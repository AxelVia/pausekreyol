/* PauseKreyol — Shell React (App + AppContent + LoginScreen)            */
/* Les composants sont dans frontend/components/ (voir index.html)       */

    // ══════════════════════════════════════════════════════════════════════════════
    // MODULE ZCAL & DISPONIBILITÉS
    // ══════════════════════════════════════════════════════════════════════════════

    function App() {
      // ── Auth ────────────────────────────────────────────────────────────────
      const [authed, setAuthed] = useState(() => sessionStorage.getItem('pk_auth') === '1');

      if (!authed) return <LoginScreen onAuth={() => { sessionStorage.setItem('pk_auth', '1'); setAuthed(true); }} />;

      return <AppContent />;
    }

    function AppContent() {
      const [view, setView] = useState('dashboard');
      const [selectedClient, setSelectedClient] = useState(null);
      const [newDevisFromTopbar, setNewDevisFromTopbar] = useState(0); // incrémenté pour déclencher ouverture modale dans DevisFacturesView
      const [data, setData] = useState({ nb_clients: 0, nb_alertes_urgentes: 0, clients: [], alertes: [] });
      const [taches, setTaches] = useState([]);
      const [finance, setFinance] = useState(null);

      async function fetchFinance() {
        try {
          const [dashRes, devisRes, subvRes] = await Promise.all([
            fetch(`${API}/devis-factures/dashboard`),
            fetch(`${API}/devis`),
            fetch(`${API}/subventions`),
          ]);
          const dashData = dashRes.ok ? await dashRes.json() : {};
          const devisData = devisRes.ok ? await devisRes.json() : [];
          const subvData = subvRes.ok ? await subvRes.json() : [];
          setFinance({ ...dashData, liste_devis: devisData, subventions: subvData });
        } catch { }
      }
      const [showModal, setShowModal] = useState(false);

      async function fetchTaches() {
        try {
          const res = await fetch(`${API}/taches`);
          if (res.ok) {
            const data = await res.json();
            if (data.length > 0) setTaches(data);
          }
        } catch { /* utilise le mock */ }
      }

      async function fetchDashboard() {
        try {
          const res = await fetch(`${API}/dashboard`);
          if (res.ok) setData(await res.json());
        } catch { /* utilise le mock */ }
      }

      useEffect(() => {
        fetchDashboard();
        fetchTaches();
        fetchFinance();
        const interval = setInterval(() => {
          fetchDashboard();
          fetchTaches();
          fetchFinance();
        }, 120000);
        return () => clearInterval(interval);
      }, []);

      const urgentCount = taches.filter(t => !t.done && t.priorite === 'URGENT').length;

      const navItems = [
        { key: 'dashboard', label: 'Tableau de bord', icon: icons.dashboard, section: 'gestion' },
        { key: 'clients', label: 'Dossiers clients', icon: icons.clients, section: 'gestion' },
        { key: 'taches', label: 'Tâches', icon: icons.taches, section: 'gestion', badge: urgentCount || null },
        { key: 'offres', label: 'Offres', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 7h6M5 10h4"/><circle cx="12" cy="3" r="2" fill="currentColor" stroke="none"/></svg>, section: 'gestion' },
        { key: 'devis', label: 'Devis & Factures', icon: icons.devis, section: 'gestion' },
        { key: 'subventions', label: 'Subventions', icon: icons.subventions, section: 'gestion' },
        { key: 'rh', label: 'Ressources Humaines', icon: icons.rh, section: 'gestion' },
        { key: 'audit', label: 'Audits', icon: icons.audit, section: 'gestion' },
        { key: 'pilotage', label: 'Stratégie & Pilotage', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M2 12L6 7L9 9L14 4"/><circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg>, section: 'gestion' },
        { key: 'calendrier', label: 'Calendriers', icon: icons.calendrier, section: 'outils' },
        { key: 'zcal', label: 'Zcal & Dispos', icon: icons.zcal, section: 'outils' },
        { key: 'annuaire', label: 'Annuaire', icon: icons.annuaire, section: 'outils' },
        { key: 'emailing', label: 'Emailing', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M2.5 3.5L8 7.5L13.5 3.5" /><rect x="1" y="2" width="14" height="12" rx="1" /></svg>, section: 'outils' },
        { key: 'comm', label: 'Comm & Assets', icon: icons.comm, section: 'outils' },
        { key: 'ia', label: 'IA', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><circle cx="8" cy="8" r="5.5"/><path d="M5 8.5L7 10.5L11 6.5"/><circle cx="8" cy="3" r="1" fill="currentColor" stroke="none"/></svg>, section: 'outils' },
      ];

      const titles = { dashboard: 'Tableau de bord', clients: 'Dossiers clients', taches: 'Tâches', offres: 'Catalogue des Offres', devis: 'Devis & Factures', subventions: 'Subventions', rh: 'Ressources Humaines', audit: 'Audits', pilotage: 'Stratégie & Pilotage', zcal: 'Zcal & Disponibilités', annuaire: 'Annuaire', calendrier: 'Calendriers', emailing: 'Gestion Emailing', comm: 'Communication', ia: '🤖 Consommation IA' };

      return (
        <div className="app">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '2px', lineHeight: 1.1 }}>
                <span style={{ color: '#FF795A', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>PAUSE</span>
                <span style={{ color: '#FFD2AD', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}> KRÉYOL</span>
              </div>
              <p>Ingénierie culturelle</p>
            </div>
            <nav className="sidebar-nav">
              <div className="nav-section">
                <div className="nav-label">Gestion</div>
                {navItems.filter(i => i.section === 'gestion').map(item => (
                  <button key={item.key} className={`nav-item ${view === item.key ? 'active' : ''}`} onClick={() => { setView(item.key); setSelectedClient(null); }}>
                    {item.icon}
                    {item.label}
                    {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                  </button>
                ))}
              </div>
              <div className="nav-section" style={{ marginTop: 8 }}>
                <div className="nav-label">Outils</div>
                {navItems.filter(i => i.section === 'outils').map(item => (
                  <button key={item.key} className={`nav-item ${view === item.key ? 'active' : ''}`} onClick={() => { setView(item.key); setSelectedClient(null); }}>
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
            <div className="sidebar-bottom">
              <div className="user-chip">
                <div className="avatar">PK</div>
                <div style={{ flex: 1 }}>
                  <div className="user-name">Pause Kreyol</div>
                  <div className="user-role">Admin de production</div>
                </div>
                <button
                  onClick={() => { sessionStorage.removeItem('pk_auth'); window.location.reload(); }}
                  title="Se déconnecter"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: '4px', borderRadius: 4, lineHeight: 1 }}
                >⏻</button>
              </div>
            </div>
          </aside>

          <div className="main">
            <header className="topbar">
              <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Bouton retour mobile dans la topbar */}
                {selectedClient && (
                  <button
                    onClick={() => setSelectedClient(null)}
                    style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0', color: 'var(--accent)', fontSize: 18, lineHeight: 1 }}
                    className="btn-back-mobile"
                  >←</button>
                )}
                {titles[view]}
              </div>
              <div className="topbar-right">
                {view === 'clients' && !selectedClient && (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau client</button>
                )}
                {view === 'devis' && (
                  <button className="btn btn-primary" onClick={() => setNewDevisFromTopbar(p => p + 1)}>+ Nouveau devis</button>
                )}
              </div>
            </header>
            <div className="mobile-readonly-banner">
              👁 Mode consultation — modifications sur ordinateur uniquement
            </div>

            <main className="content">
              {view === 'dashboard' && <DashboardView data={data} taches={taches} finance={finance} onNewClient={() => setShowModal(true)} setView={setView} />}
              {view === 'clients' && !selectedClient && <ClientsView clients={data?.clients || []} onNewClient={() => setShowModal(true)} onOpenClient={slug => setSelectedClient(slug)} />}
              {view === 'clients' && selectedClient && <ClientDetailView slug={selectedClient} onBack={() => setSelectedClient(null)} onRefresh={fetchDashboard} />}
              {view === 'taches' && <TachesView taches={taches} setTaches={setTaches} setView={setView} setSelectedClient={setSelectedClient} />}
              {view === 'offres' && <OffresView />}
              {view === 'devis' && <DevisFacturesView setView={setView} setSelectedClient={setSelectedClient} newDevisTrigger={newDevisFromTopbar} />}
              {view === 'subventions' && <SubventionsView clients={data?.clients || []} />}
          {view === 'rh' && <RHView clients={data?.clients || []} />}
          {view === 'audit' && <AuditView clients={data?.clients || []} />}
          {view === 'pilotage' && <StrategiePilotageView />}
          {view === 'zcal' && <ZcalView clients={data?.clients || []} />}
              {view === 'annuaire' && <AnnuaireView />}
              {view === 'calendrier' && <CalendrierView alertes={data?.alertes || []} clients={data?.clients || []} taches={taches} onSwitchToZcal={() => setView('zcal')} />}
              {view === 'emailing' && <EmailingView />}
              {view === 'comm' && <CommView clients={data?.clients || []} />}
              {view === 'ia' && <IAUsageView />}
            </main>
          </div>

          {showModal && <NewClientModal onClose={() => setShowModal(false)} onCreated={fetchDashboard} />}

          {/* Barre navigation mobile — 5 items + Plus */}
          <nav className="mobile-nav">
            <div className="mobile-nav-inner">
              {navItems.slice(0, 4).map(item => (
                <button
                  key={item.key}
                  className={`mobile-nav-item ${view === item.key ? 'active' : ''}`}
                  onClick={() => { setView(item.key); setSelectedClient(null); }}
                >
                  {item.badge ? <span className="mobile-nav-badge">{item.badge}</span> : null}
                  {item.icon}
                  <span>{item.label.split(' ')[0]}</span>
                </button>
              ))}
              {/* Bouton Plus — accès aux autres sections */}
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  className={`mobile-nav-item ${['subventions', 'calendrier', 'annuaire', 'comm', 'offres', 'pilotage'].includes(view) ? 'active' : ''}`}
                  onClick={() => document.getElementById('mobile-more-menu')?.classList.toggle('open')}
                  style={{ width: '100%' }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
                    <circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" />
                  </svg>
                  <span>Plus</span>
                </button>
                <div id="mobile-more-menu" style={{
                  display: 'none', position: 'absolute', bottom: '110%', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 8, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                  minWidth: 160, zIndex: 200,
                }}
                  className="mobile-more-menu"
                >
                  {navItems.slice(4).map(item => (
                    <button key={item.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: view === item.key ? 'var(--pk-blue-light)' : 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: view === item.key ? 'var(--pk-blue)' : 'var(--text)', fontWeight: view === item.key ? 600 : 400 }}
                      onClick={() => { setView(item.key); setSelectedClient(null); document.getElementById('mobile-more-menu')?.classList.remove('open'); }}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      );
    }

    // ── Modal import Excel ────────────────────────────────────────────────────────

    function ImportExcelModal({ slug, onClose, onDone }) {
      const [step, setStep] = useState('upload'); // upload → preview → done
      const [parsed, setParsed] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const isUpdate = !!slug;

      async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        setError('');
        try {
          const formData = new FormData();
          formData.append('file', file);
          const url = isUpdate
            ? `${API}/import/update-client/${slug}`
            : `${API}/import/parse`;
          const res = await fetch(url, { method: 'POST', body: formData });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setParsed(data);
          setStep('preview');
        } catch (e) {
          setError('Erreur : ' + e.message);
        } finally {
          setLoading(false);
        }
      }

      async function confirm() {
        setLoading(true);
        try {
          if (isUpdate) {
            // Applique les modifications
            const updates = {};
            Object.entries(parsed.modifications || {}).forEach(([k, v]) => {
              updates[k] = v['après'];
            });
            const res = await fetch(`${API}/clients/${slug}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error(await res.text());
            const updated = await res.json();
            onDone(updated);
          } else {
            // Crée le client — re-upload le fichier
            const input = document.getElementById('excel-import-input');
            const formData = new FormData();
            formData.append('file', input.files[0]);
            const res = await fetch(`${API}/import/create-client`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error(await res.text());
            onDone(await res.json());
          }
          onClose();
        } catch (e) {
          setError('Erreur : ' + e.message);
        } finally {
          setLoading(false);
        }
      }

      const LABELS = {
        nom_officiel: 'Nom officiel', nom_usuel: 'Nom usuel', siret: 'SIRET',
        ninea: 'NINEA', rccm: 'RCCM', date_creation: 'Date création',
        adresse_siege: 'Adresse', president: 'Président(e)', tresorier: 'Trésorier(e)',
        email_contact: 'Email', telephone: 'Téléphone', licence_type1: 'Licence Type 1',
        numero_urssaf: 'N° URSSAF', numero_guso: 'N° GUSO',
      };

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal">
            <div className="modal-title">{isUpdate ? '📊 Mettre à jour depuis un Excel' : '📥 Créer un client depuis un Excel'}</div>
            <div className="modal-sub">
              {isUpdate
                ? 'Importez une fiche client remplie — les modifications seront prévisualisées avant application.'
                : 'Importez un fichier COLLECTE_CLIENT.xlsx ou STRUCTURE_xxx.xlsx rempli par le client pour créer automatiquement son dossier.'}
            </div>

            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{error}</div>}

            {step === 'upload' && (
              <div>
                <div style={{
                  border: '2px dashed var(--border2)', borderRadius: 'var(--radius)',
                  padding: '30px', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--surface2)'
                }} onClick={() => document.getElementById('excel-import-input').click()}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Cliquez pour sélectionner un fichier Excel</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    FICHE_CLIENT.xlsx, STRUCTURE_xxx.xlsx (.xlsx uniquement)
                  </div>
                </div>
                <input id="excel-import-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
                {loading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)' }}>Analyse en cours...</div>}
              </div>
            )}

            {step === 'preview' && parsed && (
              <div>
                <div style={{ background: 'var(--accent-light)', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                  {isUpdate
                    ? <><strong>{parsed.nb_modifications}</strong> modification(s) détectée(s) — source : {parsed.source}</>
                    : <><strong>{parsed.champs_importes}</strong> champ(s) importé(s) — source : {parsed.source}</>
                  }
                </div>

                {isUpdate && parsed.modifications && Object.keys(parsed.modifications).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Modifications détectées :</div>
                    {Object.entries(parsed.modifications).map(([key, change], i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text3)', width: 140, flexShrink: 0 }}>{LABELS[key] || key}</span>
                        <span style={{ color: 'var(--danger)', textDecoration: 'line-through', flex: 1 }}>{change.avant || '—'}</span>
                        <span style={{ color: 'var(--accent)', flex: 1, fontWeight: 500 }}>→ {change['après']}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isUpdate && parsed.client_data && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Données extraites :</div>
                    {Object.entries(parsed.client_data).slice(0, 8).map(([key, val], i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text3)', width: 160, flexShrink: 0 }}>{LABELS[key] || key}</span>
                        <span style={{ fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}
                    {parsed.projet_data?.nom_projet && (
                      <div style={{ marginTop: 8, padding: '8px', background: 'var(--info-light)', borderRadius: 6, fontSize: 12 }}>
                        📋 Projet détecté : <strong>{parsed.projet_data.nom_projet}</strong> — sera créé automatiquement
                      </div>
                    )}
                  </div>
                )}

                {isUpdate && parsed.nb_modifications === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
                    Aucune modification détectée — le dossier est déjà à jour.
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn" onClick={() => step === 'preview' ? setStep('upload') : onClose()}>
                {step === 'preview' ? '← Retour' : 'Annuler'}
              </button>
              {step === 'preview' && (isUpdate ? parsed?.nb_modifications > 0 : parsed?.champs_importes > 0) && (
                <button className="btn btn-primary" onClick={confirm} disabled={loading}>
                  {loading ? 'Application...' : isUpdate ? `Appliquer ${parsed.nb_modifications} modification(s) →` : 'Créer le dossier →'}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    function NewProjectModal({ slug, clientMeta, onClose, onCreated }) {
      const [step, setStep] = useState('intro');  // intro | upload | analyse | verdict | creating
      const [file, setFile] = useState(null);
      const [analyse, setAnalyse] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');

      const cd = clientMeta?.client_data || {};
      const nomClient = cd.nom_usuel || cd.nom_officiel || '?';

      async function handleUpload(f) {
        setFile(f);
        setError('');
        setLoading(true);
        setStep('analyse');
        const form = new FormData();
        form.append('file', f);
        form.append('client_slug', slug);
        try {
          const res = await fetch(`${API}/projets/analyse-faisabilite`, {
            method: 'POST', body: form
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setAnalyse(data);
          setStep('verdict');
        } catch (e) {
          setError(e.message);
          setStep('upload');
        } finally {
          setLoading(false);
        }
      }

      async function handleDecision(decision) {
        // decision : 'accepte' | 'condition' | 'refuse'
        setStep('creating');
        setLoading(true);
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('client_slug', slug);
          form.append('decision', decision);
          form.append('analyse_id', analyse?.id || '');
          const res = await fetch(`${API}/projets/creer-depuis-faisabilite`, {
            method: 'POST', body: form
          });
          if (!res.ok) throw new Error(await res.text());
          onCreated();
          onClose();
        } catch (e) {
          setError(e.message);
          setStep('verdict');
        } finally {
          setLoading(false);
        }
      }

      const VERDICT_COLORS = {
        'FAVORABLE': { bg: '#E8F5E9', color: '#1B5E20', icon: '✅' },
        'SOUS CONDITIONS': { bg: '#FFF3E0', color: '#E65100', icon: '⚠️' },
        'DÉFAVORABLE': { bg: '#FFEBEE', color: '#B71C1C', icon: '🚫' },
      };
      const vc = VERDICT_COLORS[analyse?.verdict] || VERDICT_COLORS['SOUS CONDITIONS'];

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ width: 600 }}>

            {/* ── INTRO ────────────────────────────────────────────────────── */}
            {step === 'intro' && <>
              <div className="modal-title">📋 Nouveau projet</div>
              <div className="modal-sub">La création d'un projet nécessite l'étude de faisabilité complétée.</div>

              <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>📋 Processus de création projet</div>
                {[
                  ['1', 'Téléchargez le template et envoyez-le au client', true],
                  ['2', 'Le client remplit les hypothèses (budget, billetterie, partenaires)'],
                  ['3', 'Importez le fichier complété ici'],
                  ['4', 'Claude analyse la faisabilité et émet un verdict'],
                  ['5', 'Vous décidez : accepter, accepter sous conditions, ou refuser'],
                ].map(([n, label, hasLink]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, fontSize: 13 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                    <div>
                      {label}
                      {hasLink && <> — <a href={`${API}/templates/faisabilite-projet`} target="_blank" style={{ color: 'var(--accent)', fontWeight: 500 }}>Télécharger le template →</a></>}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius)', padding: '28px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface2)' }}
                onClick={() => document.getElementById('proj-file-input').click()}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Importer le template de faisabilité complété</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>TEMPLATE_FAISABILITE_PROJET.xlsx (.xlsx uniquement)</div>
                <input id="proj-file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
              </div>

              {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginTop: 12 }}>{error}</div>}

              <div className="modal-footer">
                <button className="btn" onClick={onClose}>Annuler</button>
              </div>
            </>}

            {/* ── ANALYSE ──────────────────────────────────────────────────── */}
            {step === 'analyse' && (
              <div className="empty" style={{ padding: '48px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Claude analyse la faisabilité…</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Vérification des indicateurs financiers et réglementaires</div>
              </div>
            )}

            {/* ── VERDICT ──────────────────────────────────────────────────── */}
            {step === 'verdict' && analyse && <>
              <div className="modal-title">🔍 Analyse de faisabilité — {analyse.nom_projet}</div>

              {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{error}</div>}

              {/* Verdict principal */}
              <div style={{ background: vc.bg, borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14, border: `1.5px solid ${vc.color}20` }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: vc.color, marginBottom: 6 }}>{vc.icon} {analyse.verdict}</div>
                <div style={{ fontSize: 13, color: vc.color }}>{analyse.synthese}</div>
              </div>

              {/* Indicateurs */}
              <div style={{ marginBottom: 14, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                {(analyse.indicateurs || []).map((ind, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <span style={{ fontSize: 14 }}>{ind.statut === 'OK' ? '✅' : ind.statut === 'WARN' ? '⚠️' : ind.statut === 'ERROR' ? '🚫' : '❓'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{ind.label}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 11 }}>{ind.valeur} — Norme : {ind.norme}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conditions si applicable */}
              {analyse.conditions?.length > 0 && (
                <div style={{ background: 'var(--warn-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--warn)', marginBottom: 6 }}>Conditions à remplir :</div>
                  {analyse.conditions.map((c, i) => <div key={i} style={{ color: 'var(--warn)' }}>• {c}</div>)}
                </div>
              )}

              {/* Chiffres clés */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  ['Budget total', `${(analyse.budget_total || 0).toLocaleString('fr-FR')} €`],
                  ['Subventions', `${(analyse.total_subventions || 0).toLocaleString('fr-FR')} €`],
                  ['Billetterie', `${(analyse.total_billetterie || 0).toLocaleString('fr-FR')} €`],
                  ['Solde prév.', `${(analyse.solde || 0).toLocaleString('fr-FR')} €`],
                ].map(([label, val]) => (
                  <div key={label} style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Décision */}
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, textAlign: 'center' }}>
                Votre décision pour ce projet :
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: 10 }}>
                <button className="btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleDecision('refuse')}>
                  🚫 Refuser
                </button>
                <button className="btn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}
                  onClick={() => handleDecision('condition')}>
                  ⚠️ Accepter sous conditions
                </button>
                <button className="btn btn-primary"
                  onClick={() => handleDecision('accepte')}>
                  ✅ Accepter — Créer le projet
                </button>
              </div>
            </>}

            {/* ── CREATING ─────────────────────────────────────────────────── */}
            {step === 'creating' && (
              <div className="empty" style={{ padding: '48px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Création du projet en cours…</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Génération des Excel Drive + fiche de faisabilité</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Modal édition client ──────────────────────────────────────────────────────

    function EditClientModal({ detail, onClose, onSaved, onDeleted }) {
      const cd = detail.client_data || {};
      const [form, setForm] = useState({
        ...cd,
        emails_surveillance: (cd.emails_surveillance || []).join(', '),
      });
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [deleteStep, setDeleteStep] = useState(0); // 0=caché, 1=première confirmation, 2=deuxième confirmation

      function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

      async function submit() {
        setLoading(true);
        try {
          const payload = {
            ...form,
            emails_surveillance: form.emails_surveillance
              ? form.emails_surveillance.split(',').map(e => e.trim()).filter(Boolean)
              : [],
          };
          const res = await fetch(`${API}/clients/${detail.slug}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(await res.text());
          const updated = await res.json();
          onSaved(updated);
          onClose();
        } catch (e) {
          setError('Erreur : ' + e.message);
        } finally {
          setLoading(false);
        }
      }

      async function confirmDelete() {
        setLoading(true);
        try {
          const res = await fetch(`${API}/clients/${detail.slug}?confirm=SUPPRIMER`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error(await res.text());
          onDeleted();
          onClose();
        } catch (e) {
          setError('Erreur suppression : ' + e.message);
          setDeleteStep(0);
        } finally {
          setLoading(false);
        }
      }

      const isFrance = cd.type_structure === 'asso_france';

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal">
            <div className="modal-title">Modifier le dossier</div>
            <div className="modal-sub">{cd.nom_usuel || cd.nom_officiel}</div>
            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{error}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nom officiel</label>
                <input className="form-input" value={form.nom_officiel || ''} onChange={e => set('nom_officiel', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom usuel</label>
                <input className="form-input" value={form.nom_usuel || ''} onChange={e => set('nom_usuel', e.target.value)} />
              </div>
            </div>

            {isFrance && <div className="form-grid">
              <div className="form-group">
                <label className="form-label">SIRET</label>
                <input className="form-input" value={form.siret || ''} onChange={e => set('siret', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Licence Type 1</label>
                <input className="form-input" value={form.licence_type1 || ''} onChange={e => set('licence_type1', e.target.value)} />
              </div>
            </div>}

            <div className="form-group">
              <label className="form-label">{isFrance ? 'Président(e)' : 'Directeur(rice) Général(e)'}</label>
              <input className="form-input" value={form.president || ''} onChange={e => set('president', e.target.value)} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Email principal</label>
                <input className="form-input" value={form.email_contact || ''} onChange={e => set('email_contact', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-input" value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Adresse du siège</label>
              <input className="form-input" value={form.adresse_siege || ''} onChange={e => set('adresse_siege', e.target.value)} />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">📧 Emails surveillés par l'agent IA</label>
              <input
                className="form-input"
                value={form.emails_surveillance || ''}
                onChange={e => set('emails_surveillance', e.target.value)}
                placeholder="contact@asso.fr, artiste@gmail.com, ..."
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                Sépare les adresses par des virgules. L'agent rattachera automatiquement les mails reçus de ces adresses à ce client.
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {/* Zone suppression */}
              <div>
                {deleteStep === 0 && (
                  <button className="btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setDeleteStep(1)}>
                    🗑 Supprimer
                  </button>
                )}
                {deleteStep === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--danger)' }}>Archiver et supprimer définitivement ?</span>
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => setDeleteStep(0)}>Non</button>
                    <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setDeleteStep(2)}>Oui, continuer</button>
                  </div>
                )}
                {deleteStep === 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>⚠️ Dernière confirmation — cette action est irréversible</span>
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => setDeleteStep(0)}>Annuler</button>
                    <button className="btn" style={{ fontSize: 12, background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }} onClick={confirmDelete} disabled={loading}>
                      {loading ? '...' : 'Supprimer définitivement'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={onClose}>Annuler</button>
                <button className="btn btn-primary" onClick={submit} disabled={loading}>
                  {loading ? 'Sauvegarde…' : 'Sauvegarder →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Écran de connexion ────────────────────────────────────────────────────────

    function LoginScreen({ onAuth }) {
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [shake, setShake] = useState(false);

      async function handleLogin(e) {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        setError('');
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
          });
          if (res.ok) {
            onAuth();
          } else {
            setError('Mot de passe incorrect');
            setShake(true);
            setTimeout(() => setShake(false), 600);
          }
        } catch {
          setError('Impossible de contacter le serveur');
        } finally {
          setLoading(false);
          setPassword('');
        }
      }

      return (
        <div style={{
          minHeight: '100vh', background: '#2834B7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 400, padding: '48px 44px',
            background: '#FFFFFF', borderRadius: 16,
            boxShadow: '0 20px 60px rgba(40,52,183,0.3)',
            animation: shake ? 'shake 0.4s ease' : 'none',
          }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#2834B7', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, boxShadow: '0 4px 16px rgba(40,52,183,0.3)',
              }}>
                <span style={{ fontSize: 28 }}>🕊️</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 22, fontWeight: 700, color: '#FF795A', letterSpacing: '2px', textTransform: 'uppercase' }}>PAUSE</span>
                <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 22, fontWeight: 700, color: '#2834B7', letterSpacing: '2px', textTransform: 'uppercase' }}> KRÉYOL</span>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Ingénierie culturelle</div>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '11px 14px',
                    borderRadius: 8, border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border2)'}`,
                    fontSize: 15, fontFamily: 'inherit', background: 'var(--surface)',
                    outline: 'none', transition: 'border 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-mid)'}
                  onBlur={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border2)'}
                />
                {error && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                    {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  width: '100%', padding: '12px',
                  background: loading || !password ? '#E0E0E0' : '#FF795A',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                  cursor: loading || !password ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text3)' }}>
              Accès réservé — Pause Kreyol
            </div>
          </div>

          <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
