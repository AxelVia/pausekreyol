    // ── Client detail view ────────────────────────────────────────────────────────

    // ── Documents client catégorisés ─────────────────────────────────────────

    function DocumentsClientView({ detail, slug, onRefresh }) {
      const [catActive, setCatActive] = useState('drive');
      const [uploadMsg, setUploadMsg] = useState('');
      const [driveFiles, setDriveFiles] = useState(null); // null = pas encore chargé
      const [driveLoading, setDriveLoading] = useState(false);
      const [docs, setDocs] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`pk_docs_${slug}`) || '{}'); } catch { return {}; }
      });

      const CATEGORIES = [
        { id: 'admin',     label: 'Admin structure',  icon: '🏛', color: '#2834B7', bg: 'var(--pk-blue-light)',
          exemples: ['Statuts', 'RNA', 'SIRET', 'RIB', 'Récépissé préfecture', 'JO', 'Assurance', 'Compte certifié'] },
        { id: 'social',    label: 'Gestion sociale',  icon: '👥', color: '#6A1B9A', bg: '#F3E5F5',
          exemples: ['Contrats artistes', 'GUSO', 'DPAE', 'Bulletins de salaire', 'Déclarations Urssaf'] },
        { id: 'projet',    label: 'Gestion de projet', icon: '📋', color: '#E65100', bg: '#FFF3E0',
          exemples: ['Budget prévisionnel', 'Dossier subvention', 'Convention', 'Compte-rendu projet'] },
        { id: 'juridique', label: 'Juridique',         icon: '⚖️', color: '#37474F', bg: '#ECEFF1',
          exemples: ['Contrats', 'Procurations', 'Actes notariés', 'Mise en demeure', 'Décisions juridiques', 'CGV'] },
      ];

      function saveDocs(newDocs) {
        setDocs(newDocs);
        try { localStorage.setItem(`pk_docs_${slug}`, JSON.stringify(newDocs)); } catch {}
      }

      async function loadDriveFiles() {
        setDriveLoading(true);
        try {
          const res = await fetch(`${API}/clients/${slug}/drive-files`);
          const d = await res.json();
          setDriveFiles(d);
        } catch { setDriveFiles({ files: [], error: 'Erreur de connexion' }); }
        setDriveLoading(false);
      }

      useEffect(() => { if (catActive === 'drive') loadDriveFiles(); }, [catActive]);

      function addDoc(catId, doc) {
        const updated = { ...docs, [catId]: [...(docs[catId] || []), doc] };
        saveDocs(updated);
      }
      function removeDoc(catId, idx) {
        const updated = { ...docs, [catId]: (docs[catId] || []).filter((_, i) => i !== idx) };
        saveDocs(updated);
      }
      function handleFileUpload(catId, file) {
        const reader = new FileReader();
        reader.onload = e => {
          addDoc(catId, { nom: file.name, type: file.name.split('.').pop().toUpperCase(),
            date: new Date().toLocaleDateString('fr-FR'), data: e.target.result, source: 'local' });
          setUploadMsg(`\u2705 ${file.name} ajout\u00e9`);
          setTimeout(() => setUploadMsg(''), 3000);
        };
        reader.readAsDataURL(file);
      }
      function addLinkDoc(catId) {
        const nom = window.prompt('Nom du document :');
        const url = window.prompt('URL (Drive, lien...) :');
        if (nom && url) {
          addDoc(catId, { nom, url, type: 'LIEN', date: new Date().toLocaleDateString('fr-FR') });
        }
      }

      const FILE_ICONS = { xlsx: '📊', docx: '📄', pdf: '📕', folder: '📁', image: '🖼', other: '📎' };

      return (
        <div>
          {/* Liens Drive principaux */}
          {(detail.drive_folder_id || detail.drive_asso_id) && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: 'var(--pk-blue-light)', borderRadius: 8, alignItems: 'center' }}>
              {detail.drive_asso_id && (
                <a href={`https://docs.google.com/spreadsheets/d/${detail.drive_asso_id}/edit`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                  📊 Fiche Association →
                </a>
              )}
              {detail.drive_projets_folder_id && (
                <a href={`https://drive.google.com/drive/folders/${detail.drive_projets_folder_id}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--pk-orange)', fontWeight: 600 }}>
                  📁 Dossier Projets →
                </a>
              )}
              {detail.drive_folder_id && (
                <a href={`https://drive.google.com/drive/folders/${detail.drive_folder_id}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--pk-blue)', fontWeight: 600 }}>
                  \u2601\uFE0F Dossier Drive complet →
                </a>
              )}
            </div>
          )}

          {/* Tabs catégories */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setCatActive('drive')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${catActive === 'drive' ? 'var(--pk-blue)' : 'var(--border2)'}`,
                background: catActive === 'drive' ? 'var(--pk-blue-light)' : 'var(--surface)',
                color: catActive === 'drive' ? 'var(--pk-blue)' : 'var(--text2)',
                fontWeight: catActive === 'drive' ? 600 : 400, fontSize: 13, cursor: 'pointer' }}>
              \u2601\uFE0F Drive
              {driveFiles?.files?.length > 0 && (
                <span style={{ background: 'var(--pk-blue)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                  {driveFiles.files.length}
                </span>
              )}
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCatActive(cat.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  border: `1.5px solid ${catActive === cat.id ? cat.color : 'var(--border2)'}`,
                  background: catActive === cat.id ? cat.bg : 'var(--surface)',
                  color: catActive === cat.id ? cat.color : 'var(--text2)',
                  fontWeight: catActive === cat.id ? 600 : 400, fontSize: 13, cursor: 'pointer' }}>
                {cat.icon} {cat.label}
                {(docs[cat.id] || []).length > 0 && (
                  <span style={{ background: cat.color, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                    {(docs[cat.id] || []).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB DRIVE ── */}
          {catActive === 'drive' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">\u2601\uFE0F Fichiers Google Drive</div>
                  <div className="card-subtitle">Fichiers stock\u00e9s dans le dossier Drive de la structure</div>
                </div>
                <button className="btn" style={{ fontSize: 11 }} onClick={loadDriveFiles} disabled={driveLoading}>
                  {driveLoading ? '\u23F3 Chargement...' : '🔄 Actualiser'}
                </button>
              </div>

              {!detail.drive_folder_id && (
                <div className="empty">
                  <div className="empty-text">Dossier Drive non configur\u00e9 pour ce client. Effectuez une synchro Drive dans Dossiers clients.</div>
                </div>
              )}
              {detail.drive_folder_id && driveLoading && (
                <div className="empty"><div className="empty-text">\u23F3 Chargement des fichiers...</div></div>
              )}
              {driveFiles?.message && !driveLoading && (
                <div style={{ padding: '10px 12px', background: 'var(--pk-blue-light)', borderRadius: 8, fontSize: 12, color: 'var(--pk-blue)', marginBottom: 8 }}>
                  \u2139\uFE0F {driveFiles.message}
                  {driveFiles.folder_id && (
                    <a href={`https://drive.google.com/drive/folders/${driveFiles.folder_id}`} target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft: 8, color: 'var(--pk-blue)', fontWeight: 600 }}>Ouvrir sur Drive \u2192</a>
                  )}
                </div>
              )}
              {driveFiles?.files?.length === 0 && !driveLoading && detail.drive_folder_id && !driveFiles?.message && (
                <div className="empty"><div className="empty-text">Aucun fichier dans le dossier Drive.</div></div>
              )}
              {(driveFiles?.files || []).map((f, i) => (
                <a key={f.id || i} href={f.url || `https://drive.google.com/file/d/${f.id}/view`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{FILE_ICONS[f.type] || FILE_ICONS.other}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pk-blue)' }}>{f.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Modifi\u00e9 le {f.modifie || '—'}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </a>
              ))}
            </div>
          )}

          {/* ── TABS CATEGORIES LOCALES ── */}
          {CATEGORIES.filter(c => c.id === catActive).map(cat => {
            const catDocs = docs[cat.id] || [];
            return (
              <div key={cat.id} className="card">
                <div style={{ marginBottom: 12, padding: '8px 12px', background: cat.bg, borderRadius: 8, borderLeft: `3px solid ${cat.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.icon} {cat.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Exemples : {cat.exemples.join(' \u00B7 ')}</div>
                </div>
                {catDocs.length === 0 ? (
                  <div className="empty" style={{ padding: '16px 0' }}><div className="empty-text">Aucun document dans cette cat\u00e9gorie.</div></div>
                ) : catDocs.map((doc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: cat.bg, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {doc.type}
                    </div>
                    <div style={{ flex: 1 }}>
                      {doc.url
                        ? <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pk-blue)' }}>{doc.nom}</a>
                        : doc.data
                          ? <a href={doc.data} download={doc.nom} style={{ fontSize: 13, fontWeight: 500 }}>{doc.nom}</a>
                          : <span style={{ fontSize: 13, fontWeight: 500 }}>{doc.nom}</span>
                      }
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.date}{doc.source === 'local' ? ' (local)' : ''}</div>
                    </div>
                    <button onClick={() => removeDoc(cat.id, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>\u2715</button>
                  </div>
                ))}
                {uploadMsg && <div style={{ fontSize: 12, color: 'var(--success)', padding: '6px 0' }}>{uploadMsg}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <label className="btn" style={{ fontSize: 12, cursor: 'pointer' }}>
                    📁 Ajouter un fichier
                    <input type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFileUpload(cat.id, e.target.files[0])} />
                  </label>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => addLinkDoc(cat.id)}>🔗 Ajouter un lien</button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    
    // ── Logo & Signature client ───────────────────────────────────────────────────

    function IdentiteVisuelleTab({ slug, nomClient, logoUrl, saveLogo, signatureData, saveSig, onShowSigPad }) {
      const [logoInput, setLogoInput] = useState(logoUrl || '');
      const [sigMsg, setSigMsg] = useState('');

      function handleLogoFile(file) {
        const reader = new FileReader();
        reader.onload = e => { saveLogo(e.target.result); setLogoInput(''); };
        reader.readAsDataURL(file);
      }

      function applyLogoUrl() { saveLogo(logoInput); }

      function downloadSig() {
        if (!signatureData) return;
        const a = document.createElement('a');
        a.href = signatureData;
        a.download = `signature_${slug}.png`;
        a.click();
      }

      function copySigToClipboard() {
        if (!signatureData) return;
        fetch(signatureData).then(r => r.blob()).then(blob => {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            .then(() => setSigMsg('✅ Signature copiée — collez-la dans votre document'))
            .catch(() => setSigMsg('📥 Téléchargez la signature et insérez-la manuellement'));
          setTimeout(() => setSigMsg(''), 4000);
        });
      }

      return (
        <div className="grid-2">
          {/* Logo */}
          <div className="card">
            <div className="card-header"><div className="card-title">🖼 Logo du client</div></div>

            {logoUrl ? (
              <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'var(--surface2)', borderRadius: 8 }}>
                <img src={logoUrl} alt="logo" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                <div style={{ marginTop: 10 }}>
                  <button className="btn" style={{ fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => saveLogo('')}>🗑 Supprimer</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, background: 'var(--surface2)', borderRadius: 8, color: 'var(--text3)', marginBottom: 16 }}>
                Aucun logo. Uploadez une image ou collez une URL.
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Uploader depuis votre ordinateur</div>
            <label className="btn" style={{ cursor: 'pointer', marginBottom: 12 }}>
              📁 Choisir une image (PNG, JPG, SVG)
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && handleLogoFile(e.target.files[0])} />
            </label>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Ou depuis une URL (Drive, hébergement)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" value={logoInput} onChange={e => setLogoInput(e.target.value)}
                placeholder="https://drive.google.com/uc?id=..." style={{ fontSize: 12 }} />
              <button className="btn btn-primary" style={{ fontSize: 12, flexShrink: 0 }} onClick={applyLogoUrl} disabled={!logoInput}>Appliquer</button>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', padding: '8px 10px', background: 'var(--pk-blue-light)', borderRadius: 6 }}>
              💡 Pour Drive : Fichier → Partager (accès public) → Copier le lien → Remplacer /view par /uc?id= dans l'URL
            </div>
          </div>

          {/* Signature */}
          <div className="card">
            <div className="card-header"><div className="card-title">✍️ Signature manuscrite</div></div>

            {signatureData ? (
              <div>
                <div style={{ textAlign: 'center', padding: 16, background: 'var(--surface2)', borderRadius: 8, marginBottom: 12 }}>
                  <img src={signatureData} alt="signature" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
                  Signature enregistrée pour <strong>{nomClient}</strong>.
                  Utilisez le bouton "Coller" pour l'insérer dans un document.
                </div>
                {sigMsg && <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--success-light)', color: 'var(--success)', marginBottom: 10 }}>{sigMsg}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={copySigToClipboard}>📋 Copier l'image</button>
                  <button className="btn" style={{ fontSize: 12 }} onClick={downloadSig}>⬇️ Télécharger PNG</button>
                  <button className="btn" style={{ fontSize: 12 }} onClick={onShowSigPad}>✏️ Redessiner</button>
                  <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => saveSig('')}>🗑 Supprimer</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', padding: 32, background: 'var(--surface2)', borderRadius: 8, color: 'var(--text3)', marginBottom: 14 }}>
                  Aucune signature enregistrée.
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Option 1 — Dessiner la signature</div>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onShowSigPad}>✍️ Ouvrir le pad de signature</button>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Option 2 — Importer une image</div>
                  <label className="btn" style={{ cursor: 'pointer', fontSize: 12 }}>
                    📁 Importer PNG/JPG de la signature
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]; if (!f) return;
                        const reader = new FileReader();
                        reader.onload = ev => saveSig(ev.target.result);
                        reader.readAsDataURL(f);
                      }} />
                  </label>
                </div>

                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text2)', padding: '10px 12px', background: 'var(--pk-blue-light)', borderRadius: 6 }}>
                  <strong>💡 Usage :</strong> Une fois la signature enregistrée, utilisez "Copier l'image" puis collez-la (Ctrl+V) directement dans Word, Google Docs, un PDF ou un dossier de subvention.
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Pad de signature (style DocuSign) ─────────────────────────────────────────

    function SignaturePadModal({ onClose, onSave, existing }) {
      const canvasRef = useRef(null);
      const [drawing, setDrawing] = useState(false);
      const [hasDrawn, setHasDrawn] = useState(false);
      const [lastPos, setLastPos] = useState(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#2834B7';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (existing) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = existing;
        }
      }, []);

      function getPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
          return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      }

      function startDraw(e) {
        e.preventDefault();
        const canvas = canvasRef.current;
        setDrawing(true);
        setHasDrawn(true);
        setLastPos(getPos(e, canvas));
      }

      function draw(e) {
        e.preventDefault();
        if (!drawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setLastPos(pos);
      }

      function stopDraw(e) { e.preventDefault(); setDrawing(false); setLastPos(null); }

      function clear() {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }

      function save() {
        const canvas = canvasRef.current;
        onSave(canvas.toDataURL('image/png'));
      }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-title">✍️ Signature</div>
            <div className="modal-sub">Dessinez la signature ci-dessous (souris ou écran tactile)</div>

            <div style={{ border: '2px solid var(--pk-blue)', borderRadius: 8, overflow: 'hidden', marginBottom: 14, background: 'white', touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, textAlign: 'center' }}>
              — Signez ici —
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={clear}>🗑 Effacer</button>
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={!hasDrawn && !existing}>
                ✅ Enregistrer la signature
              </button>
            </div>
          </div>
        </div>
      );
    }

    function ClientDetailView({ slug, onBack, onRefresh }) {
      const [detail, setDetail] = useState(null);
      const [loading, setLoading] = useState(true);
      const [tab, setTab] = useState('infos');
      const [showNewProject, setShowNewProject] = useState(false);
      const [showEdit, setShowEdit] = useState(false);
      const [showImport, setShowImport] = useState(false);
      const [selectedProjet, setSelectedProjet] = useState(null);

      // Logo + signature du client (stockés en localStorage par slug)
      const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(`pk_logo_${slug}`) || '');
      const [signatureData, setSignatureData] = useState(() => localStorage.getItem(`pk_sig_${slug}`) || '');
      const [showSigPad, setShowSigPad] = useState(false);

      function saveLogo(url) { setLogoUrl(url); localStorage.setItem(`pk_logo_${slug}`, url); }
      function saveSig(data) { setSignatureData(data); localStorage.setItem(`pk_sig_${slug}`, data); }

      function load() {
        setLoading(true);
        fetch(`${API}/clients/${slug}`)
          .then(r => r.json())
          .then(d => { setDetail(d); setLoading(false); })
          .catch(() => setLoading(false));
      }

      function handleSaved(updatedMeta) {
        if (updatedMeta && updatedMeta.client_data) {
          setDetail(updatedMeta);
        } else {
          load();
        }
        if (onRefresh) onRefresh();
      }

      useEffect(() => { load(); }, [slug]);

      if (loading) return <div className="empty"><div className="empty-text">Chargement...</div></div>;
      if (!detail) return <div className="empty"><div className="empty-text">Client introuvable.</div></div>;

      const cd = detail.client_data || {};
      const projets = detail.projets || [];
      const typeLabel = cd.type_structure === 'sas_senegal' ? '🇸🇳 SAS OHADA — Sénégal' : '🇫🇷 Association loi 1901 — France';

      return (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-desktop-back" onClick={onBack} style={{ padding: '6px 10px' }}>← Retour</button>
            {/* Logo client ou avatar */}
            {logoUrl ? (
              <img src={logoUrl} alt="logo" style={{ height: 40, width: 'auto', borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)', background: 'white', padding: 2 }}
                onError={() => saveLogo('')} />
            ) : (
              <div className="client-avatar" style={{ width: 40, height: 40, borderRadius: 10, fontSize: 15 }}>{initials(cd.nom_usuel || cd.nom_officiel || '?')}</div>
            )}
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{cd.nom_usuel || cd.nom_officiel}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{typeLabel}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>+ Nouveau projet</button>
              <button className="btn" onClick={() => setShowImport(true)}>📊 Excel</button>
              <button className="btn" onClick={() => setTab('identite_visuelle')}>🖼 Logo & Signature</button>
              <button className="btn" onClick={() => setShowEdit(true)}>✏️ Modifier</button>
            </div>
          </div>

          {showNewProject && <NewProjectModal slug={slug} clientMeta={detail} onClose={() => setShowNewProject(false)} onCreated={() => { load(); if (onRefresh) onRefresh(); }} />}
          {showEdit && detail && <EditClientModal detail={detail} onClose={() => setShowEdit(false)} onSaved={handleSaved} onDeleted={() => { if (onRefresh) onRefresh(); onBack(); }} />}
          {showImport && <ImportExcelModal slug={slug} onClose={() => setShowImport(false)} onDone={handleSaved} />}
          {showSigPad && <SignaturePadModal onClose={() => setShowSigPad(false)} onSave={data => { saveSig(data); setShowSigPad(false); }} existing={signatureData} />}

          {/* Tabs */}
          <div className="tabs">
            {[['infos', 'Informations'], ['suivi', 'Suivi'], ['projets', `Projets (${projets.length})`], ['alertes', 'Alertes'], ['documents', 'Documents'], ['facturation', 'Facturation'], ['identite_visuelle', '🖼 Logo & Signature'], ['historique', 'Historique']].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {/* Identité visuelle — logo + signature */}
          {tab === 'identite_visuelle' && (
            <IdentiteVisuelleTab
              slug={slug}
              nomClient={cd.nom_usuel || cd.nom_officiel}
              logoUrl={logoUrl} saveLogo={saveLogo}
              signatureData={signatureData} saveSig={saveSig}
              onShowSigPad={() => setShowSigPad(true)}
            />
          )}

          {/* Infos */}
          {tab === 'infos' && (
            <div>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                {/* Identité */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Identité</div></div>
                  {[
                    ['Nom officiel', cd.nom_officiel],
                    cd.nom_usuel && ['Nom usuel', cd.nom_usuel],
                    cd.statut_juridique && ['Statut juridique', cd.statut_juridique],
                    cd.implantation && ['Implantation', cd.implantation],
                    cd.categorie && ['Catégorie', cd.categorie],
                    cd.marche_cible && ['Marché cible', cd.marche_cible],
                    cd.domaines_artistiques && ['Domaines', cd.domaines_artistiques],
                    cd.siret && ['SIRET', cd.siret],
                    cd.ninea && ['NINEA', cd.ninea],
                    cd.rccm && ['RCCM', cd.rccm],
                    cd.numero_rna && ['N° RNA', cd.numero_rna],
                    cd.date_creation && ['Date création', cd.date_creation],
                    cd.adresse_siege && ['Adresse', cd.adresse_siege],
                  ].filter(Boolean).map(([label, val], i) => val && (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '58%' }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Contacts & licences */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Contacts & licences</div></div>
                  {[
                    cd.president && ['Président(e) / DG', cd.president],
                    cd.tresorier && ['Trésorier(e)', cd.tresorier],
                    cd.secretaire && ['Secrétaire', cd.secretaire],
                    cd.directeur_artistique && ['Dir. artistique', cd.directeur_artistique],
                    cd.email_contact && ['Email', cd.email_contact],
                    cd.telephone && ['Téléphone', cd.telephone],
                    cd.site_internet && ['Site web', cd.site_internet],
                    cd.licence_statut && ['Licence spectacle', cd.licence_statut],
                    cd.licence_type1 && ['N° licence', cd.licence_type1],
                    cd.date_expiration_licence && ['Expiration licence', cd.date_expiration_licence],
                    cd.societe_droits && ['Société droits', cd.societe_droits],
                  ].filter(Boolean).map(([label, val], i) => val && (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '58%' }}>{val}</span>
                    </div>
                  ))}
                  {cd.emails_surveillance?.length > 0 && (
                    <div style={{ padding: '10px 0' }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>📧 Emails surveillés</div>
                      {cd.emails_surveillance.map((email, i) => (
                        <div key={i} style={{ fontSize: 12, padding: '2px 0', color: 'var(--accent)' }}>{email}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-2">
                {/* Association — champs spécifiques */}
                {cd.type_structure === 'asso_france' && (
                  <div className="card">
                    <div className="card-header"><div className="card-title">Vie associative</div></div>
                    {[
                      ['Dernière AG', cd.date_derniere_ag],
                      ['Clôtures comptables', cd.clotures_comptables],
                      ['N° RNA', cd.numero_rna],
                      ['N° URSSAF', cd.numero_urssaf],
                      ['N° GUSO', cd.numero_guso],
                      ['N° Audiens', cd.numero_audiens],
                      ['N° AFDAS', cd.numero_afdas],
                      ['N° Congés Spectacles', cd.numero_conges_spectacles],
                      ['Mutuelle', cd.mutuelle],
                      ['N° agrément AEM', cd.numero_aem],
                    ].filter(([, v]) => v).map(([label, val], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontWeight: val === 'Non' || val?.includes('Non') ? 400 : 500, color: val === 'Oui — validées AG' ? 'var(--accent)' : val?.includes('Non') ? 'var(--danger)' : 'var(--text)' }}>{val}</span>
                      </div>
                    ))}
                    {/* Warning clôtures */}
                    {cd.clotures_comptables && !cd.clotures_comptables.includes('Oui') && (
                      <div style={{ marginTop: 8, background: 'var(--warn-light)', color: 'var(--warn)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                        ⚠️ Clôtures comptables non validées — à régulariser
                      </div>
                    )}
                  </div>
                )}

                {/* Banque */}
                {(cd.banque || cd.iban) && (
                  <div className="card">
                    <div className="card-header"><div className="card-title">Coordonnées bancaires</div></div>
                    {[
                      ['Banque', cd.banque],
                      ['IBAN', cd.iban],
                      ['BIC', cd.bic],
                      ['Titulaire', cd.titulaire_compte],
                    ].filter(([, v]) => v).map(([label, val], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontWeight: 500, fontFamily: label === 'IBAN' ? 'monospace' : 'inherit', fontSize: label === 'IBAN' ? 11 : 13 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historique projets réalisés */}
              {cd.historique_projets?.length > 0 && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="card-header"><div className="card-title">📁 Historique projets réalisés</div></div>
                  {cd.historique_projets.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Réalisé le {p.date_realisation}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{(p.total_subventions_accordees || 0).toLocaleString('fr-FR')} € obtenus</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.nb_subventions} subvention(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'suivi' && (
            <SuiviClientView slug={slug} detail={detail} />
          )}
          {tab === 'projets' && !selectedProjet && (
            <div className="card">
              {projets.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">Aucun projet. Créez le premier dossier de subvention.</div>
                </div>
              )}
              {projets.map((p, i) => (
                <div key={i} className="client-row" onClick={() => setSelectedProjet(p)} style={{ cursor: 'pointer' }}>
                  <div className="client-avatar" style={{ background: 'var(--info-light)', color: 'var(--info)', borderRadius: 8 }}>P{i + 1}</div>
                  <div className="client-info">
                    <div className="client-name">{p.nom}</div>
                    <div className="client-meta">
                      Créé le {p.created_at?.slice(0, 10)}
                      {p.lieu && ` · ${p.lieu}`}
                      {p.dates?.debut && ` · ${p.dates.debut}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge statut={
                      p.statut === 'realise' ? 'OK' :
                        p.statut === 'depose' ? 'Attention' :
                          p.statut === 'en_construction' ? 'Normal' : 'Normal'
                    } />
                    <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Détail projet */}
          {tab === 'projets' && selectedProjet && (
            <ProjetDetailView
              projet={selectedProjet}
              clientMeta={detail}
              onBack={() => setSelectedProjet(null)}
              onRefresh={load}
              driveProjetsFolderId={detail.drive_projets_folder_id}
            />
          )}

          {/* Alertes placeholder */}
          {tab === 'alertes' && (
            <div className="card">
              <div className="empty">
                <div className="empty-text">Les alertes se calculent depuis l'Excel Association. Ouvrez le fichier sur Google Drive pour les renseigner.</div>
              </div>
              {detail.drive_folder_id && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <a href={`https://drive.google.com/drive/folders/${detail.drive_folder_id}`} target="_blank" style={{ color: 'var(--accent)', fontSize: 13 }}>
                    Ouvrir le dossier Drive →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {tab === 'documents' && (
            <DocumentsClientView detail={detail} slug={slug} onRefresh={load} />
          )}
          {/* Facturation */}
          {tab === 'facturation' && (
            <FacturationClient slug={slug} nomClient={cd.nom_usuel || cd.nom_officiel} />
          )}

          {/* Historique */}
          {tab === 'historique' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Journal d'activité</div>
                <div className="card-subtitle">Toutes les opérations sur ce dossier</div>
              </div>
              {(() => {
                const history = detail?.timestamps?.history || [];
                const labels = {
                  creation_dossier: '📁 Dossier créé',
                  creation_projet: '📋 Projet créé',
                  modification_infos: '✏️ Infos modifiées',
                  upload_excel: '📊 Excel mis à jour',
                  suppression: '🗑 Suppression',
                  tache_creee: '✅ Tâche créée',
                  tache_validee: '✔️ Tâche validée',
                };
                if (history.length === 0) return (
                  <div className="empty"><div className="empty-text">Aucun événement enregistré.</div></div>
                );
                return [...history].reverse().map((evt, i) => (
                  <div key={i} className="alert-row">
                    <div style={{ flex: 1 }}>
                      <div className="alert-label">{labels[evt.event] || evt.event}</div>
                      <div className="alert-sub">
                        {new Date(evt.at).toLocaleString('fr-FR')}
                        {evt.details?.nom_projet && ` — ${evt.details.nom_projet}`}
                        {evt.details?.champs_modifiés?.length > 0 && ` — ${evt.details.champs_modifiés.join(', ')}`}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      );
    }

    // ── Suivi opérationnel par client ─────────────────────────────────────────────

    function SuiviClientView({ slug, detail }) {
      const [devis, setDevis] = useState([]);
      const [factures, setFactures] = useState([]);
      const [taches, setTaches] = useState([]);
      const [loading, setLoading] = useState(true);
      const [rhInfo, setRhInfo] = useState(null);

      const cd = detail?.client_data || {};
      const projets = detail?.projets || [];
      const today = new Date().toISOString().slice(0, 10);

      useEffect(() => {
        setLoading(true);
        Promise.all([
          fetch(`${API}/devis`).then(r => r.ok ? r.json() : []),
          fetch(`${API}/factures`).then(r => r.ok ? r.json() : []),
          fetch(`${API}/taches`).then(r => r.ok ? r.json() : []),
          fetch(`${API}/rh/structures/${slug}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([d, f, t, rh]) => {
          setDevis((d || []).filter(x => x.client_slug === slug || x.client_nom?.toLowerCase() === (cd.nom_officiel || '').toLowerCase() || x.client_nom?.toLowerCase() === (cd.nom_usuel || '').toLowerCase()));
          setFactures((f || []).filter(x => x.client_slug === slug || x.client_nom?.toLowerCase() === (cd.nom_officiel || '').toLowerCase()));
          const nomClient = (cd.nom_usuel || cd.nom_officiel || '').toLowerCase();
          setTaches((t || []).filter(x => {
            if (x.done) return false;
            if (x.client_slug && x.client_slug === slug) return true;
            if (x.client_detecte && nomClient && x.client_detecte.toLowerCase() === nomClient) return true;
            const cdNomOfficiel = (cd.nom_officiel || '').toLowerCase();
            if (x.client_detecte && cdNomOfficiel && x.client_detecte.toLowerCase() === cdNomOfficiel) return true;
            return false;
          }));
          if (rh && Object.keys(rh).length > 0) setRhInfo(rh);
          setLoading(false);
        }).catch(() => setLoading(false));
      }, [slug]);

      if (loading) return <div className="empty"><div className="empty-text">Chargement du suivi...</div></div>;

      const caEncaisse = factures.filter(f => f.statut === 'payée').reduce((s, f) => s + (f.total_ht || 0), 0);
      const caEnAttente = factures.filter(f => ['envoyée', 'à_faire'].includes(f.statut)).reduce((s, f) => s + (f.solde_a_payer || 0), 0);
      const devisEnCours = devis.filter(d => !d.archived && !['annulé', 'facturé'].includes(d.statut));
      const facturesEnCours = factures.filter(f => f.statut !== 'payée' && f.statut !== 'annulée');
      const projetsEnCours = projets.filter(p => !['archive', 'realise'].includes(p.statut));
      const projetsRealises = projets.filter(p => p.statut === 'realise');

      function diffLabel(date) {
        if (!date) return null;
        const diff = Math.round((new Date(date.includes('/') ? date.split('/').reverse().join('-') : date) - new Date()) / 86400000);
        if (diff < 0) return { txt: `${Math.abs(diff)}j retard`, color: 'var(--danger)' };
        if (diff === 0) return { txt: "Aujourd'hui", color: 'var(--danger)' };
        if (diff === 1) return { txt: 'Demain', color: 'var(--warn)' };
        if (diff <= 7) return { txt: `J-${diff}`, color: 'var(--warn)' };
        return { txt: date.includes('/') ? date : date.split('-').reverse().join('/'), color: 'var(--text3)' };
      }

      return (
        <div>
          {/* Badge Audit */}
          {detail?.client_data?.audit_statut && (
            <div style={{ marginBottom:8, padding:'7px 12px', borderRadius:8, display:'flex', alignItems:'center', gap:8,
              background: detail.client_data.audit_statut==='audite' ? 'var(--success-light)' : 'var(--warn-light)',
              border: `1px solid ${detail.client_data.audit_statut==='audite' ? 'var(--success)' : 'var(--warn)'}30` }}>
              <span style={{ fontSize:14 }}>{detail.client_data.audit_statut==='audite' ? '🔍✅' : '🔍⏳'}</span>
              <div style={{ fontSize:12, fontWeight:600, color: detail.client_data.audit_statut==='audite' ? 'var(--success)' : 'var(--warn)' }}>
                {detail.client_data.audit_statut==='audite' ? `Audit complété${detail.client_data.audit_date ? ` le ${detail.client_data.audit_date}` : ''}` : 'Audit de démarrage en attente'}
              </div>
            </div>
          )}
          {/* Badge RH statut employeur */}
          {rhInfo && (
            <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              background: rhInfo.statut_employeur ? 'var(--success-light)' : 'var(--warn-light)',
              border: `1px solid ${rhInfo.statut_employeur ? 'var(--success)' : 'var(--warn)'}30`,
            }}>
              <span style={{ fontSize: 16 }}>{rhInfo.statut_employeur ? '✅' : '⏳'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: rhInfo.statut_employeur ? 'var(--success)' : 'var(--warn)' }}>
                  {rhInfo.statut_employeur ? 'Statut Employeur actif' : `Statut Employeur incomplet — ${rhInfo.rh_champs_remplis || 0}/16 champs`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {rhInfo.statut_employeur ? 'Peut générer des fiches de paie via le module RH' : 'Compléter la fiche dans le module 👥 Ressources Humaines'}
                </div>
              </div>
            </div>
          )}
          {/* Métriques globales client */}
          <div className="metrics-grid" style={{ marginBottom: 16 }}>
            <div className="metric-card accent-green">
              <div className="metric-label">CA encaissé</div>
              <div className="metric-value" style={{ fontSize: 22 }}>{caEncaisse.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">{factures.filter(f => f.statut === 'payée').length} factures payées</div>
            </div>
            <div className="metric-card accent-warn">
              <div className="metric-label">En attente</div>
              <div className="metric-value" style={{ fontSize: 22 }}>{caEnAttente.toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">{facturesEnCours.length} facture(s) en cours</div>
            </div>
            <div className="metric-card accent-info">
              <div className="metric-label">Projets en cours</div>
              <div className="metric-value" style={{ fontSize: 22 }}>{projetsEnCours.length}</div>
              <div className="metric-sub">{projetsRealises.length} réalisé(s)</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Tâches en attente</div>
              <div className="metric-value" style={{ fontSize: 22 }}>{taches.length}</div>
              <div className="metric-sub">{taches.filter(t => t.priorite === 'URGENT').length} urgente(s)</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            {/* Projets en cours */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Projets en cours</div>
              </div>
              {projetsEnCours.length === 0 ? (
                <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucun projet en cours.</div></div>
              ) : projetsEnCours.map((p, i) => {
                const nbSubs = (p.subventions || []).length;
                const totalAccorde = (p.subventions || []).reduce((s, x) => s + (Number(x.montant_accorde) || 0), 0);
                const STATUT_COLORS = { en_construction: 'var(--text3)', en_cours: 'var(--pk-blue)', depose: 'var(--warn)', realise: 'var(--success)', archive: 'var(--text3)', en_attente_conditions: 'var(--warn)' };
                return (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        <span style={{ color: STATUT_COLORS[p.statut] || 'var(--text3)', fontWeight: 600 }}>{p.statut?.replace('_', ' ')}</span>
                        {p.dates?.debut && <span> · {p.dates.debut}</span>}
                      </div>
                      {nbSubs > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {nbSubs} subvention(s)
                          {totalAccorde > 0 && <span style={{ color: 'var(--success)', fontWeight: 600 }}> · {totalAccorde.toLocaleString('fr-FR')} € accordés</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tâches à traiter */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Tâches à traiter</div>
              </div>
              {taches.length === 0 ? (
                <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucune tâche en attente.</div></div>
              ) : taches.slice(0, 6).map((t, i) => {
                const dl = t.deadline ? diffLabel(t.deadline) : null;
                return (
                  <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.titre}</div>
                      {t.projet_nom && <div style={{ fontSize: 11, color: 'var(--pk-blue)' }}>› {t.projet_nom}</div>}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {dl && <div style={{ fontSize: 11, fontWeight: 600, color: dl.color }}>{dl.txt}</div>}
                      {t.priorite === 'URGENT' && <div style={{ fontSize: 10, background: 'var(--danger-light)', color: 'var(--danger)', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>URGENT</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Devis & factures en cours */}
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Devis en cours</div></div>
              {devisEnCours.length === 0 ? (
                <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucun devis en cours.</div></div>
              ) : devisEnCours.slice(0, 5).map(d => {
                const STATUT_C = { brouillon: 'var(--text3)', envoyé: 'var(--pk-blue)', signé: 'var(--warn)', validé: 'var(--accent)', facturé: 'var(--success)' };
                return (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{d.numero}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.periode}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{(d.total_ht || 0).toLocaleString('fr-FR')} €</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: STATUT_C[d.statut] || 'var(--text3)' }}>{d.statut}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Factures en cours</div></div>
              {facturesEnCours.length === 0 ? (
                <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucune facture en attente.</div></div>
              ) : facturesEnCours.slice(0, 5).map(f => {
                const dl = f.date_echeance ? diffLabel(f.date_echeance) : null;
                const STATUT_C = { à_faire: 'var(--warn)', envoyée: 'var(--pk-blue)', en_retard: 'var(--danger)' };
                return (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{f.numero}</div>
                      {dl && <div style={{ fontSize: 11, fontWeight: 600, color: dl.color }}>⏰ {dl.txt}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{(f.total_ht || 0).toLocaleString('fr-FR')} €</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: STATUT_C[f.statut] || 'var(--text3)' }}>{f.statut}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subventions toutes associations */}
          {projets.some(p => (p.subventions || []).length > 0) && (
            <div className="card">
              <div className="card-header"><div className="card-title">Pipeline subventions</div></div>
              {projets.flatMap(p => (p.subventions || []).map(s => ({ ...s, projet_nom: p.nom }))).map((s, i) => {
                const STATUT_SUB = { 'À préparer': { c: 'var(--text3)', bg: 'var(--surface2)' }, 'Déposée': { c: 'var(--pk-blue)', bg: 'var(--pk-blue-light)' }, 'En instruction': { c: 'var(--warn)', bg: 'var(--warn-light)' }, 'Accordée': { c: 'var(--success)', bg: 'var(--success-light)' }, 'Versée': { c: 'var(--success)', bg: 'var(--success-light)' }, 'Refusée': { c: 'var(--danger)', bg: 'var(--danger-light)' } };
                const sc = STATUT_SUB[s.statut] || { c: 'var(--text3)', bg: 'var(--surface2)' };
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.financeur}</div>
                      <div style={{ fontSize: 11, color: 'var(--pk-blue)' }}>› {s.projet_nom}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {s.montant_accorde > 0 && <span style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(s.montant_accorde).toLocaleString('fr-FR')} €</span>}
                      {s.montant_demande > 0 && s.montant_accorde === 0 && <span style={{ color: 'var(--text3)' }}>{Number(s.montant_demande).toLocaleString('fr-FR')} € demandés</span>}
                      <span style={{ background: sc.bg, color: sc.c, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s.statut}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── Facturation par client ────────────────────────────────────────────────────

    function FacturationClient({ slug, nomClient }) {
      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(true);
      const [showNewDevis, setShowNewDevis] = useState(false);

      async function load() {
        setLoading(true);
        try {
          const [devisRes, factRes] = await Promise.all([
            fetch(`${API}/devis`),
            fetch(`${API}/factures`),
          ]);
          const allDevis = devisRes.ok ? await devisRes.json() : [];
          const allFact = factRes.ok ? await factRes.json() : [];
          // Filtre par slug exact OU par nom client pour les données historiques importées
          const matchClient = (item) =>
            item.client_slug === slug ||
            item.client_nom?.toLowerCase() === (nomClient || '').toLowerCase();
          setData({
            devis: allDevis.filter(matchClient),
            factures: allFact.filter(matchClient),
          });
        } catch { }
        setLoading(false);
      }

      useEffect(() => { load(); }, [slug]);

      const STATUT_DEVIS = {
        brouillon: { label: 'Brouillon', bg: 'var(--surface2)', color: 'var(--text3)' },
        envoyé: { label: 'Envoyé', bg: 'var(--info-light)', color: 'var(--info)' },
        signé: { label: 'Signé', bg: 'var(--warn-light)', color: 'var(--warn)' },
        validé: { label: 'Validé', bg: 'var(--accent-light)', color: 'var(--accent)' },
        facturé: { label: 'Facturé', bg: '#E8F5E9', color: '#1B5E20' },
        annulé: { label: 'Annulé', bg: 'var(--danger-light)', color: 'var(--danger)' },
      };
      const STATUT_FACT = {
        à_faire: { label: 'À faire', bg: 'var(--warn-light)', color: 'var(--warn)' },
        envoyée: { label: 'Envoyée', bg: 'var(--info-light)', color: 'var(--info)' },
        payée: { label: 'Payée', bg: 'var(--accent-light)', color: 'var(--accent)' },
        annulée: { label: 'Annulée', bg: 'var(--danger-light)', color: 'var(--danger)' },
        en_retard: { label: 'En retard', bg: 'var(--danger-light)', color: 'var(--danger)' },
      };

      function Badge({ statut, map }) {
        const s = map[statut] || { label: statut, bg: 'var(--surface2)', color: 'var(--text3)' };
        return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s.label}</span>;
      }

      function printDevis(d) {
        const prestations = (d.prestations || []).filter(p => p.description);
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Devis ${d.numero}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1a1916; margin: 0; padding: 32px; font-size: 13px; }
  h1 { color: #FF795A; font-size: 22px; margin: 0 0 4px; }
  .sub { color: #888; font-size: 11px; margin-bottom: 24px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
  .from { }
  .to { text-align: right; }
  .label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 2px; }
  .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #FF795A; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  .total-block { margin-top: 16px; text-align: right; }
  .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 13px; }
  .total-final { font-size: 16px; font-weight: 700; color: #FF795A; border-top: 2px solid #FF795A; padding-top: 8px; margin-top: 4px; }
  .conditions { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>DEVIS</h1>
<div class="sub">${d.numero} · Émis le ${d.date_emission || new Date().toLocaleDateString('fr-FR')}</div>
<div class="header">
  <div class="from">
    <div class="label">De</div>
    <div class="val">Pause Kreyol</div>
    <div>Administration de production culturelle</div>
    <div>contact@pausekreyol.fr</div>
  </div>
  <div class="to">
    <div class="label">Pour</div>
    <div class="val">${d.client_nom || '—'}</div>
    ${d.periode ? `<div>Période : ${d.periode}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type / Formule</th><th style="text-align:center">Qté</th><th style="text-align:right">Tarif unitaire</th><th style="text-align:right">Sous-total</th></tr></thead>
  <tbody>
    ${prestations.map(p => `<tr>
      <td>${p.description}</td>
      <td style="color:#666">${p.type || '—'}</td>
      <td style="text-align:center">${p.quantite}</td>
      <td style="text-align:right">${(p.tarif_unitaire || 0).toLocaleString('fr-FR')} €</td>
      <td style="text-align:right;font-weight:500">${(p.sous_total || 0).toLocaleString('fr-FR')} €</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="total-block">
  <div class="total-row"><span>Total HT</span><span>${(d.total_ht || 0).toLocaleString('fr-FR')} €</span></div>
  <div class="total-row"><span>TVA (Art. 293B du CGI)</span><span>0 €</span></div>
  <div class="total-row total-final"><span>Total TTC</span><span>${(d.total_ht || 0).toLocaleString('fr-FR')} €</span></div>
  ${d.acompte_pct > 0 ? `<div class="total-row" style="color:#666"><span>Acompte à la signature (${d.acompte_pct}%)</span><span>${(d.acompte_montant || 0).toLocaleString('fr-FR')} €</span></div>` : ''}
  ${d.acompte_pct > 0 ? `<div class="total-row" style="color:#666"><span>Solde à la livraison</span><span>${(d.solde || 0).toLocaleString('fr-FR')} €</span></div>` : ''}
</div>
${d.notes ? `<div style="margin-top:20px;padding:12px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#555">${d.notes}</div>` : ''}
<div class="conditions">
  <strong>Conditions :</strong> Validité ${d.validite_jours || 30} jours · Délai de paiement 30 jours nets · Pénalités de retard : 3× le taux légal · TVA non applicable — Art. 293B du CGI
</div>
</body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
      }

      async function changeStatut(type, id, statut) {
        await fetch(`${API}/${type}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut }),
        });
        load();
      }

      async function creerFacture(devis) {
        await fetch(`${API}/factures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devis_id: devis.id }),
        });
        load();
      }

      if (loading) return <div className="empty"><div className="empty-text">Chargement...</div></div>;

      const devis = data?.devis || [];
      const factures = data?.factures || [];
      const totalEncaisse = factures.filter(f => f.statut === 'payée').reduce((s, f) => s + (f.total_ht || 0), 0);
      const totalAttente = factures.filter(f => ['envoyée', 'à_faire'].includes(f.statut)).reduce((s, f) => s + (f.solde_a_payer || 0), 0);

      return (
        <div>
          {/* Métriques client */}
          <div className="metrics-grid" style={{ marginBottom: 14 }}>
            <div className="metric-card accent-green">
              <div className="metric-label">CA encaissé</div>
              <div className="metric-value" style={{ fontSize: 20 }}>{totalEncaisse.toLocaleString('fr-FR')} €</div>
            </div>
            <div className="metric-card accent-warn">
              <div className="metric-label">En attente</div>
              <div className="metric-value" style={{ fontSize: 20 }}>{totalAttente.toLocaleString('fr-FR')} €</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Devis</div>
              <div className="metric-value" style={{ fontSize: 20 }}>{devis.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Factures</div>
              <div className="metric-value" style={{ fontSize: 20 }}>{factures.length}</div>
            </div>
          </div>

          {/* Devis */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <div className="card-title">Devis</div>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNewDevis(true)}>+ Nouveau devis</button>
            </div>
            {devis.length === 0
              ? <div className="empty"><div className="empty-text">Aucun devis pour ce client.</div></div>
              : devis.map(d => (
                <div key={d.id} className="client-row" style={{ padding: '10px 0', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.numero}</span>
                      <Badge statut={d.statut} map={STATUT_DEVIS} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{d.periode || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {(d.prestations || []).slice(0, 2).map(p => p.description).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{(d.total_ht || 0).toLocaleString('fr-FR')} €</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Acompte : {d.acompte_montant || 0} €</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {d.statut === 'brouillon' && <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => changeStatut('devis', d.id, 'envoyé')}>📤 Envoyer</button>}
                      {d.statut === 'envoyé' && <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => changeStatut('devis', d.id, 'signé')}>✍️ Signé</button>}
                      {d.statut === 'signé' && <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => changeStatut('devis', d.id, 'validé')}>✅ Valider</button>}
                      {['validé', 'signé'].includes(d.statut) && !d.factures_liees?.length && (
                        <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => creerFacture(d)}>🧾 Facturer</button>
                      )}
                      <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => printDevis(d)} title="Télécharger PDF">🖨</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Factures */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Factures</div>
            </div>
            {factures.length === 0
              ? <div className="empty"><div className="empty-text">Aucune facture. Créez un devis et validez-le pour générer une facture.</div></div>
              : factures.map(f => (
                <div key={f.id} className="client-row" style={{ padding: '10px 0', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{f.numero}</span>
                      <Badge statut={f.statut} map={STATUT_FACT} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{f.periode || '—'}</div>
                    {f.devis_numero && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Devis lié : {f.devis_numero}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{(f.total_ht || 0).toLocaleString('fr-FR')} €</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Solde : {f.solde_a_payer || 0} €</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {f.statut === 'à_faire' && <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => changeStatut('factures', f.id, 'envoyée')}>📤 Envoyer</button>}
                      {f.statut === 'envoyée' && <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => changeStatut('factures', f.id, 'payée')}>✅ Payée</button>}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {showNewDevis && (
            <NewDevisModal
              onClose={() => setShowNewDevis(false)}
              onCreated={() => { load(); setShowNewDevis(false); }}
              defaultClientSlug={slug}
              defaultClientNom={nomClient}
            />
          )}
        </div>
      );
    }

    // ── Vue détail projet ─────────────────────────────────────────────────────────

    // ── RH dans un projet ─────────────────────────────────────────────────────

        function ProjetDetailView({ projet, clientMeta, onBack, onRefresh, driveProjetsFolderId }) {
      const [tab, setTab] = useState('infos');
      const [subventions, setSubventions] = useState(projet.subventions || []);
      const [showAddSub, setShowAddSub] = useState(false);
      const [statut, setStatut] = useState(projet.statut || 'en_construction');
      const [savingStatut, setSavingStatut] = useState(false);
      const [syncing, setSyncing] = useState(false);
      const [showDeleteProjet, setShowDeleteProjet] = useState(false);
      const [deleting, setDeleting] = useState(false);

      const cd = clientMeta.client_data || {};
      const slug = clientMeta.slug;

      async function deleteProjet() {
        setDeleting(true);
        try {
          const res = await fetch(`${API}/clients/${slug}/projets/${projet.slug}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
          if (onRefresh) onRefresh();
          onBack();
        } catch (e) {
          alert('Erreur suppression projet : ' + e.message);
        } finally {
          setDeleting(false);
        }
      }

      const STATUTS = [
        { val: 'en_construction', label: 'En construction', color: 'badge-gray' },
        { val: 'en_cours', label: 'En cours', color: 'badge-info' },
        { val: 'depose', label: 'Déposé', color: 'badge-warn' },
        { val: 'realise', label: 'Réalisé', color: 'badge-green' },
        { val: 'archive', label: 'Archivé', color: 'badge-gray' },
      ];

      const SUB_STATUTS = ['À préparer', 'Déposée', 'En instruction', 'Accordée', 'Refusée', 'Versée'];

      async function saveStatut(newStatut) {
        setSavingStatut(true);
        try {
          await fetch(`${API}/clients/${slug}/projets/${projet.slug}/statut`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: newStatut }),
          });
          setStatut(newStatut);
          if (onRefresh) onRefresh();
        } catch (e) { console.error(e); }
        finally { setSavingStatut(false); }
      }

      async function addSubvention(sub) {
        const updated = [...subventions, { ...sub, id: Date.now() }];
        setSubventions(updated);
        setShowAddSub(false);
        try {
          await fetch(`${API}/clients/${slug}/projets/${projet.slug}/subventions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          if (onRefresh) onRefresh();
        } catch (e) { console.error(e); }
      }

      async function updateSubStatut(id, newStatut) {
        setSubventions(prev => prev.map(s => s.id === id ? { ...s, statut: newStatut } : s));
        try {
          await fetch(`${API}/clients/${slug}/projets/${projet.slug}/subventions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: newStatut }),
          });
        } catch (e) { console.error(e); }
      }

      const totalDemande = subventions.reduce((s, x) => s + (Number(x.montant_demande) || 0), 0);
      const totalAccorde = subventions.reduce((s, x) => s + (Number(x.montant_accorde) || 0), 0);

      return (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-desktop-back" onClick={onBack} style={{ padding: '6px 10px' }}>← Projets</button>
            <div className="client-avatar" style={{ background: 'var(--info-light)', color: 'var(--info)', borderRadius: 8, width: 40, height: 40 }}>
              {projet.nom?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{projet.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {cd.nom_usuel || cd.nom_officiel}
                {projet.lieu && ` · ${projet.lieu}`}
                {projet.dates?.debut && ` · ${projet.dates.debut}`}
              </div>
            </div>
            {/* Sélecteur statut */}
            <select
              value={statut}
              onChange={e => saveStatut(e.target.value)}
              disabled={savingStatut}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 12, background: 'var(--surface)', cursor: 'pointer' }}
            >
              {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
            <button className="btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: 12 }}
              onClick={() => setShowDeleteProjet(true)}>🗑 Supprimer le projet</button>
          </div>

          {/* Confirmation suppression projet */}
          {showDeleteProjet && (
            <div className="modal-overlay" onClick={() => setShowDeleteProjet(false)}>
              <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="modal-title">🗑 Supprimer ce projet ?</div>
                <div className="modal-sub">Cette action est irréversible. Le projet <strong>{projet.nom}</strong> sera définitivement supprimé du dossier client <strong>{cd.nom_usuel || cd.nom_officiel}</strong>. Les fichiers Drive associés ne seront pas supprimés.</div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowDeleteProjet(false)}>Annuler</button>
                  <button className="btn" style={{ background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}
                    onClick={deleteProjet} disabled={deleting}>
                    {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="tabs">
            {[['infos', 'Informations'], ['rh_projet', '👥 RH & Artistes'], ['planning', '📅 Planning résidence'], ['suivi_planning', '🗓 Suivi prévisionnel'], ['subventions', `Subventions (${subventions.length})`], ['fichiers', 'Fichiers Drive']].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {/* Infos */}
          {tab === 'infos' && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header"><div className="card-title">Détails du projet</div></div>
                {[
                  ['Nom', projet.nom],
                  ['Lieu', projet.lieu],
                  ['Date début', projet.dates?.debut],
                  ['Date fin', projet.dates?.fin],
                  ['Code AAP', projet.code_aap],
                  ['Statut', STATUTS.find(s => s.val === statut)?.label],
                  ['Créé le', projet.created_at?.slice(0, 10)],
                ].filter(([, v]) => v).map(([label, val], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Synthèse financière</div></div>
                <div className="metric-card" style={{ marginBottom: 10 }}>
                  <div className="metric-label">Total demandé</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>{totalDemande.toLocaleString('fr-FR')} €</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total accordé</div>
                  <div className="metric-value" style={{ fontSize: 20, color: 'var(--accent)' }}>{totalAccorde.toLocaleString('fr-FR')} €</div>
                </div>
                {totalDemande > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Taux d'obtention</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(100, totalAccorde / totalDemande * 100)}%`, background: 'var(--accent-mid)' }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{Math.round(totalAccorde / totalDemande * 100)}%</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subventions */}
          {tab === 'subventions' && (
            <div>
              <div className="section-header">
                <div className="section-title" style={{ fontSize: 14 }}>Demandes de subvention</div>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAddSub(true)}>+ Ajouter</button>
              </div>
              <div className="card">
                {subventions.length === 0 && (
                  <div className="empty"><div className="empty-text">Aucune demande. Ajoutez les financeurs sollicités.</div></div>
                )}
                {subventions.map((s, i) => (
                  <div key={i} className="client-row">
                    <div className="client-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 8, fontSize: 11 }}>
                      {s.financeur?.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="client-info">
                      <div className="client-name">{s.financeur}</div>
                      <div className="client-meta">
                        Demandé : {Number(s.montant_demande || 0).toLocaleString('fr-FR')} €
                        {s.montant_accorde && ` · Accordé : ${Number(s.montant_accorde).toLocaleString('fr-FR')} €`}
                        {s.deadline && ` · Deadline : ${s.deadline}`}
                      </div>
                    </div>
                    <select
                      value={s.statut || 'À préparer'}
                      onChange={e => updateSubStatut(s.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 11, background: 'var(--surface)' }}
                    >
                      {SUB_STATUTS.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {showAddSub && <AddSubventionModal onClose={() => setShowAddSub(false)} onAdd={addSubvention} />}
            </div>
          )}

          {/* Fichiers Drive */}
          {tab === 'fichiers' && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-header">
                  <div className="card-title">Fichiers Google Drive</div>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setSyncing(true)}>
                    🔄 Synchroniser
                  </button>
                </div>

                {projet.drive?.fiche_prospect_id ? (
                  <a href={`https://docs.google.com/spreadsheets/d/${projet.drive.fiche_prospect_id}/edit`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div className="client-row" style={{ cursor: 'pointer' }}>
                      <div className="client-avatar" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 8, fontSize: 11 }}>PRO</div>
                      <div className="client-info">
                        <div className="client-name">Fiche prospect — {projet.nom}</div>
                        <div className="client-meta">Collecte infos · Artistes · Faisabilité</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>Ouvrir dans Sheets →</span>
                    </div>
                  </a>
                ) : driveProjetsFolderId && (
                  <a href={`https://drive.google.com/drive/folders/${driveProjetsFolderId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div className="client-row" style={{ cursor: 'pointer' }}>
                      <div className="client-avatar" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 8, fontSize: 11 }}>PRO</div>
                      <div className="client-info">
                        <div className="client-name">Fiche prospect — {projet.nom}</div>
                        <div className="client-meta">Collecte infos · Artistes · Faisabilité</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>Dossier Drive →</span>
                    </div>
                  </a>
                )}

                {projet.drive?.dossier_subvention_id ? (
                  <a href={`https://docs.google.com/spreadsheets/d/${projet.drive.dossier_subvention_id}/edit`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div className="client-row" style={{ cursor: 'pointer' }}>
                      <div className="client-avatar" style={{ background: 'var(--info-light)', color: 'var(--info)', borderRadius: 8, fontSize: 11 }}>SUB</div>
                      <div className="client-info">
                        <div className="client-name">Dossier subvention — {projet.nom}</div>
                        <div className="client-meta">Budget maître · Salaires · ETPT · Mairie · Partenaires</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>Ouvrir dans Sheets →</span>
                    </div>
                  </a>
                ) : driveProjetsFolderId && (
                  <a href={`https://drive.google.com/drive/folders/${driveProjetsFolderId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div className="client-row" style={{ cursor: 'pointer' }}>
                      <div className="client-avatar" style={{ background: 'var(--info-light)', color: 'var(--info)', borderRadius: 8, fontSize: 11 }}>SUB</div>
                      <div className="client-info">
                        <div className="client-name">Dossier subvention — {projet.nom}</div>
                        <div className="client-meta">Budget maître · Salaires · ETPT · Mairie · Partenaires</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>Dossier Drive →</span>
                    </div>
                  </a>
                )}

                {!driveProjetsFolderId && !projet.drive && (
                  <div className="empty"><div className="empty-text">Fichiers non synchronisés sur Drive.</div></div>
                )}
              </div>

              {syncing && (
                <SyncModal
                  projet={projet}
                  clientMeta={clientMeta}
                  onClose={() => setSyncing(false)}
                  onTaskCreated={() => { setSyncing(false); if (onRefresh) onRefresh(); }}
                />
              )}
            </div>
          )}

          {/* Artistes */}
          {tab === 'rh_projet' && (
            <ProjetRHView
              projet={projet}
              clientMeta={clientMeta}
              slug={clientMeta?.slug}
            />
          )}
          {tab === 'planning' && (
            <ProjetPlanningView
              projet={projet}
              clientMeta={clientMeta}
              slug={clientMeta?.slug}
            />
          )}
          {tab === 'suivi_planning' && (
            <ProjetSuiviPlanningView
              projet={projet}
              clientMeta={clientMeta}
              slug={clientMeta?.slug}
            />
          )}
        </div>
      );
    }

    // ── Modal synchronisation Excel ───────────────────────────────────────────────

    function ProjetRHView({ projet, clientMeta, slug }) {
      const [artistes, setArtistes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pk_rh_artistes') || '[]'); } catch { return []; }
      });
      const [search, setSearch] = useState('');

      // Charge depuis API
      useEffect(() => {
        fetch(`${API}/rh/artistes`).then(r => r.ok ? r.json() : []).then(d => {
          if (Array.isArray(d) && d.length > 0) setArtistes(d);
        }).catch(() => {});
      }, []);

      const artistesProjet = artistes.filter(a =>
        a.projet_nom === projet.nom || a.structure_slug === slug
      ).filter(a =>
        !search || [a.nom, a.prenom, a.role, a.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
      );

      function statutEmployable(a) {
        const infosOk = ['nom','prenom','email','telephone','numero_secu','numero_intermittent'].every(f => a[f]);
        const docsOk = DOCS_ARTISTE.every(d => a.docs?.[d.id] || a.docs_meta?.[d.id]);
        return { ok: infosOk && docsOk, infosOk, docsOk };
      }

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Artistes rattach\u00e9s au projet</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>G\u00e9rez les artistes complets depuis \U0001f465 Ressources Humaines</div>
            </div>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="\U0001f50d Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 160 }} />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            {artistesProjet.length === 0 ? (
              <div className="empty" style={{ padding: '20px 0' }}>
                <div className="empty-icon">\U0001f3ad</div>
                <div className="empty-text">Aucun artiste rattach\u00e9 \u00e0 ce projet.</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Ajoutez des artistes depuis le module \U0001f465 Ressources Humaines en les rattachant \u00e0 ce projet.
                </div>
              </div>
            ) : artistesProjet.map((a, i) => {
              const st = statutEmployable(a);
              return (
                <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="client-avatar" style={{ background: '#F3E5F5', color: '#6A1B9A', width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                    {(a.prenom?.[0]||'')+(a.nom?.[0]||'')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.prenom} {a.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.role}{a.email ? ` \u00B7 ${a.email}` : ''}</div>
                    {a.numero_intermittent && <div style={{ fontSize: 11, color: 'var(--text3)' }}>N\u00B0 intermittent : {a.numero_intermittent}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
                      background: st.ok ? 'var(--success-light)' : 'var(--warn-light)',
                      color: st.ok ? 'var(--success)' : 'var(--warn)' }}>
                      {st.ok ? '\u2705 Employable' : '\u26A0\uFE0F ' + (!st.infosOk ? 'Infos manquantes' : 'Docs manquants')}
                    </span>
                    {/* Docs status */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {DOCS_ARTISTE.map(doc => {
                        const has = a.docs?.[doc.id] || a.docs_meta?.[doc.id];
                        return (
                          <span key={doc.id} title={doc.label} style={{ fontSize: 9, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: has ? 'var(--success-light)' : 'var(--danger-light)', color: has ? 'var(--success)' : 'var(--danger)' }}>
                            {has ? '\u2713' : '!'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* R\u00e9sum\u00e9 employabilit\u00e9 */}
          {artistesProjet.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', background: 'var(--success-light)', borderRadius: 8, fontSize: 12, color: 'var(--success)' }}>
                \u2705 {artistesProjet.filter(a => statutEmployable(a).ok).length} employable(s)
              </div>
              <div style={{ padding: '8px 14px', background: 'var(--warn-light)', borderRadius: 8, fontSize: 12, color: 'var(--warn)' }}>
                \u26A0\uFE0F {artistesProjet.filter(a => !statutEmployable(a).ok).length} incomplet(s)
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── Planning résidence dans un projet ────────────────────────────────────

    function ProjetPlanningView({ projet, clientMeta, slug }) {
      const [residences, setResidences] = useState([]);
      const [artistes, setArtistes] = useState([]);
      const [selectedRes, setSelectedRes] = useState(null);
      const [showNew, setShowNew] = useState(false);
      const [saving, setSaving] = useState(false);
      const JOURS_SEM = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

      const EMPTY_RES = {
        titre: '', structure_nom: clientMeta?.client_data?.nom_usuel || clientMeta?.client_data?.nom_officiel || '',
        structure_slug: slug || '', projet_nom: projet?.nom || '',
        date_debut: '', date_fin: '', lieu: '', notes: '',
        artistes: [], jours: [],
      };
      const [newRes, setNewRes] = useState(EMPTY_RES);

      useEffect(() => {
        fetch(`${API}/rh/residences`).then(r => r.ok ? r.json() : []).then(d => {
          setResidences(d.filter(r => r.projet_nom === projet?.nom || r.structure_slug === slug));
        }).catch(() => {});
        fetch(`${API}/rh/artistes`).then(r => r.ok ? r.json() : []).then(d => {
          setArtistes(d.filter(a => a.structure_slug === slug || a.projet_nom === projet?.nom));
        }).catch(() => {});
      }, []);

      function genererJours(dateDebut, dateFin) {
        if (!dateDebut || !dateFin) return [];
        const jours = [];
        const d = new Date(dateDebut + 'T00:00:00');
        const fin = new Date(dateFin + 'T00:00:00');
        while (d <= fin) {
          jours.push({
            date: d.toISOString().slice(0,10),
            label: JOURS_SEM[d.getDay() === 0 ? 6 : d.getDay()-1] + ' ' + d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
            heures: {},
            notes: '',
          });
          d.setDate(d.getDate()+1);
        }
        return jours;
      }

      async function createResidence() {
        setSaving(true);
        const jours = genererJours(newRes.date_debut, newRes.date_fin);
        const payload = { ...newRes, artistes: artistes.slice(0, 20), jours };
        try {
          const res = await fetch(`${API}/rh/residences`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (res.ok) {
            const saved = await res.json();
            setResidences(p => [saved, ...p]);
            setSelectedRes(saved);
            setShowNew(false);
            setNewRes(EMPTY_RES);
          }
        } catch {}
        setSaving(false);
      }

      async function updateJourHeures(resId, jourIdx, artisteId, heures) {
        setResidences(prev => prev.map(r => {
          if (r.id !== resId) return r;
          const jours = [...(r.jours || [])];
          jours[jourIdx] = { ...jours[jourIdx], heures: { ...(jours[jourIdx].heures || {}), [artisteId]: heures } };
          return { ...r, jours };
        }));
        if (selectedRes?.id === resId) {
          setSelectedRes(prev => {
            const jours = [...(prev.jours || [])];
            jours[jourIdx] = { ...jours[jourIdx], heures: { ...(jours[jourIdx].heures || {}), [artisteId]: heures } };
            return { ...prev, jours };
          });
        }
      }

      async function saveResidence(res) {
        setSaving(true);
        try {
          await fetch(`${API}/rh/residences/${res.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(res) });
        } catch {}
        setSaving(false);
      }

      async function exportPlanning(res) {
        const a = document.createElement('a');
        a.href = `${API}/export/planning-residence/${res.id}`;
        a.download = `Planning_${res.titre}.xlsx`;
        a.click();
      }

      function totalHeuresArtiste(res, artisteId) {
        return (res.jours || []).reduce((sum, j) => sum + (parseFloat(j.heures?.[artisteId]) || 0), 0);
      }

      function totalHeuresJour(jour) {
        return Object.values(jour.heures || {}).reduce((sum, h) => sum + (parseFloat(h)||0), 0);
      }

      // Vue liste
      if (!selectedRes) return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Plannings de r\u00e9sidence — {projet?.nom}</div>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(true)}>+ Nouvelle r\u00e9sidence</button>
          </div>

          {residences.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-icon">\U0001f4c5</div>
                <div className="empty-text">Aucun planning de r\u00e9sidence pour ce projet.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {residences.map(r => {
                const nbJours = (r.jours || []).length;
                const nbArtistes = (r.artistes || []).length;
                const totalH = (r.jours || []).reduce((sum, j) => sum + totalHeuresJour(j), 0);
                return (
                  <div key={r.id} className="card" style={{ cursor: 'pointer', borderLeft: '4px solid var(--pk-blue)' }}
                    onClick={() => setSelectedRes(r)}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.titre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                      {r.date_debut} \u2192 {r.date_fin}
                      {r.lieu && <span> \u00B7 {r.lieu}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                      <span style={{ background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', padding: '2px 8px', borderRadius: 8 }}>{nbJours} jour(s)</span>
                      <span style={{ background: '#F3E5F5', color: '#6A1B9A', padding: '2px 8px', borderRadius: 8 }}>{nbArtistes} artiste(s)</span>
                      {totalH > 0 && <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: 8 }}>{totalH}h total</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal nouvelle r\u00e9sidence */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
              <div className="modal" style={{ maxWidth: 520 }}>
                <div className="modal-title">\U0001f4c5 Nouvelle r\u00e9sidence artistique</div>
                <div className="form-group">
                  <label className="form-label">Titre de la r\u00e9sidence *</label>
                  <input className="form-input" value={newRes.titre} onChange={e => setNewRes(p=>({...p,titre:e.target.value}))} placeholder="Ex: R\u00e9sidence Bastet F\u00e9vrier 2026" />
                </div>
                <div className="form-group">
                  <label className="form-label">Lieu</label>
                  <input className="form-input" value={newRes.lieu} onChange={e => setNewRes(p=>({...p,lieu:e.target.value}))} placeholder="Studio, salle de r\u00e9p\u00e9tition..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date de d\u00e9but *</label>
                    <input className="form-input" type="date" value={newRes.date_debut} onChange={e => setNewRes(p=>({...p,date_debut:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de fin *</label>
                    <input className="form-input" type="date" value={newRes.date_fin} onChange={e => setNewRes(p=>({...p,date_fin:e.target.value}))} />
                  </div>
                </div>
                {newRes.date_debut && newRes.date_fin && (
                  <div style={{ fontSize: 12, color: 'var(--pk-blue)', padding: '6px 10px', background: 'var(--pk-blue-light)', borderRadius: 6 }}>
                    \U0001f4c5 {genererJours(newRes.date_debut, newRes.date_fin).length} jour(s) de r\u00e9sidence \u00B7 {artistes.length} artiste(s) disponibles
                  </div>
                )}
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={2} value={newRes.notes} onChange={e => setNewRes(p=>({...p,notes:e.target.value}))} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowNew(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={createResidence} disabled={!newRes.titre || !newRes.date_debut || !newRes.date_fin || saving}>
                    {saving ? '\u23F3 Cr\u00e9ation...' : 'Cr\u00e9er le planning \u2192'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );

      // Vue d\u00e9tail planning
      const res = selectedRes;
      const resArtistes = res.artistes || [];

      return (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" onClick={() => { saveResidence(res); setSelectedRes(null); }}>← Retour</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{res.titre}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{res.date_debut} \u2192 {res.date_fin}{res.lieu ? ' \u00B7 ' + res.lieu : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => exportPlanning(res)}>\U0001f4e5 Export xlsx</button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => saveResidence(res)} disabled={saving}>
                {saving ? '\u23F3' : '\U0001f4be Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Tableau planning */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--pk-blue)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 100 }}>
                    Date
                  </th>
                  {resArtistes.map(a => (
                    <th key={a.id} style={{ padding: '10px 8px', textAlign: 'center', color: 'white', fontWeight: 600, minWidth: 90 }}>
                      {a.prenom} {a.nom}<br />
                      <span style={{ fontSize: 10, opacity: 0.8 }}>{a.role}</span>
                    </th>
                  ))}
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'white', fontWeight: 700, minWidth: 80 }}>Total H</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: 'white', fontWeight: 600, minWidth: 120 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(res.jours || []).map((jour, jIdx) => {
                  const total = totalHeuresJour(jour);
                  const isWeekend = ['Sam','Dim'].some(d => jour.label?.startsWith(d));
                  return (
                    <tr key={jIdx} style={{ background: isWeekend ? '#FFF8F0' : jIdx%2===0 ? 'white' : 'var(--surface2)' }}>
                      <td style={{ padding: '6px 12px', fontWeight: isWeekend ? 600 : 400, color: isWeekend ? 'var(--pk-orange)' : 'inherit', whiteSpace: 'nowrap' }}>
                        {jour.label}
                      </td>
                      {resArtistes.map(a => (
                        <td key={a.id} style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <input
                            type="number" min="0" max="24" step="0.5"
                            value={jour.heures?.[a.id] || ''}
                            onChange={e => updateJourHeures(res.id, jIdx, a.id, parseFloat(e.target.value) || 0)}
                            style={{ width: 60, textAlign: 'center', padding: '4px', borderRadius: 4, border: '1px solid var(--border2)', fontSize: 12,
                              background: jour.heures?.[a.id] ? 'var(--success-light)' : 'white',
                              color: jour.heures?.[a.id] ? 'var(--success)' : 'var(--text3)' }}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: total > 0 ? 'var(--pk-blue)' : 'var(--text3)' }}>
                        {total > 0 ? total + 'h' : '—'}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input value={jour.notes || ''} onChange={e => {
                          setSelectedRes(prev => {
                            const jours = [...(prev.jours||[])];
                            jours[jIdx] = { ...jours[jIdx], notes: e.target.value };
                            return { ...prev, jours };
                          });
                        }} style={{ width: '100%', padding: '3px 6px', border: '1px solid var(--border2)', borderRadius: 4, fontSize: 11 }} placeholder="Note du jour" />
                      </td>
                    </tr>
                  );
                })}
                {/* Ligne totaux */}
                <tr style={{ background: 'var(--pk-blue)', color: 'white' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>TOTAUX</td>
                  {resArtistes.map(a => {
                    const tot = totalHeuresArtiste(res, a.id);
                    return (
                      <td key={a.id} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>
                        {tot > 0 ? tot + 'h' : '—'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                    {(res.jours||[]).reduce((s,j) => s+totalHeuresJour(j), 0)}h
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dispos artistes */}
          {artistes.filter(a => !resArtistes.find(r => r.id === a.id)).length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header"><div className="card-title">Ajouter un artiste au planning</div></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {artistes.filter(a => !resArtistes.find(r => r.id === a.id)).map(a => (
                  <button key={a.id} className="btn" style={{ fontSize: 11 }}
                    onClick={() => {
                      const newArtistes = [...resArtistes, { id: a.id, nom: a.nom, prenom: a.prenom, role: a.role }];
                      setSelectedRes(p => ({ ...p, artistes: newArtistes }));
                    }}>
                    + {a.prenom} {a.nom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }


    function SyncModal({ projet, clientMeta, onClose, onTaskCreated }) {
      const [step, setStep] = useState('confirm'); // confirm | loading | result
      const [result, setResult] = useState(null);
      const [error, setError] = useState('');

      const slug = clientMeta.slug;

      async function runSync() {
        setStep('loading');
        try {
          const res = await fetch(`${API}/clients/${slug}/projets/${projet.slug}/sync`, {
            method: 'POST',
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setResult(data);
          setStep('result');
        } catch (e) {
          setError(e.message);
          setStep('confirm');
        }
      }

      async function valider() {
        try {
          await fetch(`${API}/taches/${result.task_id}/valider`, { method: 'POST' });
          onTaskCreated();
        } catch (e) {
          setError(e.message);
        }
      }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal">
            <div className="modal-title">🔄 Synchroniser les Excel</div>

            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{error}</div>}

            {step === 'confirm' && (
              <>
                <div className="modal-sub">
                  Claude va analyser les deux fichiers Excel du projet et l'Excel Association, vérifier la cohérence des données, et proposer les mises à jour nécessaires.
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13, marginBottom: 16 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>Ce qui sera vérifié :</div>
                  <div style={{ color: 'var(--text2)', lineHeight: 1.8 }}>
                    • Les infos de l'Association (SIRET, nom, contacts) sont-elles à jour dans le Dossier Subvention ?<br />
                    • Les taux de charges correspondent-ils aux paramètres actuels ?<br />
                    • Le bilan de l'Association reflète-t-il les données du projet ?<br />
                    • Des informations manquantes ou incohérentes ?
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                  📖 <a href="https://docs.google.com/spreadsheets" target="_blank" style={{ color: 'var(--accent)' }}>Consulter la documentation de synchronisation</a> pour comprendre les règles appliquées.
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={onClose}>Annuler</button>
                  <button className="btn btn-primary" onClick={runSync}>Lancer l'analyse →</button>
                </div>
              </>
            )}

            {step === 'loading' && (
              <div className="empty" style={{ padding: '40px 0' }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Claude analyse les fichiers…</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Lecture des Excel Association + Projet en cours</div>
              </div>
            )}

            {step === 'result' && result && (
              <>
                <div style={{ background: result.nb_ecarts > 0 ? 'var(--warn-light)' : 'var(--accent-light)', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                  {result.nb_ecarts > 0
                    ? <><strong>{result.nb_ecarts} écart(s) détecté(s)</strong> — une tâche de validation a été créée</>
                    : <><strong>✅ Tout est synchronisé</strong> — aucune modification nécessaire</>
                  }
                </div>

                {result.ecarts && result.ecarts.length > 0 && (
                  <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 14 }}>
                    {result.ecarts.map((e, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <div style={{ fontWeight: 500 }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{e.fichier} · {e.champ}</div>
                        {e.valeur_asso && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>Association : {e.valeur_asso} → Projet : {e.valeur_projet}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {result.analyse_claude && (
                  <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Analyse Claude :</div>
                    {result.analyse_claude}
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn" onClick={onClose}>Fermer</button>
                  {result.task_id && (
                    <button className="btn btn-primary" onClick={valider}>
                      ✓ Valider et appliquer →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // ── Modal ajout subvention ────────────────────────────────────────────────────

    function AddSubventionModal({ onClose, onAdd }) {
      const [form, setForm] = useState({ financeur: '', montant_demande: '', montant_accorde: '', deadline: '', statut: 'À préparer', notes: '' });
      function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal">
            <div className="modal-title">Nouvelle demande de subvention</div>
            <div className="form-group">
              <label className="form-label">Financeur *</label>
              <input className="form-input" value={form.financeur} onChange={e => set('financeur', e.target.value)} placeholder="Mairie de Paris, DRAC IDF, CNM..." autoFocus />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Montant demandé (€)</label>
                <input className="form-input" type="number" value={form.montant_demande} onChange={e => set('montant_demande', e.target.value)} placeholder="10000" />
              </div>
              <div className="form-group">
                <label className="form-label">Montant accordé (€)</label>
                <input className="form-input" type="number" value={form.montant_accorde} onChange={e => set('montant_accorde', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Deadline dépôt</label>
                <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {['À préparer', 'Déposée', 'En instruction', 'Accordée', 'Refusée', 'Versée'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Conditions, contacts, remarques..." />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={() => form.financeur && onAdd(form)} disabled={!form.financeur}>
                Ajouter →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Clients view ──────────────────────────────────────────────────────────────

    function ClientsView({ clients, onNewClient, onOpenClient }) {
      const [search, setSearch] = useState('');
      const [showArchived, setShowArchived] = useState(false);
      const [syncMsg, setSyncMsg] = useState({});

      const actifs = clients
        .filter(c => !c.archived)
        .filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.siret?.includes(search))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));

      const archives = clients
        .filter(c => c.archived)
        .filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));

      const displayed = showArchived ? archives : actifs;

      async function toggleArchive(e, slug, currentArchived) {
        e.stopPropagation();
        await fetch(`${API}/clients/${slug}/archive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: !currentArchived }),
        });
        window.location.reload(); // Recharge pour mise à jour liste
      }

      async function syncDrive(e, slug) {
        e.stopPropagation();
        setSyncMsg(p => ({ ...p, [slug]: '⏳ Sync...' }));
        try {
          const res = await fetch(`${API}/clients/${slug}/sync-drive`, { method: 'POST' });
          const d = await res.json();
          setSyncMsg(p => ({ ...p, [slug]: d.status === 'ok' ? `✅ ${d.synced.length} fichier(s) synced` : `⚠️ Partiel (${d.errors[0]})` }));
          setTimeout(() => setSyncMsg(p => ({ ...p, [slug]: '' })), 4000);
        } catch (err) {
          setSyncMsg(p => ({ ...p, [slug]: '❌ Erreur' }));
        }
      }

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                {showArchived ? archives.length : actifs.length} client(s) {showArchived ? 'archivés' : 'actifs'}
              </div>
              <button
                className="btn"
                style={{ fontSize: 11, background: showArchived ? 'var(--pk-blue-light)' : 'var(--surface2)', color: showArchived ? 'var(--pk-blue)' : 'var(--text3)' }}
                onClick={() => setShowArchived(p => !p)}
              >
                {showArchived ? '👁 Actifs' : `📦 Archives (${archives.length})`}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 180 }} />
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onNewClient}>+ Nouveau client</button>
            </div>
          </div>

          <div className="card">
            {displayed.length === 0 && (
              <div className="empty" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">{showArchived ? '📦' : '📁'}</div>
                <div className="empty-text" style={{ marginBottom: 8 }}>
                  {search ? 'Aucun résultat.' : showArchived ? 'Aucun client archivé.' : 'Aucun dossier client'}
                </div>
                {!search && !showArchived && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, maxWidth: 320, textAlign: 'center' }}>
                      Créez un dossier ou importez l'historique via Devis & Factures → 📥 Historique Excel.
                    </div>
                    <button className="btn btn-primary" onClick={onNewClient}>+ Créer un premier dossier</button>
                  </>
                )}
              </div>
            )}
            {displayed.map((c, i) => {
              const logo = localStorage.getItem(`pk_logo_${c.slug}`);
              const typeIcon = c.type === 'sas_senegal' ? '🇸🇳' : '🇫🇷';
              return (
                <div key={i} className="client-row" onClick={() => onOpenClient(c.slug)}
                  style={{ cursor: 'pointer', padding: '10px 4px', opacity: c.archived ? 0.6 : 1 }}>
                  {logo
                    ? <img src={logo} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)', background: 'white', padding: 2, flexShrink: 0 }} />
                    : <div className="client-avatar" style={{ flexShrink: 0 }}>{initials(c.nom)}</div>
                  }
                  <div className="client-info" style={{ flex: 1 }}>
                    <div className="client-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{c.nom}</span>
                      <span style={{ fontSize: 11 }}>{typeIcon}</span>
                      {c.archived && <span style={{ fontSize: 10, background: 'var(--surface2)', color: 'var(--text3)', padding: '1px 6px', borderRadius: 8 }}>Archivé</span>}
                    </div>
                    <div className="client-meta">
                      {c.nb_projets > 0 && <span>{c.nb_projets} projet(s)</span>}
                      {c.siret && <span> · {c.siret.slice(0, 9)}…</span>}
                      {c.implantation && <span> · {c.implantation}</span>}
                    </div>
                    {syncMsg[c.slug] && <div style={{ fontSize: 11, color: 'var(--pk-blue)', marginTop: 2 }}>{syncMsg[c.slug]}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn"
                      style={{ fontSize: 10, padding: '2px 7px', color: 'var(--text3)' }}
                      title="Synchroniser avec Drive"
                      onClick={e => syncDrive(e, c.slug)}
                    >☁️</button>
                    <button
                      className="btn"
                      style={{ fontSize: 10, padding: '2px 7px', color: c.archived ? 'var(--success)' : 'var(--text3)' }}
                      title={c.archived ? 'Désarchiver' : 'Archiver'}
                      onClick={e => toggleArchive(e, c.slug, c.archived)}
                    >{c.archived ? '↩ Restaurer' : '📦 Archiver'}</button>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ cursor: 'pointer' }} onClick={() => onOpenClient(c.slug)}>
                      <path d="M5 3l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

