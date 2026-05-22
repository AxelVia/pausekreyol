    // ── Communication ─────────────────────────────────────────────────────────────

    function CommView({ clients }) {
      const [tab, setTab] = useState('charte');
      const [charte, setCharte] = useState(null);
      const [showCharteEditor, setShowCharteEditor] = useState(false);

      // Générateur signature email
      const [sigForm, setSigForm] = useState({ nom: 'Océane Hurez', titre: 'Ingénieure culturelle · Pause Kréyol', email: 'contact@pausekreyol.fr', telephone: '+33 6 58 91 08 14', site: 'pausekreyol.fr', slogan: 'De l\'idée au lancement, valorisons votre projet !', imgGauche: '', imgGaucheH: 80, imgBas: '', imgBasW: 500 });
      const [sigGenerated, setSigGenerated] = useState(true);

      // Assets partagés entre la signature et l'onglet Assets
      const [assets, setAssetsState] = useState([]);

      useEffect(() => {
        fetch(`${API}/comm/config`).then(r => r.json()).then(data => {
          setCharte(data.charte || null);
          setAssetsState(data.assets || []);
        });
      }, []);

      function saveAssetsShared(list) {
        setAssetsState(list);
        fetch(`${API}/comm/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charte, assets: list }) });
      }

      // Générateur email client
      const [emailForm, setEmailForm] = useState({ client: '', type: 'onboarding', custom: '' });
      const [emailResult, setEmailResult] = useState('');
      const [emailLoading, setEmailLoading] = useState(false);

      function setSig(k, v) { setSigForm(p => ({ ...p, [k]: v })); }
      function setEF(k, v) { setEmailForm(p => ({ ...p, [k]: v })); }

      function saveCharte(data) {
        setCharte(data);
        fetch(`${API}/comm/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charte: data, assets }) });
        setShowCharteEditor(false);
      }

      async function generateEmail() {
        if (!emailForm.type && !emailForm.custom) return;
        setEmailLoading(true);
        setEmailResult('');
        try {
          const client = clients.find(c => c.slug === emailForm.client);
          const res = await fetch(`${API}/comm/generer-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_nom: client?.nom || emailForm.client || 'Client',
              type: emailForm.type,
              custom: emailForm.custom,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setEmailResult(data.email);
          }
        } catch { }
        setEmailLoading(false);
      }

      const C = charte?.couleurs || { primaire: '#FF795A', secondaire: '#2834B7', neutre: '#F7F5F0', texte: '#1A1916' };

      return (
        <div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[['charte', '🎨 Charte graphique'], ['signature', '✉️ Signature email'], ['emails', '📧 Modèles emails'], ['assets', '📁 Assets']].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {/* ── CHARTE GRAPHIQUE ───────────────────────────────────────────────── */}
          {tab === 'charte' && (
            <div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                {/* Couleurs */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Palette de couleurs</div>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowCharteEditor(true)}>
                      {charte ? '✏️ Modifier' : '+ Configurer'}
                    </button>
                  </div>
                  {charte ? (
                    <div>
                      {[['Couleur primaire', C.primaire], ['Couleur secondaire', C.secondaire], ['Fond / Neutre', C.neutre], ['Texte', C.texte]].map(([label, color]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: color, border: '1px solid var(--border)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{color}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <div className="empty-icon">🎨</div>
                      <div className="empty-text">Configurez votre charte graphique pour centraliser les couleurs et polices.</div>
                    </div>
                  )}
                </div>

                {/* Typo & Identité */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Typographie & Identité</div>
                  </div>
                  {charte ? (
                    <div>
                      {[
                        ['Police principale', charte.typo?.principale || '—'],
                        ['Police secondaire', charte.typo?.secondaire || '—'],
                        ['Slogan', charte.identite?.slogan || '—'],
                        ['Site web', charte.identite?.site || '—'],
                        ['Email contact', charte.identite?.email || '—'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text3)' }}>{label}</span>
                          <span style={{ fontWeight: 500 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty"><div className="empty-text">Aucune charte configurée.</div></div>
                  )}
                </div>
              </div>

              {/* Aperçu charte */}
              {charte && (
                <div className="card">
                  <div className="card-header"><div className="card-title">Aperçu de la charte</div></div>
                  <div style={{ padding: 20, background: C.neutre, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: charte.typo?.principale || 'inherit', color: C.primaire, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                      Pause Kreyol
                    </div>
                    <div style={{ fontFamily: charte.typo?.secondaire || 'inherit', color: C.texte, fontSize: 14, marginBottom: 16 }}>
                      {charte.identite?.slogan || 'Administration de production culturelle'}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ padding: '8px 18px', background: C.primaire, color: 'white', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Bouton principal</div>
                      <div style={{ padding: '8px 18px', background: 'white', color: C.primaire, border: `1.5px solid ${C.primaire}`, borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Bouton secondaire</div>
                      <div style={{ padding: '8px 18px', background: C.secondaire, color: 'white', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Accentuation</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SIGNATURE EMAIL ────────────────────────────────────────────────── */}
          {tab === 'signature' && (
            <div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                {/* Paramètres */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Paramètres de la signature</div></div>
                  {[
                    ['Nom / Structure', 'nom', 'Océane Hurez'],
                    ['Titre / Fonction', 'titre', 'Ingénieure culturelle · Pause Kréyol'],
                    ['Email', 'email', 'contact@pausekreyol.fr'],
                    ['Téléphone', 'telephone', '+33 6 58 91 08 14'],
                    ['Site web', 'site', 'pausekreyol.fr'],
                    ['Slogan (optionnel)', 'slogan', 'De l\'idée au lancement, valorisons votre projet !'],
                  ].map(([label, key, placeholder]) => (
                    <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label">{label}</label>
                      <input className="form-input" value={sigForm[key]} onChange={e => setSig(key, e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}

                  {/* Image gauche */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
                      🖼 Image à gauche (logo, photo...)
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">URL de l'image (Drive, hébergement...)</label>
                      <input className="form-input" value={sigForm.imgGauche || ''} onChange={e => setSig('imgGauche', e.target.value)}
                        placeholder="https://drive.google.com/uc?id=..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Hauteur (px)</label>
                      <input className="form-input" type="number" value={sigForm.imgGaucheH || 80} onChange={e => setSig('imgGaucheH', parseInt(e.target.value))}
                        style={{ width: 90 }} />
                    </div>
                    {/* Sélecteur rapide depuis les assets */}
                    {assets.filter(a => ['logo', 'photo', 'charte'].includes(a.type)).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Ou choisir depuis vos assets :</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {assets.filter(a => ['logo', 'photo', 'charte'].includes(a.type)).map(a => (
                            <button key={a.id} className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setSig('imgGauche', a.url)}>
                              {a.nom}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image bas */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
                      🖼 Image en dessous (bannière, newsletter...)
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">URL de l'image</label>
                      <input className="form-input" value={sigForm.imgBas || ''} onChange={e => setSig('imgBas', e.target.value)}
                        placeholder="https://..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Largeur max (px, ex: 500)</label>
                      <input className="form-input" type="number" value={sigForm.imgBasW || 500} onChange={e => setSig('imgBasW', parseInt(e.target.value))}
                        style={{ width: 90 }} />
                    </div>
                    {assets.filter(a => ['photo', 'video', 'template'].includes(a.type)).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Ou choisir depuis vos assets :</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {assets.filter(a => ['photo', 'video', 'template'].includes(a.type)).map(a => (
                            <button key={a.id} className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setSig('imgBas', a.url)}>
                              {a.nom}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={() => {
                    setSigGenerated(true);
                    setTimeout(() => {
                      const el = document.getElementById('sig-html');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                  }}>
                    ✅ Générer la signature →
                  </button>
                </div>

                {/* Aperçu */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Aperçu live</div>
                    {sigGenerated && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" style={{ fontSize: 11 }}
                          onClick={() => {
                            const el = document.getElementById('sig-html');
                            if (!el) return;
                            // Copie le HTML pour coller dans Gmail/Outlook
                            const type = 'text/html';
                            const blob = new Blob([el.outerHTML], { type });
                            const data = [new ClipboardItem({ [type]: blob })];
                            navigator.clipboard.write(data)
                              .then(() => alert('✅ Signature HTML copiée ! Collez-la dans les paramètres de signature de Gmail ou Outlook.'))
                              .catch(() => {
                                // Fallback texte brut
                                navigator.clipboard.writeText(el.innerText || '')
                                  .then(() => alert('Texte copié (format simplifié). Pour le HTML complet, utilisez Chrome.'));
                              });
                          }}>
                          📋 Copier pour Gmail/Outlook
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Signature avec les 2 emplacements image */}
                  <div id="sig-html" style={{ display: 'inline-block', fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
                    <table cellPadding="0" cellSpacing="0" border="0" style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {/* Image gauche */}
                          {sigForm.imgGauche && (
                            <td style={{ paddingRight: 16, verticalAlign: 'middle' }}>
                              <img src={sigForm.imgGauche} alt="logo"
                                style={{ height: sigForm.imgGaucheH || 80, width: 'auto', display: 'block' }}
                                onError={e => { e.target.style.display = 'none'; }} />
                            </td>
                          )}
                          {/* Contenu texte */}
                          <td style={{ borderLeft: '4px solid #FF795A', paddingLeft: 16, verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#2834B7', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                              {sigForm.nom}
                            </div>
                            <div style={{ color: '#FF795A', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Arial, sans-serif' }}>
                              {sigForm.titre}
                            </div>
                            <div style={{ height: 1, background: '#FFD2AD', marginBottom: 8, width: 160 }} />
                            {sigForm.telephone && (
                              <div style={{ color: '#333', fontSize: 12, marginBottom: 3, fontFamily: 'Arial, sans-serif' }}>
                                📞 {sigForm.telephone}
                              </div>
                            )}
                            <div style={{ color: '#333', fontSize: 12, marginBottom: 3, fontFamily: 'Arial, sans-serif' }}>
                              ✉️ {sigForm.email}
                            </div>
                            {sigForm.site && (
                              <div style={{ color: '#2834B7', fontSize: 12, marginBottom: 8, fontFamily: 'Arial, sans-serif' }}>
                                🌐 {sigForm.site}
                              </div>
                            )}
                            {sigForm.slogan && (
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #FFD2AD' }}>
                                <div style={{ fontStyle: 'italic', color: '#888', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
                                  "{sigForm.slogan}"
                                </div>
                              </div>
                            )}
                            <div style={{ marginTop: 10, background: '#2834B7', display: 'inline-block', padding: '5px 12px', borderRadius: 4 }}>
                              <span style={{ color: '#FF795A', fontWeight: 700, fontSize: 12, letterSpacing: '1.5px', fontFamily: 'Arial, sans-serif' }}>PAUSE</span>
                              <span style={{ color: '#FFD2AD', fontWeight: 700, fontSize: 12, letterSpacing: '1.5px', fontFamily: 'Arial, sans-serif' }}>KRÉYOL</span>
                            </div>
                          </td>
                        </tr>
                        {/* Image bas */}
                        {sigForm.imgBas && (
                          <tr>
                            <td colSpan={sigForm.imgGauche ? 2 : 1} style={{ paddingTop: 14 }}>
                              <img src={sigForm.imgBas} alt="bannière"
                                style={{ maxWidth: sigForm.imgBasW || 500, width: '100%', display: 'block', borderRadius: 4 }}
                                onError={e => { e.target.style.display = 'none'; }} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!sigGenerated && (
                    <div className="empty" style={{ marginTop: 12 }}>
                      <div className="empty-text">L'aperçu se met à jour en temps réel.</div>
                    </div>
                  )}

                  {/* Guide URL images */}
                  <div style={{ marginTop: 14, background: 'var(--pk-blue-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 11, color: 'var(--text2)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 Comment héberger une image pour la signature ?</div>
                    <div>1. Uploader l'image sur Google Drive</div>
                    <div>2. Clic droit → Obtenir le lien → Accès public</div>
                    <div>3. Transformer le lien Drive : <code style={{ background: 'white', padding: '1px 4px', borderRadius: 3 }}>drive.google.com/uc?id=VOTRE_ID</code></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MODÈLES EMAILS ─────────────────────────────────────────────────── */}
          {tab === 'emails' && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header"><div className="card-title">Générer un email</div></div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-input" value={emailForm.client} onChange={e => setEF('client', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type d'email</label>
                  <select className="form-input" value={emailForm.type} onChange={e => setEF('type', e.target.value)}>
                    <option value="onboarding">Accueil nouveau client</option>
                    <option value="devis_envoi">Envoi d'un devis</option>
                    <option value="devis_relance">Relance devis non signé</option>
                    <option value="facture_envoi">Envoi d'une facture</option>
                    <option value="facture_relance">Relance facture impayée</option>
                    <option value="subvention_update">Mise à jour subvention</option>
                    <option value="projet_demarrage">Démarrage de projet</option>
                    <option value="bilan">Bilan de mission</option>
                    <option value="custom">Email personnalisé...</option>
                  </select>
                </div>
                {emailForm.type === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Décrivez l'email à générer</label>
                    <textarea className="form-input" rows={3} value={emailForm.custom} onChange={e => setEF('custom', e.target.value)} placeholder="Ex: Email pour demander les documents manquants au client avant le dépôt de subvention..." style={{ resize: 'vertical' }} />
                  </div>
                )}
                <button className="btn btn-primary" onClick={generateEmail} disabled={emailLoading}>
                  {emailLoading ? '⏳ Génération...' : '✨ Générer avec Claude →'}
                </button>

                {/* Modèles rapides */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Modèles rapides</div>
                  {[
                    ['📩 Accueil client', 'onboarding'],
                    ['📤 Relance devis', 'devis_relance'],
                    ['⚠️ Relance facture', 'facture_relance'],
                    ['🎉 Démarrage projet', 'projet_demarrage'],
                  ].map(([label, type]) => (
                    <button key={type} className="btn" style={{ fontSize: 11, padding: '4px 10px', marginRight: 6, marginBottom: 6 }}
                      onClick={() => { setEF('type', type); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Email généré</div>
                  {emailResult && (
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => navigator.clipboard.writeText(emailResult)}>
                      📋 Copier
                    </button>
                  )}
                </div>
                {emailResult ? (
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                    {emailResult}
                  </div>
                ) : (
                  <div className="empty">
                    <div className="empty-icon">📧</div>
                    <div className="empty-text">Sélectionnez un type d'email et cliquez "Générer" pour obtenir un brouillon rédigé par Claude.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ASSETS ─────────────────────────────────────────────────────────── */}
          {tab === 'assets' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Assets & Ressources</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Liens vers vos fichiers Drive</div>
              </div>
              <AssetsList assets={assets} setAssets={saveAssetsShared} />
            </div>
          )}

          {/* Modal éditeur charte */}
          {showCharteEditor && (
            <CharteEditor initial={charte} onSave={saveCharte} onClose={() => setShowCharteEditor(false)} />
          )}
        </div>
      );
    }

    // ── Éditeur de charte ─────────────────────────────────────────────────────────

    function CharteEditor({ initial, onSave, onClose }) {
      const [form, setForm] = useState(initial || {
        couleurs: { primaire: '#FF795A', secondaire: '#2834B7', neutre: '#FFD2AD', texte: '#000000' },
        typo: { principale: 'Josefin Sans', secondaire: 'DM Sans' },
        identite: { slogan: 'De l\'idée au lancement, valorisons votre projet !', site: 'pausekreyol.fr', email: 'contact@pausekreyol.fr', telephone: '+33 6 58 91 08 14' },
      });

      function set(section, key, val) {
        setForm(p => ({ ...p, [section]: { ...p[section], [key]: val } }));
      }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-title">🎨 Configurer la charte graphique</div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Couleurs</div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[['Couleur primaire', 'primaire'], ['Couleur secondaire', 'secondaire'], ['Fond / Neutre', 'neutre'], ['Couleur texte', 'texte']].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.couleurs[key]} onChange={e => set('couleurs', key, e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 6, border: '1px solid var(--border2)', cursor: 'pointer', padding: 2 }} />
                    <input className="form-input" value={form.couleurs[key]} onChange={e => set('couleurs', key, e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="#000000" />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', margin: '12px 0 8px' }}>Typographie</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Police principale</label>
                <select className="form-input" value={form.typo.principale} onChange={e => set('typo', 'principale', e.target.value)}>
                  {['DM Sans', 'Inter', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Raleway', 'Georgia', 'Playfair Display'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Police secondaire</label>
                <select className="form-input" value={form.typo.secondaire} onChange={e => set('typo', 'secondaire', e.target.value)}>
                  {['DM Mono', 'Georgia', 'Playfair Display', 'Merriweather', 'Inter', 'Poppins', 'Lato'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', margin: '12px 0 8px' }}>Identité</div>
            {[['Slogan', 'slogan', 'Administration de production culturelle'], ['Site web', 'site', 'pausekreyol.fr'], ['Email', 'email', 'contact@pausekreyol.fr'], ['Téléphone', 'telephone', '']].map(([label, key, ph]) => (
              <div key={key} className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={form.identite[key] || ''} onChange={e => set('identite', key, e.target.value)} placeholder={ph} />
              </div>
            ))}

            <div className="modal-footer">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={() => onSave(form)}>Enregistrer →</button>
            </div>
          </div>
        </div>
      );
    }

    // ── Assets Drive ──────────────────────────────────────────────────────────────

    function AssetsList({ assets: externalAssets, setAssets: setExternalAssets }) {
      const [internalAssets, setInternalAssets] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_assets') || '[]'); } catch { return []; }
      });

      // Utilise les props si disponibles, sinon l'état interne
      const assets = externalAssets !== undefined ? externalAssets : internalAssets;
      function save(list) {
        if (setExternalAssets) {
          setExternalAssets(list);
        } else {
          setInternalAssets(list);
          try { localStorage.setItem('pk_assets', JSON.stringify(list)); } catch { }
        }
      }

      const [showAdd, setShowAdd] = useState(false);
      const [form, setForm] = useState({ nom: '', type: 'logo', url: '', note: '' });

      const TYPES = {
        logo: { label: 'Logo', icon: '🖼' },
        charte: { label: 'Charte graphique', icon: '🎨' },
        template: { label: 'Template', icon: '📄' },
        photo: { label: 'Photo / Visuel', icon: '📷' },
        video: { label: 'Vidéo', icon: '🎬' },
        autre: { label: 'Autre', icon: '📁' },
      };

      function addAsset() {
        if (!form.nom || !form.url) return;
        save([...assets, { id: Date.now(), ...form }]);
        setForm({ nom: '', type: 'logo', url: '', note: '' });
        setShowAdd(false);
      }

      return (
        <div>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAdd(true)}>+ Ajouter un asset</button>
          </div>

          {assets.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📁</div>
              <div className="empty-text">Ajoutez des liens vers vos fichiers Drive (logos, chartes, templates...)</div>
            </div>
          ) : (
            <div>
              {Object.entries(TYPES).map(([type, { label, icon }]) => {
                const typeAssets = assets.filter(a => a.type === type);
                if (!typeAssets.length) return null;
                return (
                  <div key={type} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>{icon} {label}</div>
                    {typeAssets.map(a => (
                      <div key={a.id} className="client-row" style={{ padding: '8px 0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{a.nom}</div>
                          {a.note && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.note}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 11, padding: '3px 10px' }}>Ouvrir →</a>
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => save(assets.filter(x => x.id !== a.id))}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal indisponibilité → Google Cal → Zcal */}
          {showIndispoForm && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowIndispoForm(false)}>
              <div className="modal" style={{ maxWidth: 440 }}>
                <div className="modal-title">🚫 Bloquer un créneau Zcal</div>
                <div style={{ fontSize: 12, padding: '8px 10px', background: '#FFF3E0', borderRadius: 6, marginBottom: 12, color: '#5D4037' }}>
                  📅 Ce créneau sera créé dans Google Calendar → Zcal le bloquera automatiquement pour les réservations.
                </div>
                <div className="form-group">
                  <label className="form-label">Titre</label>
                  <input className="form-input" value={newIndispo.titre} onChange={e => setNewIndispo(p=>({...p,titre:e.target.value}))} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date début *</label>
                    <input className="form-input" type="date" value={newIndispo.date_debut} onChange={e => setNewIndispo(p=>({...p,date_debut:e.target.value,date_fin:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date fin</label>
                    <input className="form-input" type="date" value={newIndispo.date_fin} onChange={e => setNewIndispo(p=>({...p,date_fin:e.target.value}))} />
                  </div>
                </div>
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
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowIndispoForm(false)}>Annuler</button>
                  <button className="btn btn-primary" style={{ background: '#D50000', borderColor: '#D50000' }} onClick={async () => {
                    try {
                      const res = await fetch(`${API}/gcal/indisponibilite`, {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify(newIndispo)
                      });
                      if (res.ok) {
                        const saved = await res.json();
                        setIndispos(p => [...p, saved]);
                      }
                    } catch {}
                    setShowIndispoForm(false);
                    setNewIndispo({ titre: 'Indisponible', date_debut: '', date_fin: '', heure_debut: '', heure_fin: '' });
                  }} disabled={!newIndispo.date_debut}>🚫 Bloquer →</button>
                </div>
              </div>
            </div>
          )}

          {showAdd && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
              <div className="modal">
                <div className="modal-title">Ajouter un asset</div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Logo PK couleur, Charte V2..." autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(TYPES).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Lien Drive / URL *</label>
                  <input className="form-input" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://drive.google.com/..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input className="form-input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Version, usage, format..." />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowAdd(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={addAsset} disabled={!form.nom || !form.url}>Ajouter →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

