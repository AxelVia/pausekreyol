    // ══════════════════════════════════════════════════════════════════════════════
    // MODULE AUDIT
    // ══════════════════════════════════════════════════════════════════════════════

    function AuditView({ clients }) {
      const [audits, setAudits] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [selectedAudit, setSelectedAudit] = useState(null);
      const [showArchived, setShowArchived] = useState(false);
      const [tab, setTab] = useState('dashboard');

      const EMPTY_AUDIT = { client_slug: '', client_nom: '', projet_nom: '', date_rdv: '',
        lieu: '', format_rdv: 'Visio', participants_structure: '', participants_pk: 'Océane Hurez',
        notes_generales: '', statut: 'en_attente' };
      const [newAudit, setNewAudit] = useState(EMPTY_AUDIT);

      useEffect(() => {
        fetch(`${API}/audits`).then(r => r.ok ? r.json() : []).then(setAudits).catch(() => {});
      }, []);

      const auditsActifs  = audits.filter(a => !a.archived);
      const auditsArchives = audits.filter(a => a.archived);
      const nbAudites = auditsActifs.filter(a => a.statut === 'audite').length;
      const nbEnAttente = auditsActifs.filter(a => a.statut === 'en_attente').length;
      const nbTotal = auditsActifs.length;

      async function createAudit() {
        const c = clients.find(x => x.slug === newAudit.client_slug);
        const payload = { ...newAudit, client_nom: c?.nom || newAudit.client_nom };
        try {
          const res = await fetch(`${API}/audits`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (res.ok) { const saved = await res.json(); setAudits(p => [saved, ...p]); setSelectedAudit(saved); }
        } catch {}
        setShowNew(false); setNewAudit(EMPTY_AUDIT);
      }

      async function toggleArchive(id, archived) {
        setAudits(p => p.map(a => a.id === id ? {...a, archived: !archived} : a));
        await fetch(`${API}/audits/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ archived: !archived }) }).catch(() => {});
      }

      async function deleteAudit(id) {
        if (!window.confirm('Supprimer cet audit ?')) return;
        setAudits(p => p.filter(a => a.id !== id));
        await fetch(`${API}/audits/${id}`, { method:'DELETE' }).catch(() => {});
      }

      function downloadTemplate() {
        const a = document.createElement('a');
        a.href = `${API}/export/template-audit`;
        a.download = 'PauseKreyol_Template_Reunion_Demarrage.xlsx';
        a.click();
      }

      if (selectedAudit) return (
        <AuditFicheView
          audit={selectedAudit}
          clients={clients}
          onBack={() => setSelectedAudit(null)}
          onUpdate={updated => { setAudits(p => p.map(a => a.id === updated.id ? updated : a)); setSelectedAudit(updated); }}
          onDelete={id => { deleteAudit(id); setSelectedAudit(null); }}
        />
      );

      const liste = showArchived ? auditsArchives : auditsActifs;

      return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="tabs" style={{ marginBottom:0 }}>
              {[['dashboard','📊 Tableau de bord'],['liste',`📋 Audits (${auditsActifs.length})`]].map(([k,l]) => (
                <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" style={{ fontSize:12 }} onClick={downloadTemplate}>📥 Template réunion</button>
              <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => setShowNew(true)}>+ Nouvel audit</button>
            </div>
          </div>

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div>
              <div className="metrics-grid" style={{ marginBottom:16 }}>
                <div className="metric-card accent-green">
                  <div className="metric-label">Audités</div>
                  <div className="metric-value" style={{ fontSize:26 }}>{nbAudites}</div>
                  <div className="metric-sub">structures</div>
                </div>
                <div className="metric-card accent-warn">
                  <div className="metric-label">En attente</div>
                  <div className="metric-value" style={{ fontSize:26 }}>{nbEnAttente}</div>
                  <div className="metric-sub">à planifier</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total audits</div>
                  <div className="metric-value" style={{ fontSize:26 }}>{nbTotal}</div>
                  <div className="metric-sub">{auditsArchives.length} archivé(s)</div>
                </div>
                <div className="metric-card accent-info">
                  <div className="metric-label">Taux audit</div>
                  <div className="metric-value" style={{ fontSize:26 }}>{nbTotal > 0 ? Math.round(nbAudites/nbTotal*100) : 0}%</div>
                  <div className="metric-sub">des structures</div>
                </div>
              </div>

              {/* Statuts par client */}
              <div className="card">
                <div className="card-header"><div className="card-title">Statut audit par structure</div></div>
                {clients.filter(c=>!c.archived).map(c => {
                  const audit = auditsActifs.find(a => a.client_slug === c.slug);
                  const st = audit?.statut || 'non_initie';
                  const cfg = {
                    audite:      { bg:'var(--success-light)', c:'var(--success)',   txt:'✅ Audité',          sub: audit?.date_rdv ? `RDV : ${audit.date_rdv}` : '' },
                    en_attente:  { bg:'var(--warn-light)',    c:'var(--warn)',       txt:'⏳ En attente',      sub: audit?.date_rdv ? `Prévu : ${audit.date_rdv}` : 'Date à planifier' },
                    non_initie:  { bg:'var(--surface2)',      c:'var(--text3)',      txt:'○ Non initié',        sub: '' },
                  }[st] || { bg:'var(--surface2)', c:'var(--text3)', txt:'○ Non initié', sub:'' };
                  return (
                    <div key={c.slug} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid var(--border)', cursor: audit ? 'pointer' : 'default' }}
                      onClick={() => audit && setSelectedAudit(audit)}>
                      <div className="client-avatar" style={{ flexShrink:0 }}>{(c.nom||'').slice(0,2).toUpperCase()}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{c.nom}</div>
                        {cfg.sub && <div style={{ fontSize:11, color:'var(--text3)' }}>{cfg.sub}</div>}
                      </div>
                      <span style={{ background:cfg.bg, color:cfg.c, padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:600 }}>{cfg.txt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LISTE */}
          {tab === 'liste' && (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <button className="btn" style={{ fontSize:11, background: showArchived?'var(--pk-blue-light)':'', color: showArchived?'var(--pk-blue)':'var(--text3)' }}
                  onClick={() => setShowArchived(p=>!p)}>
                  {showArchived ? '👁 Actifs' : `📦 Archives (${auditsArchives.length})`}
                </button>
              </div>
              <div className="card">
                {liste.length === 0
                  ? <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">{showArchived ? 'Aucun audit archivé.' : 'Aucun audit. Créez-en un avec "+ Nouvel audit".'}</div></div>
                  : liste.map(a => {
                    const cfg = { audite:{bg:'var(--success-light)',c:'var(--success)',txt:'✅ Audité'}, en_attente:{bg:'var(--warn-light)',c:'var(--warn)',txt:'⏳ En attente'} }[a.statut] || {bg:'var(--surface2)',c:'var(--text3)',txt:'—'};
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                        onClick={() => setSelectedAudit(a)}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600 }}>{a.client_nom}</div>
                          <div style={{ fontSize:11, color:'var(--text3)' }}>
                            {a.date_rdv && <span>📅 {a.date_rdv} · </span>}
                            {a.format_rdv} · {a.participants_pk}
                          </div>
                          {a.projet_nom && <div style={{ fontSize:11, color:'var(--pk-blue)' }}>{a.projet_nom}</div>}
                        </div>
                        <span style={{ background:cfg.bg, color:cfg.c, padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:600 }}>{cfg.txt}</span>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={e => { e.stopPropagation(); toggleArchive(a.id, a.archived); }}
                            style={{ background:'none', border:'1px solid var(--border2)', borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', color:'var(--text3)' }}
                            title={a.archived ? 'Désarchiver':'Archiver'}>{a.archived ? '↩' : '📦'}</button>
                          <button onClick={e => { e.stopPropagation(); deleteAudit(a.id); }}
                            style={{ background:'none', border:'1px solid var(--danger)40', borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', color:'var(--danger)' }}>🗑</button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Modal nouvel audit */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
              <div className="modal" style={{ maxWidth:500 }}>
                <div className="modal-title">🔍 Nouvel audit de démarrage</div>
                <div className="form-group">
                  <label className="form-label">Structure *</label>
                  <select className="form-input" value={newAudit.client_slug} onChange={e => {
                    const c = clients.find(x => x.slug === e.target.value);
                    setNewAudit(p => ({ ...p, client_slug: e.target.value, client_nom: c?.nom || '' }));
                  }}>
                    <option value="">— Choisir —</option>
                    {clients.filter(c=>!c.archived).map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Projet (optionnel)</label>
                  <input className="form-input" value={newAudit.projet_nom} onChange={e => setNewAudit(p=>({...p,projet_nom:e.target.value}))} placeholder="Nom du projet..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date du RDV</label>
                    <input className="form-input" type="date" value={newAudit.date_rdv} onChange={e => setNewAudit(p=>({...p,date_rdv:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Format</label>
                    <select className="form-input" value={newAudit.format_rdv} onChange={e => setNewAudit(p=>({...p,format_rdv:e.target.value}))}>
                      {['Visio','Présentiel','Téléphone','Hybride'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Participants (structure)</label>
                  <input className="form-input" value={newAudit.participants_structure} onChange={e => setNewAudit(p=>({...p,participants_structure:e.target.value}))} placeholder="Noms et fonctions..." />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowNew(false); setNewAudit(EMPTY_AUDIT); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={createAudit} disabled={!newAudit.client_slug}>Créer l'audit →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── Fiche détaillée d'un audit ────────────────────────────────────────────

    function AuditFicheView({ audit, clients, onBack, onUpdate, onDelete }) {
      const [form, setForm] = useState(audit);
      const [saving, setSaving] = useState(false);
      const [completing, setCompleting] = useState(false);
      const [planningRows, setPlanningRows] = useState(
        (audit.compte_rendu?.planning || []).length > 0
          ? audit.compte_rendu.planning
          : Array(5).fill(null).map((_, i) => ({ titre:'', date:'', date_fin:'', type:'culturel', projet_nom:'', notes:'' }))
      );
      const [savedMsg, setSavedMsg] = useState('');

      async function save() {
        setSaving(true);
        const updated = { ...form, compte_rendu: { ...(form.compte_rendu||{}), planning: planningRows } };
        try {
          const res = await fetch(`${API}/audits/${audit.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) });
          if (res.ok) { const saved = await res.json(); onUpdate(saved); setSavedMsg('✅ Sauvegardé'); setTimeout(() => setSavedMsg(''), 2500); }
        } catch {}
        setSaving(false);
      }

      async function completeAudit() {
        if (!window.confirm('Marquer cet audit comme terminé ? Cela créera une tâche "Envoi compte rendu" à J+5 et injectera le planning dans le calendrier.')) return;
        setCompleting(true);
        const planning = planningRows.filter(r => r.titre && r.date);
        try {
          const res = await fetch(`${API}/audits/${audit.id}/complete`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ...form, compte_rendu: { ...(form.compte_rendu||{}), planning }, planning_previsionnel: planning })
          });
          if (res.ok) {
            const result = await res.json();
            const updated = { ...form, statut:'audite', compte_rendu: { ...(form.compte_rendu||{}), planning } };
            onUpdate(updated);
            // Push retroplanning vers Google Calendar
            planning.forEach(async evt => {
              if (evt.date && evt.titre) {
                try {
                  await fetch(`${API}/gcal/event-to-gcal`, {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ ...evt, client_nom: form.client_nom, notes: 'Retroplanning audit — ' + form.client_nom })
                  });
                } catch {}
              }
            });
            setSavedMsg(`✅ Audit finalisé · Tâche CR créée · ${result.planning_events} événement(s) injectés${planning.length > 0 ? ' · Planning → Google Calendar' : ''}`);
          }
        } catch {}
        setCompleting(false);
      }

      const isAudite = form.statut === 'audite';

      return (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <button className="btn" onClick={onBack}>← Retour</button>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{form.client_nom}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>
                Audit de démarrage{form.date_rdv ? ` · ${form.date_rdv}` : ''}{form.format_rdv ? ` · ${form.format_rdv}` : ''}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{ padding:'4px 12px', borderRadius:10, fontSize:12, fontWeight:700, alignSelf:'center',
                background: isAudite ? 'var(--success-light)' : 'var(--warn-light)',
                color: isAudite ? 'var(--success)' : 'var(--warn)' }}>
                {isAudite ? '✅ Audité' : '⏳ En attente'}
              </span>
              {savedMsg && <span style={{ fontSize:12, color:'var(--success)', alignSelf:'center' }}>{savedMsg}</span>}
              {!isAudite && (
                <button className="btn btn-primary" style={{ fontSize:12, background:'var(--success)', borderColor:'var(--success)' }}
                  onClick={completeAudit} disabled={completing}>
                  {completing ? '⏳ Finalisation...' : '✅ Finaliser l\'audit'}
                </button>
              )}
              <button className="btn btn-primary" style={{ fontSize:12 }} onClick={save} disabled={saving}>
                {saving ? '⏳' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>

          {isAudite && (
            <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--success-light)', borderRadius:8, fontSize:12, color:'var(--success)', fontWeight:500 }}>
              ✅ Audit finalisé · Compte rendu à envoyer sous 5 jours · Planning injecté dans le calendrier
            </div>
          )}

          <div className="grid-2" style={{ gap:14 }}>
            {/* Infos générales */}
            <div>
              <div className="card" style={{ marginBottom:12 }}>
                <div className="card-header"><div className="card-title">📋 Informations du RDV</div></div>
                {[
                  ['Date du RDV', 'date_rdv', 'date'],
                  ['Format', 'format_rdv', 'text'],
                  ['Lieu', 'lieu', 'text'],
                  ['Participants (structure)', 'participants_structure', 'text'],
                  ['Participants (PauseKreyol)', 'participants_pk', 'text'],
                  ['Projet associé', 'projet_nom', 'text'],
                ].map(([label, key, type]) => (
                  <div className="form-group" key={key} style={{ marginBottom:8 }}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" type={type} value={form[key]||''} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} />
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">📝 Notes & observations</div></div>
                <textarea className="form-input" rows={5} value={form.notes_generales||''} style={{ resize:'vertical' }}
                  onChange={e => setForm(p=>({...p,notes_generales:e.target.value}))}
                  placeholder="Points de vigilance, besoins identifiés, contexte..." />
                <div className="form-group" style={{ marginTop:10 }}>
                  <label className="form-label">Besoins / Prestations identifiées</label>
                  <textarea className="form-input" rows={3} value={form.besoins||''} style={{ resize:'vertical' }}
                    onChange={e => setForm(p=>({...p,besoins:e.target.value}))}
                    placeholder="Administration, subventions, RH, comm..." />
                </div>
                <div className="form-group" style={{ marginTop:10 }}>
                  <label className="form-label">Prochaines étapes</label>
                  <textarea className="form-input" rows={3} value={form.prochaines_etapes||''} style={{ resize:'vertical' }}
                    onChange={e => setForm(p=>({...p,prochaines_etapes:e.target.value}))}
                    placeholder="Actions à engager..." />
                </div>
              </div>
            </div>

            {/* Planning prévisionnel */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">🗓 Planning prévisionnel</div>
                  <div className="card-subtitle">Ces dates seront injectées dans le calendrier lors de la finalisation</div>
                </div>
                <button className="btn" style={{ fontSize:11 }} onClick={() => setPlanningRows(p => [...p, { titre:'', date:'', date_fin:'', type:'culturel', notes:'' }])}>+ Ligne</button>
              </div>
              {planningRows.map((row, i) => (
                <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                    <input className="form-input" style={{ flex:2, fontSize:12 }} placeholder="Étape / événement" value={row.titre||''} onChange={e => setPlanningRows(p => p.map((r,j) => j===i ? {...r,titre:e.target.value} : r))} />
                    <select style={{ fontSize:11, padding:'4px 6px', border:'1px solid var(--border2)', borderRadius:6 }} value={row.type||'culturel'} onChange={e => setPlanningRows(p => p.map((r,j) => j===i ? {...r,type:e.target.value} : r))}>
                      <option value="culturel">Culturel</option>
                      <option value="formalites">Formalités</option>
                      <option value="reunion">Réunion</option>
                    </select>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:14, padding:'0 4px' }} onClick={() => setPlanningRows(p => p.filter((_,j) => j!==i))}>✕</button>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <input className="form-input" type="date" style={{ flex:1, fontSize:11 }} value={row.date||''} onChange={e => setPlanningRows(p => p.map((r,j) => j===i ? {...r,date:e.target.value} : r))} />
                    <input className="form-input" type="date" style={{ flex:1, fontSize:11 }} value={row.date_fin||''} onChange={e => setPlanningRows(p => p.map((r,j) => j===i ? {...r,date_fin:e.target.value} : r))} />
                    <input className="form-input" style={{ flex:2, fontSize:11 }} placeholder="Projet" value={row.projet_nom||''} onChange={e => setPlanningRows(p => p.map((r,j) => j===i ? {...r,projet_nom:e.target.value} : r))} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', fontStyle:'italic' }}>
                💡 Cliquez "Finaliser l'audit" pour injecter ces dates dans le calendrier global et le projet.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Suivi prévisionnel dans un projet ─────────────────────────────────────

    function ProjetSuiviPlanningView({ projet, clientMeta, slug }) {
      const [events, setEvents] = useState([]);
      const [showAdd, setShowAdd] = useState(false);
      const [newEvt, setNewEvt] = useState({ titre:'', date:'', date_fin:'', type:'culturel', notes:'' });

      useEffect(() => {
        // Charge les events du calendrier liés à ce projet/client
        fetch(`${API}/planning-events`)
          .then(r => r.ok ? r.json() : [])
          .then(data => setEvents(data.filter(e => e.client_slug === slug || e.projet_nom === projet?.nom)))
          .catch(() => {});
      }, []);

      const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

      async function addEvent() {
        try {
          const payload = { ...newEvt, client_slug: slug, client_nom: clientMeta?.client_data?.nom_usuel || '', projet_nom: projet?.nom || '', source: 'audit_planning' };
          const res = await fetch(`${API}/calendrier/event`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (res.ok) {
            const saved = await res.json();
            setEvents(p => [...p, saved]);
          }
        } catch {}
        setShowAdd(false);
        setNewEvt({ titre:'', date:'', date_fin:'', type:'culturel', notes:'' });
      }

      // Groupe par mois
      const byMonth = {};
      events.filter(e => e.date).forEach(e => {
        const d = new Date(e.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(e);
      });
      const sortedMonths = Object.keys(byMonth).sort();

      const TYPE_COLORS = { culturel:{ bg:'var(--pk-blue-light)', c:'var(--pk-blue)' }, formalites:{ bg:'var(--warn-light)', c:'var(--warn)' }, reunion:{ bg:'var(--success-light)', c:'var(--success)' } };

      return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Suivi prévisionnel — {projet?.nom}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Événements injectés depuis les audits ou ajoutés manuellement</div>
            </div>
            <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => setShowAdd(true)}>+ Ajouter une étape</button>
          </div>

          {events.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-icon">🗓</div>
                <div className="empty-text">Aucune étape planifiée. Complétez un audit pour injecter le planning, ou ajoutez manuellement.</div>
              </div>
            </div>
          ) : (
            <div>
              {sortedMonths.map(monthKey => {
                const [year, month] = monthKey.split('-');
                const monthEvents = byMonth[monthKey].sort((a,b) => a.date.localeCompare(b.date));
                return (
                  <div key={monthKey} style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:1, background:'var(--border)' }} />
                      {MONTHS[parseInt(month)-1]} {year}
                      <div style={{ flex:1, height:1, background:'var(--border)' }} />
                    </div>
                    {monthEvents.map((evt, i) => {
                      const tc = TYPE_COLORS[evt.type] || TYPE_COLORS.culturel;
                      const d = new Date(evt.date + 'T00:00:00');
                      return (
                        <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                          <div style={{ width:36, textAlign:'center', flexShrink:0 }}>
                            <div style={{ fontSize:18, fontWeight:700, color:'var(--pk-blue)' }}>{d.getDate()}</div>
                            <div style={{ fontSize:10, color:'var(--text3)' }}>{MONTHS[d.getMonth()]}</div>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600 }}>{evt.titre}</div>
                            {evt.date_fin && evt.date_fin !== evt.date && (
                              <div style={{ fontSize:11, color:'var(--text3)' }}>→ {new Date(evt.date_fin+'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'})}</div>
                            )}
                            {evt.notes && <div style={{ fontSize:11, color:'var(--text2)', fontStyle:'italic' }}>{evt.notes}</div>}
                          </div>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600, background:tc.bg, color:tc.c, flexShrink:0 }}>{evt.type}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {showAdd && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
              <div className="modal" style={{ maxWidth:440 }}>
                <div className="modal-title">🗓 Ajouter une étape au planning</div>
                <div className="form-group">
                  <label className="form-label">Titre *</label>
                  <input className="form-input" value={newEvt.titre} onChange={e => setNewEvt(p=>({...p,titre:e.target.value}))} placeholder="Ex: Dépôt dossier subvention, Résidence..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date début *</label>
                    <input className="form-input" type="date" value={newEvt.date} onChange={e => setNewEvt(p=>({...p,date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date fin</label>
                    <input className="form-input" type="date" value={newEvt.date_fin} onChange={e => setNewEvt(p=>({...p,date_fin:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={newEvt.type} onChange={e => setNewEvt(p=>({...p,type:e.target.value}))}>
                    <option value="culturel">Culturel</option>
                    <option value="formalites">Formalités</option>
                    <option value="reunion">Réunion</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={newEvt.notes} onChange={e => setNewEvt(p=>({...p,notes:e.target.value}))} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowAdd(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={addEvent} disabled={!newEvt.titre || !newEvt.date}>Ajouter →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


