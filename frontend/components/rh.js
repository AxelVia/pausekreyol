    // ══════════════════════════════════════════════════════════════════════════════
    // MODULE RESSOURCES HUMAINES
    // ══════════════════════════════════════════════════════════════════════════════

    // Champs requis pour le statut Employeur (depuis template Info_pour_gestion_social_et_paie)
    const CHAMPS_EMPLOYEUR = [
      { id: "licence_spectacle",        label: "N° Licence du spectacle",             tooltip: "Autorisation DRAC cat. 1/2/3" },
      { id: "agrement_aem",             label: "N° Agrément AEM",                     tooltip: "Attestation Employeur Mensuelle — Pôle emploi" },
      { id: "dernier_ordre_conges",     label: "Dernier N° d'ordre Congés Spectacle", tooltip: "Pour le suivi des déclarations" },
      { id: "dernier_ordre_aem",        label: "Dernier N° d'ordre AEM",              tooltip: "Pour le suivi des déclarations" },
      { id: "numero_objet",             label: "N° d'Objet",                          tooltip: "Demandé auprès de Pôle emploi par spectacle/production" },
      { id: "identifiant_net_entreprise",label: "Identifiant Net-Entreprise",         tooltip: "Login/mot de passe DSN" },
      { id: "numero_conges_spectacle",  label: "N° Congés Spectacle salarié",         tooltip: "Cotisation sur salaires artistes/techniciens < 12 mois" },
      { id: "identifiant_audiens",      label: "Identifiant Audiens",                 tooltip: "Prévoyance et congés spectacle" },
      { id: "affiliation_diffuseur",    label: "Affiliation diffuseur d'œuvres",       tooltip: "" },
      { id: "centre_recouvrement",      label: "Affiliation centre de recouvrement",  tooltip: "" },
      { id: "adhesion_pole_emploi",     label: "N° Adhésion Pôle emploi",            tooltip: "" },
      { id: "thalie_sante",             label: "Thalie Santé",                        tooltip: "Médecine du travail spectacle" },
      { id: "afdas",                    label: "AFDAS",                               tooltip: "Formation professionnelle" },
      { id: "ccnsvp",                   label: "CCNSVP",                              tooltip: "Convention Collective Nationale du Spectacle Vivant Privé" },
      { id: "fcap_svp",                 label: "FCAP-SVP",                            tooltip: "" },
      { id: "droits_auteur",            label: "Droits d'auteur",                     tooltip: "SACEM / SACD affiliation" },
    ];

    const DOCS_ARTISTE = [
      { id: "rib",          label: "RIB",                        required: true },
      { id: "carte_id",     label: "Carte d'identité",           required: true },
      { id: "attest_secu",  label: "Attestation de sécurité sociale", required: true },
      { id: "attest_mutuelle", label: "Attestation de mutuelle", required: true },
      { id: "contrat",      label: "Contrat signé",              required: true },
    ];

    function RHView({ clients }) {
      const [tab, setTab] = useState('structures');
      const [selectedStructure, setSelectedStructure] = useState(null);
      const [selectedArtiste, setSelectedArtiste] = useState(null);

      // Données RH stockées localement (indexé par slug client)
      const [rhData, setRhData] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_rh_data') || '{}'); } catch { return {}; }
      });
      const [artistes, setArtistes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_rh_artistes') || '[]'); } catch { return []; }
      });
      const [fiches, setFiches] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_rh_fiches') || '[]'); } catch { return []; }
      });

      const [clientsDetails, setClientsDetails] = useState([]);
      const [loadingClients, setLoadingClients] = useState(false);

      useEffect(() => {
        if (!clients.length) return;
        setLoadingClients(true);
        Promise.all(
          clients.filter(c => !c.archived).map(c =>
            fetch(`${API}/clients/${c.slug}`).then(r => r.ok ? r.json() : null).catch(() => null)
          )
        ).then(details => { setClientsDetails(details.filter(Boolean)); setLoadingClients(false); });
      }, [clients]);

      function saveRhData(data) {
        setRhData(data);
        try { localStorage.setItem('pk_rh_data', JSON.stringify(data)); } catch {}
      }
      function saveArtistes(list) {
        setArtistes(list);
        try { localStorage.setItem('pk_rh_artistes', JSON.stringify(list)); } catch {}
      }
      function saveFiches(list) {
        setFiches(list);
        try { localStorage.setItem('pk_rh_fiches', JSON.stringify(list)); } catch {}
      }

      // Calcule le statut employeur d'une structure
      function statutEmployeur(slug) {
        const data = rhData[slug] || {};
        const filled = CHAMPS_EMPLOYEUR.filter(c => data[c.id] && String(data[c.id]).trim());
        return {
          count: filled.length,
          total: CHAMPS_EMPLOYEUR.length,
          ok: filled.length === CHAMPS_EMPLOYEUR.length,
          pct: Math.round((filled.length / CHAMPS_EMPLOYEUR.length) * 100),
        };
      }

      // Calcule le statut employable d'un artiste
      function statutEmployable(artiste) {
        const infosOk = ['nom', 'prenom', 'email', 'telephone', 'numero_secu', 'numero_intermittent'].every(
          f => artiste[f] && String(artiste[f]).trim()
        );
        const docsOk = DOCS_ARTISTE.every(d => artiste.docs?.[d.id]);
        return { infosOk, docsOk, ok: infosOk && docsOk };
      }

      const structuresActives = clients.filter(c => !c.archived);
      const structuresEmployeurs = structuresActives.filter(c => statutEmployeur(c.slug).ok);

      // ── Filtres artistes ────────────────────────────────────────────────────
      const [filterStructArt, setFilterStructArt] = useState('tous');
      const [filterProjetArt, setFilterProjetArt] = useState('tous');
      const [searchArt, setSearchArt] = useState('');

      // Charge artistes + données RH depuis l'API au montage
      useEffect(() => {
        fetch(`${API}/rh/artistes`).then(r => r.ok ? r.json() : []).then(d => {
          if (Array.isArray(d) && d.length > 0) saveArtistes(d);
        }).catch(() => {});
        fetch(`${API}/rh/structures`).then(r => r.ok ? r.json() : {}).then(d => {
          if (d && Object.keys(d).length > 0) saveRhData(d);
        }).catch(() => {});
      }, []);

      const projetsDispos = filterStructArt === 'tous'
        ? [...new Set(artistes.map(a => a.projet_nom).filter(Boolean))]
        : [...new Set(artistes.filter(a => a.structure_slug === filterStructArt).map(a => a.projet_nom).filter(Boolean))];

      const artistesFiltres = artistes.filter(a => {
        const matchStruct = filterStructArt === 'tous' || a.structure_slug === filterStructArt;
        const matchProjet = filterProjetArt === 'tous' || a.projet_nom === filterProjetArt;
        const matchSearch = !searchArt || [a.nom, a.prenom, a.email, a.role].some(v => v?.toLowerCase().includes(searchArt.toLowerCase()));
        return matchStruct && matchProjet && matchSearch;
      });

      return (
        <div>
          {/* Header + tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[
                ['structures', `🏛 Structures (${structuresActives.length})`],
                ['artistes',   `🎭 Artistes (${artistes.length})`],
                ['fiches',     `🧾 Fiches de paie (${fiches.length})`],
              ].map(([k,l]) => (
                <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => { setTab(k); setSelectedStructure(null); setSelectedArtiste(null); }}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tab === 'artistes' && (
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setSelectedArtiste({ _new: true, nom: '', prenom: '', email: '', telephone: '', numero_secu: '', numero_intermittent: '', role: '', structure_slug: '', projet_nom: '', docs: {} })}>
                  + Nouvel artiste
                </button>
              )}
            </div>
          </div>

          {/* ══ STRUCTURES ══ */}
          {tab === 'structures' && !selectedStructure && (
            <div>
              <div className="card" style={{ marginBottom: 12, background: 'var(--pk-blue-light)', border: '1px solid var(--pk-blue)20', padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: 'var(--pk-blue)' }}>
                  <strong>Pour devenir Employeur</strong>, une structure doit avoir rempli les 16 informations du formulaire "Info pour gestion sociale et paie".
                  Une fois le statut obtenu, elle peut rattacher des artistes et générer des fiches de paie.
                </div>
              </div>
              <div className="card">
                {loadingClients && <div className="empty"><div className="empty-text">Chargement...</div></div>}
                {structuresActives.map(c => {
                  const st = statutEmployeur(c.slug);
                  return (
                    <div key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedStructure(c.slug)}>
                      <div className="client-avatar" style={{ flexShrink: 0 }}>{initials(c.nom)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nom}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {/* Barre de progression */}
                          <div style={{ flex: 1, maxWidth: 150, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                            <div style={{ width: st.pct + '%', height: '100%', background: st.ok ? 'var(--success)' : st.pct > 50 ? 'var(--warn)' : 'var(--pk-orange)', borderRadius: 3, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{st.count}/{st.total} champs</span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {st.ok
                          ? <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>✅ Employeur</span>
                          : <span style={{ background: 'var(--warn-light)', color: 'var(--warn)', padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>⏳ Incomplet</span>
                        }
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ FICHE STRUCTURE EMPLOYEUR ══ */}
          {tab === 'structures' && selectedStructure && (
            <StructureRHView
              slug={selectedStructure}
              client={clients.find(c => c.slug === selectedStructure)}
              data={rhData[selectedStructure] || {}}
              onSave={data => saveRhData({ ...rhData, [selectedStructure]: data })}
              onBack={() => setSelectedStructure(null)}
              artistes={artistes.filter(a => a.structure_slug === selectedStructure)}
              statutEmployeur={statutEmployeur(selectedStructure)}
              fiches={fiches.filter(f => f.structure_slug === selectedStructure)}
              clientDetails={clientsDetails.find(c => c.slug === selectedStructure)}
            />
          )}

          {/* ══ ARTISTES ══ */}
          {tab === 'artistes' && !selectedArtiste && (
            <div>
              {/* Filtres */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="form-input" value={searchArt} onChange={e => setSearchArt(e.target.value)}
                  placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 160 }} />
                <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                  value={filterStructArt} onChange={e => { setFilterStructArt(e.target.value); setFilterProjetArt('tous'); }}>
                  <option value="tous">Toutes structures</option>
                  {structuresActives.map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                </select>
                {projetsDispos.length > 0 && (
                  <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                    value={filterProjetArt} onChange={e => setFilterProjetArt(e.target.value)}>
                    <option value="tous">Tous projets</option>
                    {projetsDispos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {(filterStructArt !== 'tous' || filterProjetArt !== 'tous' || searchArt) && (
                  <button className="btn" style={{ fontSize: 11 }} onClick={() => { setFilterStructArt('tous'); setFilterProjetArt('tous'); setSearchArt(''); }}>✕ Réinitialiser</button>
                )}
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>{artistesFiltres.length} artiste(s)</span>
              </div>
              <div className="card">
                {artistesFiltres.length === 0
                  ? <div className="empty"><div className="empty-icon">🎭</div><div className="empty-text">{artistes.length === 0 ? 'Aucun artiste. Cliquez "+ Nouvel artiste".' : 'Aucun résultat pour ces filtres.'}</div></div>
                  : artistesFiltres.map((a, i) => {
                    const st = statutEmployable(a);
                    const structure = clients.find(c => c.slug === a.structure_slug);
                    return (
                      <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => setSelectedArtiste(a)}>
                        <div className="client-avatar" style={{ background: '#F3E5F5', color: '#6A1B9A', flexShrink: 0 }}>
                          {(a.prenom?.[0] || '') + (a.nom?.[0] || '')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.prenom} {a.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {a.role && <span>{a.role}</span>}
                            {structure && <span style={{ color: 'var(--pk-blue)' }}> · {structure.nom}</span>}
                            {a.projet_nom && <span> › {a.projet_nom}</span>}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {st.ok
                            ? <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>✅ Employable</span>
                            : <span style={{ background: 'var(--surface2)', color: 'var(--text3)', padding: '3px 10px', borderRadius: 10, fontSize: 12 }}>
                                {!st.infosOk ? '⚠️ Infos manquantes' : '📄 Documents manquants'}
                              </span>
                          }
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* ══ FICHE ARTISTE ══ */}
          {tab === 'artistes' && selectedArtiste && (
            <ArtisteRHView
              artiste={selectedArtiste}
              clients={structuresEmployeurs}
              clientsDetails={clientsDetails}
              onBack={() => setSelectedArtiste(null)}
              onSave={async artiste => {
                let saved;
                if (artiste._new) {
                  const newA = { ...artiste, _new: undefined, created_at: new Date().toISOString() };
                  try {
                    const res = await fetch(`${API}/rh/artistes`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newA) });
                    saved = res.ok ? await res.json() : { ...newA, id: `art_${Date.now()}` };
                  } catch { saved = { ...newA, id: `art_${Date.now()}` }; }
                  saveArtistes([...artistes, saved]);
                  setSelectedArtiste(saved);
                } else {
                  try {
                    const res = await fetch(`${API}/rh/artistes/${artiste.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(artiste) });
                    saved = res.ok ? await res.json() : artiste;
                  } catch { saved = artiste; }
                  saveArtistes(artistes.map(a => a.id === artiste.id ? saved : a));
                  setSelectedArtiste(saved);
                }
                return saved;
              }}
              onDelete={async id => {
                try { await fetch(`${API}/rh/artistes/${id}`, { method: 'DELETE' }); } catch {}
                saveArtistes(artistes.filter(a => a.id !== id));
                setSelectedArtiste(null);
              }}
            />
          )}

          {/* ══ FICHES DE PAIE ══ */}
          {tab === 'fiches' && (
            <FichesPaieView
              fiches={fiches}
              clients={structuresEmployeurs}
              artistes={artistes}
              onSave={saveFiches}
              rhData={rhData}
            />
          )}
        </div>
      );
    }

    // ── Fiche RH d'une structure ──────────────────────────────────────────────────

    function StructureRHView({ slug, client, data, onSave, onBack, artistes, statutEmployeur, fiches, clientDetails }) {
      const [form, setForm] = useState(data || {});
      const [saved, setSaved] = useState(false);

      async function handleSave() {
        try {
          const res = await fetch(`${API}/rh/structures/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
          });
          if (res.ok) {
            const result = await res.json();
            // Met à jour le statut employeur depuis la réponse serveur
            if (result.statut_employeur !== undefined) {
              onSave({ ...form, _statut_employeur: result.statut_employeur, _champs_remplis: result.champs_remplis });
            } else {
              onSave(form);
            }
          } else {
            onSave(form);
          }
        } catch {
          onSave(form); // Fallback local
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }

      function exportFicheStructure() {
        // Génère le document "Info salarié" pour envoi à MCH Dom
        const lines = [
          "FICHE STRUCTURE — INFO POUR GESTION SOCIALE ET PAIE",
          "Générée par PauseKreyol — " + new Date().toLocaleDateString('fr-FR'),
          "Structure : " + (client?.nom || slug),
          "",
          ...CHAMPS_EMPLOYEUR.map(c => `${c.label}: ${form[c.id] || '[Non renseigné]'}`),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Fiche_Structure_${slug}_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
      }

      const st = statutEmployeur;
      const projets = clientDetails?.projets || [];

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" onClick={onBack}>← Retour</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{client?.nom || slug}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Fiche RH — Info pour gestion sociale et paie</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn" style={{ fontSize: 12 }} onClick={exportFicheStructure}>📄 Exporter pour MCH Dom</button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave}>
                {saved ? '✅ Sauvegardé' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Barre de statut */}
          <div style={{ marginBottom: 16, padding: '12px 16px', background: st.ok ? 'var(--success-light)' : 'var(--warn-light)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: st.ok ? 'var(--success)' : 'var(--warn)' }}>
                {st.ok ? '✅ Statut Employeur activé' : `⏳ ${st.count}/${st.total} champs remplis (${st.pct}%) — Statut Employeur non atteint`}
              </div>
              {!st.ok && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Remplissez tous les champs ci-dessous pour débloquer la génération de fiches de paie.</div>}
            </div>
            <div style={{ width: 80, height: 8, background: 'var(--border)', borderRadius: 4 }}>
              <div style={{ width: st.pct + '%', height: '100%', background: st.ok ? 'var(--success)' : 'var(--warn)', borderRadius: 4 }} />
            </div>
          </div>

          {/* Formulaire champs */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">📋 Informations gestion sociale et paie</div></div>
            <div className="form-grid">
              {CHAMPS_EMPLOYEUR.map(c => (
                <div className="form-group" key={c.id}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {c.label}
                    {!form[c.id] && <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span>}
                    {c.tooltip && <span title={c.tooltip} style={{ color: 'var(--text3)', cursor: 'help', fontSize: 11 }}>ⓘ</span>}
                  </label>
                  <input
                    className="form-input"
                    style={{ borderColor: form[c.id] ? 'var(--border2)' : 'var(--warn)' }}
                    value={form[c.id] || ''}
                    onChange={e => setForm(p => ({ ...p, [c.id]: e.target.value }))}
                    placeholder={c.tooltip || ''}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Artistes rattachés */}
          {st.ok && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div><div className="card-title">🎭 Artistes rattachés ({artistes.length})</div></div>
              </div>
              {artistes.length === 0
                ? <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucun artiste rattaché à cette structure.</div></div>
                : artistes.map((a, i) => {
                  const stA = (() => {
                    const infosOk = ['nom','prenom','email','telephone','numero_secu','numero_intermittent'].every(f => a[f]);
                    const docsOk = DOCS_ARTISTE.every(d => a.docs?.[d.id]);
                    return { ok: infosOk && docsOk, infosOk, docsOk };
                  })();
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="client-avatar" style={{ background: '#F3E5F5', color: '#6A1B9A', flexShrink: 0, width: 32, height: 32, fontSize: 11 }}>
                        {(a.prenom?.[0]||'') + (a.nom?.[0]||'')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.prenom} {a.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.role}{a.projet_nom ? ` › ${a.projet_nom}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600, background: stA.ok ? 'var(--success-light)' : 'var(--surface2)', color: stA.ok ? 'var(--success)' : 'var(--text3)' }}>
                        {stA.ok ? '✅ Employable' : '⚠️ Incomplet'}
                      </span>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Fiches de paie */}
          {st.ok && fiches.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">🧾 Fiches de paie générées ({fiches.length})</div></div>
              {fiches.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.artiste_nom} — {f.periode}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Envoyée à MCH Dom le {f.date_envoi || '—'}</div>
                  </div>
                  <span style={{ fontSize: 11, background: f.statut === 'reçue' ? 'var(--success-light)' : 'var(--warn-light)', color: f.statut === 'reçue' ? 'var(--success)' : 'var(--warn)', padding: '2px 8px', borderRadius: 8, fontWeight: 600, alignSelf: 'center' }}>
                    {f.statut || 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Fiche d'un artiste ────────────────────────────────────────────────────────

    function ArtisteRHView({ artiste, clients, clientsDetails, onBack, onSave, onDelete }) {
      const [form, setForm] = useState(artiste);
      const [saved, setSaved] = useState(false);
      const [uploadMsg, setUploadMsg] = useState('');

      const clientDetail = clientsDetails.find(c => c.slug === form.structure_slug);
      const projets = clientDetail?.projets || [];

      const stA = (() => {
        const infosOk = ['nom','prenom','email','telephone','numero_secu','numero_intermittent'].every(f => form[f] && String(form[f]).trim());
        const docsOk = DOCS_ARTISTE.every(d => form.docs?.[d.id]);
        return { ok: infosOk && docsOk, infosOk, docsOk };
      })();

      async function handleSave() {
        const saved = await onSave(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }

      const [uploadingDoc, setUploadingDoc] = useState(null); // id du doc en cours d'upload

      async function handleDoc(docId, file) {
        setUploadingDoc(docId);
        try {
          if (form.id && !form._new) {
            // Upload vers Drive via API
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API}/rh/artistes/${form.id}/documents/${docId}`, {
              method: 'POST', body: fd
            });
            if (res.ok) {
              const result = await res.json();
              setForm(p => ({
                ...p,
                docs: { ...p.docs, [docId]: { nom: file.name, date: new Date().toLocaleDateString('fr-FR'), drive_url: result.drive_url } },
                docs_meta: { ...p.docs_meta, [docId]: { nom: file.name, date: new Date().toLocaleDateString('fr-FR'), drive_url: result.drive_url } }
              }));
              setUploadMsg(`✅ ${file.name} uploadé${result.drive_url ? ' sur Drive' : ''}`);
            } else {
              // Fallback base64 si pas encore sauvegardé ou erreur API
              throw new Error('API error');
            }
          } else {
            // Artiste pas encore sauvegardé → base64 temporaire
            const reader = new FileReader();
            reader.onload = e => {
              setForm(p => ({ ...p, docs: { ...p.docs, [docId]: { nom: file.name, data: e.target.result, date: new Date().toLocaleDateString('fr-FR'), source: 'local' } } }));
              setUploadMsg(`✅ ${file.name} ajouté (sauvegardez pour uploader sur Drive)`);
            };
            reader.readAsDataURL(file);
          }
        } catch {
          // Fallback base64
          const reader = new FileReader();
          reader.onload = e => {
            setForm(p => ({ ...p, docs: { ...p.docs, [docId]: { nom: file.name, data: e.target.result, date: new Date().toLocaleDateString('fr-FR'), source: 'local' } } }));
            setUploadMsg(`⚠️ ${file.name} stocké localement (Drive non disponible)`);
          };
          reader.readAsDataURL(file);
        }
        setUploadingDoc(null);
        setTimeout(() => setUploadMsg(''), 4000);
      }

      function exportFicheSalarie() {
        const lines = [
          "FICHE SALARIÉ — INFO POUR GESTION DE PAIE",
          "Générée par PauseKreyol — " + new Date().toLocaleDateString('fr-FR'),
          "",
          "Nom : " + (form.nom || ''),
          "Prénom : " + (form.prenom || ''),
          "Email : " + (form.email || ''),
          "Téléphone : " + (form.telephone || ''),
          "N° Sécurité sociale : " + (form.numero_secu || ''),
          "N° Intermittent : " + (form.numero_intermittent || ''),
          "Rôle / Fonction : " + (form.role || ''),
          "Structure employeur : " + (clients.find(c => c.slug === form.structure_slug)?.nom || ''),
          "Projet : " + (form.projet_nom || ''),
          "",
          "DOCUMENTS :",
          ...DOCS_ARTISTE.map(d => `${d.label}: ${form.docs?.[d.id] ? '✅ Fourni' : '❌ Manquant'}`),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Fiche_Salarie_${form.prenom}_${form.nom}_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
      }

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" onClick={onBack}>← Retour</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {form._new ? 'Nouvel artiste' : `${form.prenom} ${form.nom}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Fiche artiste / intermittent</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {!form._new && <button className="btn" style={{ fontSize: 12 }} onClick={exportFicheSalarie}>📄 Fiche salarié MCH Dom</button>}
              {!form._new && <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { if (window.confirm('Supprimer cet artiste ?')) onDelete(form.id); }}>🗑</button>}
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave}>{saved ? '✅ Sauvegardé' : '💾 Sauvegarder'}</button>
            </div>
          </div>

          {/* Badge statut employable */}
          <div style={{ marginBottom: 14, padding: '10px 14px', background: stA.ok ? 'var(--success-light)' : 'var(--warn-light)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: stA.ok ? 'var(--success)' : 'var(--warn)' }}>
              {stA.ok ? '✅ Statut Employable — Prêt pour une fiche de paie' : '⏳ Non employable — '}
              {!stA.ok && (
                <span style={{ fontSize: 12, fontWeight: 400 }}>
                  {!stA.infosOk && 'Informations manquantes. '}
                  {!stA.docsOk && 'Documents manquants.'}
                </span>
              )}
            </div>
          </div>

          <div className="grid-2">
            {/* Informations */}
            <div className="card">
              <div className="card-header"><div className="card-title">Informations</div></div>
              <div className="form-grid">
                {[['prenom','Prénom',''],['nom','Nom',''],['email','Email',''],['telephone','Téléphone',''],
                  ['numero_secu','N° Sécurité sociale','ex: 1 85 12 75 108 123 45'],
                  ['numero_intermittent','N° Intermittent','N° Pôle Emploi spectacle'],
                  ['role','Rôle / Fonction','Musicien, danseur, technicien...'],
                ].map(([id, label, ph]) => (
                  <div className="form-group" key={id}>
                    <label className="form-label">
                      {label}{['prenom','nom','email','telephone','numero_secu','numero_intermittent'].includes(id) && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <input className="form-input" value={form[id] || ''} placeholder={ph}
                      onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))} />
                  </div>
                ))}
              </div>

              {/* Rattachement structure → projet */}
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Structure employeur *</label>
                <select className="form-input" value={form.structure_slug || ''} onChange={e => setForm(p => ({ ...p, structure_slug: e.target.value, projet_nom: '' }))}>
                  <option value="">— Choisir une structure employeur —</option>
                  {clients.map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                </select>
                {!form.structure_slug && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 3 }}>⚠️ Seules les structures avec statut Employeur sont listées</div>}
              </div>
              {projets.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Projet rattaché</label>
                  <select className="form-input" value={form.projet_nom || ''} onChange={e => setForm(p => ({ ...p, projet_nom: e.target.value }))}>
                    <option value="">— Choisir un projet —</option>
                    {projets.map(p => <option key={p.slug} value={p.nom}>{p.nom}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="card">
              <div className="card-header"><div className="card-title">Documents requis</div></div>
              {uploadMsg && <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8 }}>{uploadMsg}</div>}
              {DOCS_ARTISTE.map(doc => {
                const existing = form.docs?.[doc.id];
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: existing ? 'var(--success-light)' : 'var(--danger-light)', color: existing ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {existing ? '✅' : '⚠️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</div>
                      {existing && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {existing.drive_url
                            ? <a href={existing.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pk-blue)' }}>☁️ {existing.nom} — Voir sur Drive</a>
                            : <span>{existing.nom} — {existing.date}{existing.source === 'local' ? ' (local)' : ''}</span>
                          }
                        </div>
                      )}
                    </div>
                    <label className="btn" style={{ fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                      {uploadingDoc === doc.id ? '⏳' : existing ? '🔄' : '📁'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={uploadingDoc === doc.id}
                        onChange={e => e.target.files[0] && handleDoc(doc.id, e.target.files[0])} />
                    </label>
                    {existing && (
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13 }}
                        onClick={() => setForm(p => { const d = { ...p.docs }; delete d[doc.id]; return { ...p, docs: d }; })}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // ── Fiches de paie ────────────────────────────────────────────────────────────

    function FichesPaieView({ fiches, clients, artistes, onSave, rhData }) {
      const [showNew, setShowNew] = useState(false);
      const [newFiche, setNewFiche] = useState({ structure_slug: '', artiste_id: '', periode: '', notes: '' });
      const [filterStruct, setFilterStruct] = useState('tous');

      const displayFiches = fiches.filter(f => filterStruct === 'tous' || f.structure_slug === filterStruct);

      function genererFiche() {
        const structure = clients.find(c => c.slug === newFiche.structure_slug);
        const artiste = artistes.find(a => a.id === newFiche.artiste_id);
        if (!structure || !artiste) return;

        const rh = rhData[newFiche.structure_slug] || {};
        const stA = (() => {
          const infosOk = ['nom','prenom','email','telephone','numero_secu','numero_intermittent'].every(f => artiste[f]);
          const docsOk = DOCS_ARTISTE.every(d => artiste.docs?.[d.id]);
          return infosOk && docsOk;
        })();

        if (!stA) {
          window.alert("⚠️ L'artiste n'a pas le statut Employable. Complétez d'abord ses informations et documents.");
          return;
        }

        // Génère le package à envoyer à MCH Dom (txt)
        const lines = [
          "═══════════════════════════════════════════════════",
          "   PACKAGE FICHES DE PAIE — PauseKreyol",
          "═══════════════════════════════════════════════════",
          `Période : ${newFiche.periode}`,
          `Généré le : ${new Date().toLocaleDateString('fr-FR')}`,
          "",
          "── FICHE STRUCTURE ──────────────────────────────",
          `Structure : ${structure.nom}`,
          ...CHAMPS_EMPLOYEUR.map(c => `${c.label}: ${rh[c.id] || '[Non renseigné]'}`),
          "",
          "── FICHE SALARIÉ ────────────────────────────────",
          `Nom : ${artiste.nom}`,
          `Prénom : ${artiste.prenom}`,
          `Email : ${artiste.email}`,
          `Téléphone : ${artiste.telephone}`,
          `N° Sécurité sociale : ${artiste.numero_secu}`,
          `N° Intermittent : ${artiste.numero_intermittent}`,
          `Rôle : ${artiste.role}`,
          `Projet : ${artiste.projet_nom || '—'}`,
          "",
          "Documents fournis :",
          ...DOCS_ARTISTE.map(d => `  ${d.label}: ${artiste.docs?.[d.id] ? '✅ Fourni' : '❌ Manquant'}`),
          newFiche.notes ? `\nNotes : ${newFiche.notes}` : '',
          "",
          "À envoyer à : MCH Dom",
          "═══════════════════════════════════════════════════",
        ];

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Package_Paie_${artiste.nom}_${newFiche.periode.replace('/','-')}.txt`;
        a.click();

        const fiche = {
          id: `fiche_${Date.now()}`,
          structure_slug: newFiche.structure_slug,
          artiste_id: newFiche.artiste_id,
          artiste_nom: `${artiste.prenom} ${artiste.nom}`,
          periode: newFiche.periode,
          date_envoi: new Date().toLocaleDateString('fr-FR'),
          statut: 'envoyée',
          notes: newFiche.notes,
        };
        onSave([...fiches, fiche]);
        setShowNew(false);
        setNewFiche({ structure_slug: '', artiste_id: '', periode: '', notes: '' });
      }

      const artistesEligibles = artistes.filter(a => {
        if (newFiche.structure_slug && a.structure_slug !== newFiche.structure_slug) return false;
        const infosOk = ['nom','prenom','email','telephone','numero_secu','numero_intermittent'].every(f => a[f]);
        const docsOk = DOCS_ARTISTE.every(d => a.docs?.[d.id]);
        return infosOk && docsOk;
      });

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                value={filterStruct} onChange={e => setFilterStruct(e.target.value)}>
                <option value="tous">Toutes structures</option>
                {clients.map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(true)}>+ Générer un package paie</button>
          </div>

          <div className="card" style={{ marginBottom: 12, background: 'var(--pk-blue-light)', padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--pk-blue)' }}>
              <strong>💡 Workflow paie MCH Dom :</strong> Sélectionnez la structure et l'artiste, choisissez la période, et téléchargez le package complet (fiche structure + fiche salarié) à envoyer au prestataire MCH Dom.
            </div>
          </div>

          <div className="card">
            {displayFiches.length === 0
              ? <div className="empty"><div className="empty-icon">🧾</div><div className="empty-text">Aucune fiche de paie générée.</div></div>
              : displayFiches.map((f, i) => {
                const structure = clients.find(c => c.slug === f.structure_slug);
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.artiste_nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {structure?.nom} · Période : {f.periode} · Envoyée le {f.date_envoi}
                      </div>
                      {f.notes && <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text3)' }}>{f.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border2)', cursor: 'pointer' }}
                        value={f.statut || 'envoyée'}
                        onChange={e => onSave(fiches.map(x => x.id === f.id ? { ...x, statut: e.target.value } : x))}>
                        {['envoyée','en traitement','reçue','archivée'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Modal nouvelle fiche */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
              <div className="modal" style={{ maxWidth: 480 }}>
                <div className="modal-title">🧾 Générer un package paie</div>
                <div className="form-group">
                  <label className="form-label">Structure employeur</label>
                  <select className="form-input" value={newFiche.structure_slug} onChange={e => setNewFiche(p => ({ ...p, structure_slug: e.target.value, artiste_id: '' }))}>
                    <option value="">— Choisir —</option>
                    {clients.map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Artiste (employable uniquement)</label>
                  <select className="form-input" value={newFiche.artiste_id} onChange={e => setNewFiche(p => ({ ...p, artiste_id: e.target.value }))}>
                    <option value="">— Choisir —</option>
                    {artistesEligibles.map(a => <option key={a.id} value={a.id}>{a.prenom} {a.nom} — {a.role}</option>)}
                  </select>
                  {newFiche.structure_slug && artistesEligibles.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4 }}>⚠️ Aucun artiste employable rattaché à cette structure.</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Période (ex: 01/2026)</label>
                  <input className="form-input" value={newFiche.periode} onChange={e => setNewFiche(p => ({ ...p, periode: e.target.value }))} placeholder="MM/YYYY" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (facultatif)</label>
                  <textarea className="form-input" rows={2} value={newFiche.notes} onChange={e => setNewFiche(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowNew(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={genererFiche} disabled={!newFiche.structure_slug || !newFiche.artiste_id || !newFiche.periode}>
                    📥 Générer et télécharger →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


