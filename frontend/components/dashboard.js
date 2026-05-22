    // ── Dashboard view ────────────────────────────────────────────────────────────

    function DashboardView({ data, taches, finance, onNewClient, setView }) {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const currentMonth = todayStr.slice(0, 7);

      const tachesEnCours = taches.filter(t => !t.done);
      const tachesUrgentes = tachesEnCours.filter(t => t.priorite === 'URGENT' || (t.deadline && t.deadline < todayStr));
      const tachesAujourdhuiDemain = tachesEnCours.filter(t =>
        !tachesUrgentes.includes(t) && t.deadline && (t.deadline === todayStr || t.deadline === tomorrowStr)
      );
      const tachesProchaines = tachesEnCours.filter(t =>
        t.deadline && t.deadline > tomorrowStr &&
        t.deadline <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) &&
        !tachesUrgentes.includes(t)
      ).slice(0, 4);

      const devisEnvoyes = (finance?.liste_devis || []).filter(d => d.statut === 'envoyé');
      const facturesEnvoyees = (finance?.liste_factures || []).filter(f => f.statut === 'envoyée');
      const facturesEnRetard = (finance?.liste_factures || []).filter(f => f.statut === 'en_retard');

      const caEncaisse = finance?.factures?.ca_encaisse || 0;
      const caEnAttente = finance?.factures?.en_attente || 0;
      const totalDevis = finance?.devis?.total || 0;
      const devisValidesNb = finance?.devis?.valides || 0;
      const tauxConversion = totalDevis > 0 ? Math.round((devisValidesNb / totalDevis) * 100) : null;

      const subventions = (finance?.subventions || []).filter(s => !s.archived);
      const subvEnCours = subventions.filter(s => ['À préparer','En cours','Déposée','En instruction'].includes(s.statut));
      const subvObtenues = subventions.filter(s => ['Accordée','Versée'].includes(s.statut));
      const caSubvObtenu = subvObtenues.reduce((sum, s) => sum + (Number(s.montant_sollicite)||0), 0);
      const caSubvEnCours = subvEnCours.reduce((sum, s) => sum + (Number(s.montant_sollicite)||0), 0);
      const subvDeadlines = subventions
        .filter(s => s.deadline && s.deadline >= todayStr && !['Accordée','Versée','Refusée'].includes(s.statut))
        .sort((a,b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 4);

      function diffLabel(deadline, short) {
        if (!deadline) return null;
        const diff = Math.round((new Date(deadline + 'T00:00:00') - today) / 86400000);
        if (diff < 0) return { txt: short ? `+${Math.abs(diff)}j` : `J+${Math.abs(diff)} retard`, color: 'var(--danger)' };
        if (diff === 0) return { txt: "Auj.", color: 'var(--danger)' };
        if (diff === 1) return { txt: 'Demain', color: 'var(--warn)' };
        if (diff <= 7) return { txt: `J-${diff}`, color: 'var(--warn)' };
        if (diff <= 30) return { txt: `J-${diff}`, color: 'var(--pk-blue)' };
        return { txt: deadline.split('-').reverse().join('/'), color: 'var(--text3)' };
      }

      const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      const dateLabel = `${JOURS_FR[today.getDay()]} ${today.getDate()} ${MOIS_FR[today.getMonth()]} ${today.getFullYear()}`;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* En-tête opérationnel */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>{dateLabel}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {tachesUrgentes.length > 0
                  ? <span>🔥 <span style={{ color: 'var(--danger)' }}>{tachesUrgentes.length} urgence{tachesUrgentes.length > 1 ? 's' : ''}</span> à traiter</span>
                  : '✅ Aucune urgence — bonne journée'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onNewClient}>+ Client</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setView('taches')}>+ Tâche</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setView('devis')}>+ Devis</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="metrics-grid">
            <div className="metric-card accent-info" onClick={() => setView('clients')} style={{ cursor: 'pointer' }}>
              <div className="metric-label">Clients actifs</div>
              <div className="metric-value">{data?.nb_clients || 0}</div>
              <div className="metric-sub">{tachesEnCours.length} tâche{tachesEnCours.length !== 1 ? 's' : ''} en cours</div>
            </div>
            <div className="metric-card accent-green" onClick={() => setView('devis')} style={{ cursor: 'pointer' }}>
              <div className="metric-label">CA encaissé</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{caEncaisse.toLocaleString('fr-FR')} €</div>
              {caEnAttente > 0 && <div className="metric-sub" style={{ color: 'var(--warn)' }}>+ {caEnAttente.toLocaleString('fr-FR')} € en attente</div>}
            </div>
            <div className="metric-card" onClick={() => setView('devis')} style={{ cursor: 'pointer' }}>
              <div className="metric-label">Devis en attente</div>
              <div className="metric-value">{devisEnvoyes.length}</div>
              {tauxConversion !== null && <div className="metric-sub">{tauxConversion}% de conversion</div>}
            </div>
            <div className="metric-card accent-warn" onClick={() => setView('taches')} style={{ cursor: 'pointer' }}>
              <div className="metric-label">Tâches urgentes</div>
              <div className="metric-value" style={{ color: tachesUrgentes.length > 0 ? 'var(--danger)' : 'var(--text)' }}>{tachesUrgentes.length}</div>
              <div className="metric-sub">{tachesEnCours.length} au total</div>
            </div>
          </div>

          {/* Santé financière */}
          {(caEncaisse > 0 || caEnAttente > 0 || caSubvObtenu > 0) && (
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>💰 Santé financière</div>
                <button className="btn" style={{ fontSize: 11 }} onClick={() => setView('devis')}>Voir les finances →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {[
                  { label: 'CA encaissé', val: caEncaisse, color: 'var(--success)' },
                  { label: 'CA en attente', val: caEnAttente, color: 'var(--warn)' },
                  { label: 'Devis validés', val: finance?.devis?.ca_devis_valides || 0, color: 'var(--pk-blue)' },
                  { label: 'Subventions obtenues', val: caSubvObtenu, color: '#6A1B9A' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>{val.toLocaleString('fr-FR')} €</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Colonne principale */}
          <div className="grid-2" style={{ gap: 14 }}>

            {/* Gauche : urgences + agenda + suivi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div className="card" style={{ borderTop: tachesUrgentes.length > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: tachesUrgentes.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {tachesUrgentes.length > 0 ? '🔥 Urgences & retards' : '✅ Aucune urgence'}
                  </div>
                </div>
                {tachesUrgentes.length === 0 && facturesEnRetard.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>Tout est à jour. Profitez-en.</div>
                ) : (
                  <>
                    {tachesUrgentes.slice(0, 5).map(t => {
                      const dl = diffLabel(t.deadline);
                      return (
                        <div key={t.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                          onClick={() => setView('taches')}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titre}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.client_detecte || t.client_nom || '—'}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ background: 'var(--danger)', color: 'white', fontSize: 9, padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>
                              {t.priorite === 'URGENT' ? 'URGENT' : 'RETARD'}
                            </span>
                            {dl && <div style={{ fontSize: 10, color: dl.color, marginTop: 3, fontWeight: 600 }}>{dl.txt}</div>}
                          </div>
                        </div>
                      );
                    })}
                    {facturesEnRetard.map(f => (
                      <div key={f.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => setView('devis')}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Facture impayée : {f.numero}</div>
                          <div style={{ fontSize: 11, color: 'var(--danger)' }}>{f.client_nom}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13 }}>{Number(f.total_ht).toLocaleString('fr-FR')} €</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--warn)' }}>
                <div className="card-header">
                  <div className="card-title">📅 Dans les 48h</div>
                  <button className="btn" style={{ fontSize: 11 }} onClick={() => setView('calendrier')}>Agenda →</button>
                </div>
                {tachesAujourdhuiDemain.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>Rien de prévu aujourd'hui ni demain.</div>
                ) : tachesAujourdhuiDemain.map(t => {
                  const dl = diffLabel(t.deadline);
                  return (
                    <div key={t.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{t.titre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.client_detecte || t.client_nom}</div>
                      </div>
                      {dl && <span style={{ fontWeight: 700, fontSize: 11, color: dl.color, flexShrink: 0 }}>{dl.txt}</span>}
                    </div>
                  );
                })}
                {tachesProchaines.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10, marginBottom: 4 }}>Cette semaine</div>
                    {tachesProchaines.map(t => {
                      const dl = diffLabel(t.deadline, true);
                      return (
                        <div key={t.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{t.titre}</div>
                          {dl && <span style={{ fontSize: 11, color: dl.color, fontWeight: 600, flexShrink: 0 }}>{dl.txt}</span>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--pk-blue)' }}>
                <div className="card-header">
                  <div className="card-title">⏳ En attente de réponse</div>
                  <button className="btn" style={{ fontSize: 11 }} onClick={() => setView('devis')}>Voir →</button>
                </div>
                {devisEnvoyes.length === 0 && facturesEnvoyees.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>Aucun devis ni facture en attente.</div>
                ) : (
                  <div className="grid-2" style={{ gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Devis ({devisEnvoyes.length})</div>
                      {devisEnvoyes.slice(0, 3).map(d => (
                        <div key={d.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{d.client_nom}</div>
                          <div style={{ color: 'var(--text2)', fontSize: 11 }}>{d.numero} — {Number(d.total_ht).toLocaleString()}€</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Factures ({facturesEnvoyees.length})</div>
                      {facturesEnvoyees.slice(0, 3).map(f => (
                        <div key={f.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{f.client_nom}</div>
                          <div style={{ color: 'var(--text2)', fontSize: 11 }}>{f.numero} — {Number(f.total_ht).toLocaleString()}€</div>
                          {f.date_echeance && <div style={{ color: 'var(--warn)', fontSize: 10 }}>Éch. {f.date_echeance}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Droite : pipeline subventions + alertes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div className="card" style={{ borderTop: '4px solid #6A1B9A' }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">🏛 Pipeline subventions</div>
                    <div className="card-subtitle">{caSubvEnCours.toLocaleString('fr-FR')} € en cours · {caSubvObtenu.toLocaleString('fr-FR')} € obtenus</div>
                  </div>
                  <button className="btn" style={{ fontSize: 11 }} onClick={() => setView('subventions')}>Voir tout →</button>
                </div>
                {subventions.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>Aucune subvention suivie.</div>
                ) : (
                  <>
                    {[
                      { key: 'À préparer',    color: 'var(--text3)' },
                      { key: 'En cours',      color: 'var(--pk-blue)' },
                      { key: 'Déposée',       color: '#E65100' },
                      { key: 'En instruction',color: 'var(--warn)' },
                      { key: 'Accordée',      color: 'var(--success)', label: 'Accordée ✅' },
                    ].map(({ key, color, label }) => {
                      const items = subventions.filter(s => s.statut === key);
                      if (!items.length) return null;
                      const ca = items.reduce((sum, s) => sum + (Number(s.montant_sollicite)||0), 0);
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color }}>{label || key}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color }}>{items.length} dossier{items.length > 1 ? 's' : ''}</span>
                            {ca > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{ca.toLocaleString('fr-FR')} €</span>}
                          </div>
                        </div>
                      );
                    })}
                    {subvDeadlines.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10, marginBottom: 4 }}>
                          Prochaines deadlines
                        </div>
                        {subvDeadlines.map(s => {
                          const dl = diffLabel(s.deadline);
                          return (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.modele_nom || s.organisme}</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.client_nom}</div>
                              </div>
                              {dl && <span style={{ fontSize: 12, fontWeight: 700, color: dl.color, flexShrink: 0 }}>{dl.txt}</span>}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>

              {(data?.alertes || []).filter(a => ['EXPIRÉ','URGENT','Attention'].includes(a.statut)).length > 0 && (
                <div className="card" style={{ borderTop: '4px solid var(--warn)' }}>
                  <div className="card-header">
                    <div className="card-title">⚠️ Alertes documents clients</div>
                    <button className="btn" style={{ fontSize: 11 }} onClick={() => setView('clients')}>Dossiers →</button>
                  </div>
                  {(data.alertes).filter(a => ['EXPIRÉ','URGENT','Attention'].includes(a.statut)).slice(0, 6).map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: a.statut === 'EXPIRÉ' ? 'var(--danger)' : 'var(--warn)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{a.organisme}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.client}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0,
                        background: a.statut === 'EXPIRÉ' ? 'var(--danger-light)' : 'var(--warn-light)',
                        color: a.statut === 'EXPIRÉ' ? 'var(--danger)' : 'var(--warn)' }}>
                        {a.statut}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(() => {
                const tachesSubv = subventions
                  .flatMap(s => (s.taches||[]).map(t => ({...t, subNom: s.modele_nom||s.organisme, clientNom: s.client_nom})))
                  .filter(t => !t.done && t.deadline)
                  .sort((a,b) => a.deadline.localeCompare(b.deadline))
                  .slice(0, 5);
                if (!tachesSubv.length) return null;
                return (
                  <div className="card" style={{ borderTop: '4px solid var(--pk-blue)' }}>
                    <div className="card-header"><div className="card-title">📋 Suivi dossiers subventions</div></div>
                    {tachesSubv.map(t => {
                      const dl = diffLabel(t.deadline, true);
                      return (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{t.titre}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t.subNom} · {t.clientNom}</div>
                          </div>
                          {dl && <span style={{ fontWeight: 700, fontSize: 11, color: dl.color, flexShrink: 0 }}>{dl.txt}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      );
    }


