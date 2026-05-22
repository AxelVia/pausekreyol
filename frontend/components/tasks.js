    // ── Tâches view ───────────────────────────────────────────────────────────────

    function TachesView({ taches, setTaches, setView, setSelectedClient }) {
      const [mainTab, setMainTab] = useState('taches'); // 'taches' | 'memos'
      const [filterStatut, setFilterStatut] = useState('pending');
      const [filterCategorie, setFilterCategorie] = useState('all');
      const [filterClient, setFilterClient] = useState('all');
      const [search, setSearch] = useState('');
      const [showNew, setShowNew] = useState(false);
      const [offres, setOffres] = useState([]);
      const [newTask, setNewTask] = useState({ titre: '', description: '', priorite: 'Normal', categorie: 'admin', client_detecte: '', deadline: '', calendrier: '', offre_id: '', valeur: '', temps_estime_dj: '', bloquer_zcal: false, checklist_items: [] });

      // Catégories avec couleurs et icônes
      const CATEGORIES = {
        finance: { label: 'Finance', icon: '💰', color: '#1B5E20', bg: '#E8F5E9' },
        gestion_client: { label: 'Gestion client', icon: '👥', color: '#1565C0', bg: '#E3F2FD' },
        subvention: { label: 'Subvention', icon: '🏛', color: '#6A1B9A', bg: '#F3E5F5' },
        admin: { label: 'Admin', icon: '📋', color: '#E65100', bg: '#FFF3E0' },
        comm: { label: 'Comm', icon: '📣', color: '#00695C', bg: '#E0F2F1' },
        devis: { label: 'Devis', icon: '📝', color: '#5D4037', bg: '#EFEBE9' },
        facture: { label: 'Facture', icon: '🧾', color: '#37474F', bg: '#ECEFF1' },
        manuel: { label: 'Manuel', icon: '✏️', color: '#546E7A', bg: '#ECEFF1' },
        relance_devis: { label: 'Relance devis', icon: '🔔', color: '#F57F17', bg: '#FFFDE7' },
        relance_facture: { label: 'Relance paiement', icon: '⚠️', color: '#B71C1C', bg: '#FFEBEE' },
        acompte: { label: 'Acompte', icon: '💳', color: '#1565C0', bg: '#E3F2FD' },
        validation: { label: 'Validation', icon: '✅', color: '#2E7D32', bg: '#E8F5E9' },
        archivage: { label: 'Archivage', icon: '📦', color: '#455A64', bg: '#ECEFF1' },
      };

      function catFor(t) {
        if (t.type && CATEGORIES[t.type]) return t.type;
        if (t.categorie && CATEGORIES[t.categorie]) return t.categorie;
        // Détection automatique depuis source/type
        if (t.type === 'validation_import') return 'gestion_client';
        if (t.type === 'sync_excel') return 'admin';
        if (t.source === 'Gmail') return 'gestion_client';
        if (t.source === 'Facture') return 'facture';
        if (t.source === 'Devis') return 'devis';
        if (t.source === 'Faisabilité') return 'subvention';
        if (t.source === 'Création client') return 'gestion_client';
        return 'admin';
      }

      // Filtre
      const clientsUniques = [...new Set(taches.filter(t => t.client_detecte).map(t => t.client_detecte))].sort();

      const filtered = taches.filter(t => {
        const statutOk = filterStatut === 'all' ? true : filterStatut === 'pending' ? !t.done : t.done;
        const catOk = filterCategorie === 'all' ? true : catFor(t) === filterCategorie;
        const clientOk = filterClient === 'all' ? true : t.client_detecte === filterClient;
        const searchOk = !search || [t.titre, t.client_detecte, t.description, t.projet_nom].some(v => v?.toLowerCase().includes(search.toLowerCase()));
        return statutOk && catOk && clientOk && searchOk;
      }).sort((a, b) => {
        // Tri : URGENT d'abord, puis par deadline
        const prio = { 'URGENT': 0, 'Attention': 1, 'Normal': 2 };
        if (!a.done && !b.done) {
          const pd = (prio[a.priorite] || 2) - (prio[b.priorite] || 2);
          if (pd !== 0) return pd;
          if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
          if (a.deadline) return -1;
          if (b.deadline) return 1;
        }
        return 0;
      });

      // Compte par catégorie (non terminées)
      const countsByCat = {};
      taches.filter(t => !t.done).forEach(t => {
        const c = catFor(t);
        countsByCat[c] = (countsByCat[c] || 0) + 1;
      });

      function markDone(id) {
        const task = taches.find(t => t.id === id);
        // Bloquer si checklist incomplète
        if (task && (task.checklist_items || []).some(ci => !ci.done)) {
          const remaining = (task.checklist_items || []).filter(ci => !ci.done).length;
          alert(`⚠️ Checklist incomplète !\n\n${remaining} étape(s) non cochée(s). Veuillez compléter la checklist avant de valider la tâche.`);
          return;
        }
        const now = new Date().toISOString().slice(0, 10);
        setTaches(prev => prev.map(t => t.id === id ? { ...t, done: true, done_at: now } : t));
        if (task) fetch(`${API}/taches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: true, done_at: now }) }).catch(() => { });
      }

      function markUndone(id) {
        setTaches(prev => prev.map(t => t.id === id ? { ...t, done: false } : t));
        const task = taches.find(t => t.id === id);
        if (task) fetch(`${API}/taches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: false }) }).catch(() => { });
      }

      function decalerDeadline(id, newDate) {
        setTaches(prev => prev.map(t => t.id === id ? { ...t, deadline: newDate } : t));
        fetch(`${API}/taches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline: newDate }) }).catch(() => { });
      }

      const [editingDeadline, setEditingDeadline] = useState(null); // task id en cours d'édition deadline

      // Charge la liste clients pour le sélecteur arborescent
      useEffect(() => {
        fetch(`${API}/offres`).then(r => r.ok ? r.json() : []).then(setOffres).catch(() => {});
        fetch(`${API}/clients`)
          .then(r => r.json())
          .then(clients => {
            // Charge aussi les projets de chaque client
            Promise.all(clients.map(c =>
              fetch(`${API}/clients/${c.slug}`).then(r => r.ok ? r.json() : null).catch(() => null)
            )).then(details => {
              window._tachesClients = clients.map((c, i) => ({
                ...c,
                projets: details[i]?.projets || [],
              }));
            });
          })
          .catch(() => { });
      }, []);

      async function createTask() {
        if (!newTask.titre) return;
        try {
          // Exclure les items que l'utilisatrice a décochés
          const payload = {
            ...newTask,
            checklist_items: (newTask.checklist_items || []).filter(ci => !ci._excluded).map(ci => ({ label: ci.label, done: false })),
          };
          const res = await fetch(`${API}/taches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const t = await res.json();
            setTaches(prev => [t, ...prev]);
            setShowNew(false);
            setNewTask({ titre: '', description: '', priorite: 'Normal', categorie: 'admin', client_detecte: '', deadline: '', calendrier: '', offre_id: '', valeur: '', temps_estime_dj: '', bloquer_zcal: false, checklist_items: [] });
          }
        } catch { }
      }

      async function toggleChecklistItem(taskId, itemIdx) {
        const task = taches.find(t => t.id === taskId);
        if (!task) return;
        const newItems = (task.checklist_items || []).map((ci, i) => i === itemIdx ? { ...ci, done: !ci.done } : ci);
        setTaches(prev => prev.map(t => t.id === taskId ? { ...t, checklist_items: newItems } : t));
        await fetch(`${API}/taches/${taskId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checklist_items: newItems }),
        }).catch(() => {});
      }

      const urgentCount = taches.filter(t => !t.done && t.priorite === 'URGENT').length;

      async function exportDone() {
        try {
          const url = `${API}/taches/export`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Erreur export');
          const blob = await res.blob();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'taches_terminees.csv';
          a.click();
        } catch (e) { alert('Erreur lors de l\'export : ' + e.message); }
      }

      return (
        <div>
          {/* Onglets principaux Tâches / Mémo */}
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={`tab ${mainTab === 'taches' ? 'active' : ''}`} onClick={() => setMainTab('taches')}>
              ✅ Tâches {urgentCount > 0 && <span style={{ background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, marginLeft: 4 }}>{urgentCount}</span>}
            </button>
            <button className={`tab ${mainTab === 'memos' ? 'active' : ''}`} onClick={() => setMainTab('memos')}>
              📝 Mémo
            </button>
          </div>

          {mainTab === 'memos' && <MemosView />}

          {mainTab === 'taches' && (<div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Tâches
                {urgentCount > 0 && <span style={{ marginLeft: 8, background: 'var(--danger)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{urgentCount} urgentes</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} tâche(s) affichée(s)</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 160 }} />
              <select className="form-input" style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}
                value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                <option value="all">Tous clients</option>
                {clientsUniques.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {filterStatut === 'done' && (
                <button className="btn" style={{ fontSize: 12 }} onClick={exportDone} title="Exporter CSV">📊 Export</button>
              )}
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(true)}>+ Nouvelle tâche</button>
            </div>
          </div>

          {/* Filtres catégorie — chips horizontaux */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              onClick={() => setFilterCategorie('all')}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: filterCategorie === 'all' ? 'var(--accent)' : 'var(--surface)',
                color: filterCategorie === 'all' ? 'white' : 'var(--text2)',
                borderColor: filterCategorie === 'all' ? 'var(--accent)' : 'var(--border2)',
              }}>
              Toutes {filterStatut === 'pending' && `(${taches.filter(t => !t.done).length})`}
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = countsByCat[key] || 0;
              if (count === 0 && filterStatut === 'pending') return null;
              return (
                <button key={key}
                  onClick={() => setFilterCategorie(key)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: filterCategorie === key ? cat.color : cat.bg,
                    color: filterCategorie === key ? 'white' : cat.color,
                    borderColor: cat.color + '40',
                  }}>
                  {cat.icon} {cat.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Filtres statut */}
          <div className="tabs" style={{ marginBottom: 14 }}>
            {[['pending', 'En cours'], ['all', 'Toutes'], ['done', 'Terminées']].map(([k, l]) => (
              <button key={k} className={`tab ${filterStatut === k ? 'active' : ''}`} onClick={() => setFilterStatut(k)}>{l}</button>
            ))}
          </div>

          {/* Liste */}
          <div className="card">
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-icon">✅</div>
                <div className="empty-text">{filterStatut === 'pending' ? 'Aucune tâche en cours dans cette catégorie.' : 'Aucune tâche.'}</div>
              </div>
            )}
            {filtered.map(t => {
              const cat = CATEGORIES[catFor(t)] || CATEGORIES.admin;
              return (
                <div key={t.id} className="task-row" style={{ alignItems: 'flex-start', padding: '12px 0', opacity: t.done ? 0.5 : 1 }}>
                  <div className="task-body" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ background: cat.bg, color: cat.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>
                        {cat.icon} {cat.label}
                      </span>
                      {!t.done && t.priorite === 'URGENT' && (
                        <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>URGENT</span>
                      )}
                      {!t.done && t.priorite === 'Attention' && (
                        <span style={{ background: 'var(--warn-light)', color: 'var(--warn)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>Attention</span>
                      )}
                      {t.done && <span style={{ background: 'var(--success-light)', color: 'var(--success)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>✅ Terminée</span>}
                    </div>
                    <div className="task-title" style={{ textDecoration: t.done ? 'line-through' : 'none', marginBottom: 3 }}>{t.titre}</div>
                    <div className="task-meta">
                      {t.client_detecte && <span style={{ fontWeight: 500 }}>{t.client_detecte}</span>}
                      {t.projet_nom && <span style={{ color: 'var(--pk-blue)' }}> › {t.projet_nom}</span>}
                      {(t.client_detecte || t.projet_nom) && <span> · </span>}
                      <span>{t.source}</span>
                      {t.deadline && (
                        editingDeadline === t.id ? (
                          <span style={{ marginLeft: 6 }}>
                            <input type="date" defaultValue={t.deadline} autoFocus
                              style={{ fontSize: 11, padding: '1px 4px', border: '1px solid var(--border2)', borderRadius: 4 }}
                              onBlur={e => { decalerDeadline(t.id, e.target.value); setEditingDeadline(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { decalerDeadline(t.id, e.target.value); setEditingDeadline(null); } if (e.key === 'Escape') setEditingDeadline(null); }}
                            />
                          </span>
                        ) : (
                          <span
                            onClick={() => !t.done && setEditingDeadline(t.id)}
                            style={{ marginLeft: 6, cursor: t.done ? 'default' : 'pointer', color: 'var(--text2)' }}
                            title={t.done ? '' : 'Cliquer pour décaler'}
                          >
                            ⏰ {t.deadline}
                            {!t.done && <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 3 }}>✎</span>}
                          </span>
                        )
                      )}
                      {t.calendrier && (
                        <span style={{ marginLeft: 6, background: t.calendrier === 'culturel' ? '#E8F5E9' : 'var(--pk-blue-light)', color: t.calendrier === 'culturel' ? '#1B5E20' : 'var(--pk-blue)', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8 }}>
                          {t.calendrier === 'culturel' ? '🎭 Culturel' : '📋 Formalités'}
                        </span>
                      )}
                    </div>
                    {t.description && !t.done && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>
                        {t.description.slice(0, 120)}{t.description.length > 120 ? '…' : ''}
                      </div>
                    )}
                    {/* Checklist */}
                    {!t.done && (t.checklist_items || []).length > 0 && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
                        {(() => {
                          const total = t.checklist_items.length;
                          const done = t.checklist_items.filter(ci => ci.done).length;
                          const pct = Math.round((done / total) * 100);
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: done === total ? 'var(--success)' : 'var(--text2)' }}>
                                  ☑️ Checklist : {done}/{total}
                                </span>
                                <span style={{ fontSize: 11, color: done === total ? 'var(--success)' : 'var(--text3)' }}>{pct}%</span>
                              </div>
                              <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2, marginBottom: 8 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: done === total ? 'var(--success)' : 'var(--pk-blue)', borderRadius: 2, transition: 'width 0.3s' }} />
                              </div>
                              {t.checklist_items.map((ci, idx) => (
                                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, cursor: 'pointer', color: ci.done ? 'var(--text3)' : 'var(--text1)', textDecoration: ci.done ? 'line-through' : 'none' }}>
                                  <input type="checkbox" checked={!!ci.done} onChange={() => toggleChecklistItem(t.id, idx)} />
                                  {ci.label}
                                </label>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, marginTop: 2 }}>
                    {!t.done ? (
                      <>
                        {(() => {
                          const checklistIncomplete = (t.checklist_items || []).length > 0 && (t.checklist_items || []).some(ci => !ci.done);
                          return (
                            <button
                              onClick={() => markDone(t.id)}
                              title={checklistIncomplete ? 'Checklist incomplète — terminez toutes les étapes' : ''}
                              style={{ fontSize: 11, padding: '3px 10px', background: checklistIncomplete ? 'var(--warn-light)' : 'var(--success-light)', color: checklistIncomplete ? 'var(--warn)' : 'var(--success)', border: `1px solid ${checklistIncomplete ? 'var(--warn)' : '#86efac'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >{checklistIncomplete ? '⚠️ Checklist' : '✅ Fait'}</button>
                          );
                        })()}
                        {t.client_slug && setView && setSelectedClient && (
                          <button
                            onClick={() => { setSelectedClient(t.client_slug); setView('clients'); }}
                            style={{ fontSize: 11, padding: '3px 10px', background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', border: '1px solid var(--pk-blue)30', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >👤 Client</button>
                        )}
                        {!t.deadline && (
                          <button
                            onClick={() => setEditingDeadline(t.id)}
                            style={{ fontSize: 11, padding: '3px 10px', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >⏰ Deadline</button>
                        )}
                        {t.deadline && (
                          <button
                            onClick={() => setEditingDeadline(t.id)}
                            style={{ fontSize: 11, padding: '3px 10px', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >📅 Décaler</button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => markUndone(t.id)}
                        style={{ fontSize: 11, padding: '3px 10px', background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                      >↩ Rouvrir</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal nouvelle tâche */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
              <div className="modal">
                <div className="modal-title">✏️ Nouvelle tâche</div>

                <div className="form-group">
                  <label className="form-label">Titre *</label>
                  <input className="form-input" value={newTask.titre} onChange={e => setNewTask(p => ({ ...p, titre: e.target.value }))}
                    placeholder="Relancer HOB pour les statuts..." autoFocus />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Catégorie</label>
                    <select className="form-input" value={newTask.categorie} onChange={e => setNewTask(p => ({ ...p, categorie: e.target.value }))}>
                      {Object.entries(CATEGORIES).filter(([k]) => ['finance', 'gestion_client', 'subvention', 'admin', 'comm', 'devis', 'facture', 'manuel'].includes(k)).map(([k, cat]) => (
                        <option key={k} value={k}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priorité</label>
                    <select className="form-input" value={newTask.priorite} onChange={e => setNewTask(p => ({ ...p, priorite: e.target.value }))}>
                      <option value="Normal">Normal</option>
                      <option value="Attention">Attention</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Client associé</label>
                  <select className="form-input" value={newTask.client_slug || ''}
                    onChange={e => {
                      const c = (window._tachesClients || []).find(x => x.slug === e.target.value);
                      setNewTask(p => ({ ...p, client_slug: e.target.value, client_detecte: c?.nom || '', projet_slug: '', projet_nom: '' }));
                    }}>
                    <option value="">— Aucun client —</option>
                    {(window._tachesClients || []).map(c => (
                      <option key={c.slug} value={c.slug}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Projet — arborescence du client sélectionné */}
                {newTask.client_slug && (() => {
                  const client = (window._tachesClients || []).find(c => c.slug === newTask.client_slug);
                  const projets = client?.projets || [];
                  if (!projets.length) return null;
                  return (
                    <div className="form-group">
                      <label className="form-label">Projet associé (optionnel)</label>
                      <select className="form-input" value={newTask.projet_slug || ''}
                        onChange={e => {
                          const p = projets.find(x => x.slug === e.target.value);
                          setNewTask(prev => ({ ...prev, projet_slug: e.target.value, projet_nom: p?.nom || '' }));
                        }}>
                        <option value="">— Projet général du client —</option>
                        {projets.map(p => (
                          <option key={p.slug} value={p.slug}>{p.nom}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input className="form-input" type="date" value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calendrier</label>
                    <select className="form-input" value={newTask.calendrier || ''} onChange={e => setNewTask(p => ({ ...p, calendrier: e.target.value }))}>
                      <option value="">— Aucun —</option>
                      <option value="formalite">📋 Formalités & Échéances</option>
                      <option value="culturel">🎭 Calendrier Culturel</option>
                    </select>
                  </div>
                </div>
                {newTask.calendrier && !newTask.deadline && (
                  <div style={{ fontSize: 11, color: 'var(--warn)', marginBottom: 8 }}>⚠️ Ajoutez une deadline pour que la tâche apparaisse sur le calendrier.</div>
                )}

                {/* Offre & valorisation */}
                <div className="form-group">
                  <label className="form-label">Offre associée (optionnel)</label>
                  <select className="form-input" value={newTask.offre_id || ''}
                    onChange={e => {
                      const o = offres.find(x => x.id === e.target.value);
                      // Pré-sélectionne toute la checklist de l'offre
                      const checklistItems = (o?.checklist || []).map(label => ({ label, done: false }));
                      setNewTask(p => ({
                        ...p,
                        offre_id: e.target.value,
                        valeur: o ? String(o.prix) : p.valeur,
                        temps_estime_dj: o ? String(o.temps_dj) : p.temps_estime_dj,
                        checklist_items: checklistItems,
                      }));
                    }}>
                    <option value="">— Sélectionner une offre —</option>
                    {offres.filter(o => o.actif !== false).map(o => (
                      <option key={o.id} value={o.id}>{o.nom} — {o.prix} € · {o.temps_dj} demi-j.</option>
                    ))}
                  </select>
                </div>
                {/* Checklist de l'offre — sélection des items à inclure */}
                {newTask.offre_id && newTask.checklist_items.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">☑️ Checklist pour cette tâche</label>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Décochez les étapes qui ne s'appliquent pas à cette tâche spécifique.</div>
                    {newTask.checklist_items.map((ci, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', marginBottom: 3, background: 'var(--surface2)', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={!ci._excluded}
                          onChange={e => setNewTask(p => ({ ...p, checklist_items: p.checklist_items.map((x, j) => j === i ? { ...x, _excluded: !e.target.checked } : x) }))} />
                        {ci.label}
                      </label>
                    ))}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      {newTask.checklist_items.filter(ci => !ci._excluded).length} étape(s) sélectionnée(s) sur {newTask.checklist_items.length}
                    </div>
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Valeur (€)</label>
                    <input className="form-input" type="number" min="0" step="0.01"
                      value={newTask.valeur || ''} onChange={e => setNewTask(p => ({ ...p, valeur: e.target.value }))}
                      placeholder="Tarif de la prestation" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temps estimé (demi-journées)</label>
                    <input className="form-input" type="number" min="0.5" step="0.5"
                      value={newTask.temps_estime_dj || ''} onChange={e => setNewTask(p => ({ ...p, temps_estime_dj: e.target.value }))}
                      placeholder="0.5 = demi-journée" />
                  </div>
                </div>
                {newTask.temps_estime_dj && newTask.deadline && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!newTask.bloquer_zcal}
                      onChange={e => setNewTask(p => ({ ...p, bloquer_zcal: e.target.checked }))} />
                    🚫 Bloquer automatiquement le temps dans Zcal & Disponibilités
                  </label>
                )}

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={newTask.description}
                    onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    placeholder="Détails, contexte, liens utiles..." style={{ resize: 'vertical' }} />
                </div>

                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowNew(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={createTask} disabled={!newTask.titre}>Créer →</button>
                </div>
              </div>
            </div>
          )}
        </div>)} {/* fin mainTab === 'taches' */}
        </div>
      );
    }

    // ── Mémos view ───────────────────────────────────────────────────────────────

    function MemosView() {
      const [memos, setMemos] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [editMemo, setEditMemo] = useState(null);
      const [search, setSearch] = useState('');
      const EMPTY = { titre: '', contenu: '', couleur: '#FFFDE7' };
      const [form, setForm] = useState(EMPTY);

      const COULEURS = [
        '#FFFDE7', '#E8F5E9', '#E3F2FD', '#FCE4EC', '#F3E5F5', '#FFF3E0', '#E0F2F1', '#FAFAFA',
      ];

      useEffect(() => {
        fetch(`${API}/memos`).then(r => r.ok ? r.json() : []).then(setMemos).catch(() => {});
      }, []);

      const filtered = memos.filter(m => !m.archive && (!search || [m.titre, m.contenu].some(v => v?.toLowerCase().includes(search.toLowerCase()))));

      async function saveMemo() {
        if (!form.titre && !form.contenu) return;
        try {
          if (editMemo) {
            const res = await fetch(`${API}/memos/${editMemo.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            if (res.ok) {
              const updated = await res.json();
              setMemos(p => p.map(m => m.id === editMemo.id ? updated : m));
            }
          } else {
            const res = await fetch(`${API}/memos`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            if (res.ok) {
              const created = await res.json();
              setMemos(p => [created, ...p]);
            }
          }
        } catch {}
        setShowNew(false);
        setEditMemo(null);
        setForm(EMPTY);
      }

      async function deleteMemo(id) {
        if (!window.confirm('Supprimer ce mémo ?')) return;
        await fetch(`${API}/memos/${id}`, { method: 'DELETE' }).catch(() => {});
        setMemos(p => p.filter(m => m.id !== id));
      }

      function openEdit(m) {
        setForm({ titre: m.titre, contenu: m.contenu, couleur: m.couleur || '#FFFDE7' });
        setEditMemo(m);
        setShowNew(true);
      }

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>📝 Mémos — Notes internes</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 160 }} />
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setForm(EMPTY); setEditMemo(null); setShowNew(true); }}>+ Nouveau mémo</button>
            </div>
          </div>

          {filtered.length === 0 && !showNew && (
            <div className="empty">
              <div className="empty-icon">📝</div>
              <div className="empty-text">Aucun mémo. Créez votre premier mémo pour garder des notes, idées, brouillons…</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {filtered.map(m => (
              <div key={m.id} style={{ background: m.couleur || '#FFFDE7', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', position: 'relative' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, paddingRight: 40 }}>{m.titre || '(Sans titre)'}</div>
                <div style={{ fontSize: 12, color: '#444', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 120, overflow: 'hidden' }}>{m.contenu}</div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 8 }}>{m.updated_at?.slice(0, 10)}</div>
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 2 }} title="Modifier">✏️</button>
                  <button onClick={() => deleteMemo(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 2 }} title="Supprimer">🗑</button>
                </div>
              </div>
            ))}
          </div>

          {showNew && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
              <div className="modal">
                <div className="modal-title">{editMemo ? '✏️ Modifier le mémo' : '📝 Nouveau mémo'}</div>
                <div className="form-group">
                  <label className="form-label">Titre</label>
                  <input className="form-input" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                    placeholder="Titre du mémo..." autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Contenu</label>
                  <textarea className="form-input" rows={8} value={form.contenu}
                    onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))}
                    placeholder="Vos notes, idées, points importants..." style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COULEURS.map(c => (
                      <button key={c} onClick={() => setForm(p => ({ ...p, couleur: c }))}
                        style={{ width: 28, height: 28, background: c, borderRadius: 6, border: form.couleur === c ? '2px solid #333' : '1.5px solid #ccc', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowNew(false); setEditMemo(null); setForm(EMPTY); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveMemo}>💾 Enregistrer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

