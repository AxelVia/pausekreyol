    // ══════════════════════════════════════════════════════════════════════════════
    // OFFRES — Catalogue des prestations
    // ══════════════════════════════════════════════════════════════════════════════

    function OffresView() {
      const [offres, setOffres] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [editOffre, setEditOffre] = useState(null);
      const [search, setSearch] = useState('');
      const EMPTY = { nom: '', description: '', prix: '', temps_dj: '0.5', categorie: 'admin', actif: true, checklist: [] };
      const [form, setForm] = useState(EMPTY);
      const [newCheckItem, setNewCheckItem] = useState('');

      const CAT_LABELS = {
        admin: 'Admin', subvention: 'Subvention', gestion_client: 'Gestion client',
        comm: 'Communication', finance: 'Finance', juridique: 'Juridique', autre: 'Autre',
      };

      useEffect(() => {
        fetch(`${API}/offres`).then(r => r.ok ? r.json() : []).then(setOffres).catch(() => {});
      }, []);

      const filtered = offres.filter(o => !search || [o.nom, o.description, o.categorie].some(v => v?.toLowerCase().includes(search.toLowerCase())));

      async function saveOffre() {
        if (!form.nom) return;
        const payload = { ...form, prix: parseFloat(form.prix) || 0, temps_dj: parseFloat(form.temps_dj) || 0.5 };
        try {
          if (editOffre) {
            const res = await fetch(`${API}/offres/${editOffre.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            if (res.ok) { const updated = await res.json(); setOffres(p => p.map(o => o.id === editOffre.id ? updated : o)); }
          } else {
            const res = await fetch(`${API}/offres`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            if (res.ok) { const created = await res.json(); setOffres(p => [...p, created]); }
          }
        } catch {}
        setShowNew(false); setEditOffre(null); setForm(EMPTY); setNewCheckItem('');
      }

      async function deleteOffre(id) {
        if (!window.confirm('Supprimer cette offre ?')) return;
        await fetch(`${API}/offres/${id}`, { method: 'DELETE' }).catch(() => {});
        setOffres(p => p.filter(o => o.id !== id));
      }

      async function toggleActif(o) {
        const res = await fetch(`${API}/offres/${o.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actif: !o.actif }),
        }).catch(() => null);
        if (res?.ok) setOffres(p => p.map(x => x.id === o.id ? { ...x, actif: !x.actif } : x));
      }

      function addCheckItem() {
        const label = newCheckItem.trim();
        if (!label) return;
        setForm(p => ({ ...p, checklist: [...(p.checklist || []), label] }));
        setNewCheckItem('');
      }

      function removeCheckItem(idx) {
        setForm(p => ({ ...p, checklist: (p.checklist || []).filter((_, i) => i !== idx) }));
      }

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>📦 Catalogue des Offres</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Listez vos prestations, tarifs et temps d'exécution estimés</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 160 }} />
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setForm(EMPTY); setEditOffre(null); setShowNew(true); }}>+ Nouvelle offre</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <div className="empty-text">Aucune offre. Créez votre catalogue pour valoriser et rattacher des tâches à des prestations précises.</div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: '4px 0' }}>
                {filtered.map(o => (
                  <div key={o.id} style={{ border: `1.5px solid ${o.actif ? 'var(--border)' : 'var(--border2)'}`, borderRadius: 10, padding: '14px 16px', background: o.actif ? 'var(--surface)' : 'var(--surface2)', opacity: o.actif ? 1 : 0.65 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.nom}</div>
                      <span style={{ fontSize: 10, background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', padding: '1px 7px', borderRadius: 8, flexShrink: 0 }}>
                        {CAT_LABELS[o.categorie] || o.categorie}
                      </span>
                    </div>
                    {o.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.4 }}>{o.description}</div>}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{(o.prix || 0).toLocaleString('fr-FR')} €</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>⏱ {o.temps_dj} demi-j. ({o.temps_dj <= 0.5 ? 'demi-journée' : o.temps_dj < 1 ? `${o.temps_dj} demi-journée` : o.temps_dj === 1 ? '1 journée' : `${o.temps_dj} journée${o.temps_dj > 1 ? 's' : ''}`})</div>
                    </div>
                    {(o.checklist || []).length > 0 && (
                      <div style={{ marginBottom: 10, padding: '6px 8px', background: 'var(--surface2)', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Checklist ({o.checklist.length} étapes)</div>
                        {o.checklist.slice(0, 3).map((item, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text2)', padding: '2px 0' }}>☐ {item}</div>)}
                        {o.checklist.length > 3 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{o.checklist.length - 3} étapes…</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { setForm({ nom: o.nom, description: o.description, prix: String(o.prix), temps_dj: String(o.temps_dj), categorie: o.categorie, actif: o.actif, checklist: o.checklist || [] }); setEditOffre(o); setShowNew(true); }}>✏️ Modifier</button>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px', color: o.actif ? 'var(--warn)' : 'var(--success)' }} onClick={() => toggleActif(o)}>
                        {o.actif ? '⏸ Désactiver' : '▶ Activer'}
                      </button>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => deleteOffre(o.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showNew && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
              <div className="modal" style={{ maxWidth: 540 }}>
                <div className="modal-title">{editOffre ? '✏️ Modifier l\'offre' : '📦 Nouvelle offre'}</div>
                <div className="form-group">
                  <label className="form-label">Nom de la prestation *</label>
                  <input className="form-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Montage dossier subvention DRAC..." autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Détail de ce qui est inclus..." style={{ resize: 'vertical' }} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Prix (€ HT)</label>
                    <input className="form-input" type="number" min="0" step="0.01"
                      value={form.prix} onChange={e => setForm(p => ({ ...p, prix: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temps estimé (demi-journées)</label>
                    <input className="form-input" type="number" min="0.5" step="0.5"
                      value={form.temps_dj} onChange={e => setForm(p => ({ ...p, temps_dj: e.target.value }))} />
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>0.5 = demi-journée · 1 = journée complète</div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select className="form-input" value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Checklist */}
                <div className="form-group">
                  <label className="form-label">☑️ Checklist des étapes (optionnel)</label>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Ces étapes seront proposées lors de la création d'une tâche rattachée à cette offre.</div>
                  {(form.checklist || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 4, background: 'var(--surface2)', borderRadius: 6 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>☐ {item}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, lineHeight: 1 }} onClick={() => removeCheckItem(i)}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input className="form-input" value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                      placeholder="Ajouter une étape..." style={{ flex: 1, fontSize: 12 }} />
                    <button className="btn" style={{ fontSize: 12, flexShrink: 0 }} onClick={addCheckItem}>+ Ajouter</button>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowNew(false); setEditOffre(null); setForm(EMPTY); setNewCheckItem(''); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveOffre} disabled={!form.nom}>💾 Enregistrer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STRATÉGIE & PILOTAGE
    // ══════════════════════════════════════════════════════════════════════════════

    function StrategiePilotageView() {
      const [tab, setTab] = useState('strategie');

      return (
        <div>
          <div className="tabs" style={{ marginBottom: 20 }}>
            {[['strategie', '📈 Stratégie & Croissance'], ['prospect', '🔍 Prospect']].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === 'strategie' && <StrategieCroissanceTab />}
          {tab === 'prospect' && <ProspectTab />}
        </div>
      );
    }

    // ── Onglet Stratégie & Croissance ─────────────────────────────────────────

    function StrategieCroissanceTab() {
      const EMPTY = {
        point_etape: '',
        objectifs_6_mois: '',
        objectifs_1_an: '',
        objectifs_5_ans: '',
        kpis: '',
        actions: '',
        plafond_verre: '',
      };
      const [data, setData] = useState(EMPTY);
      const [editing, setEditing] = useState(false);
      const [form, setForm] = useState(EMPTY);
      const [saving, setSaving] = useState(false);
      const [msg, setMsg] = useState('');
      const [iaResult, setIaResult] = useState(null);
      const [iaLoading, setIaLoading] = useState(false);
      const [iaError, setIaError] = useState('');

      useEffect(() => {
        fetch(`${API}/strategie`).then(r => r.ok ? r.json() : {}).then(d => {
          const merged = { ...EMPTY, ...d };
          setData(merged);
          setForm(merged);
        }).catch(() => {});
      }, []);

      function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

      async function save() {
        setSaving(true);
        try {
          const res = await fetch(`${API}/strategie`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
          });
          if (res.ok) {
            const saved = await res.json();
            const merged = { ...EMPTY, ...saved };
            setData(merged);
            setForm(merged);
            setEditing(false);
            setMsg('✅ Stratégie enregistrée');
            setTimeout(() => setMsg(''), 3000);
          }
        } catch {}
        setSaving(false);
      }

      async function analyserIA() {
        setIaLoading(true);
        setIaError('');
        setIaResult(null);
        try {
          const res = await fetch(`${API}/strategie/analyser-ia`, { method: 'POST' });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Erreur analyse');
          }
          setIaResult(await res.json());
        } catch (e) {
          setIaError(e.message);
        }
        setIaLoading(false);
      }

      const SECTIONS = [
        { key: 'point_etape', label: '📍 Point d\'étape — Où en est-on aujourd\'hui ?', icon: '📍', color: 'var(--pk-blue)' },
        { key: 'objectifs_6_mois', label: '⏱ Objectifs à 6 mois', icon: '⏱', color: 'var(--warn)' },
        { key: 'objectifs_1_an', label: '📅 Objectifs à 1 an', icon: '📅', color: 'var(--accent)' },
        { key: 'objectifs_5_ans', label: '🚀 Vision à 5 ans', icon: '🚀', color: 'var(--success)' },
        { key: 'kpis', label: '📊 KPIs de suivi (indicateurs clés)', icon: '📊', color: 'var(--info)' },
        { key: 'actions', label: '✅ Actions à réaliser', icon: '✅', color: '#6A1B9A' },
        { key: 'plafond_verre', label: '🔭 Plafond de verre — Analyse des freins & leviers', icon: '🔭', color: 'var(--danger)' },
      ];

      const SCORE_COLOR = s => s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--warn)' : 'var(--danger)';
      const AMBITION_LABELS = { 'TROP_TIMIDE': '🐌 Trop timide', 'ADAPTÉ': '🎯 Adapté', 'TRÈS_AMBITIEUX': '🚀 Très ambitieux' };

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>📈 Stratégie & Croissance</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Vision, objectifs et pilotage de l'activité Pause Kréyol</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {msg && <span style={{ fontSize: 12, color: 'var(--success)' }}>{msg}</span>}
              <button className="btn" style={{ fontSize: 12, background: iaLoading ? 'var(--surface2)' : 'var(--pk-blue-light)', color: 'var(--pk-blue)', borderColor: 'var(--pk-blue)30' }}
                onClick={analyserIA} disabled={iaLoading}>
                {iaLoading ? '⏳ Analyse...' : '🤖 Analyser avec l\'IA'}
              </button>
              {!editing
                ? <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>✏️ Modifier</button>
                : <>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => { setForm(data); setEditing(false); }}>Annuler</button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={save} disabled={saving}>{saving ? '⏳...' : '💾 Enregistrer'}</button>
                </>
              }
            </div>
          </div>

          {iaError && (
            <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              ⚠️ {iaError}
            </div>
          )}

          {iaResult && (
            <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--pk-blue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pk-blue)', marginBottom: 4 }}>🤖 Analyse IA de votre stratégie</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(iaResult.analysed_at).toLocaleString('fr-FR')}</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }} onClick={() => setIaResult(null)}>✕</button>
              </div>
              {/* Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                {[['Cohérence', iaResult.score_coherence], ['Faisabilité', iaResult.score_faisabilite], ['Ambition', iaResult.score_ambition], ['Alignement', iaResult.score_alignement], ['Score global', iaResult.score_global]].map(([label, score]) => (
                  <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: SCORE_COLOR(score) }}>{score}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>/100</div>
                  </div>
                ))}
              </div>
              {/* Verdict ambition */}
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{AMBITION_LABELS[iaResult.verdict_ambition] || iaResult.verdict_ambition}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 10 }}>{iaResult.commentaire_ambition}</span>
              </div>
              {/* Synthèse */}
              <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6, marginBottom: 14, padding: '10px 14px', background: 'var(--pk-blue-light)', borderRadius: 8 }}>
                {iaResult.synthese}
              </div>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                {iaResult.points_forts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 6 }}>✅ Points forts</div>
                    {iaResult.points_forts.map((p, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text1)' }}>• {p}</div>)}
                  </div>
                )}
                {iaResult.points_vigilance?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', textTransform: 'uppercase', marginBottom: 6 }}>⚠️ Points de vigilance</div>
                    {iaResult.points_vigilance.map((p, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text1)' }}>• {p}</div>)}
                  </div>
                )}
              </div>
              {iaResult.angles_morts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 6 }}>🔍 Angles morts identifiés</div>
                  {iaResult.angles_morts.map((p, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text1)' }}>• {p}</div>)}
                </div>
              )}
              {iaResult.recommandations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pk-blue)', textTransform: 'uppercase', marginBottom: 8 }}>💡 Recommandations</div>
                  {iaResult.recommandations.map((r, i) => (
                    <div key={i} style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, background: r.priorite === 'HAUTE' ? 'var(--danger-light)' : 'var(--surface2)', borderLeft: `3px solid ${r.priorite === 'HAUTE' ? 'var(--danger)' : 'var(--accent)'}` }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: r.priorite === 'HAUTE' ? 'var(--danger)' : 'var(--accent)', textTransform: 'uppercase' }}>{r.priorite}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.action}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.pourquoi}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {SECTIONS.map(s => (
              <div key={s.key} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 8 }}>{s.label}</div>
                {editing ? (
                  <textarea
                    className="form-input"
                    rows={s.key === 'point_etape' || s.key === 'plafond_verre' ? 5 : 4}
                    value={form[s.key] || ''}
                    onChange={e => set(s.key, e.target.value)}
                    placeholder={`Renseigner ${s.label.toLowerCase()}...`}
                    style={{ resize: 'vertical', fontSize: 13 }}
                  />
                ) : (
                  data[s.key]
                    ? <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data[s.key]}</div>
                    : <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>— Non renseigné —</div>
                )}
              </div>
            ))}
          </div>

          {data.updated_at && !editing && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'right' }}>
              Dernière mise à jour : {new Date(data.updated_at).toLocaleString('fr-FR')}
            </div>
          )}
        </div>
      );
    }

    // ── Onglet Prospect ───────────────────────────────────────────────────────

    function ProspectTab() {
      const EMPTY_FORM = { nom: '', description: '', budget: '', deadline: '', missions: '', contexte: '' };
      const [form, setForm] = useState(EMPTY_FORM);
      const [result, setResult] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [history, setHistory] = useState([]);
      const [showHistory, setShowHistory] = useState(false);

      useEffect(() => {
        fetch(`${API}/prospects`).then(r => r.ok ? r.json() : []).then(setHistory).catch(() => {});
      }, []);

      function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

      async function analyser() {
        if (!form.description) { setError('Décrivez le projet pour lancer l\'analyse.'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        try {
          const res = await fetch(`${API}/prospects/analyser`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setResult(data);
          setHistory(p => [data, ...p.slice(0, 49)]);
        } catch (e) {
          setError('Erreur lors de l\'analyse : ' + e.message);
        }
        setLoading(false);
      }

      async function deleteAnalyse(id) {
        await fetch(`${API}/prospects/${id}`, { method: 'DELETE' }).catch(() => {});
        setHistory(p => p.filter(x => x.id !== id));
        if (result?.id === id) setResult(null);
      }

      const VERDICT_STYLE = {
        'POSSIBLE': { bg: '#E8F5E9', color: '#1B5E20', icon: '✅' },
        'SOUS CONDITIONS': { bg: '#FFF3E0', color: '#E65100', icon: '⚠️' },
        'DÉCONSEILLÉ': { bg: '#FFEBEE', color: '#B71C1C', icon: '❌' },
      };
      const RENTA_STYLE = {
        'RENTABLE': { bg: '#E8F5E9', color: '#1B5E20' },
        'LIMITE': { bg: '#FFF3E0', color: '#E65100' },
        'NON_RENTABLE': { bg: '#FFEBEE', color: '#B71C1C' },
      };

      function ResultCard({ r }) {
        const vs = VERDICT_STYLE[r.verdict] || VERDICT_STYLE['SOUS CONDITIONS'];
        const rs = RENTA_STYLE[r.rentabilite] || RENTA_STYLE['LIMITE'];
        return (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ background: vs.bg, color: vs.color, padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                {vs.icon} {r.verdict}
              </span>
              <span style={{ background: rs.bg, color: rs.color, padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                💰 {r.rentabilite}
              </span>
              {r.charge_warning && (
                <span style={{ background: '#FFF3E0', color: '#E65100', padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  ⚠️ Charge élevée
                </span>
              )}
              {r.estimation_charge && (
                <span style={{ background: 'var(--surface2)', color: 'var(--text2)', padding: '4px 12px', borderRadius: 12, fontSize: 12 }}>
                  ⏱ {r.estimation_charge}
                </span>
              )}
            </div>

            {r.synthese && (
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'var(--text1)' }}>
                {r.synthese}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {r.points_positifs?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 6 }}>✅ Points positifs</div>
                  {r.points_positifs.map((p, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {p}</div>)}
                </div>
              )}
              {r.points_risques?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 6 }}>⚠️ Risques</div>
                  {r.points_risques.map((p, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {p}</div>)}
                </div>
              )}
            </div>

            {r.conditions_acceptation?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pk-blue)', textTransform: 'uppercase', marginBottom: 6 }}>📋 Conditions d'acceptation</div>
                {r.conditions_acceptation.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {c}</div>)}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {r.engagements_possibles?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E20', textTransform: 'uppercase', marginBottom: 6 }}>✅ Sur quoi on peut s'engager</div>
                  {r.engagements_possibles.map((e, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {e}</div>)}
                </div>
              )}
              {r.engagements_risques?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#B71C1C', textTransform: 'uppercase', marginBottom: 6 }}>❌ Ce qui est risqué</div>
                  {r.engagements_risques.map((e, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>• {e}</div>)}
                </div>
              )}
            </div>

            {r.recommandation_finale && (
              <div style={{ background: vs.bg, border: `1px solid ${vs.color}30`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: vs.color }}>
                💡 {r.recommandation_finale}
              </div>
            )}
          </div>
        );
      }

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>🔍 Analyse Prospect</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Décrivez une demande entrante et l'IA évalue faisabilité, rentabilité et conditions</div>
            </div>
            {history.length > 0 && (
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setShowHistory(p => !p)}>
                {showHistory ? '▲ Masquer l\'historique' : `📂 Historique (${history.length})`}
              </button>
            )}
          </div>

          {/* Formulaire */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>📝 Nouvelle demande à analyser</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nom du prospect / contact</label>
                <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Cie Lumière, Sophie Martin..." />
              </div>
              <div className="form-group">
                <label className="form-label">Budget proposé (€)</label>
                <input className="form-input" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="Ex : 3 000 € ou non communiqué" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description du projet *</label>
              <textarea className="form-input" rows={4} value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Décrivez précisément la demande : type de projet, objectifs, contexte, public visé..."
                style={{ resize: 'vertical' }} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Missions demandées</label>
                <textarea className="form-input" rows={3} value={form.missions}
                  onChange={e => set('missions', e.target.value)}
                  placeholder="Ex : montage dossier subvention DRAC, coordination résidence 10 jours, charge de production..."
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline / Date souhaitée</label>
                <input className="form-input" value={form.deadline} onChange={e => set('deadline', e.target.value)} placeholder="Ex : octobre 2026, avant le 15/09..." style={{ marginBottom: 10 }} />
                <label className="form-label">Contexte supplémentaire</label>
                <textarea className="form-input" rows={2} value={form.contexte}
                  onChange={e => set('contexte', e.target.value)}
                  placeholder="Contraintes particulières, historique relationnel, urgence..."
                  style={{ resize: 'vertical' }} />
              </div>
            </div>

            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setForm(EMPTY_FORM); setResult(null); setError(''); }}>Réinitialiser</button>
              <button className="btn btn-primary" onClick={analyser} disabled={loading || !form.description}>
                {loading ? '⏳ Analyse en cours...' : '🤖 Lancer l\'analyse IA'}
              </button>
            </div>
          </div>

          {/* Résultat */}
          {result && <ResultCard r={result} />}

          {/* Historique */}
          {showHistory && history.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📂 Historique des analyses</div>
              {history.map(h => {
                const vs = VERDICT_STYLE[h.verdict] || VERDICT_STYLE['SOUS CONDITIONS'];
                return (
                  <div key={h.id} className="card" style={{ padding: '12px 16px', marginBottom: 10, cursor: 'pointer', borderLeft: `3px solid ${vs.color}` }}
                    onClick={() => { setResult(h); setShowHistory(false); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{h.nom || h.request?.nom || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(h.created_at).toLocaleDateString('fr-FR')} · {h.request?.description ? (h.request.description.length > 80 ? h.request.description.slice(0, 80) + '...' : h.request.description) : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ background: vs.bg, color: vs.color, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{vs.icon} {h.verdict}</span>
                        <button className="btn" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--danger)' }}
                          onClick={e => { e.stopPropagation(); deleteAnalyse(h.id); }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

