    // ══════════════════════════════════════════════════════════════════════════════
    // ZCAL & DISPONIBILITÉS — Sync avec Google Calendar
    // ══════════════════════════════════════════════════════════════════════════════

    function ZcalView({ clients }) {
      const [tab, setTab] = useState('calendrier');
      const [gcalEvents, setGcalEvents] = useState([]);
      const [loading, setLoading] = useState(false);
      const [syncing, setSyncing] = useState(false);
      const [syncMsg, setSyncMsg] = useState('');
      const [busySlots, setBusySlots] = useState([]);
      const [showAddIndispo, setShowAddIndispo] = useState(false);
      const [showAddEvent, setShowAddEvent] = useState(false);
      const [mois, setMois] = useState(new Date().getMonth());
      const [annee, setAnnee] = useState(new Date().getFullYear());
      const EMPTY_INDISPO = { titre: '', date: '', date_fin: '', heure_debut: '09:00', heure_fin: '18:00', all_day: true, notes: '', client_slug: '' };
      const EMPTY_EVENT = { titre: '', date: '', date_fin: '', type: 'culturel', client_slug: '', client_nom: '', couleur: '#2834B7', notes: '' };
      const [newIndispo, setNewIndispo] = useState(EMPTY_INDISPO);
      const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
      const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

      useEffect(() => { loadGcalEvents(); }, []);

      async function loadGcalEvents() {
        setLoading(true);
        try {
          const res = await fetch(`${API}/google-calendar/events`);
          if (res.ok) setGcalEvents(await res.json());
        } catch {}
        setLoading(false);
      }

      async function syncGcal() {
        setSyncing(true);
        setSyncMsg('');
        try {
          const res = await fetch(`${API}/google-calendar/sync`, { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setSyncMsg(`✅ ${data.events_synced} events sync · ${data.zcal_rdv} RDV Zcal · ${data.indispo} indispo`);
            await loadGcalEvents();
          }
        } catch { setSyncMsg('❌ Erreur de sync'); }
        setSyncing(false);
        setTimeout(() => setSyncMsg(''), 5000);
      }

      async function createIndispo() {
        const c = clients.find(x => x.slug === newIndispo.client_slug);
        const payload = { ...newIndispo, is_indispo: true, type: 'formalites', client_nom: c?.nom || '', source: 'indispo' };
        try {
          const res = await fetch(`${API}/google-calendar/events`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (res.ok) {
            const saved = await res.json();
            setGcalEvents(p => [...p, saved]);
            setSyncMsg('✅ Indisponibilité créée — Google Calendar + Zcal bloqué');
            setTimeout(() => setSyncMsg(''), 4000);
          }
        } catch { setSyncMsg('❌ Erreur création indispo'); }
        setShowAddIndispo(false);
        setNewIndispo(EMPTY_INDISPO);
      }

      async function createEvent() {
        const c = clients.find(x => x.slug === newEvent.client_slug);
        const payload = { ...newEvent, client_nom: c?.nom || '', source: 'pausekreyol' };
        try {
          const res = await fetch(`${API}/google-calendar/events`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (res.ok) {
            const saved = await res.json();
            setGcalEvents(p => [...p, saved]);
            setSyncMsg('✅ Événement créé dans Google Calendar');
            setTimeout(() => setSyncMsg(''), 3000);
          }
        } catch {}
        setShowAddEvent(false);
        setNewEvent(EMPTY_EVENT);
      }

      async function deleteEvent(evt) {
        if (!window.confirm(`Supprimer "${evt.titre}" de Google Calendar ?`)) return;
        const gcalId = evt.gcal_id || evt.id?.replace('gcal_','');
        if (gcalId && !String(gcalId).startsWith('gcal_') === false) {
          await fetch(`${API}/google-calendar/events/${gcalId}`, { method: 'DELETE' }).catch(()=>{});
        }
        setGcalEvents(p => p.filter(e => e.id !== evt.id));
      }

      // Filtre events par mois affiché
      const eventsThisMonth = gcalEvents.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() === mois && d.getFullYear() === annee;
      });
      const indispos = gcalEvents.filter(e => e.is_indispo);
      const zcalRdvs = gcalEvents.filter(e => e.source === 'google_calendar' && !e.is_indispo);
      const today = new Date();
      const todayStr = today.toISOString().slice(0,10);
      const firstDayAdj = (new Date(annee, mois, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(annee, mois + 1, 0).getDate();

      return (
        <div>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="tabs" style={{ marginBottom:0 }}>
              {[['calendrier','📅 Calendrier Google'], ['dispos','✅ Disponibilités'], ['rdvs',`📞 RDV Zcal (${zcalRdvs.length})`], ['guide','ℹ️ Configuration']].map(([k,l]) => (
                <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {syncMsg && <span style={{ fontSize:12, color:'var(--success)', alignSelf:'center' }}>{syncMsg}</span>}
              <button className="btn" style={{ fontSize:12 }} onClick={syncGcal} disabled={syncing}>
                {syncing ? '⏳ Sync...' : '🔄 Sync Google Calendar'}
              </button>
              <button className="btn" style={{ fontSize:12, background:'var(--danger-light)', color:'var(--danger)', borderColor:'var(--danger)30' }}
                onClick={() => setShowAddIndispo(true)}>🚫 Indispo</button>
              <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => setShowAddEvent(true)}>+ Événement</button>
            </div>
          </div>

          {/* ── TAB CALENDRIER ── */}
          {tab === 'calendrier' && (
            <div>
              {loading && <div style={{ textAlign:'center', padding:20, color:'var(--text3)' }}>⏳ Chargement Google Calendar...</div>}
              {/* Nav mois */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <button className="btn" onClick={() => { if (mois===0){setMois(11);setAnnee(a=>a-1);}else setMois(m=>m-1); }}>←</button>
                <div style={{ fontFamily:"'Josefin Sans',sans-serif", fontWeight:700, fontSize:15, color:'var(--pk-blue)' }}>{MOIS[mois]} {annee}</div>
                <button className="btn" onClick={() => { if (mois===11){setMois(0);setAnnee(a=>a+1);}else setMois(m=>m+1); }}>→</button>
              </div>
              {/* Grille */}
              <div className="card" style={{ padding:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
                  {JOURS.map(j => <div key={j} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--text3)', padding:'3px 0' }}>{j}</div>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                  {Array(firstDayAdj).fill(null).map((_,i) => <div key={`e${i}`} style={{ minHeight:64 }} />)}
                  {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
                    const ds = `${annee}-${String(mois+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const dayEvts = gcalEvents.filter(e => e.date === ds || (e.date <= ds && e.date_fin >= ds));
                    const isToday = ds === todayStr;
                    const isWeekend = (new Date(ds+'T00:00:00').getDay() + 6) % 7 >= 5;
                    const hasIndispo = dayEvts.some(e => e.is_indispo);
                    return (
                      <div key={d} style={{ minHeight:64, padding:'3px 4px', borderRadius:6, background: hasIndispo ? '#FFF0F0' : isWeekend ? '#FFF8F0' : 'var(--surface)', border: isToday ? '2px solid var(--pk-blue)' : '1px solid var(--border)' }}>
                        <div style={{ fontSize:11, fontWeight:isToday?700:400, color:isToday?'var(--pk-blue)':isWeekend?'var(--pk-orange)':'var(--text2)', marginBottom:2 }}>{d}</div>
                        {dayEvts.slice(0,3).map((e,i) => (
                          <div key={i} title={e.titre} style={{ fontSize:9, padding:'1px 3px', borderRadius:3, marginBottom:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', background: e.is_indispo ? '#FFEBEE' : e.couleur+'20', color: e.is_indispo ? '#C62828' : e.couleur || 'var(--pk-blue)', fontWeight:500 }}>
                            {e.is_indispo ? '🚫' : '●'} {e.titre}
                          </div>
                        ))}
                        {dayEvts.length > 3 && <div style={{ fontSize:9, color:'var(--text3)' }}>+{dayEvts.length-3}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Liste du mois */}
              {eventsThisMonth.length > 0 && (
                <div className="card" style={{ marginTop:12 }}>
                  <div className="card-header"><div className="card-title">Événements — {MOIS[mois]} {annee}</div></div>
                  {eventsThisMonth.sort((a,b)=>a.date.localeCompare(b.date)).map((e,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:36, height:36, borderRadius:6, background: e.is_indispo ? '#FFEBEE' : (e.couleur||'var(--pk-blue)')+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                        {e.is_indispo ? '🚫' : e.source==='google_calendar' ? '📅' : '✏️'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500 }}>{e.titre}</div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>
                          {e.date}{e.date_fin && e.date_fin !== e.date ? ` → ${e.date_fin}` : ''}
                          {e.client && <span style={{ color:'var(--pk-blue)', marginLeft:6 }}>· {e.client}</span>}
                          {e.source === 'google_calendar' && <span style={{ marginLeft:6, background:'#E8F5E9', color:'#2E7D32', padding:'1px 5px', borderRadius:6, fontSize:9, fontWeight:700 }}>GCAL</span>}
                          {e.is_indispo && <span style={{ marginLeft:6, background:'#FFEBEE', color:'#C62828', padding:'1px 5px', borderRadius:6, fontSize:9, fontWeight:700 }}>INDISPO → ZCAL BLOQUÉ</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(e)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:14, padding:'2px 6px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB DISPONIBILITÉS ── */}
          {tab === 'dispos' && (
            <div>
              <div className="card" style={{ marginBottom:14, background:'var(--pk-blue-light)', border:'1px solid var(--pk-blue)20', padding:'12px 16px' }}>
                <div style={{ fontSize:13, color:'var(--pk-blue)', fontWeight:600 }}>Comment fonctionnent les disponibilités</div>
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:6 }}>
                  Zcal lit directement ton Google Calendar pour afficher les créneaux disponibles.
                  Pour bloquer un créneau dans Zcal, crée une <strong>indisponibilité</strong> ici → l'event est envoyé à Google Calendar avec le statut "Occupé" (Busy) → Zcal le détecte et masque automatiquement le créneau.
                </div>
              </div>

              {/* Indisponibilités actives */}
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">🚫 Indisponibilités ({indispos.length})</div>
                    <div className="card-subtitle">Ces créneaux sont bloqués dans Zcal via Google Calendar</div>
                  </div>
                  <button className="btn btn-primary" style={{ fontSize:11 }} onClick={() => setShowAddIndispo(true)}>+ Indispo</button>
                </div>
                {indispos.length === 0
                  ? <div className="empty"><div className="empty-text">Aucune indisponibilité configurée. Zcal affiche tous vos créneaux libres.</div></div>
                  : indispos.sort((a,b) => a.date.localeCompare(b.date)).filter(e => e.date >= todayStr).map((e,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:40, height:40, borderRadius:8, background:'#FFEBEE', color:'#C62828', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🚫</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{e.titre}</div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>
                          {e.date}{e.date_fin && e.date_fin !== e.date ? ` → ${e.date_fin}` : ''}
                          {e.client && <span style={{ color:'var(--pk-blue)', marginLeft:6 }}>· {e.client}</span>}
                        </div>
                        <div style={{ fontSize:10, marginTop:2 }}>
                          <span style={{ background:'#FFEBEE', color:'#C62828', padding:'1px 6px', borderRadius:6, fontWeight:700 }}>ZCAL BLOQUÉ</span>
                          {e.source === 'google_calendar' && <span style={{ marginLeft:4, background:'#E8F5E9', color:'#2E7D32', padding:'1px 6px', borderRadius:6, fontWeight:700, fontSize:9 }}>SYNC GOOGLE CAL</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(e)} style={{ background:'none', border:'1px solid var(--danger)30', borderRadius:6, cursor:'pointer', color:'var(--danger)', fontSize:12, padding:'3px 8px' }}>Supprimer</button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── TAB RDV ZCAL ── */}
          {tab === 'rdvs' && (
            <div>
              <div className="card" style={{ marginBottom:12, padding:'10px 14px', background:'var(--success-light)', border:'1px solid var(--success)20' }}>
                <div style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>
                  ✅ Les RDV pris via Zcal apparaissent automatiquement dans ton Google Calendar et sont synchronisés ici après une sync.
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📞 RDV Zcal synchronisés</div>
                  <button className="btn" style={{ fontSize:11 }} onClick={syncGcal} disabled={syncing}>{syncing ? '⏳' : '🔄 Actualiser'}</button>
                </div>
                {zcalRdvs.length === 0
                  ? <div className="empty"><div className="empty-text">Aucun RDV détecté. Cliquez "🔄 Sync Google Calendar" pour charger les events.</div></div>
                  : zcalRdvs.sort((a,b) => a.date.localeCompare(b.date)).map((e,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:40, height:40, borderRadius:8, background:'var(--success-light)', color:'var(--success)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📞</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{e.titre}</div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>
                          {e.date}{e.date_fin && e.date_fin !== e.date ? ` → ${e.date_fin}` : ''}
                          {e.client && <span style={{ color:'var(--pk-blue)', marginLeft:6 }}>· {e.client}</span>}
                        </div>
                        {e.lieu && <div style={{ fontSize:11, color:'var(--text3)' }}>📍 {e.lieu}</div>}
                        {e.description && <div style={{ fontSize:11, color:'var(--text2)', fontStyle:'italic', marginTop:2 }}>{e.description.slice(0,100)}</div>}
                      </div>
                      <span style={{ background:'var(--success-light)', color:'var(--success)', padding:'3px 8px', borderRadius:8, fontSize:10, fontWeight:700, flexShrink:0 }}>RDV</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── TAB GUIDE ── */}
          {tab === 'guide' && (
            <div>
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header"><div className="card-title">⚙️ Architecture Zcal × Google Calendar × PauseKreyol</div></div>
                {[
                  { step:'1', titre:'Zcal prend les RDV', desc:'Zcal lit ton Google Calendar pour afficher tes disponibilités. Chaque RDV pris via Zcal est automatiquement ajouté dans Google Calendar.', status:'✅ Automatique' },
                  { step:'2', titre:'PauseKreyol lit Google Calendar', desc:'En cliquant "🔄 Sync", PauseKreyol récupère tous les events de ton Google Calendar (RDV Zcal + events culturels + indisponibilités).', status:'✅ Via scope calendar' },
                  { step:'3', titre:'Bloquer Zcal avec une Indispo', desc:'Crée une "🚫 Indispo" ici → l\'event est créé dans Google Calendar avec statut "Occupé" → Zcal détecte automatiquement ce créneau comme indisponible.', status:'✅ Sync descendante' },
                  { step:'4', titre:'Régénérer le token OAuth', desc:'Le scope Google Calendar doit être autorisé dans le token OAuth. Si la sync échoue, il faut régénérer le refresh_token avec le scope "calendar" ajouté.', status:'⚠️ Vérifier en prod' },
                  { step:'5', titre:'Calendrier Google Agenda perso', desc:'Pour synchroniser un agenda perso (indispos perso), configurer GOOGLE_CALENDAR_ID avec l\'ID de cet agenda dans les variables d\'environnement Railway.', status:'🔧 Config Railway' },
                ].map(({step, titre, desc, status}) => (
                  <div key={step} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--pk-blue)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{step}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{titre}</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>{desc}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--success)', flexShrink:0, alignSelf:'center', whiteSpace:'nowrap' }}>{status}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, padding:'10px 12px', background:'var(--warn-light)', borderRadius:8, fontSize:12, color:'var(--warn)' }}>
                  <strong>Variable env à ajouter dans Railway :</strong><br/>
                  <code>GOOGLE_CALENDAR_ID = primary</code> (ou l'ID d'un agenda secondaire)<br/>
                  <code>GMAIL_REFRESH_TOKEN</code> doit être régénéré avec le scope <code>calendar</code> en plus de <code>drive</code> et <code>gmail</code>.
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL INDISPONIBILITÉ ── */}
          {showAddIndispo && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAddIndispo(false)}>
              <div className="modal" style={{ maxWidth:480 }}>
                <div className="modal-title">🚫 Créer une indisponibilité</div>
                <div style={{ padding:'8px 12px', background:'#FFEBEE', borderRadius:8, marginBottom:14, fontSize:12, color:'#C62828' }}>
                  Ce créneau sera marqué "Occupé" dans Google Calendar → Zcal le bloquera automatiquement.
                </div>
                <div className="form-group">
                  <label className="form-label">Motif *</label>
                  <input className="form-input" value={newIndispo.titre} onChange={e => setNewIndispo(p=>({...p,titre:e.target.value}))} placeholder="Ex: Formation, Congés, RDV personnel..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date début *</label>
                    <input className="form-input" type="date" value={newIndispo.date} onChange={e => setNewIndispo(p=>({...p,date:e.target.value,date_fin:p.date_fin||e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date fin</label>
                    <input className="form-input" type="date" value={newIndispo.date_fin} onChange={e => setNewIndispo(p=>({...p,date_fin:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={newIndispo.all_day} onChange={e => setNewIndispo(p=>({...p,all_day:e.target.checked}))} />
                    Journée entière
                  </label>
                </div>
                {!newIndispo.all_day && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Heure début</label>
                      <input className="form-input" type="time" value={newIndispo.heure_debut} onChange={e => setNewIndispo(p=>({...p,heure_debut:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Heure fin</label>
                      <input className="form-input" type="time" value={newIndispo.heure_fin} onChange={e => setNewIndispo(p=>({...p,heure_fin:e.target.value}))} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Client associé (optionnel)</label>
                  <select className="form-input" value={newIndispo.client_slug} onChange={e => setNewIndispo(p=>({...p,client_slug:e.target.value}))}>
                    <option value="">— Aucun —</option>
                    {clients.filter(c=>!c.archived).map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowAddIndispo(false); setNewIndispo(EMPTY_INDISPO); }}>Annuler</button>
                  <button className="btn btn-primary" style={{ background:'var(--danger)', borderColor:'var(--danger)' }} onClick={createIndispo} disabled={!newIndispo.titre || !newIndispo.date}>
                    🚫 Bloquer dans Zcal →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL NOUVEL ÉVÉNEMENT ── */}
          {showAddEvent && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAddEvent(false)}>
              <div className="modal" style={{ maxWidth:460 }}>
                <div className="modal-title">📅 Ajouter un événement</div>
                <div className="form-group">
                  <label className="form-label">Titre *</label>
                  <input className="form-input" value={newEvent.titre} onChange={e => setNewEvent(p=>({...p,titre:e.target.value}))} placeholder="Intitulé de l'événement" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date début *</label>
                    <input className="form-input" type="date" value={newEvent.date} onChange={e => setNewEvent(p=>({...p,date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date fin</label>
                    <input className="form-input" type="date" value={newEvent.date_fin} onChange={e => setNewEvent(p=>({...p,date_fin:e.target.value}))} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input" value={newEvent.type} onChange={e => setNewEvent(p=>({...p,type:e.target.value}))}>
                      <option value="culturel">Culturel</option>
                      <option value="formalites">Formalités</option>
                      <option value="reunion">Réunion</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client</label>
                    <select className="form-input" value={newEvent.client_slug} onChange={e => setNewEvent(p=>({...p,client_slug:e.target.value}))}>
                      <option value="">— Aucun —</option>
                      {clients.filter(c=>!c.archived).map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowAddEvent(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={createEvent} disabled={!newEvent.titre || !newEvent.date}>Créer dans Google Calendar →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


