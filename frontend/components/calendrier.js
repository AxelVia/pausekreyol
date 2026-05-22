    // ── Calendriers ───────────────────────────────────────────────────────────────

    function CalendrierView({ alertes, clients, taches = [] }) {
      const [mois, setMois] = useState(new Date().getMonth());
      const [annee, setAnnee] = useState(new Date().getFullYear());
      const [events, setEvents] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_cal_events') || '[]'); } catch { return []; }
      });
      const [indispos, setIndispos] = useState([]);
      const [showIndispoForm, setShowIndispoForm] = useState(false);
      const [newIndispo, setNewIndispo] = useState({ titre: 'Indisponible', date_debut: '', date_fin: '', heure_debut: '', heure_fin: '' });
      const [showAdd, setShowAdd] = useState(false);
      const [showAddCal, setShowAddCal] = useState(null); // 'formalite' | 'culturel'
      const [selectedDay, setSelectedDay] = useState(null);
      const [filterClient, setFilterClient] = useState('tous');
      const [filterType, setFilterType] = useState('tous'); // 'tous' | 'formalite' | 'culturel' | 'tache' | 'planning'
      const [newEvent, setNewEvent] = useState({ titre: '', type: 'formalite', client: '', couleur: '#FF795A', note: '' });

      // Charge les indisponibilités depuis l'API
      useEffect(() => {
        fetch(`${API}/gcal/indisponibilites`).then(r => r.ok ? r.json() : []).then(d => {
          setIndispos(Array.isArray(d) ? d : []);
        }).catch(() => {});
      }, []);

      // Charge les events depuis l'API pour avoir les events injectés par les audits
      useEffect(() => {
        const fetchEvents = async () => {
          try {
            const [calRes, planRes] = await Promise.all([
              fetch(`${API}/calendrier/events`).catch(() => null),
              fetch(`${API}/planning-events`).catch(() => null),
            ]);
            const planEvents = planRes?.ok ? await planRes.json() : [];
            if (planEvents.length > 0) {
              setEvents(prev => {
                const ids = new Set(prev.map(e => String(e.id)));
                const news = planEvents.filter(e => !ids.has(String(e.id)));
                return [...prev, ...news];
              });
            }
          } catch {}
        };
        fetchEvents();
      }, []);

      function saveEvents(evts) {
        setEvents(evts);
        try { localStorage.setItem('pk_cal_events', JSON.stringify(evts)); } catch { }
      }
      function addEvent(calType) {
        if (!newEvent.titre || !selectedDay) return;
        const evt = { id: Date.now(), date: selectedDay, ...newEvent, type: calType, created_at: new Date().toISOString() };
        fetch(`${API}/calendrier/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evt) }).catch(() => { });
        saveEvents([...events, evt]);
        setShowAdd(false);
        setNewEvent({ titre: '', type: calType, client: '', couleur: '#FF795A', note: '' });
      }
      function removeEvent(id) {
        fetch(`${API}/calendrier/event/${id}`, { method: 'DELETE' }).catch(() => { });
        saveEvents(events.filter(e => e.id !== id));
      }

      // Événements auto depuis alertes conformité → formalités
      function getAutoEvents() {
        return (alertes || []).filter(a => a.date_expiration).map(a => ({
          id: `auto_${a.organisme}_${a.client}`,
          date: a.date_expiration,
          titre: `${a.organisme} — ${a.client}`,
          type: 'formalite',
          couleur: a.statut === 'EXPIRÉ' ? '#B71C1C' : a.statut === 'URGENT' ? '#E65100' : '#2834B7',
          auto: true, statut: a.statut,
        }));
      }

      // Tâches avec deadline et calendrier assigné
      const tachesFormalite = taches.filter(t => !t.done && t.deadline && t.calendrier === 'formalite');
      const tachesCulturel = taches.filter(t => !t.done && t.deadline && t.calendrier === 'culturel');
      // Tâches sans calendrier mais avec deadline → formalités par défaut si pas culturel
      const tachesSansCalAvecDL = taches.filter(t => !t.done && t.deadline && !t.calendrier);

      const allAutoEvents = getAutoEvents();
      // Filtre par client
      function filterEvt(e) {
        if (filterClient !== 'tous') {
          const clientMatch = e.client_slug === filterClient || e.client === filterClient ||
            (clients || []).find(c => c.slug === filterClient)?.nom === e.client;
          if (!clientMatch) return false;
        }
        return true;
      }
      const allAutoEventsFiltered = allAutoEvents.filter(filterEvt);
      const eventsFiltered = events.filter(filterEvt);
      const tachesFiltered = taches.filter(t => {
        if (filterType === 'tache' || filterType === 'tous') {
          if (filterClient === 'tous') return true;
          return t.client_slug === filterClient || t.client_detecte === (clients||[]).find(c=>c.slug===filterClient)?.nom;
        }
        return false;
      });
      const allAutoEvents_ = filterType === 'tous' || filterType === 'formalite' ? allAutoEventsFiltered : [];
      // Indisponibilités → affichées en formalités avec style spécial
      const indispoEvents = (filterType === 'tous' || filterType === 'formalite') ? indispos.map(ind => ({
        id: `indispo_${ind.id}`,
        date: ind.date,
        titre: `🚫 ${ind.titre}`,
        type: 'indisponibilite',
        couleur: '#D50000',
        isIndispo: true,
      })) : [];

      const eventsFormalite = [...allAutoEvents_, ...indispoEvents, ...eventsFiltered.filter(e => e.type === 'formalite'), ...tachesFormalite.map(t => ({
        id: `tache_${t.id}`, date: t.deadline, titre: `📌 ${t.titre}`, type: 'formalite',
        couleur: t.priorite === 'URGENT' ? '#B71C1C' : t.priorite === 'Attention' ? '#E65100' : '#2834B7',
        isTache: true, client: t.client_detecte,
      })), ...tachesSansCalAvecDL.map(t => ({
        id: `tache_nc_${t.id}`, date: t.deadline, titre: `📌 ${t.titre}`, type: 'formalite',
        couleur: '#9898B0', isTache: true, client: t.client_detecte,
      }))];

      const eventsCulturel = [...events.filter(e => e.type !== 'formalite'), ...tachesCulturel.map(t => ({
        id: `tache_c_${t.id}`, date: t.deadline, titre: `📌 ${t.titre}`, type: 'culturel',
        couleur: '#FF795A', isTache: true, client: t.client_detecte,
      }))];

      const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

      function prevMois() { if (mois === 0) { setMois(11); setAnnee(a => a - 1); } else setMois(m => m - 1); }
      function nextMois() { if (mois === 11) { setMois(0); setAnnee(a => a + 1); } else setMois(m => m + 1); }

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const firstDayAdj = (new Date(annee, mois, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(annee, mois + 1, 0).getDate();

      function dayStr(d) { return `${annee}-${String(mois + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
      function eventsForDay(allEvts, d) {
        const ds = dayStr(d);
        return allEvts.filter(e => e.date === ds || e.date?.startsWith(ds));
      }

      function MiniCalendrier({ title, allEvents, color, calType, addLabel }) {
        return (
          <div className="card" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px', background: color, borderColor: color }}
                  onClick={() => { setShowAddCal(calType); setShowAdd(true); setSelectedDay(todayStr); }}>
                  + Ajouter
                </button>
                {calType === 'culturel' && (
                  <button className="btn" style={{ fontSize: 10, padding: '3px 6px', color: '#D50000', borderColor: '#D50000' }}
                    onClick={() => { setNewIndispo(p => ({...p, date_debut: todayStr, date_fin: todayStr})); setShowIndispoForm(true); }}
                    title="Bloquer ce créneau dans Zcal">
                    🚫
                  </button>
                )}
              </div>
            </div>

            {/* Navigation mois commune */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={prevMois}>←</button>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{MOIS_LABELS[mois]} {annee}</span>
              <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={nextMois}>→</button>
            </div>

            {/* Jours semaine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 3 }}>
              {JOURS.map(j => <div key={j} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text3)', padding: '2px 0' }}>{j}</div>)}
            </div>

            {/* Grille */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
              {Array(firstDayAdj).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const ds = dayStr(d);
                const dayEvts = eventsForDay(allEvents, d);
                const isToday = ds === todayStr;
                return (
                  <div key={d} onClick={() => { setSelectedDay(ds); setShowAddCal(calType); setShowAdd(true); }}
                    style={{
                      minHeight: 38, padding: '2px 3px', borderRadius: 4, cursor: 'pointer',
                      background: isToday ? color : dayEvts.length > 0 ? color + '18' : 'var(--surface2)',
                      border: isToday ? 'none' : dayEvts.length > 0 ? `1px solid ${color}30` : '1px solid transparent',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'white' : 'var(--text)', marginBottom: 1 }}>{d}</div>
                    {dayEvts.slice(0, 2).map((e, ei) => (
                      <div key={ei} style={{ fontSize: 8, background: e.couleur || color, color: 'white', borderRadius: 2, padding: '1px 2px', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.isTache ? '📌' : ''}{e.titre?.slice(0, 12)}
                      </div>
                    ))}
                    {dayEvts.length > 2 && <div style={{ fontSize: 8, color: 'var(--text3)' }}>+{dayEvts.length - 2}</div>}
                  </div>
                );
              })}
            </div>

            {/* Événements du mois */}
            <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
              {allEvents
                .filter(e => e.date?.startsWith(`${annee}-${String(mois + 1).padStart(2, '0')}`))
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((e, i) => (
                  <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.couleur || color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: e.isTache ? 500 : 400 }}>{e.date?.slice(8, 10)}/{e.date?.slice(5, 7)} — {e.titre}</span>
                      {e.client && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 4 }}>({e.client})</span>}
                    </div>
                    {!e.auto && !e.isTache && (
                      <button onClick={() => removeEvent(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>✕</button>
                    )}
                  </div>
                ))}
              {allEvents.filter(e => e.date?.startsWith(`${annee}-${String(mois + 1).padStart(2, '0')}`)).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '10px 0' }}>Aucun événement ce mois</div>
              )}
            </div>
          </div>
        );
      }

      return (
        <div>
          {/* 2 calendriers côte à côte */}
          {/* Filtres */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <select className="form-input" style={{ fontSize:12, padding:'4px 8px', width:'auto' }}
              value={filterClient} onChange={e => setFilterClient(e.target.value)}>
              <option value="tous">Tous les clients</option>
              {(clients||[]).filter(c=>!c.archived).map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
            </select>
            <select className="form-input" style={{ fontSize:12, padding:'4px 8px', width:'auto' }}
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="tous">Tous types</option>
              <option value="formalite">Formalités</option>
              <option value="culturel">Culturel</option>
              <option value="tache">Tâches</option>
              <option value="planning">Planning prévisionnel</option>
            </select>
            {(filterClient !== 'tous' || filterType !== 'tous') && (
              <button className="btn" style={{ fontSize:11 }} onClick={() => { setFilterClient('tous'); setFilterType('tous'); }}>✕ Réinitialiser</button>
            )}
            {filterClient !== 'tous' && (
              <span style={{ fontSize:12, color:'var(--pk-blue)', fontWeight:500 }}>
                📌 {(clients||[]).find(c=>c.slug===filterClient)?.nom}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <MiniCalendrier
              title="📋 Formalités & Échéances"
              allEvents={eventsFormalite}
              color="#2834B7"
              calType="formalite"
              addLabel="+ Formalité"
            />
            <MiniCalendrier
              title="🎭 Calendrier Culturel"
              allEvents={eventsCulturel}
              color="#FF795A"
              calType="culturel"
              addLabel="+ Événement"
            />
          </div>

          {/* À venir toutes catégories */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Prochaines échéances & tâches</div>
            </div>
            {(() => {
              const all = [...eventsFormalite, ...eventsCulturel]
                .filter(e => e.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 10);
              if (!all.length) return <div className="empty"><div className="empty-text">Aucune échéance à venir.</div></div>;
              return all.map((e, i) => {
                const d = new Date(e.date + 'T00:00:00');
                const diff = Math.round((d - today) / 86400000);
                const isFormalite = e.type === 'formalite';
                return (
                  <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.couleur || (isFormalite ? '#2834B7' : '#FF795A'), flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{e.titre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {isFormalite ? '📋 Formalités' : '🎭 Culturel'}
                        {e.client && ` · ${e.client}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: diff <= 3 ? 'var(--danger)' : diff <= 7 ? 'var(--warn)' : 'var(--text3)', flexShrink: 0 }}>
                      {diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : `J-${diff}`}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Modal ajout */}
          {showAdd && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
              <div className="modal">
                <div className="modal-title">{showAddCal === 'culturel' ? '🎭 Ajouter un événement culturel' : '📋 Ajouter une formalité'}</div>
                <div className="modal-sub">Date : {selectedDay?.split('-').reverse().join('/')}</div>
                <div className="form-group">
                  <label className="form-label">Titre *</label>
                  <input className="form-input" value={newEvent.titre} onChange={e => setNewEvent(p => ({ ...p, titre: e.target.value }))} autoFocus
                    placeholder={showAddCal === 'culturel' ? "Festival, concert, répétition..." : "Renouvellement licence, URSSAF..."} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input" value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))}>
                      {showAddCal === 'formalite' ? <>
                        <option value="formalite">Formalité administrative</option>
                        <option value="deadline">Deadline / Date limite</option>
                        <option value="rdv">Rendez-vous</option>
                      </> : <>
                        <option value="culturel">Événement culturel</option>
                        <option value="festival">Festival / Spectacle</option>
                        <option value="formation">Formation / Résidence</option>
                        <option value="rdv">Rendez-vous</option>
                      </>}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client associé</label>
                    <select className="form-input" value={newEvent.client} onChange={e => setNewEvent(p => ({ ...p, client: e.target.value }))}>
                      <option value="">— Aucun —</option>
                      {(clients || []).map(c => <option key={c.slug} value={c.nom}>{c.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(showAddCal === 'culturel'
                      ? ['#FF795A', '#2834B7', '#B71C1C', '#1B5E20', '#6A1B9A', '#FFD2AD']
                      : ['#2834B7', '#FF795A', '#B71C1C', '#E65100', '#1B5E20', '#6A1B9A']
                    ).map(c => (
                      <div key={c} onClick={() => setNewEvent(p => ({ ...p, couleur: c }))}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                          border: newEvent.couleur === c ? '3px solid var(--text)' : '2px solid transparent'
                        }} />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input className="form-input" value={newEvent.note} onChange={e => setNewEvent(p => ({ ...p, note: e.target.value }))} placeholder="Détails..." />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowAdd(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={() => addEvent(showAddCal)} disabled={!newEvent.titre}>Ajouter →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

