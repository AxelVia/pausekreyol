    // ── Devis & Factures ──────────────────────────────────────────────────────────

    // ── Modal PDF (URL + Upload) ────────────────────────────────────────────────
    function PdfAttachModal({ type, id, currentUrl, onClose, onSaved }) {
      const [tabPdf, setTabPdf] = useState(currentUrl ? 'url' : 'url');
      const [urlInput, setUrlInput] = useState(currentUrl || '');
      const [uploading, setUploading] = useState(false);
      const [msg, setMsg] = useState('');

      async function saveUrl() {
        if (!urlInput.trim()) return;
        const endpoint = type === 'devis' ? `${API}/devis/${id}` : `${API}/factures/${id}`;
        await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdf_url: urlInput.trim() }) });
        onSaved(urlInput.trim());
        onClose();
      }

      async function handleUpload(file) {
        if (!file) return;
        setUploading(true);
        setMsg('Upload en cours...');
        try {
          // Convertit le PDF en base64 DataURL et le stocke comme pdf_url
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target.result;
            const endpoint = type === 'devis' ? `${API}/devis/${id}` : `${API}/factures/${id}`;
            await fetch(endpoint, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdf_url: dataUrl, pdf_nom: file.name })
            });
            onSaved(dataUrl);
            setMsg('✅ PDF attaché !');
            setTimeout(() => onClose(), 800);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          setMsg('❌ Erreur : ' + err.message);
        }
        setUploading(false);
      }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-title">📎 Attacher un PDF</div>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className={`tab ${tabPdf === 'url' ? 'active' : ''}`} onClick={() => setTabPdf('url')}>🔗 Lien URL</button>
              <button className={`tab ${tabPdf === 'upload' ? 'active' : ''}`} onClick={() => setTabPdf('upload')}>📁 Depuis l'ordinateur</button>
            </div>

            {tabPdf === 'url' && (
              <div>
                <div className="form-group">
                  <label className="form-label">URL du PDF (Google Drive, Dropbox, site...)</label>
                  <input className="form-input" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view" autoFocus />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, padding: '8px 10px', background: 'var(--pk-blue-light)', borderRadius: 6 }}>
                  💡 Drive : ouvrir le PDF → Partager (accès public) → Copier le lien
                </div>
                {currentUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <a href={currentUrl.startsWith('data:') ? '#' : currentUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--accent)' }}>📄 Voir le PDF actuel →</a>
                    <button onClick={async () => {
                      const ep = type === 'devis' ? `${API}/devis/${id}` : `${API}/factures/${id}`;
                      await fetch(ep, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdf_url: null, pdf_nom: null }) });
                      onSaved(null); onClose();
                    }} style={{ marginLeft: 12, fontSize: 11, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>🗑 Supprimer</button>
                  </div>
                )}
                <div className="modal-footer">
                  <button className="btn" onClick={onClose}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveUrl} disabled={!urlInput.trim()}>Enregistrer →</button>
                </div>
              </div>
            )}

            {tabPdf === 'upload' && (
              <div>
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', fontSize: 13 }}>
                    📁 Choisir un fichier PDF
                    <input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                      onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
                  </label>
                  {uploading && <div style={{ marginTop: 12, color: 'var(--text3)', fontSize: 12 }}>⏳ Upload en cours...</div>}
                  {msg && <div style={{ marginTop: 12, fontSize: 12, color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{msg}</div>}
                  <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text3)' }}>Le PDF sera stocké directement dans l'application.</div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={onClose}>Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    function DevisFacturesView({ setView, setSelectedClient, newDevisTrigger }) {
      const [tab, setTab] = useState('devis');
      const [filterArchive, setFilterArchive] = useState(false);
      const [filterAnnee, setFilterAnnee] = useState('tous');
      const [filterMois, setFilterMois] = useState('tous');
      const [remiseModal, setRemiseModal] = useState(null); // { id, remise_globale_pct }
      const [remiseVal, setRemiseVal] = useState(0);

      const MOIS_LABELS = ['Tous les mois','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(true);
      const [showNewDevis, setShowNewDevis] = useState(false);
      const [importMsg, setImportMsg] = useState('');
      const [pdfModal, setPdfModal] = useState(null); // { type, id, currentUrl }

      // Ouvre la modale "Nouveau devis" quand le bouton topbar est pressé
      useEffect(() => {
        if (newDevisTrigger > 0) setShowNewDevis(true);
      }, [newDevisTrigger]);

      async function exportComptaExcel() {
        // Télécharge le vrai xlsx via l'API (sauvegardé aussi sur Drive)
        try {
          setImportMsg('⏳ Génération du fichier Excel...');
          const res = await fetch(`${API}/export/compta-xlsx`);
          if (!res.ok) throw new Error('Erreur serveur');
          const blob = await res.blob();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `Pause_Kreyol_Comptabilite_Pro.xlsx`;
          a.click();
          setImportMsg('✅ Fichier Excel exporté et sauvegardé sur Drive');
          setTimeout(() => setImportMsg(''), 4000);
        } catch(e) {
          setImportMsg('❌ Erreur export : ' + e.message);
        }
      }

      async function deleteDevis(id) {
        if (!window.confirm('Supprimer ce devis ? (irréversible si aucune facture liée)')) return;
        await fetch(`${API}/devis/${id}`, { method: 'DELETE' });
        load();
      }

      async function deleteFacture(id) {
        if (!window.confirm('Supprimer / annuler cette facture ?')) return;
        await fetch(`${API}/factures/${id}`, { method: 'DELETE' });
        load();
      }

      async function importHistorique(file) {
        const form = new FormData();
        form.append('file', file);
        setImportMsg('Import en cours…');
        try {
          const res = await fetch(`${API}/import/compta-historique`, { method: 'POST', body: form });
          const d = await res.json();
          if (res.ok) {
            const majD = d.devis_mis_a_jour || 0;
            const majF = d.factures_mises_a_jour || 0;
            setImportMsg(`✅ ${d.devis_importes} devis + ${d.factures_importees} factures importés${majD+majF>0 ? `, ${majD+majF} mis à jour` : ''} — ${d.clients_crees} client(s) créé(s)`);
            load();
          } else {
            setImportMsg('❌ Erreur : ' + (d.detail || 'inconnue'));
          }
        } catch (e) {
          setImportMsg('❌ ' + e.message);
        }
        setTimeout(() => setImportMsg(''), 6000);
      }

      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`${API}/devis-factures/dashboard`);
          if (res.ok) setData(await res.json());
        } catch { }
        setLoading(false);
      }

      useEffect(() => { load(); }, []);

      const STATUT_DEVIS = {
        brouillon: { label: 'Brouillon', bg: 'var(--surface2)', color: 'var(--text3)' },
        envoyé: { label: 'Envoyé', bg: 'var(--pk-blue-light)', color: 'var(--pk-blue)' },
        signé: { label: 'Signé', bg: '#FFF3E0', color: '#E65100' },
        validé: { label: 'Validé', bg: 'var(--accent-light)', color: 'var(--accent)' },
        facturé: { label: 'Facturé', bg: '#E8F5E9', color: '#1B5E20' },
        annulé: { label: '⛔ Annulé', bg: 'var(--danger-light)', color: 'var(--danger)' },
        caduc: { label: '⏰ Caduc', bg: 'var(--surface2)', color: 'var(--text3)' },
      };
      const STATUT_FACTURE = {
        à_faire: { label: 'À faire', bg: '#FFF3E0', color: '#E65100' },
        envoyée: { label: 'Envoyée', bg: 'var(--pk-blue-light)', color: 'var(--pk-blue)' },
        payée: { label: '✅ Payée', bg: '#E8F5E9', color: '#1B5E20' },
        annulée: { label: 'Annulée', bg: 'var(--danger-light)', color: 'var(--danger)' },
        en_retard: { label: '🚨 En retard', bg: 'var(--danger-light)', color: 'var(--danger)' },
        majoration: { label: '10% Majoration', bg: '#F3E5F5', color: '#6A1B9A' },
      };

      function SBadge({ statut, map }) {
        const s = map[statut] || { label: statut, bg: 'var(--surface2)', color: 'var(--text3)' };
        return <span style={{ background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>;
      }

      async function patchDevis(id, body) {
        await fetch(`${API}/devis/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        load();
      }

      async function patchFacture(id, body) {
        await fetch(`${API}/factures/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        load();
      }

      // Années disponibles : calculé depuis les données réelles (devis + factures)
      const anneesDevis = (data?.liste_devis || []).map(d => d.annee).filter(Boolean);
      const anneesFact = (data?.liste_factures || []).map(f => f.annee).filter(Boolean);
      const anneesDispos = ['tous', ...Array.from(new Set([...anneesDevis, ...anneesFact])).sort((a, b) => Number(b) - Number(a))];

      // Helper : extrait le mois depuis date_envoi ou created_at (format DD/MM/YYYY ou ISO)
      function extractMois(item) {
        const d = item.date_envoi || item.date_emission || item.created_at || '';
        if (d.includes('/')) return parseInt(d.split('/')[1], 10); // DD/MM/YYYY
        if (d.includes('-')) return parseInt(d.split('-')[1], 10); // ISO
        return 0;
      }

      const listeDevis = (data?.liste_devis || []).filter(d =>
        (filterAnnee === 'tous' || String(d.annee) === String(filterAnnee)) &&
        (filterMois === 'tous' || extractMois(d) === parseInt(filterMois, 10)) &&
        (filterArchive ? d.archived : !d.archived)
      ).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const listeFactures = (data?.liste_factures || []).filter(f =>
        (filterAnnee === 'tous' || String(f.annee) === String(filterAnnee)) &&
        (filterMois === 'tous' || extractMois(f) === parseInt(filterMois, 10)) &&
        (filterArchive ? ['annulée', 'en_retard'].includes(f.statut) && f.archived : !f.archived)
      ).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const devisStats = data?.devis || {};
      const facturesStats = data?.factures || {};

      // Métriques filtrées selon l'année/mois sélectionné
      const caDevisFiltres = listeDevis.filter(x => ['validé','facturé','signé'].includes(x.statut)).reduce((s,x) => s+(x.total_ht||0), 0);
      const caFacturesFiltres = listeFactures.filter(x => x.statut === 'payée').reduce((s,x) => s+(x.total_ht||0), 0);
      const enAttenteFiltres = listeFactures.filter(x => ['envoyée','à_faire'].includes(x.statut)).reduce((s,x) => s+(x.solde_a_payer||0), 0);
      const isFiltered = filterAnnee !== 'tous' || filterMois !== 'tous';

      return (
        <div>
          {/* Métriques */}
          <div className="metrics-grid" style={{ marginBottom: 12 }}>
            <div className="metric-card accent-green">
              <div className="metric-label">CA devis validés{isFiltered ? ' (filtre)' : ''}</div>
              <div className="metric-value">{(isFiltered ? caDevisFiltres : (devisStats.ca_devis_valides||0)).toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">{isFiltered ? listeDevis.filter(x=>['validé','facturé'].includes(x.statut)).length : (devisStats.valides||0)} devis</div>
            </div>
            <div className="metric-card accent-info">
              <div className="metric-label">CA encaissé{isFiltered ? ' (filtre)' : ''}</div>
              <div className="metric-value">{(isFiltered ? caFacturesFiltres : (facturesStats.ca_encaisse||0)).toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">{isFiltered ? listeFactures.filter(x=>x.statut==='payée').length : (facturesStats.payees||0)} factures payées</div>
            </div>
            <div className="metric-card accent-warn">
              <div className="metric-label">En attente{isFiltered ? ' (filtre)' : ''}</div>
              <div className="metric-value">{(isFiltered ? enAttenteFiltres : (facturesStats.en_attente||0)).toLocaleString('fr-FR')} €</div>
              <div className="metric-sub">{isFiltered ? listeFactures.filter(x=>['envoyée','à_faire'].includes(x.statut)).length : (facturesStats.envoyees||0)} facture(s)</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Devis en cours</div>
              <div className="metric-value">{isFiltered ? listeDevis.filter(x=>!x.archived).length : (devisStats.en_cours||0)}</div>
              <div className="metric-sub">{isFiltered ? listeDevis.filter(x=>x.archived).length : (devisStats.annules||0)} annulés</div>
            </div>
          </div>

          {/* Import historique */}
          {importMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13,
              background: importMsg.startsWith('✅') ? 'var(--success-light)' : importMsg.startsWith('❌') ? 'var(--danger-light)' : 'var(--pk-blue-light)',
              color: importMsg.startsWith('✅') ? 'var(--success)' : importMsg.startsWith('❌') ? 'var(--danger)' : 'var(--pk-blue)',
            }}>
              {importMsg}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[['devis', `Devis (${(data?.liste_devis || []).filter(x => !x.archived).length})`],
              ['factures', `Factures (${(data?.liste_factures || []).filter(x => !['annulée'].includes(x.statut) || x.type === 'majoration').length})`],
              ['calendrier', '📅 Calendrier']
              ].map(([k, l]) => (
                <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filtre année */}
              <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                value={filterAnnee} onChange={e => { setFilterAnnee(e.target.value); setFilterMois('tous'); }}>
                {anneesDispos.map(a => <option key={a} value={a}>{a === 'tous' ? 'Toutes années' : a}</option>)}
              </select>
              {/* Filtre mois */}
              <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                value={filterMois} onChange={e => setFilterMois(e.target.value)}>
                {MOIS_LABELS.map((m, i) => (
                  <option key={i} value={i === 0 ? 'tous' : String(i)}>{m}</option>
                ))}
              </select>
              {/* Indicateur résultats filtrés */}
              {(filterAnnee !== 'tous' || filterMois !== 'tous') && (
                <span style={{ fontSize: 11, color: 'var(--pk-blue)', background: 'var(--pk-blue-light)', padding: '2px 8px', borderRadius: 8 }}>
                  {tab === 'devis' ? listeDevis.length : listeFactures.length} résultat(s)
                  <button onClick={() => { setFilterAnnee('tous'); setFilterMois('tous'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: 'var(--pk-blue)', fontWeight: 700 }}>✕</button>
                </span>
              )}
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filterArchive} onChange={e => setFilterArchive(e.target.checked)} />
                Voir archives
              </label>
              {tab === 'devis' && !filterArchive && (
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNewDevis(true)}>+ Nouveau devis</button>
              )}
              {/* Export Excel + Import historique */}
              <label className="btn" style={{ fontSize: 11, cursor: 'pointer' }} title="Importer depuis Pause_Kreyol_Comptabilite_Pro.xlsx">
                📥 Historique Excel
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && importHistorique(e.target.files[0])} />
              </label>
              <button className="btn" style={{ fontSize: 11 }} onClick={exportComptaExcel} title="Exporter au format Compta_Pro">
                📤 Export Excel
              </button>
            </div>
          </div>

          {/* ── DEVIS ── */}
          {tab === 'devis' && (
            <div className="card">
              {listeDevis.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">{filterArchive ? '📦' : '📝'}</div>
                  <div className="empty-text">{filterArchive ? 'Aucun devis archivé.' : 'Aucun devis. Créez le premier.'}</div>
                </div>
              ) : listeDevis.map(devis => (
                <div key={devis.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{devis.numero}</span>
                        <SBadge statut={devis.statut} map={STATUT_DEVIS} />
                        {devis.annulation_marker && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>{devis.annulation_marker}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>
                        {devis.client_slug && setView && setSelectedClient ? (
                          <button onClick={() => { setSelectedClient(devis.client_slug); setView('clients'); }}
                            style={{ fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-blue)', fontSize: 12, padding: 0 }}>
                            👤 {devis.client_nom}
                          </button>
                        ) : (
                          <strong>{devis.client_nom}</strong>
                        )}
                        {devis.periode && <span style={{ color: 'var(--text3)' }}> · {devis.periode}</span>}
                      </div>
                      {/* Échéances */}
                      {devis.echeances?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                          {devis.echeances.map((e, i) => (
                            <span key={i} style={{ fontSize: 10, background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', padding: '2px 7px', borderRadius: 8 }}>
                              {e.label} : {(e.montant || 0).toLocaleString('fr-FR')}€ — {e.date}
                            </span>
                          ))}
                        </div>
                      )}
                      {devis.date_limite_signature && devis.statut === 'envoyé' && (
                        <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 3 }}>
                          ⏰ À signer avant le {devis.date_limite_signature}
                        </div>
                      )}
                      {/* Historique */}
                      {devis.historique?.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                          {devis.historique.slice(-3).map((h, i) => (
                            <span key={i} style={{ marginRight: 8 }}>{h.statut} — {h.date?.slice(0, 10)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>
                        {(devis.total_ht || 0).toLocaleString('fr-FR')} €
                      </div>
                      {devis.remise_globale_pct > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                          🏷 Remise {devis.remise_globale_pct}% appliquée
                          {devis.remise_globale_amt > 0 && <span style={{ fontWeight: 400, color: 'var(--text3)' }}> (−{devis.remise_globale_amt} €)</span>}
                        </div>
                      )}
                      {devis.acompte_montant > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Acompte : {devis.acompte_montant} €</div>
                      )}
                      {devis.facilite_paiement && devis.facilite_paiement !== '1x' && (
                        <div style={{ fontSize: 10, background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', padding: '1px 6px', borderRadius: 8, marginTop: 2 }}>
                          Paiement {devis.facilite_paiement}
                        </div>
                      )}
                      {!devis.archived && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                          {devis.statut === 'brouillon' && (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => patchDevis(devis.id, { statut: 'envoyé' })}>📤 Envoyer</button>
                          )}
                          {devis.statut === 'envoyé' && (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => patchDevis(devis.id, { statut: 'signé' })}>✍️ Signé</button>
                          )}
                          {devis.statut === 'signé' && (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => patchDevis(devis.id, { statut: 'validé' })}>✅ Valider</button>
                          )}
                          {!['annulé', 'caduc', 'facturé'].includes(devis.statut) && (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--pk-blue)', borderColor: 'var(--pk-blue)' }}
                              onClick={() => { setRemiseVal(devis.remise_globale_pct || 0); setRemiseModal({ id: devis.id, total_brut: devis.total_brut || devis.total_ht }); }}>
                              🏷 Remise
                            </button>
                          )}
                          {!['annulé', 'caduc', 'facturé'].includes(devis.statut) && (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={() => patchDevis(devis.id, { statut: 'annulé' })}>⛔ Annuler</button>
                          )}
                          {devis.pdf_url ? (
                            <>
                              <a href={devis.pdf_url.startsWith('data:') ? devis.pdf_url : devis.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
                                title={devis.pdf_nom || 'Voir le PDF'}>📄 PDF</a>
                              <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                                onClick={() => setPdfModal({ type: 'devis', id: devis.id, currentUrl: devis.pdf_url })} title="Changer le PDF">✏️</button>
                            </>
                          ) : (
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setPdfModal({ type: 'devis', id: devis.id, currentUrl: null })} title="Attacher un PDF">📎 PDF</button>
                          )}
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)', borderColor: 'transparent' }}
                            onClick={() => deleteDevis(devis.id)} title="Supprimer">🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── FACTURES ── */}
          {tab === 'factures' && (
            <div className="card">
              {listeFactures.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🧾</div>
                  <div className="empty-text">Aucune facture. Les factures sont générées automatiquement à la validation d'un devis.</div>
                </div>
              ) : listeFactures.map(fac => (
                <div key={fac.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{fac.numero}</span>
                        <SBadge statut={fac.type === 'majoration' ? 'majoration' : fac.statut} map={STATUT_FACTURE} />
                        {fac.type === 'majoration' && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#6A1B9A' }}>Majoration 10% retard</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>
                        {fac.client_slug && setView && setSelectedClient ? (
                          <button onClick={() => { setSelectedClient(fac.client_slug); setView('clients'); }}
                            style={{ fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-blue)', fontSize: 12, padding: 0 }}>
                            👤 {fac.client_nom}
                          </button>
                        ) : (
                          <strong>{fac.client_nom}</strong>
                        )}
                        {fac.devis_numero && <span style={{ color: 'var(--text3)' }}> · Devis : {fac.devis_numero}</span>}
                      </div>
                      {fac.date_echeance && fac.statut !== 'payée' && (
                        <div style={{ fontSize: 11, color: fac.statut === 'en_retard' ? 'var(--danger)' : 'var(--warn)', marginTop: 2 }}>
                          ⏰ Échéance : {fac.date_echeance}
                        </div>
                      )}
                      {/* Historique */}
                      {fac.historique?.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                          {fac.historique.slice(-2).map((h, i) => (
                            <span key={i} style={{ marginRight: 8 }}>{h.statut} — {h.date?.slice(0, 10)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: fac.statut === 'payée' ? '#1B5E20' : 'var(--accent)' }}>
                        {(fac.total_ht || 0).toLocaleString('fr-FR')} €
                      </div>
                      {fac.solde_a_payer > 0 && fac.solde_a_payer !== fac.total_ht && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Solde : {fac.solde_a_payer} €</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 8 }}>
                        {fac.statut === 'à_faire' && (
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => patchFacture(fac.id, { statut: 'envoyée' })}>📤 Envoyer</button>
                        )}
                        {fac.statut === 'envoyée' && (
                          <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => patchFacture(fac.id, { statut: 'payée' })}>✅ Payée</button>
                        )}
                        {fac.statut === 'envoyée' && (
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => patchFacture(fac.id, { statut: 'en_retard' })}>🚨 J+7 impayé</button>
                        )}
                        {fac.pdf_url ? (
                          <>
                            <a href={fac.pdf_url.startsWith('data:') ? fac.pdf_url : fac.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--success)', borderColor: 'var(--success)' }}
                              title={fac.pdf_nom || 'Voir le PDF'}>📄 PDF</a>
                            <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setPdfModal({ type: 'facture', id: fac.id, currentUrl: fac.pdf_url })} title="Changer le PDF">✏️</button>
                          </>
                        ) : (
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => setPdfModal({ type: 'facture', id: fac.id, currentUrl: null })} title="Attacher un PDF">📎 PDF</button>
                        )}
                        <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)', borderColor: 'transparent' }}
                          onClick={() => deleteFacture(fac.id)} title="Supprimer/Annuler">🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CALENDRIER DEVIS/FACTURES ── */}
          {tab === 'calendrier' && (
            <CalendrierDevisFactures devis={data?.liste_devis || []} factures={data?.liste_factures || []} />
          )}

          {showNewDevis && <NewDevisModal onClose={() => setShowNewDevis(false)} onCreated={() => { load(); setShowNewDevis(false); }} />}

          {/* Modal Remise */}
          {remiseModal && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRemiseModal(null)}>
              <div className="modal" style={{ maxWidth: 380 }}>
                <div className="modal-title">🏷 Appliquer une remise / rabais / ristourne</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                  La remise est calculée sur le montant brut HT du devis.
                  {remiseModal.total_brut > 0 && (
                    <span style={{ display: 'block', marginTop: 4 }}>
                      Montant brut : <strong>{remiseModal.total_brut.toLocaleString('fr-FR')} €</strong>
                      {remiseVal > 0 && <> → Net après remise : <strong style={{ color: 'var(--success)' }}>{(remiseModal.total_brut * (1 - remiseVal / 100)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</strong></>}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Remise (%)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.5"
                    value={remiseVal} onChange={e => setRemiseVal(parseFloat(e.target.value) || 0)}
                    autoFocus />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    0% = pas de remise · 10% = rabais de 10% sur le montant total
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setRemiseModal(null)}>Annuler</button>
                  <button className="btn btn-primary" onClick={async () => {
                    await patchDevis(remiseModal.id, { remise_globale_pct: remiseVal });
                    setRemiseModal(null);
                  }}>✅ Appliquer la remise</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal PDF */}
          {pdfModal && (
            <PdfAttachModal
              type={pdfModal.type}
              id={pdfModal.id}
              currentUrl={pdfModal.currentUrl}
              onClose={() => setPdfModal(null)}
              onSaved={(url) => {
                // Met à jour localement sans recharger tout
                setData(prev => {
                  if (!prev) return prev;
                  const updateList = (list) => list.map(item =>
                    item.id === pdfModal.id ? { ...item, pdf_url: url } : item
                  );
                  return {
                    ...prev,
                    liste_devis: pdfModal.type === 'devis' ? updateList(prev.liste_devis || []) : (prev.liste_devis || []),
                    liste_factures: pdfModal.type === 'facture' ? updateList(prev.liste_factures || []) : (prev.liste_factures || []),
                  };
                });
                setPdfModal(null);
              }}
            />
          )}
        </div>
      );
    }

    // ── Calendrier Devis/Factures ─────────────────────────────────────────────────

    function CalendrierDevisFactures({ devis, factures }) {
      const today = new Date().toISOString().slice(0, 10);

      // Collecte toutes les dates importantes
      const events = [];

      devis.filter(d => !d.archived).forEach(d => {
        if (d.date_limite_signature && d.statut === 'envoyé') {
          const diff = Math.round((new Date(d.date_limite_signature.split('/').reverse().join('-')) - new Date()) / 86400000);
          events.push({
            type: 'devis_signature',
            label: `✍️ Limite signature — ${d.client_nom} (${d.numero})`,
            date: d.date_limite_signature,
            diff,
            color: diff <= 3 ? 'var(--danger)' : diff <= 7 ? 'var(--warn)' : 'var(--pk-blue)',
            bg: diff <= 3 ? 'var(--danger-light)' : diff <= 7 ? 'var(--warn-light)' : 'var(--pk-blue-light)',
          });
        }
        if (d.date_envoi && d.statut === 'envoyé') {
          events.push({
            type: 'devis_relance',
            label: `🔔 Relance devis J+7 — ${d.client_nom} (${d.numero})`,
            date: d.date_envoi,
            diff: 7,
            color: 'var(--warn)',
            bg: 'var(--warn-light)',
          });
        }
      });

      factures.filter(f => !['payée', 'annulée'].includes(f.statut)).forEach(f => {
        if (f.date_echeance) {
          const dateStr = f.date_echeance.split('/').length === 3
            ? f.date_echeance.split('/').reverse().join('-')
            : f.date_echeance;
          const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
          events.push({
            type: 'facture_echeance',
            label: `🧾 Échéance facture — ${f.client_nom} (${f.numero}) — ${(f.total_ht || 0).toLocaleString('fr-FR')}€`,
            date: f.date_echeance,
            diff,
            color: diff < 0 ? 'var(--danger)' : diff <= 7 ? 'var(--warn)' : 'var(--text2)',
            bg: diff < 0 ? 'var(--danger-light)' : diff <= 7 ? 'var(--warn-light)' : 'var(--surface2)',
            montant: f.total_ht,
          });
        }
        // Échéances de paiement (1x/2x/3x)
        (f.echeances || []).forEach((e, i) => {
          events.push({
            type: 'facture_echeance_detail',
            label: `💳 ${e.label} — ${f.client_nom} — ${(e.montant || 0).toLocaleString('fr-FR')}€`,
            date: e.date,
            diff: 0,
            color: 'var(--pk-blue)',
            bg: 'var(--pk-blue-light)',
          });
        });
      });

      const sorted = events.sort((a, b) => {
        const da = a.date?.split('/').reverse().join('-') || '';
        const db = b.date?.split('/').reverse().join('-') || '';
        return da.localeCompare(db);
      });

      const enRetard = sorted.filter(e => e.diff < 0);
      const urgent = sorted.filter(e => e.diff >= 0 && e.diff <= 7);
      const aVenir = sorted.filter(e => e.diff > 7);

      function Section({ title, items, defaultOpen = true }) {
        const [open, setOpen] = useState(defaultOpen);
        if (!items.length) return null;
        return (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header" style={{ cursor: 'pointer', marginBottom: open ? 14 : 0 }} onClick={() => setOpen(!open)}>
              <div className="card-title">{title} <span style={{ fontSize: 11, color: 'var(--text3)' }}>({items.length})</span></div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && items.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, marginBottom: 4, background: e.bg, border: `1px solid ${e.color}20` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: e.color }}>{e.label}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: e.color, flexShrink: 0 }}>
                  {e.diff < 0 ? `J+${Math.abs(e.diff)} retard` : e.diff === 0 ? "Aujourd'hui" : e.diff === 1 ? 'Demain' : e.date}
                </div>
              </div>
            ))}
          </div>
        );
      }

      return (
        <div>
          {enRetard.length === 0 && urgent.length === 0 && aVenir.length === 0 && (
            <div className="empty"><div className="empty-icon">📅</div><div className="empty-text">Aucune échéance devis/facture en cours.</div></div>
          )}
          <Section title="🚨 En retard" items={enRetard} />
          <Section title="⚠️ Urgent — Dans les 7 jours" items={urgent} />
          <Section title="📅 À venir" items={aVenir} defaultOpen={false} />
        </div>
      );
    }

    // ── Modal nouveau devis ───────────────────────────────────────────────────────

    function NewDevisModal({ onClose, onCreated, defaultClientSlug = '', defaultClientNom = '' }) {
      const [clients, setClients] = useState([]);
      const [tarifs, setTarifs] = useState([]);
      const [offres, setOffres] = useState([]);
      const [form, setForm] = useState({
        client_slug: defaultClientSlug,
        client_nom: defaultClientNom,
        periode: '',
        acompte_pct: 30, facilite_paiement: '1x', notes: '',
      });
      const [prestations, setPrestations] = useState([
        { description: '', texte_libre: '', type: '', quantite: 1, tarif_unitaire: 0, remise_pct: 0, sous_total: 0 }
      ]);
      const [remiseGlobale, setRemiseGlobale] = useState(0); // % remise sur total
      const [showTexteLibre, setShowTexteLibre] = useState({}); // {i: true} affiche la zone texte
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');

      useEffect(() => {
        fetch(`${API}/clients`).then(r => r.json()).then(d => setClients(d || [])).catch(() => { });
        fetch(`${API}/devis/tarifs`).then(r => r.json()).then(d => setTarifs(d || [])).catch(() => { });
        fetch(`${API}/offres`).then(r => r.ok ? r.json() : []).then(d => setOffres(d.filter(o => o.actif !== false))).catch(() => {});
      }, []);

      function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

      function updatePresta(i, k, v) {
        setPrestations(prev => {
          const next = [...prev];
          next[i] = { ...next[i], [k]: v };
          // Recalcule le sous-total avec remise éventuelle
          const qt = parseFloat(next[i].quantite) || 0;
          const tu = parseFloat(next[i].tarif_unitaire) || 0;
          const remPct = parseFloat(next[i].remise_pct) || 0;
          const brut = qt * tu;
          next[i].sous_total = Math.round(brut * (1 - remPct/100) * 100) / 100;
          if (k === 'type') {
            const tarif = tarifs.find(t => t.label === v);
            if (tarif) {
              next[i].tarif_unitaire = tarif.tarif;
              const brut2 = (parseFloat(next[i].quantite) || 1) * tarif.tarif;
              next[i].sous_total = Math.round(brut2 * (1 - remPct/100) * 100) / 100;
              if (!next[i].description) next[i].description = v;
            }
          }
          return next;
        });
      }
      function addLine() {
        setPrestations(prev => [...prev, { description: '', texte_libre: '', type: '', quantite: 1, tarif_unitaire: 0, remise_pct: 0, sous_total: 0 }]);
      }

      function addLineFromOffre(offreId) {
        if (!offreId) return;
        const o = offres.find(x => x.id === offreId);
        if (!o) return;
        setPrestations(prev => [...prev, {
          description: o.nom,
          texte_libre: o.description || '',
          type: '',
          quantite: 1,
          tarif_unitaire: o.prix || 0,
          remise_pct: 0,
          sous_total: o.prix || 0,
          offre_id: o.id,
        }]);
      }


      function removeLine(i) {
        setPrestations(p => p.filter((_, idx) => idx !== i));
      }

      const totalBrut = prestations.reduce((s, p) => s + (parseFloat(p.sous_total) || 0), 0);
      const remiseGlobaleAmt = Math.round(totalBrut * (parseFloat(remiseGlobale) || 0) / 100 * 100) / 100;
      const total = Math.round((totalBrut - remiseGlobaleAmt) * 100) / 100;
      const acompte = Math.round(total * (parseFloat(form.acompte_pct) || 0) / 100 * 100) / 100;
      const solde = Math.round((total - acompte) * 100) / 100;

      // Calcul de l'échéancier automatique
      function calcEcheances(facilite, totalNet, dateEmission) {
        const base = dateEmission || new Date().toISOString().slice(0,10);
        const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10); };
        const addMonths = (d, n) => { const dt = new Date(d); dt.setMonth(dt.getMonth()+n); return dt.toISOString().slice(0,10); };
        if (facilite === '1x') return [{ label: 'Paiement intégral', montant: totalNet, date: addDays(base, 30), pct: 100 }];
        if (facilite === '2x') return [
          { label: 'Acompte 50%', montant: Math.round(totalNet/2*100)/100, date: addDays(base, 0), pct: 50 },
          { label: 'Solde 50%', montant: Math.round(totalNet/2*100)/100, date: addMonths(base, 1), pct: 50 },
        ];
        if (facilite === '3x') return [
          { label: '1er tiers', montant: Math.round(totalNet/3*100)/100, date: addDays(base, 0), pct: 33 },
          { label: '2ème tiers', montant: Math.round(totalNet/3*100)/100, date: addMonths(base, 1), pct: 33 },
          { label: '3ème tiers', montant: Math.round(totalNet/3*100)/100, date: addMonths(base, 2), pct: 34 },
        ];
        return form.echeances_manuelles || [];
      }
      const echeances = calcEcheances(form.facilite_paiement, total, form.date_emission);

      async function submit() {
        if (!form.client_nom) { setError('Client obligatoire'); return; }
        if (!prestations.some(p => p.description)) { setError('Au moins une prestation obligatoire'); return; }
        setLoading(true);
        try {
          const res = await fetch(`${API}/devis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, prestations, total_ht: total, remise_globale_pct: parseFloat(remiseGlobale)||0, remise_globale_amt: remiseGlobaleAmt, echeances }),
          });
          if (!res.ok) throw new Error(await res.text());
          const saved = await res.json();
          // Notif sync si échéancier créé
          if (saved.echeances && saved.echeances.length > 1) {
            console.info(`Dévis créé · ${saved.echeances.length} échéances sync calendrier`);
          }
          onCreated();
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">📝 Nouveau devis</div>
            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className="form-input" value={form.client_slug}
                  onChange={e => {
                    const c = clients.find(x => x.slug === e.target.value);
                    setF('client_slug', e.target.value);
                    setF('client_nom', c ? (c.nom || c.nom_officiel) : '');
                  }}>
                  <option value="">Sélectionner...</option>
                  {clients.map(c => <option key={c.slug} value={c.slug}>{c.nom || c.nom_officiel}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Période</label>
                <input className="form-input" value={form.periode} onChange={e => setF('periode', e.target.value)} placeholder="du JJ/MM/AAAA au JJ/MM/AAAA" />
              </div>
            </div>

            {/* Prestations */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Prestations *</div>
            {prestations.map((p, i) => (
              <div key={i} style={{ marginBottom: 10, padding: '8px', background: 'var(--surface2)', borderRadius: 8 }}>
                {/* Ligne principale */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
                  <div style={{ flex: 3 }}>
                    <input className="form-input" style={{ fontSize: 12 }} value={p.description}
                      onChange={e => updatePresta(i, 'description', e.target.value)} placeholder="Intitulé de la prestation *" />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <select className="form-input" style={{ fontSize: 12 }} value={p.type}
                      onChange={e => updatePresta(i, 'type', e.target.value)}>
                      <option value="">Type</option>
                      {tarifs.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                    </select>
                  </div>
                  <div style={{ width: 56 }}>
                    <input className="form-input" style={{ fontSize: 12, textAlign: 'center' }} type="number" value={p.quantite}
                      onChange={e => updatePresta(i, 'quantite', e.target.value)} min="0" step="0.5" placeholder="Qté" />
                  </div>
                  <div style={{ width: 80 }}>
                    <input className="form-input" style={{ fontSize: 12, textAlign: 'right' }} type="number" value={p.tarif_unitaire}
                      onChange={e => updatePresta(i, 'tarif_unitaire', e.target.value)} placeholder="PU €" />
                  </div>
                  <div style={{ width: 54 }}>
                    <input className="form-input" style={{ fontSize: 12, textAlign: 'center', borderColor: p.remise_pct > 0 ? 'var(--pk-orange)' : 'var(--border2)' }}
                      type="number" value={p.remise_pct || ''} min="0" max="100"
                      onChange={e => updatePresta(i, 'remise_pct', e.target.value)} placeholder="% rem" />
                  </div>
                  <div style={{ width: 80, textAlign: 'right', fontWeight: 700, fontSize: 13, paddingBottom: 6, color: 'var(--pk-blue)', flexShrink: 0 }}>
                    {(p.sous_total || 0).toLocaleString('fr-FR')} €
                    {p.remise_pct > 0 && <div style={{ fontSize: 10, color: 'var(--pk-orange)', fontWeight: 400 }}>-{p.remise_pct}%</div>}
                  </div>
                  <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', paddingBottom: 6, fontSize: 16 }}>✕</button>
                </div>
                {/* Texte libre / description détaillée */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setShowTexteLibre(s => ({...s, [i]: !s[i]}))}
                    style={{ fontSize: 10, background: 'none', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 6px', cursor: 'pointer', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {showTexteLibre[i] ? '▲ Masquer desc.' : '▼ Description détaillée'}
                  </button>
                  {p.texte_libre && !showTexteLibre[i] && (
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.texte_libre.slice(0,60)}</span>
                  )}
                </div>
                {showTexteLibre[i] && (
                  <textarea className="form-input" style={{ fontSize: 11, marginTop: 4, resize: 'vertical', minHeight: 48 }}
                    value={p.texte_libre || ''}
                    onChange={e => updatePresta(i, 'texte_libre', e.target.value)}
                    placeholder="Description détaillée, conditions, inclusions… (apparaîtra dans le devis Word)" />
                )}
              </div>
            ))}
            <button className="btn" style={{ fontSize: 12, marginBottom: 10 }} onClick={addLine}>+ Ligne</button>
            {offres.length > 0 && (
              <select className="form-input" style={{ fontSize: 12, marginBottom: 10, marginLeft: 8, width: 'auto', display: 'inline-block' }}
                value=""
                onChange={e => { addLineFromOffre(e.target.value); }}>
                <option value="">📦 Insérer depuis catalogue...</option>
                {offres.map(o => (
                  <option key={o.id} value={o.id}>{o.nom} — {(o.prix || 0).toLocaleString('fr-FR')} €</option>
                ))}
              </select>
            )}

            {/* Totaux */}
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: 14 }}>
              {totalBrut !== total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--text3)' }}>
                  <span>Sous-total brut</span><span>{totalBrut.toLocaleString('fr-FR')} €</span>
                </div>
              )}
              {/* Remise globale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text2)' }}>Remise globale (%)</span>
                  <input type="number" min="0" max="100" value={remiseGlobale || ''}
                    onChange={e => setRemiseGlobale(e.target.value)}
                    style={{ width: 60, padding: '2px 6px', border: '1px solid var(--border2)', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                    placeholder="0" />
                </div>
                {remiseGlobaleAmt > 0 && <span style={{ color: 'var(--pk-orange)', fontWeight: 600 }}>- {remiseGlobaleAmt.toLocaleString('fr-FR')} €</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                <span>Total HT</span><strong style={{ color: 'var(--pk-blue)' }}>{total.toLocaleString('fr-FR')} €</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text3)' }}>
                <span>TVA — Non applicable (Art. 293B du CGI)</span><span>0 €</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>Acompte (%)</span>
                <input type="number" className="form-input" style={{ width: 70, fontSize: 12 }}
                  value={form.acompte_pct} onChange={e => setF('acompte_pct', e.target.value)} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{acompte.toLocaleString('fr-FR')} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Solde à la livraison</span><strong>{solde.toLocaleString('fr-FR')} €</strong>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Facilité de paiement</label>
                <select className="form-input" value={form.facilite_paiement} onChange={e => setF('facilite_paiement', e.target.value)}>
                  <option value="1x">1 fois (standard)</option>
                  <option value="2x">2 fois</option>
                  <option value="3x">3 fois</option>
                  <option value="manuel">Manuel (délais personnalisés)</option>
                </select>
                {/* Prévisualisation échéancier */}
                {total > 0 && echeances.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--pk-blue-light)', borderRadius: 6, borderLeft: '3px solid var(--pk-blue)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pk-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                      Échéancier automatique
                    </div>
                    {echeances.map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--pk-blue)', padding: '2px 0', borderBottom: i < echeances.length-1 ? '1px solid var(--pk-blue)20' : 'none' }}>
                        <span>{e.label}</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <span style={{ color: 'var(--text3)' }}>{e.date?.split('-').reverse().join('/')}</span>
                          <strong>{e.montant.toLocaleString('fr-FR')} €</strong>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5, fontStyle: 'italic' }}>
                      ✅ Ces échéances seront créées comme tâches et sync avec le calendrier
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Conditions particulières..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? 'Création…' : 'Créer le devis →'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Subventions pipeline view ─────────────────────────────────────────────────



    // ── Modal nouveau client ──────────────────────────────────────────────────────

    // ── Nouveau client — flux obligatoire par Excel ───────────────────────────────

    function NewClientModal({ onClose, onCreated }) {
      const [step, setStep] = useState('intro');    // intro | upload | preview | creating | done
      const [file, setFile] = useState(null);
      const [parsed, setParsed] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [devisAudit, setDevisAudit] = useState(false); // option devis audit

      const LABELS = {
        nom_officiel: 'Nom officiel', nom_usuel: 'Nom usuel', siret: 'SIRET',
        ninea: 'NINEA', rccm: 'RCCM', statut_juridique: 'Statut juridique',
        implantation: 'Implantation', categorie: 'Catégorie', marche_cible: 'Marché cible',
        domaines_artistiques: 'Domaines artistiques', president: 'Président(e)',
        email_contact: 'Email', telephone: 'Téléphone', adresse_siege: 'Adresse',
        date_creation: 'Date création', date_derniere_ag: 'Dernière AG',
        clotures_comptables: 'Clôtures comptables', licence_statut: 'Licence spectacle',
        licence_type1: 'N° licence', banque: 'Banque', iban: 'IBAN',
        societe_droits: 'Société droits', pays: 'Pays',
      };

      // Calcul des warnings métier
      function getWarnings(cd) {
        const warns = [];
        const cat = (cd.categorie || '').toLowerCase();
        const dom = (cd.domaines_artistiques || '').toLowerCase();
        const impl = (cd.implantation || '').toLowerCase();

        if ((cat.includes('diffuseur')) && !cd.licence_type1)
          warns.push({ level: 'error', msg: '🚫 Licence entrepreneur du spectacle obligatoire pour tout diffuseur — impossible de créer des projets sans.' });
        if (cd.type_structure === 'asso_france' && !cd.date_derniere_ag)
          warns.push({ level: 'warn', msg: '⚠️ Date de dernière AG manquante — obligatoire pour les associations.' });
        if (cd.type_structure === 'asso_france' && !cd.numero_rna)
          warns.push({ level: 'info', msg: 'ℹ️ Numéro RNA non renseigné — à collecter.' });
        if ((dom.includes('écriture') || dom.includes('ecrivain') || dom.includes('littérature')) && !cd.societe_droits)
          warns.push({ level: 'warn', msg: '⚠️ Auteur/écrivain détecté — affiliation SCAM/SACD recommandée.' });
        if (impl.includes('antilles') || impl.includes('martinique') || impl.includes('guadeloupe'))
          warns.push({ level: 'info', msg: 'ℹ️ Implantation Antilles — régime fiscal et caisses sociales spécifiques (CGSS, AT-MP).' });
        if (impl.includes('sénégal') || impl.includes('senegal'))
          warns.push({ level: 'info', msg: 'ℹ️ Implantation Sénégal — régime OHADA, caisses IPRES/CSS.' });
        if (!cd.iban)
          warns.push({ level: 'warn', msg: '⚠️ RIB/IBAN manquant — requis pour les paiements et subventions.' });
        return warns;
      }

      async function handleUpload(f) {
        setFile(f);
        setError('');
        setLoading(true);
        const form = new FormData();
        form.append('file', f);
        try {
          const res = await fetch(`${API}/import/parse`, { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Erreur analyse');
          if (data.erreur) throw new Error(data.erreur);
          if (data.type_fichier === 'unknown')
            throw new Error('Format non reconnu. Utilisez TEMPLATE_FICHE_CLIENT_V2.xlsx');
          setParsed(data);
          setStep('preview');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }

      async function handleCreate() {
        setStep('creating');
        setLoading(true);
        const form = new FormData();
        form.append('file', file);
        form.append('devis_audit', devisAudit ? '1' : '0');
        try {
          const res = await fetch(`${API}/import/create-client`, { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Erreur création');
          setStep('done');
          setTimeout(() => { onCreated(); onClose(); }, 1800);
        } catch (e) {
          setError(e.message);
          setStep('preview');
        } finally {
          setLoading(false);
        }
      }

      const cd = parsed?.client_data || {};
      const warnings = parsed ? getWarnings(cd) : [];
      const hasBlocker = warnings.some(w => w.level === 'error');
      const manquants = parsed?.champs_manquants || [];

      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="modal" style={{ width: 600 }}>

            {/* ── INTRO ────────────────────────────────────────────────────────── */}
            {step === 'intro' && (
              <>
                <div className="modal-title">📁 Nouveau dossier client</div>
                <div className="modal-sub">La création d'un dossier client nécessite la fiche de renseignements complétée.</div>

                <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>📋 Processus de création</div>
                  {[
                    ['1', 'Téléchargez et envoyez la fiche au client', 'TEMPLATE_FICHE_CLIENT_V2.xlsx'],
                    ['2', 'Le client la remplit et vous la retourne'],
                    ['3', 'Importez le fichier complété ici'],
                    ['4', 'Vérifiez les données et validez la création'],
                  ].map(([n, label, link]) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, fontSize: 13 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                      <div>
                        {label}
                        {link && <> — <a href={`${API}/templates/fiche-client-v2`} target="_blank" style={{ color: 'var(--accent)', fontWeight: 500 }}>Télécharger le template →</a></>}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius)', padding: '28px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface2)' }}
                  onClick={() => document.getElementById('nc-file-input').click()}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Importer la fiche client complétée</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>TEMPLATE_FICHE_CLIENT_V2.xlsx (.xlsx uniquement)</div>
                  <input id="nc-file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
                </div>

                {loading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>Analyse du fichier…</div>}
                {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginTop: 12 }}>{error}</div>}

                <div className="modal-footer">
                  <button className="btn" onClick={onClose}>Annuler</button>
                </div>
              </>
            )}

            {/* ── PREVIEW ──────────────────────────────────────────────────────── */}
            {step === 'preview' && parsed && (
              <>
                <div className="modal-title">✅ Vérification du dossier</div>
                <div className="modal-sub">{parsed.nb_champs} champs extraits depuis {file?.name}</div>

                {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{error}</div>}

                {/* Warnings métier */}
                {warnings.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {warnings.map((w, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 6,
                        background: w.level === 'error' ? 'var(--danger-light)' : w.level === 'warn' ? 'var(--warn-light)' : 'var(--info-light)',
                        color: w.level === 'error' ? 'var(--danger)' : w.level === 'warn' ? 'var(--warn)' : 'var(--info)',
                      }}>{w.msg}</div>
                    ))}
                  </div>
                )}

                {/* Champs manquants */}
                {manquants.length > 0 && (
                  <div style={{ background: '#FFF8E1', border: '1px solid #F59E0B', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
                    <strong>Champs manquants :</strong> {manquants.join(', ')}
                  </div>
                )}

                {/* Données extraites */}
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {Object.entries(cd).filter(([k, v]) => v && k !== 'type_structure' && k !== 'documents_fournis' && k !== 'emails_surveillance').map(([k, v], i) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{LABELS[k] || k}</span>
                      <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Badge type structure */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, fontSize: 13 }}>
                  <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 20, fontWeight: 500, fontSize: 12 }}>
                    {cd.statut_juridique || cd.type_structure}
                  </span>
                  {cd.implantation && <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>{cd.implantation}</span>}
                  {cd.categorie && <span style={{ background: 'var(--warn-light)', color: 'var(--warn)', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>{cd.categorie}</span>}
                </div>

                {/* Option devis audit */}
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 4, fontSize: 13 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={devisAudit} onChange={e => setDevisAudit(e.target.checked)} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Générer aussi un devis d'audit (optionnel)</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>En plus du devis de rendez-vous démarrage (350€), ajouter un devis d'audit complet</div>
                    </div>
                  </label>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, paddingLeft: 2 }}>
                  ✅ Un devis de rendez-vous démarrage (350€) sera automatiquement généré.
                </div>

                <div className="modal-footer">
                  <button className="btn" onClick={() => { setStep('intro'); setParsed(null); setFile(null); }}>← Recommencer</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreate}
                    disabled={hasBlocker || loading}
                    title={hasBlocker ? 'Corrigez les erreurs bloquantes avant de continuer' : ''}
                  >
                    {hasBlocker ? '🚫 Erreur bloquante' : 'Créer le dossier →'}
                  </button>
                </div>
              </>
            )}

            {/* ── CREATING ─────────────────────────────────────────────────────── */}
            {step === 'creating' && (
              <div className="empty" style={{ padding: '48px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Création du dossier en cours…</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Génération des Excel + synchronisation Google Drive</div>
              </div>
            )}

            {/* ── DONE ─────────────────────────────────────────────────────────── */}
            {step === 'done' && (
              <div className="empty" style={{ padding: '48px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Dossier créé avec succès !</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Fichiers Excel générés sur Drive · Devis de démarrage créé</div>
              </div>
            )}
          </div>
        </div>
      );
    }

