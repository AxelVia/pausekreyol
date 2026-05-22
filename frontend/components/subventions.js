    // ── Nav icons SVG ─────────────────────────────────────────────────────────────

    const icons = {
      dashboard: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>,
      clients: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" /><path d="M12 5.5a2 2 0 1 1 0-4M15 14c0-2.2-1.4-4-3-4.5" /></svg>,
      taches: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="2" y="2" width="12" height="12" rx="1.5" /><polyline points="5,8 7,10 11,6" /></svg>,
      devis: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M11 2v4h3M5 7h6M5 10h4" /></svg>,
      subventions: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M8 2l1.5 3 3.5.5-2.5 2.4.6 3.5L8 9.8l-3.1 1.6.6-3.5L3 5.5l3.5-.5z" /></svg>,
      annuaire: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="2" y="1" width="12" height="14" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h3" /></svg>,
      calendrier: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="1" y="3" width="14" height="12" rx="1.5" /><path d="M1 7h14M5 1v4M11 1v4" /></svg>,
      comm: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h4l2 2 2-2h4a1 1 0 001-1V3a1 1 0 00-1-1z" /></svg>,
      rh: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-2.76 2.24-5 5-5"/><circle cx="12" cy="8" r="1.5"/><path d="M9.5 14c0-1.93 1.12-3.5 2.5-3.5s2.5 1.57 2.5 3.5"/></svg>,
      audit: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3"/><path d="M5 6.5h3M6.5 5v3"/></svg>,
      zcal: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon"><rect x="1" y="3" width="14" height="12" rx="1.5"/><path d="M1 7h14M5 1v4M11 1v4"/><circle cx="5" cy="10.5" r="1"/><circle cx="11" cy="10.5" r="1"/></svg>,
    };

    // ── App ───────────────────────────────────────────────────────────────────────

    // ── Subventions ───────────────────────────────────────────────────────────────

    const MODELES_SUBVENTIONS = [
      {
        id: "feac",
        nom: "FEAC — Fonds d’aide aux échanges artistiques et culturels pour les Outre-mer",
        organisme: "Direction générale de la démocratie culturelle (DGDCER)",
        type: "mobilité",
        deadline_indicative: "30 janvier",
        montant_max: 3000,
        description: "Soutien aux projets de mobilité artistique depuis les Outre-mer vers l’étranger.",
        champs: ["Titre du projet", "Territoire de départ", "Pays d’arrivée", "Nombre de personnes", "Budget total", "Montant sollicité", "Partenaires", "Description détaillée", "Calendrier", "Évaluation"],
        pieces: ["RIB", "Statuts", "Récépissé préfecture", "Budget projet", "Dossier artistique", "Compte certifié N-1"],
        url: "https://demarche.numerique.gouv.fr",
        couleur: "#2834B7",
        icone: "🌐",
      },
      {
        id: "fme_citoyennete",
        nom: "AAP Citoyenneté — Fondation pour la Mémoire de l’Esclavage",
        organisme: "Fondation pour la Mémoire de l’Esclavage (FME)",
        type: "projet pédagogique",
        deadline_indicative: "31 janvier",
        montant_max: 3000,
        description: "Appel à projets pour des actions citoyennes autour de la mémoire de l’esclavage, ciblant les jeunes 12-25 ans.",
        champs: ["Nom de la structure", "SIRET", "Titre du projet", "Résumé (800 car.)", "Domaine du projet", "Type de projet", "Bénéficiaires", "Territoire", "Description détaillée", "Moyens humains", "Budget total", "Montant sollicité", "Évaluation"],
        pieces: ["RIB", "Statuts", "Récépissé préfecture", "JO", "Budget projet", "Budget association", "Dossier descriptif", "Compte certifié 2025", "Déclaration co-financement", "Attestation sur l’honneur"],
        url: "",
        couleur: "#FF795A",
        icone: "🏛",
      },
      {
        id: "fdva",
        nom: "FDVA — Fonds de Développement de la Vie Associative",
        organisme: "Préfecture de région",
        type: "fonctionnement / formation",
        deadline_indicative: "juin (AAP annuel — varie par région)",
        montant_max: 10000,
        description: "Subvention nationale pour les associations : formation des bénévoles et fonctionnement.",
        champs: ["RNA", "Projet associatif", "Budget prévisionnel", "Effectif bénévoles", "Formations prévues"],
        pieces: ["Statuts", "Récépissé préfecture", "Compte de résultat N-1", "Budget prévisionnel"],
        url: "https://www.associations.gouv.fr",
        couleur: "#6A1B9A",
        icone: "🤝",
      },
      {
        id: "dac_creation",
        nom: "DAC — Aide à la création artistique",
        organisme: "Direction des Affaires Culturelles (Martinique / Guadeloupe)",
        type: "création artistique",
        deadline_indicative: "variable (AAP annuel)",
        montant_max: 15000,
        description: "Aide à la création artistique pour les associations des Outre-mer.",
        champs: ["Présentation de la compagnie", "Description du projet artistique", "Budget prévisionnel", "Calendrier de création", "Partenaires", "Diffusion prévue"],
        pieces: ["Statuts", "RNA", "SIRET", "RIB", "Budget prévisionnel", "Dossier artistique", "CV artistes"],
        url: "",
        couleur: "#E65100",
        icone: "🎨",
      },
      {
        id: "cnm",
        nom: "CNM — Centre National de la Musique",
        organisme: "Centre National de la Musique",
        type: "musique / diffusion",
        deadline_indicative: "variable",
        montant_max: 20000,
        description: "Aides aux projets musicaux : création, diffusion, export, festivals.",
        champs: ["Identité de la structure", "Projet musical", "Territoires de diffusion", "Artistes concernés", "Budget", "Partenaires"],
        pieces: ["SIRET", "RIB", "Statuts", "Budget", "Dossier artistique"],
        url: "https://cnm.fr",
        couleur: "#1B5E20",
        icone: "🎵",
      },
    ];

    // ── Fiche détaillée d'une subvention ─────────────────────────────────────

    const PIECES_STANDARD_SUB = [
        { id: "rib", label: "RIB de la structure", required: true },
        { id: "statuts", label: "Statuts de l'association", required: true },
        { id: "pv_ag", label: "PV d'Assemblée Générale", required: true },
        { id: "joafe", label: "Extrait JOAFE / JO", required: true },
        { id: "insee", label: "Attestation INSEE / SIRET", required: true },
        { id: "compte_certifie", label: "Compte certifié N-1", required: true },
        { id: "recepisse", label: "Récépissé préfecture", required: true },
        { id: "budget_aap", label: "Budget selon le modèle de l'AAP ⚠️", required: true, vigilance: 'budget',
          vigilanceMsg: "Utiliser IMPÉRATIVEMENT le modèle de budget fourni par l'organisme dans son appel à projets. Un budget générique entraîne souvent le rejet du dossier." },
        { id: "budget_prev", label: "Budget prévisionnel du projet (générique)", required: false },
        { id: "budget_asso", label: "Budget annuel de l'association N-1", required: true },
        { id: "attestation_honneur", label: "Attestation sur l'honneur", required: true },
        { id: "dossier_artistique", label: "Dossier artistique", required: false },
        { id: "cv_intervenants", label: "CV des intervenants principaux", required: false },
        { id: "decla_cofinancement", label: "Déclaration de co-financement", required: false },
      ];

    const LETTRES_ENGAGEMENT_STD = [
        { id: "leng_institution", label: "Lettre d'engagement — Institution sollicitée", required: true,
          desc: "Confirme l'intérêt de l'organisme subventionneur pour votre projet avant ou pendant l'instruction." },
        { id: "leng_cofinanceur", label: "Lettre(s) d'engagement — Co-financeurs", required: true,
          desc: "Chaque co-financeur confirmé doit fournir une lettre d'intention de financement avec le montant prévu." },
        { id: "leng_partenaires", label: "Lettre(s) d'engagement — Partenaires artistiques", required: false,
          desc: "Les partenaires artistiques ou structures d'accueil confirment leur implication dans le projet." },
        { id: "leng_territoire", label: "Lettre d'engagement — Territoire / Collectivité", required: false,
          desc: "Si le projet est ancré sur un territoire, une lettre du maire, conseil régional ou préfecture peut être requise." },
        { id: "leng_artistes", label: "Lettre(s) d'engagement — Artistes principaux", required: false,
          desc: "Les artistes phares confirment leur participation au projet pour lequel la subvention est sollicitée." },
      ];

    const INFOS_CLIENT_SUB = [
      { id: "nom_officiel",  label: "Nom officiel",          path: ["client_data","nom_officiel"] },
      { id: "siret",         label: "N° SIRET",              path: ["client_data","siret"] },
      { id: "numero_rna",    label: "N° RNA",                path: ["client_data","numero_rna"] },
      { id: "adresse_siege", label: "Adresse siège social",  path: ["client_data","adresse_siege"] },
      { id: "president",     label: "Président(e)",          path: ["client_data","president"] },
      { id: "email_contact", label: "Email de contact",      path: ["client_data","email_contact"] },
      { id: "telephone",     label: "Téléphone",             path: ["client_data","telephone"] },
      { id: "licence_type1", label: "N° Licence spectacle",  path: ["client_data","licence_type1"] },
    ];

    function SubventionFicheView({ sub, clients, clientsDetails, allModeles, onBack, onUpdate }) {
      const [uploading, setUploading] = useState(null);
      const [uploadingLeng, setUploadingLeng] = useState(null);
      const [msg, setMsg] = useState('');
      const [localSub, setLocalSub] = useState(sub);
      const [tachesSubv, setTachesSubv] = useState(sub.taches || []);
      const [showNewTache, setShowNewTache] = useState(false);
      const [newTache, setNewTache] = useState({ titre: '', deadline: '', priorite: 'Normal', notes: '' });
      const [editingSub, setEditingSub] = useState(false);
      const [editForm, setEditForm] = useState({
        organisme: sub.organisme || sub.modele_nom || '',
        montant_sollicite: sub.montant_sollicite || '',
        deadline: sub.deadline || '',
        date_retour_prevue: sub.date_retour_prevue || '',
        notes: sub.notes || '',
      });
      const [savingEdit, setSavingEdit] = useState(false);

      const TACHES_TYPES_SUBV = [
        'Préparer le dossier', 'Collecter les pièces justificatives', 'Rédiger le budget',
        'Déposer le dossier', "Relancer l'instructeur", 'Envoyer les compléments',
        'Signer la convention', 'Envoyer le compte rendu financier', 'Archiver le dossier',
      ];

      async function addTacheSubv() {
        if (!newTache.titre) return;
        const t = {
          id: `tsubv_${Date.now()}`,
          ...newTache,
          created_at: new Date().toISOString(),
          done: false,
          sub_id: localSub.id,
        };
        const newTaches = [...tachesSubv, t];
        setTachesSubv(newTaches);
        // Persiste sur la subvention
        const updated = { ...localSub, taches: newTaches };
        setLocalSub(updated);
        onUpdate(updated);
        // Crée aussi dans le module tâches global + calendrier
        try {
          await fetch(`${API}/taches`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              titre: newTache.titre,
              deadline: newTache.deadline,
              priorite: newTache.priorite,
              description: `Subvention ${localSub.modele_nom || localSub.organisme} — ${localSub.client_nom}. ${newTache.notes}`,
              client_slug: localSub.client_slug,
              client_detecte: localSub.client_nom,
              categorie: 'subvention',
              calendrier: 'formalites',
              sub_id: localSub.id,
            })
          });
          if (newTache.deadline) {
            await fetch(`${API}/calendrier/event`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({
                titre: `📋 ${newTache.titre} — ${localSub.client_nom}`,
                date: newTache.deadline,
                type: 'formalite',
                client_slug: localSub.client_slug,
                client: localSub.client_nom,
                couleur: '#2834B7',
                source: 'subvention',
              })
            });
          }
        } catch {}
        // Patch subvention
        await fetch(`${API}/subventions/${localSub.id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ taches: newTaches })
        }).catch(() => {});
        setShowNewTache(false);
        setNewTache({ titre: '', deadline: '', priorite: 'Normal', notes: '' });
      }

      async function toggleTache(tId) {
        const newTaches = tachesSubv.map(t => t.id === tId ? {...t, done: !t.done} : t);
        setTachesSubv(newTaches);
        const updated = { ...localSub, taches: newTaches };
        setLocalSub(updated);
        onUpdate(updated);
        await fetch(`${API}/subventions/${localSub.id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ taches: newTaches })
        }).catch(() => {});
      }

      // Récupère les détails du client depuis clientsDetails
      const clientDetail = clientsDetails.find(c => c.slug === sub.client_slug);
      const cd = clientDetail?.client_data || {};

      // Infos client auto-remplies
      const infosClient = INFOS_CLIENT_SUB.map(info => {
        const val = info.path.reduce((obj, k) => obj?.[k], clientDetail) || '';
        return { ...info, valeur: val };
      });

      // Modèle associé pour les pièces spécifiques
      const modele = allModeles.find(m => m.id === localSub.modele_id);
      const piecesModele = (modele?.pieces || []).map((p, i) => ({
        id: `modele_${i}`, label: p, required: true, source: 'modele'
      }));

      // Toutes les pièces = standards + spécifiques au modèle
      const toutesLesPieces = [
        ...PIECES_STANDARD_SUB,
        ...piecesModele.filter(pm => !PIECES_STANDARD_SUB.find(ps => ps.label.toLowerCase() === pm.label.toLowerCase())),
      ];

      const piecesFournies = localSub.pieces_fournies || {};
      const nbFournies = toutesLesPieces.filter(p => piecesFournies[p.id]).length;
      const nbRequises = toutesLesPieces.filter(p => p.required).length;
      const nbFourniesRequises = toutesLesPieces.filter(p => p.required && piecesFournies[p.id]).length;
      const dossierComplet = nbFourniesRequises === nbRequises;

      const sc = {
        'À préparer':    { bg: 'var(--surface2)',       c: 'var(--text3)' },
        'En cours':      { bg: 'var(--pk-blue-light)',  c: 'var(--pk-blue)' },
        'Déposée':       { bg: '#FFF3E0',               c: '#E65100' },
        'En instruction':{ bg: 'var(--warn-light)',     c: 'var(--warn)' },
        'Accordée':      { bg: 'var(--success-light)',  c: 'var(--success)' },
        'Versée':        { bg: 'var(--success-light)',  c: 'var(--success)' },
        'Refusée':       { bg: 'var(--danger-light)',   c: 'var(--danger)' },
      }[localSub.statut] || { bg: 'var(--surface2)', c: 'var(--text3)' };

      async function saveSubEdit() {
        setSavingEdit(true);
        try {
          const res = await fetch(`${API}/subventions/${localSub.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organisme: editForm.organisme,
              montant_sollicite: editForm.montant_sollicite,
              deadline: editForm.deadline,
              date_retour_prevue: editForm.date_retour_prevue,
              notes: editForm.notes,
            }),
          });
          if (res.ok) {
            const updated = await res.json();
            setLocalSub(updated);
            onUpdate(updated);
            setEditingSub(false);
            setMsg('✅ Demande mise à jour');
            setTimeout(() => setMsg(''), 3000);
          }
        } catch {}
        setSavingEdit(false);
      }

      async function uploadPiece(pieceId, file) {
        setUploading(pieceId);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch(`${API}/subventions/${localSub.id}/pieces/${pieceId}`, {
            method: 'POST', body: fd
          });
          if (res.ok) {
            const result = await res.json();
            const updated = {
              ...localSub,
              pieces_fournies: {
                ...(localSub.pieces_fournies || {}),
                [pieceId]: { nom: file.name, date: new Date().toLocaleDateString('fr-FR'), drive_url: result.drive_url }
              }
            };
            setLocalSub(updated);
            onUpdate(updated);
            setMsg(`✅ ${file.name} ${result.drive_url ? 'uploadé sur Drive' : 'ajouté'}`);
          } else throw new Error();
        } catch {
          // Fallback local si API échoue
          const updated = {
            ...localSub,
            pieces_fournies: {
              ...(localSub.pieces_fournies || {}),
              [pieceId]: { nom: file.name, date: new Date().toLocaleDateString('fr-FR') }
            }
          };
          setLocalSub(updated);
          onUpdate(updated);
          setMsg(`⚠️ ${file.name} enregistré localement`);
        }
        setUploading(null);
        setTimeout(() => setMsg(''), 4000);
      }

      function removePiece(pieceId) {
        const pf = { ...(localSub.pieces_fournies || {}) };
        delete pf[pieceId];
        const updated = { ...localSub, pieces_fournies: pf };
        setLocalSub(updated);
        onUpdate(updated);
      }

      async function uploadLengagement(lengId, file) {
        setUploadingLeng(lengId);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch(`${API}/subventions/${localSub.id}/pieces/${lengId}`, {
            method: 'POST', body: fd
          });
          const result = res.ok ? await res.json() : {};
          const updated = {
            ...localSub,
            lettres_engagement: {
              ...(localSub.lettres_engagement || {}),
              [lengId]: { nom: file.name, date: new Date().toLocaleDateString('fr-FR'), drive_url: result.drive_url }
            }
          };
          setLocalSub(updated);
          onUpdate(updated);
          await fetch(`${API}/subventions/${localSub.id}`, {
            method: 'PATCH', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ lettres_engagement: updated.lettres_engagement })
          }).catch(() => {});
          setMsg(`✅ Lettre d'engagement : ${file.name} ${result.drive_url ? 'sur Drive' : 'enregistrée'}`);
        } catch {
          setMsg(`⚠️ Erreur lors de l'upload de ${file.name}`);
        }
        setUploadingLeng(null);
        setTimeout(() => setMsg(''), 4000);
      }

      function removeLengagement(lengId) {
        const leng = { ...(localSub.lettres_engagement || {}) };
        delete leng[lengId];
        const updated = { ...localSub, lettres_engagement: leng };
        setLocalSub(updated);
        onUpdate(updated);
        fetch(`${API}/subventions/${localSub.id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ lettres_engagement: leng })
        }).catch(() => {});
      }

      async function exportFormulaire() {
        const a = document.createElement('a');
        a.href = `${API}/export/formulaire-subvention/${localSub.id}`;
        a.download = `Formulaire_${localSub.client_nom}_${localSub.modele_nom || localSub.organisme}.xlsx`;
        a.click();
      }

      async function saveStatut(statut) {
        const updated = { ...localSub, statut };
        setLocalSub(updated);
        onUpdate(updated);
        await fetch(`${API}/subventions/${localSub.id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ statut })
        }).catch(() => {});
      }

      return (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" onClick={onBack}>← Retour</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{localSub.modele_nom || localSub.organisme}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {localSub.client_nom}{localSub.projet_nom ? ` › ${localSub.projet_nom}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {msg && <span style={{ fontSize: 12, color: 'var(--success)', alignSelf: 'center' }}>{msg}</span>}
              <span style={{ background: sc.bg, color: sc.c, padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, alignSelf: 'center' }}>
                {localSub.statut}
              </span>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditingSub(true)}>✏️ Modifier</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={exportFormulaire}>📥 Export formulaire xlsx</button>
            </div>
          </div>

          {/* Modal édition de la demande */}
          {editingSub && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingSub(false)}>
              <div className="modal" style={{ maxWidth: 500 }}>
                <div className="modal-title">✏️ Modifier la demande de subvention</div>
                <div className="form-group">
                  <label className="form-label">Organisme</label>
                  <input className="form-input" value={editForm.organisme} onChange={e => setEditForm(p => ({ ...p, organisme: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Montant sollicité (€)</label>
                  <input className="form-input" type="number" value={editForm.montant_sollicite} onChange={e => setEditForm(p => ({ ...p, montant_sollicite: e.target.value }))} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Deadline de dépôt</label>
                    <input className="form-input" type="date" value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date prévue de retour</label>
                    <input className="form-input" type="date" value={editForm.date_retour_prevue} onChange={e => setEditForm(p => ({ ...p, date_retour_prevue: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / contexte</label>
                  <textarea className="form-input" rows={3} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setEditingSub(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveSubEdit} disabled={savingEdit}>{savingEdit ? '⏳...' : '💾 Enregistrer'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ gap: 14 }}>
            {/* Colonne gauche : infos + client */}
            <div>
              {/* Infos demande */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-header"><div className="card-title">📋 Informations de la demande</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Organisme', localSub.organisme || localSub.modele_nom],
                    ['Montant sollicité', localSub.montant_sollicite ? Number(localSub.montant_sollicite).toLocaleString('fr-FR') + ' €' : '—'],
                    ['Deadline dépôt', localSub.deadline ? localSub.deadline.split('-').reverse().join('/') : '—'],
                    ['Retour prévu', localSub.date_retour_prevue ? localSub.date_retour_prevue.split('-').reverse().join('/') : '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{val || '—'}</div>
                    </div>
                  ))}
                </div>
                {localSub.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                    {localSub.notes}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Modifier le statut :</div>
                  <select style={{ fontSize: 12, padding: '5px 10px', border: `1px solid ${sc.c}40`, borderRadius: 6, background: sc.bg, color: sc.c, fontWeight: 600, cursor: 'pointer' }}
                    value={localSub.statut} onChange={e => saveStatut(e.target.value)}>
                    {['À préparer','En cours','Déposée','En instruction','Accordée','Refusée','Versée'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Infos client auto-remplies */}
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">🏛 Informations de la structure</div>
                    <div className="card-subtitle">Récupérées depuis le dossier client</div>
                  </div>
                </div>
                {infosClient.map(info => (
                  <div key={info.id} style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid var(--border)', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', width: 140, flexShrink: 0 }}>{info.label}</div>
                    <div style={{ fontSize: 13, fontWeight: info.valeur ? 500 : 400, color: info.valeur ? 'var(--text)' : 'var(--text3)', flex: 1 }}>
                      {info.valeur || <span style={{ fontStyle: 'italic', fontSize: 11 }}>Non renseigné dans le dossier client</span>}
                    </div>
                  </div>
                ))}
                {!clientDetail && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warn)', padding: '6px 10px', background: 'var(--warn-light)', borderRadius: 6 }}>
                    ⚠️ Aucun client rattaché à cette demande — les infos ne peuvent pas être récupérées automatiquement.
                  </div>
                )}
              </div>
            </div>

            {/* Colonne droite : pièces justificatives */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📄 Pièces justificatives</div>
                  <div className="card-subtitle">
                    <span style={{ color: dossierComplet ? 'var(--success)' : 'var(--warn)', fontWeight: 600 }}>
                      {dossierComplet ? '✅ Dossier complet' : `${nbFourniesRequises}/${nbRequises} pièces requises`}
                    </span>
                    {` — ${nbFournies}/${toutesLesPieces.length} au total`}
                  </div>
                </div>
              </div>

              {/* Barre de progression */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', background: dossierComplet ? 'var(--success)' : 'var(--pk-orange)', borderRadius: 3,
                    width: `${Math.round((nbFourniesRequises/Math.max(nbRequises,1))*100)}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              {msg && <div style={{ fontSize: 12, padding: '6px 8px', background: 'var(--success-light)', borderRadius: 6, marginBottom: 8, color: 'var(--success)' }}>{msg}</div>}

              {/* Liste pièces standards */}
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Documents standards</div>
              {PIECES_STANDARD_SUB.map(piece => {
                const fournie = piecesFournies[piece.id];
                return (
                  <div key={piece.id}>
                    {piece.vigilance === 'budget' && !fournie && (
                      <div style={{ background: '#FFF3E0', border: '1px solid #FF795A40', borderRadius: 6, padding: '7px 10px', marginBottom: 4, fontSize: 11, color: '#E65100' }}>
                        <strong>⚠️ POINT DE VIGILANCE BUDGET :</strong> {piece.vigilanceMsg}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)',
                      background: piece.vigilance === 'budget' && !fournie ? '#FFF9F6' : 'transparent',
                      borderLeft: piece.vigilance === 'budget' ? '3px solid var(--pk-orange)' : 'none',
                      paddingLeft: piece.vigilance === 'budget' ? 8 : 0 }}>
                      <div style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>
                        {fournie ? '✅' : piece.required ? (piece.vigilance === 'budget' ? '🚨' : '⚠️') : '○'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: piece.vigilance ? 700 : 500 }}>
                          {piece.label}{piece.required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                        </div>
                        {fournie && (
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                            {fournie.drive_url
                              ? <a href={fournie.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pk-blue)' }}>☁️ {fournie.nom} — Drive</a>
                              : `📄 ${fournie.nom} — ${fournie.date}`
                            }
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {fournie && (
                          <button onClick={() => removePiece(piece.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12 }}>✕</button>
                        )}
                        <label style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--surface)' }}>
                          {uploading === piece.id ? '⏳' : fournie ? '🔄' : '📁'}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style={{ display: 'none' }} disabled={uploading === piece.id}
                            onChange={e => e.target.files[0] && uploadPiece(piece.id, e.target.files[0])} />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pièces spécifiques au modèle */}
              {piecesModele.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                    Pièces spécifiques — {modele?.nom || localSub.organisme}
                  </div>
                  {piecesModele.map(piece => {
                    const fournie = piecesFournies[piece.id];
                    return (
                      <div key={piece.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{fournie ? '✅' : '⚠️'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{piece.label}<span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></div>
                          {fournie && <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                            {fournie.drive_url
                              ? <a href={fournie.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pk-blue)' }}>☁️ {fournie.nom}</a>
                              : `📄 ${fournie.nom}`}
                          </div>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {fournie && <button onClick={() => removePiece(piece.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12 }}>✕</button>}
                          <label style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--surface)' }}>
                            {uploading === piece.id ? '⏳' : fournie ? '🔄' : '📁'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style={{ display: 'none' }} disabled={uploading === piece.id}
                              onChange={e => e.target.files[0] && uploadPiece(piece.id, e.target.files[0])} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Lettres d'engagement ────────────────────────────────────────── */}
          <div className="card" style={{ marginTop: 14, borderTop: '4px solid var(--pk-orange)', borderLeft: '4px solid transparent' }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ color: 'var(--pk-orange)' }}>✉️ Lettres d'engagement</div>
                <div className="card-subtitle">
                  {Object.keys(localSub.lettres_engagement || {}).length}/{LETTRES_ENGAGEMENT_STD.filter(l => l.required).length} lettres requises
                </div>
              </div>
            </div>

            {/* Bannière vigilance */}
            <div style={{ background: '#FFF3E0', border: '1px solid #FF795A50', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#E65100', marginBottom: 4 }}>⚠️ POINT DE VIGILANCE — Lettres d'engagement</div>
              <div style={{ color: '#9A3412', lineHeight: 1.7 }}>
                Les lettres d'engagement sont <strong>souvent décisives</strong> pour l'obtention d'une subvention. Un dossier sans lettre d'engagement d'au moins un co-financeur ou partenaire solide peut être rejeté même si les autres pièces sont parfaites.<br/>
                <span style={{ fontSize: 11, color: '#C05621' }}>• Chaque lettre doit être signée, datée, et mentionner explicitement le projet et le montant s'il est connu.<br/>
                • Obtenir les lettres <strong>en amont</strong> de la deadline : certains partenaires nécessitent plusieurs semaines de traitement interne.</span>
              </div>
            </div>

            {LETTRES_ENGAGEMENT_STD.map(leng => {
              const fournie = (localSub.lettres_engagement || {})[leng.id];
              return (
                <div key={leng.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, marginTop: 2 }}>
                    {fournie ? '✅' : leng.required ? '⚠️' : '○'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {leng.label}{leng.required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>{leng.desc}</div>
                    {fournie && (
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                        {fournie.drive_url
                          ? <a href={fournie.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pk-blue)' }}>☁️ {fournie.nom} — Drive</a>
                          : `📄 ${fournie.nom} — ${fournie.date}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
                    {fournie && (
                      <button onClick={() => removeLengagement(leng.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12 }}>✕</button>
                    )}
                    <label style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--pk-orange)40', background: '#FFF9F6' }}>
                      {uploadingLeng === leng.id ? '⏳' : fournie ? '🔄' : '📁'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: 'none' }} disabled={uploadingLeng === leng.id}
                        onChange={e => e.target.files[0] && uploadLengagement(leng.id, e.target.files[0])} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Module tâches subvention */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-header">
              <div>
                <div className="card-title">✅ Tâches & suivi</div>
                <div className="card-subtitle">
                  {tachesSubv.filter(t=>t.done).length}/{tachesSubv.length} accomplie(s)
                  {tachesSubv.length > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                        {Math.round(tachesSubv.filter(t=>t.done).length/tachesSubv.length*100)}%
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => setShowNewTache(true)}>+ Tâche</button>
            </div>
            {/* Barre de progression */}
            {tachesSubv.length > 0 && (
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, marginBottom: 10 }}>
                <div style={{ height: '100%', background: 'var(--success)', borderRadius: 3, width: `${Math.round(tachesSubv.filter(t=>t.done).length/tachesSubv.length*100)}%`, transition: 'width 0.3s' }} />
              </div>
            )}
            {tachesSubv.length === 0 ? (
              <div className="empty" style={{ padding: '12px 0' }}>
                <div className="empty-text">Aucune tâche. Ajoutez des actions de suivi.</div>
              </div>
            ) : tachesSubv.sort((a,b) => (a.done?1:-1) - (b.done?1:-1)).map(t => {
              const now = new Date().toISOString().slice(0,10);
              const isLate = !t.done && t.deadline && t.deadline < now;
              const isSoon = !t.done && t.deadline && t.deadline >= now && t.deadline <= new Date(Date.now()+7*86400000).toISOString().slice(0,10);
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', opacity: t.done ? 0.5 : 1 }}>
                  <button onClick={() => toggleTache(t.id)} style={{ background: 'none', border: `2px solid ${t.done ? 'var(--success)' : 'var(--border2)'}`, borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', flexShrink: 0, color: t.done ? 'var(--success)' : 'transparent', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {t.done ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: t.done ? 400 : 500, textDecoration: t.done ? 'line-through' : 'none' }}>{t.titre}</div>
                    {t.deadline && (
                      <div style={{ fontSize: 11, color: isLate ? 'var(--danger)' : isSoon ? 'var(--warn)' : 'var(--text3)', marginTop: 2 }}>
                        {isLate ? '⚠️ Dépassé : ' : '📅 '}{t.deadline.split('-').reverse().join('/')}
                      </div>
                    )}
                    {t.notes && <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{t.notes}</div>}
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: t.priorite === 'URGENT' ? 'var(--danger-light)' : t.priorite === 'HAUT' ? 'var(--warn-light)' : 'var(--surface2)', color: t.priorite === 'URGENT' ? 'var(--danger)' : t.priorite === 'HAUT' ? 'var(--warn)' : 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>
                    {t.priorite}
                  </span>
                </div>
              );
            })}
            {/* Modal ajout tâche */}
            {showNewTache && (
              <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNewTache(false)}>
                <div className="modal" style={{ maxWidth: 460 }}>
                  <div className="modal-title">✅ Nouvelle tâche</div>
                  <div className="form-group">
                    <label className="form-label">Titre *</label>
                    <select className="form-input" value={newTache.titre} onChange={e => setNewTache(p=>({...p,titre:e.target.value}))}>
                      <option value="">— Choisir ou saisir —</option>
                      {TACHES_TYPES_SUBV.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="form-input" style={{ marginTop: 4 }} value={newTache.titre} onChange={e => setNewTache(p=>({...p,titre:e.target.value}))} placeholder="Ou saisir un intitulé personnalisé..." />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Deadline</label>
                      <input className="form-input" type="date" value={newTache.deadline} onChange={e => setNewTache(p=>({...p,deadline:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Priorité</label>
                      <select className="form-input" value={newTache.priorite} onChange={e => setNewTache(p=>({...p,priorite:e.target.value}))}>
                        <option value="Normal">Normal</option>
                        <option value="HAUT">Haut</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input className="form-input" value={newTache.notes} onChange={e => setNewTache(p=>({...p,notes:e.target.value}))} placeholder="Contexte, instructions..." />
                  </div>
                  {newTache.deadline && (
                    <div style={{ fontSize: 11, padding: '6px 10px', background: 'var(--pk-blue-light)', borderRadius: 6, color: 'var(--pk-blue)', marginBottom: 8 }}>
                      ✅ Cette tâche sera ajoutée au module Tâches et sync avec le calendrier Formalités
                    </div>
                  )}
                  <div className="modal-footer">
                    <button className="btn" onClick={() => setShowNewTache(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={addTacheSubv} disabled={!newTache.titre}>Créer →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }


    function SubventionsView({ clients }) {
      // ─────────────────────────────────────────────────────────────────────
      // État principal
      const [tab, setTab] = useState('dashboard');
      const [subventions, setSubventions] = useState([]);
      const [modeles, setModeles] = useState([]); // modèles personnalisés
      const [showArchived, setShowArchived] = useState(false);
      const [selectedSub, setSelectedSub] = useState(null); // fiche subvention ouverte
      const [clientsData, setClientsData] = useState({}); // données enrichies par slug
      const [clientsDetails, setClientsDetails] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [showNewModele, setShowNewModele] = useState(false);
      const [selectedModele, setSelectedModele] = useState(null); // pour la fiche détail
      const [editModele, setEditModele] = useState(null); // pour éditer un modèle perso
      const EMPTY_SUB = { modele_id: '', client_slug: '', projet_nom: '', montant_sollicite: '',
        statut: 'À préparer', notes: '', deadline: '', date_retour_prevue: '', organisme: '' };
      const EMPTY_MODELE = { nom: '', organisme: '', type: '', deadline_indicative: '',
        montant_max: '', description: '', couleur: '#2834B7', icone: '🏛',
        champs: '', pieces: '', url: '' };
      const [newSub, setNewSub] = useState(EMPTY_SUB);
      const [newModele, setNewModele] = useState(EMPTY_MODELE);

      useEffect(() => {
        fetch(`${API}/subventions`).then(r => r.json()).then(setSubventions).catch(() => {});
        // Modèles perso depuis localStorage (pas besoin d'API)
        try { setModeles(JSON.parse(localStorage.getItem('pk_modeles_sub') || '[]')); } catch {}
        Promise.all(clients.map(c =>
          fetch(`${API}/clients/${c.slug}`).then(r => r.ok ? r.json() : null).catch(() => null)
        )).then(d => setClientsDetails(d.filter(Boolean)));
      }, [clients]);

      function saveModeles(list) {
        setModeles(list);
        try { localStorage.setItem('pk_modeles_sub', JSON.stringify(list)); } catch {}
      }

      // ── Tous les modèles : prédéfinis + perso ─────────────────────────────
      const allModeles = [
        ...MODELES_SUBVENTIONS,
        ...modeles.map(m => ({ ...m, _custom: true })),
      ];

      // ── STATUTS & couleurs ─────────────────────────────────────────────────
      const STATUTS = ['À préparer', 'En cours', 'Déposée', 'En instruction', 'Accordée', 'Refusée', 'Versée'];
      const STATUT_COLORS = {
        'À préparer':    { bg: 'var(--surface2)',       c: 'var(--text3)' },
        'En cours':      { bg: 'var(--pk-blue-light)',  c: 'var(--pk-blue)' },
        'Déposée':       { bg: '#FFF3E0',               c: '#E65100' },
        'En instruction':{ bg: 'var(--warn-light)',     c: 'var(--warn)' },
        'Accordée':      { bg: 'var(--success-light)',  c: 'var(--success)' },
        'Versée':        { bg: 'var(--success-light)',  c: 'var(--success)' },
        'Refusée':       { bg: 'var(--danger-light)',   c: 'var(--danger)' },
      };

      // ── Métriques dashboard ─────────────────────────────────────────────
      const actives = subventions.filter(s => !s.archived);
      const caTotal  = actives.reduce((sum, s) => sum + (Number(s.montant_sollicite) || 0), 0);
      const caObtenu = actives.filter(s => ['Accordée','Versée'].includes(s.statut)).reduce((sum, s) => sum + (Number(s.montant_sollicite) || 0), 0);
      const enAttente = actives.filter(s => ['Déposée','En instruction'].includes(s.statut)).reduce((sum, s) => sum + (Number(s.montant_sollicite) || 0), 0);
      const nbRefus = actives.filter(s => s.statut === 'Refusée').length;

      // Subventions à afficher (filtre archive)
      const listeAffichee = showArchived
        ? subventions.filter(s => s.archived)
        : subventions.filter(s => !s.archived);

      // Prochaines deadlines
      const today = new Date().toISOString().slice(0,10);
      const prochaines = actives
        .filter(s => s.deadline && s.deadline >= today && !['Accordée','Versée','Refusée'].includes(s.statut))
        .sort((a,b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 5);

      function diffLabel(date) {
        if (!date) return null;
        const diff = Math.round((new Date(date) - new Date()) / 86400000);
        if (diff < 0) return { txt: `J+${Math.abs(diff)} dépassé`, c: 'var(--danger)' };
        if (diff === 0) return { txt: "Aujourd'hui", c: 'var(--danger)' };
        if (diff <= 7) return { txt: `J-${diff}`, c: 'var(--warn)' };
        return { txt: date.split('-').reverse().join('/'), c: 'var(--text3)' };
      }

      // ── CRUD subventions ───────────────────────────────────────────────────
      async function createSub() {
        const m = allModeles.find(x => x.id === newSub.modele_id);
        const c = clients.find(x => x.slug === newSub.client_slug);
        const payload = { ...newSub, modele_nom: m?.nom || '', client_nom: c?.nom || '' };
        try {
          const res = await fetch(`${API}/subventions`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
          });
          if (res.ok) {
            const saved = await res.json();
            // Avertissement règle 30 jours
            if (saved.tarif_urgence) {
              alert(`⚠️ TARIF URGENCE activé !\n\nDélai restant avant la deadline : ${saved.jours_restants} jour(s).\nLe cadre standard exige minimum 30 jours entre la demande et la soumission.\n\nUn supplément urgence de +${saved.supplement_urgence_pct}% s'applique.`);
            }
            setSubventions(p => [saved, ...p]);
          }
        } catch {}
        setShowNew(false);
        setNewSub(EMPTY_SUB);
      }

      async function updateStatut(id, statut) {
        setSubventions(p => p.map(s => s.id === id ? {...s, statut} : s));
        await fetch(`${API}/subventions/${id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ statut })
        }).catch(() => {});
      }

      async function toggleArchiveSub(id, archived) {
        setSubventions(p => p.map(s => s.id === id ? {...s, archived: !archived} : s));
        await fetch(`${API}/subventions/${id}`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ archived: !archived })
        }).catch(() => {});
      }

      async function deleteSub(id) {
        if (!window.confirm('Supprimer cette demande de subvention ?')) return;
        setSubventions(p => p.filter(s => s.id !== id));
        await fetch(`${API}/subventions/${id}`, { method: 'DELETE' }).catch(() => {});
      }

      // ── CRUD modèles perso ─────────────────────────────────────────────────
      const [iaModeleLoading, setIaModeleLoading] = useState(false);
      const [iaModeleResult, setIaModeleResult] = useState(null);
      const [iaModeleError, setIaModeleError] = useState('');

      function saveNewModele() {
        if (!newModele.nom || !newModele.organisme) return;
        const m = {
          id: `custom_${Date.now()}`,
          ...newModele,
          montant_max: Number(newModele.montant_max) || 0,
          champs: typeof newModele.champs === 'string' ? newModele.champs.split(',').map(s => s.trim()).filter(Boolean) : newModele.champs,
          pieces: typeof newModele.pieces === 'string' ? newModele.pieces.split(',').map(s => s.trim()).filter(Boolean) : newModele.pieces,
          _custom: true,
        };
        saveModeles([...modeles, m]);
        setShowNewModele(false);
        setNewModele(EMPTY_MODELE);
        setIaModeleResult(null);
      }

      function saveEditModele() {
        if (!editModele || !editModele.nom || !editModele.organisme) return;
        const updated = {
          ...editModele,
          montant_max: Number(editModele.montant_max) || 0,
          champs: typeof editModele.champs === 'string' ? editModele.champs.split(',').map(s => s.trim()).filter(Boolean) : editModele.champs,
          pieces: typeof editModele.pieces === 'string' ? editModele.pieces.split(',').map(s => s.trim()).filter(Boolean) : editModele.pieces,
        };
        saveModeles(modeles.map(m => m.id === updated.id ? updated : m));
        setEditModele(null);
      }

      async function analyserFormulaireIA(url, setTarget) {
        if (!url || !url.startsWith('http')) { setIaModeleError('Veuillez d\'abord renseigner une URL valide.'); return; }
        setIaModeleLoading(true);
        setIaModeleError('');
        setIaModeleResult(null);
        try {
          const res = await fetch(`${API}/subventions/analyser-formulaire`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
          });
          if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Erreur analyse'); }
          const data = await res.json();
          setIaModeleResult(data);
          // Pré-remplit automatiquement les champs si vides
          setTarget(p => ({
            ...p,
            nom: p.nom || data.nom_programme || p.nom,
            organisme: p.organisme || data.organisme || p.organisme,
            description: p.description || data.synthese || p.description,
            pieces: p.pieces || (data.documents_obligatoires || []).map(d => d.document).join(', ') || p.pieces,
            champs: p.champs || (data.textes_a_rediger || []).map(d => d.section).join(', ') || p.champs,
          }));
        } catch (e) {
          setIaModeleError(e.message);
        }
        setIaModeleLoading(false);
      }

      function deleteModele(id) {
        if (!window.confirm('Supprimer ce modèle ?')) return;
        saveModeles(modeles.filter(m => m.id !== id));
      }

      function archiveModele(id) {
        saveModeles(modeles.map(m => m.id === id ? {...m, archived: !m.archived} : m));
      }

      const selectedClient = clientsDetails.find(c => c.slug === newSub.client_slug);
      const projetsClient = selectedClient?.projets || [];

      // ══════════════════════════════════════════════════════════════════════
      return (
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[
                ['dashboard', '📊 Tableau de bord'],
                ['suivi',     `📋 Suivi (${actives.length})`],
                ['catalogue', '📚 Catalogue'],
              ].map(([k,l]) => (
                <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tab === 'suivi' && selectedSub && (
                <SubventionFicheView
                  sub={selectedSub}
                  clients={clients}
                  clientsDetails={clientsDetails}
                  allModeles={allModeles}
                  onBack={() => setSelectedSub(null)}
                  onUpdate={updated => {
                    setSubventions(p => p.map(s => s.id === updated.id ? updated : s));
                    setSelectedSub(updated);
                  }}
                />
              )}
              {tab === 'suivi' && !selectedSub && (
                <>
                  <button className="btn" style={{ fontSize: 11, background: showArchived ? 'var(--pk-blue-light)' : '', color: showArchived ? 'var(--pk-blue)' : 'var(--text3)' }}
                    onClick={() => setShowArchived(p => !p)}>
                    {showArchived ? '👁 Actives' : `📦 Archives (${subventions.filter(s=>s.archived).length})`}
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(true)}>+ Nouvelle demande</button>
                </>
              )}
              {tab === 'catalogue' && (
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNewModele(true)}>+ Créer un modèle</button>
              )}
            </div>
          </div>

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div>
              {/* Métriques */}
              <div className="metrics-grid" style={{ marginBottom: 16 }}>
                <div className="metric-card accent-green">
                  <div className="metric-label">Total sollicité</div>
                  <div className="metric-value" style={{ fontSize: 22 }}>{caTotal.toLocaleString('fr-FR')} €</div>
                  <div className="metric-sub">{actives.length} demande(s)</div>
                </div>
                <div className="metric-card accent-info">
                  <div className="metric-label">Obtenu / Versé</div>
                  <div className="metric-value" style={{ fontSize: 22 }}>{caObtenu.toLocaleString('fr-FR')} €</div>
                  <div className="metric-sub">{actives.filter(s=>['Accordée','Versée'].includes(s.statut)).length} accordée(s)</div>
                </div>
                <div className="metric-card accent-warn">
                  <div className="metric-label">En instruction</div>
                  <div className="metric-value" style={{ fontSize: 22 }}>{enAttente.toLocaleString('fr-FR')} €</div>
                  <div className="metric-sub">{actives.filter(s=>['Déposée','En instruction'].includes(s.statut)).length} en cours</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Refusées</div>
                  <div className="metric-value" style={{ fontSize: 22 }}>{nbRefus}</div>
                  <div className="metric-sub">{actives.filter(s=>s.statut==='À préparer').length} à préparer</div>
                </div>
              </div>

              <div className="grid-2">
                {/* Pipeline kanban simplifié */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Pipeline par statut</div></div>
                  {STATUTS.map(st => {
                    const items = actives.filter(s => s.statut === st);
                    if (!items.length) return null;
                    const sc = STATUT_COLORS[st];
                    const total = items.reduce((sum,s) => sum + (Number(s.montant_sollicite)||0), 0);
                    return (
                      <div key={st} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: sc.bg, color: sc.c, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{st}</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{items.length} dossier(s)</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{total.toLocaleString('fr-FR')} €</span>
                      </div>
                    );
                  })}
                </div>

                {/* Prochaines deadlines */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Prochaines deadlines</div></div>
                  {prochaines.length === 0
                    ? <div className="empty" style={{ padding: '12px 0' }}><div className="empty-text">Aucune deadline à venir.</div></div>
                    : prochaines.map(s => {
                      const dl = diffLabel(s.deadline);
                      return (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.modele_nom || s.organisme}</div>
                            <div style={{ fontSize: 11, color: 'var(--pk-blue)' }}>{s.client_nom}{s.projet_nom ? ` › ${s.projet_nom}` : ''}</div>
                            {s.date_retour_prevue && <div style={{ fontSize: 10, color: 'var(--text3)' }}>Retour prévu : {s.date_retour_prevue.split('-').reverse().join('/')}</div>}
                          </div>
                          {dl && <span style={{ fontSize: 12, fontWeight: 700, color: dl.c }}>{dl.txt}</span>}
                        </div>
                      );
                    })
                  }
                </div>
              </div>

              {/* Répartition par client */}
              {actives.length > 0 && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="card-header"><div className="card-title">Répartition par client</div></div>
                  {Object.entries(
                    actives.reduce((acc, s) => {
                      const k = s.client_nom || '— Sans client —';
                      if (!acc[k]) acc[k] = { total: 0, obtenu: 0, nb: 0 };
                      acc[k].total += Number(s.montant_sollicite) || 0;
                      if (['Accordée','Versée'].includes(s.statut)) acc[k].obtenu += Number(s.montant_sollicite) || 0;
                      acc[k].nb++;
                      return acc;
                    }, {})
                  ).sort((a,b) => b[1].total - a[1].total).map(([nom, data]) => (
                    <div key={nom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{nom}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{data.nb} demande(s)</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{data.total.toLocaleString('fr-FR')} € sollicités</div>
                        {data.obtenu > 0 && <div style={{ fontSize: 11, color: 'var(--success)' }}>{data.obtenu.toLocaleString('fr-FR')} € obtenus</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ SUIVI ══ */}
          {tab === 'suivi' && (
            <div className="card">
              {listeAffichee.length === 0
                ? <div className="empty"><div className="empty-icon">🏛</div><div className="empty-text">{showArchived ? 'Aucune demande archivée.' : 'Aucune demande. Créez-en une ou utilisez le catalogue.'}</div></div>
                : listeAffichee.map(s => {
                  const sc = STATUT_COLORS[s.statut] || STATUT_COLORS['À préparer'];
                  const dl = s.deadline ? diffLabel(s.deadline) : null;
                  const dlRetour = s.date_retour_prevue ? diffLabel(s.date_retour_prevue) : null;
                  return (
                    <div key={s.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: s.archived ? 0.6 : 1, cursor: 'pointer' }}
                      onClick={e => { if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') setSelectedSub(s); }}>
                      <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                         <div style={{ fontWeight: 600, fontSize: 13 }}>{s.modele_nom || s.organisme}</div>
                         {s.tarif_urgence && (
                           <span style={{ background: '#B71C1C', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
                             🚨 URGENCE +{s.supplement_urgence_pct || 30}%
                           </span>
                         )}
                       </div>
                       <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>
                         {s.client_nom && <span style={{ color: 'var(--pk-blue)', fontWeight: 500 }}>{s.client_nom}</span>}
                         {s.projet_nom && <span style={{ color: 'var(--text3)' }}> › {s.projet_nom}</span>}
                       </div>
                       {s.tarif_urgence && s.jours_restants != null && (
                         <div style={{ fontSize: 11, color: '#B71C1C', marginBottom: 3, fontWeight: 500 }}>
                          ⚠️ {s.jours_restants} jour(s) restant(s) — délai {'<'} 30j, supplément urgence applicable
                         </div>
                       )}
                       <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
                         {s.deadline && dl && <span style={{ color: dl.c }}>⏰ Dépôt : {dl.txt}</span>}
                         {s.date_retour_prevue && dlRetour && <span style={{ color: dlRetour.c }}>📬 Retour prévu : {dlRetour.txt}</span>}
                       </div>
                       {s.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, fontStyle: 'italic' }}>{s.notes}</div>}
                     </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {s.montant_sollicite && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{Number(s.montant_sollicite).toLocaleString('fr-FR')} €</div>}
                        <select style={{ fontSize: 11, padding: '3px 6px', border: `1px solid ${sc.c}40`, borderRadius: 6, background: sc.bg, color: sc.c, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}
                          value={s.statut} onChange={e => updateStatut(s.id, e.target.value)}>
                          {STATUTS.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => toggleArchiveSub(s.id, s.archived)}
                            style={{ fontSize: 10, padding: '2px 6px', background: 'none', border: '1px solid var(--border2)', borderRadius: 4, cursor: 'pointer', color: 'var(--text3)' }}
                            title={s.archived ? 'Désarchiver' : 'Archiver'}>
                            {s.archived ? '↩' : '📦'}
                          </button>
                          <button onClick={() => deleteSub(s.id)}
                            style={{ fontSize: 10, padding: '2px 6px', background: 'none', border: '1px solid var(--danger)40', borderRadius: 4, cursor: 'pointer', color: 'var(--danger)' }}
                            title="Supprimer">🗑</button>
                        </div>
                        <button onClick={() => setSelectedSub(s)} style={{ marginTop: 4, fontSize: 11, color: 'var(--pk-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Voir la fiche →
                        </button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* ══ CATALOGUE ══ */}
          {tab === 'catalogue' && (
            <div>
              {selectedModele ? (
                /* Fiche détail modèle */
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <button className="btn" onClick={() => setSelectedModele(null)}>← Retour</button>
                    <div style={{ fontSize: 26 }}>{selectedModele.icone}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 15, color: selectedModele.couleur }}>{selectedModele.nom}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selectedModele.organisme}</div>
                    </div>
                    {selectedModele._custom && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" style={{ fontSize: 11 }} onClick={() => { setEditModele(selectedModele); setSelectedModele(null); }}>✏️ Modifier</button>
                        <button className="btn" style={{ fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { deleteModele(selectedModele.id); setSelectedModele(null); }}>🗑 Supprimer</button>
                        <button className="btn" style={{ fontSize: 11 }} onClick={() => { archiveModele(selectedModele.id); setSelectedModele(null); }}>📦 Archiver</button>
                      </div>
                    )}
                  </div>
                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Informations clés</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Type :</strong> {selectedModele.type}</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Deadline indicative :</strong> {selectedModele.deadline_indicative}</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Montant max :</strong> {Number(selectedModele.montant_max || 0).toLocaleString('fr-FR')} €</div>
                      <div style={{ fontSize: 13, marginBottom: 12 }}>{selectedModele.description}</div>
                      {selectedModele.url && <a href={selectedModele.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--pk-blue)' }}>🔗 Formulaire</a>}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Pièces justificatives</div>
                      {(selectedModele.pieces || []).map((p, i) => (
                        <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--pk-orange)' }}>📄</span>{p}
                        </div>
                      ))}
                    </div>
                  </div>
                  {(selectedModele.champs || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Champs du formulaire</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(selectedModele.champs || []).map((c, i) => (
                          <span key={i} style={{ background: 'var(--surface2)', color: 'var(--text2)', padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={() => {
                    setTab('suivi'); setShowNew(true);
                    setNewSub(p => ({ ...p, modele_id: selectedModele.id, organisme: selectedModele.organisme }));
                    setSelectedModele(null);
                  }}>+ Créer une demande depuis ce modèle</button>
                </div>
              ) : (
                /* Grille catalogue */
                <div>
                  {/* Modèles prédéfinis */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Modèles prédéfinis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {MODELES_SUBVENTIONS.map(m => (
                      <div key={m.id} className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${m.couleur}`, padding: '14px 16px' }}
                        onClick={() => setSelectedModele(m)}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontSize: 24 }}>{m.icone}</div>
                          <div>
                            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 12, color: m.couleur }}>{m.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.organisme}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                          <span style={{ background: m.couleur+'15', color: m.couleur, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>≤ {Number(m.montant_max).toLocaleString('fr-FR')} €</span>
                          <span style={{ color: 'var(--text3)' }}>⏰ {m.deadline_indicative}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Modèles personnalisés */}
                  {modeles.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Modèles personnalisés</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {modeles.filter(m => !m.archived).map(m => (
                          <div key={m.id} className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${m.couleur || '#2834B7'}`, padding: '14px 16px' }}
                            onClick={() => setSelectedModele(m)}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ fontSize: 24 }}>{m.icone || '🏛'}</div>
                                <div>
                                  <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 12, color: m.couleur || 'var(--pk-blue)' }}>{m.nom}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.organisme}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)' }} title="Archiver" onClick={() => archiveModele(m.id)}>📦</button>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)' }} title="Supprimer" onClick={() => deleteModele(m.id)}>🗑</button>
                              </div>
                            </div>
                            {m.montant_max > 0 && (
                              <span style={{ background: (m.couleur||'#2834B7')+'15', color: m.couleur||'var(--pk-blue)', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>≤ {Number(m.montant_max).toLocaleString('fr-FR')} €</span>
                            )}
                          </div>
                        ))}
                        {/* Modèles archivés */}
                        {modeles.filter(m => m.archived).map(m => (
                          <div key={m.id} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>📦 {m.nom}</span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--pk-blue)' }} onClick={() => archiveModele(m.id)}>↩ Restaurer</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ MODAL NOUVELLE DEMANDE ══ */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
              <div className="modal" style={{ maxWidth: 520 }}>
                <div className="modal-title">🏛 Nouvelle demande de subvention</div>
                <div className="form-group">
                  <label className="form-label">Modèle / Organisme</label>
                  <select className="form-input" value={newSub.modele_id} onChange={e => {
                    const m = allModeles.find(x => x.id === e.target.value);
                    setNewSub(p => ({ ...p, modele_id: e.target.value, organisme: m?.organisme || '' }));
                  }}>
                    <option value="">— Choisir un modèle —</option>
                    <optgroup label="Modèles prédéfinis">
                      {MODELES_SUBVENTIONS.map(m => <option key={m.id} value={m.id}>{m.icone} {m.nom}</option>)}
                    </optgroup>
                    {modeles.filter(m=>!m.archived).length > 0 && (
                      <optgroup label="Mes modèles">
                        {modeles.filter(m=>!m.archived).map(m => <option key={m.id} value={m.id}>{m.icone||'🏛'} {m.nom}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                {!newSub.modele_id && (
                  <div className="form-group">
                    <label className="form-label">Ou saisir l'organisme manuellement</label>
                    <input className="form-input" value={newSub.organisme} onChange={e => setNewSub(p=>({...p, organisme: e.target.value}))} placeholder="Nom de l'organisme..." />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Client bénéficiaire</label>
                  <select className="form-input" value={newSub.client_slug} onChange={e => setNewSub(p => ({ ...p, client_slug: e.target.value, projet_nom: '' }))}>
                    <option value="">— Aucun client —</option>
                    {clients.filter(c=>!c.archived).map(c => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
                  </select>
                </div>
                {projetsClient.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Projet associé</label>
                    <select className="form-input" value={newSub.projet_nom} onChange={e => setNewSub(p => ({ ...p, projet_nom: e.target.value }))}>
                      <option value="">— Niveau association —</option>
                      {projetsClient.map(p => <option key={p.slug} value={p.nom}>{p.nom}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Montant sollicité (€)</label>
                    <input className="form-input" type="number" value={newSub.montant_sollicite} onChange={e => setNewSub(p => ({ ...p, montant_sollicite: e.target.value }))} placeholder="3000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline de dépôt</label>
                    <input className="form-input" type="date" value={newSub.deadline} onChange={e => setNewSub(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Date prévue de retour</label>
                  <input className="form-input" type="date" value={newSub.date_retour_prevue} onChange={e => setNewSub(p => ({ ...p, date_retour_prevue: e.target.value }))} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Date à laquelle la réponse de l'organisme est attendue</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / contexte</label>
                  <textarea className="form-input" rows={2} value={newSub.notes} onChange={e => setNewSub(p => ({ ...p, notes: e.target.value }))} placeholder="Dossier n°, contact instructeur..." style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowNew(false); setNewSub(EMPTY_SUB); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={createSub} disabled={!newSub.modele_id && !newSub.organisme}>Créer →</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ MODAL NOUVEAU MODÈLE ══ */}
          {showNewModele && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && (setShowNewModele(false), setIaModeleResult(null), setIaModeleError(''))}>
              <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-title">📚 Nouveau modèle de subvention</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nom du modèle *</label>
                    <input className="form-input" value={newModele.nom} onChange={e => setNewModele(p=>({...p,nom:e.target.value}))} placeholder="Ex: Aide à la résidence DAC" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organisme *</label>
                    <input className="form-input" value={newModele.organisme} onChange={e => setNewModele(p=>({...p,organisme:e.target.value}))} placeholder="Ex: DAC Martinique" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <input className="form-input" value={newModele.type} onChange={e => setNewModele(p=>({...p,type:e.target.value}))} placeholder="résidence, création, diffusion..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline indicative</label>
                    <input className="form-input" value={newModele.deadline_indicative} onChange={e => setNewModele(p=>({...p,deadline_indicative:e.target.value}))} placeholder="Ex: mars (AAP annuel)" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Montant max (€)</label>
                    <input className="form-input" type="number" value={newModele.montant_max} onChange={e => setNewModele(p=>({...p,montant_max:e.target.value}))} placeholder="5000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">URL formulaire</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" value={newModele.url} onChange={e => setNewModele(p=>({...p,url:e.target.value}))} placeholder="https://..." style={{ flex: 1 }} />
                      <button className="btn" style={{ fontSize: 11, flexShrink: 0, background: 'var(--pk-blue-light)', color: 'var(--pk-blue)' }}
                        onClick={() => analyserFormulaireIA(newModele.url, setNewModele)} disabled={iaModeleLoading || !newModele.url}>
                        {iaModeleLoading ? '⏳' : '🤖 IA'}
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>L'IA analysera la page pour pré-remplir le modèle</div>
                  </div>
                </div>
                {iaModeleError && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>⚠️ {iaModeleError}</div>}
                {iaModeleResult && <IaModeleResultPanel result={iaModeleResult} onClose={() => setIaModeleResult(null)} />}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={newModele.description} onChange={e => setNewModele(p=>({...p,description:e.target.value}))} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pièces justificatives (séparées par virgule)</label>
                  <input className="form-input" value={typeof newModele.pieces === 'string' ? newModele.pieces : (newModele.pieces || []).join(', ')} onChange={e => setNewModele(p=>({...p,pieces:e.target.value}))} placeholder="RIB, Statuts, Budget prévisionnel, ..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Champs du formulaire (séparés par virgule)</label>
                  <input className="form-input" value={typeof newModele.champs === 'string' ? newModele.champs : (newModele.champs || []).join(', ')} onChange={e => setNewModele(p=>({...p,champs:e.target.value}))} placeholder="Titre du projet, Budget total, ..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Couleur</label>
                    <input type="color" value={newModele.couleur} onChange={e => setNewModele(p=>({...p,couleur:e.target.value}))} style={{ height: 36, width: '100%', borderRadius: 6, border: '1px solid var(--border2)', cursor: 'pointer' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Icône (emoji)</label>
                    <input className="form-input" value={newModele.icone} onChange={e => setNewModele(p=>({...p,icone:e.target.value}))} placeholder="🏛" style={{ fontSize: 20, textAlign: 'center' }} maxLength={2} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setShowNewModele(false); setNewModele(EMPTY_MODELE); setIaModeleResult(null); setIaModeleError(''); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveNewModele} disabled={!newModele.nom || !newModele.organisme}>Créer le modèle →</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ MODAL ÉDITION MODÈLE ══ */}
          {editModele && (
            <div className="modal-overlay" onClick={e => e.target===e.currentTarget && (setEditModele(null), setIaModeleResult(null), setIaModeleError(''))}>
              <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-title">✏️ Modifier le modèle</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nom du modèle *</label>
                    <input className="form-input" value={editModele.nom || ''} onChange={e => setEditModele(p=>({...p,nom:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organisme *</label>
                    <input className="form-input" value={editModele.organisme || ''} onChange={e => setEditModele(p=>({...p,organisme:e.target.value}))} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <input className="form-input" value={editModele.type || ''} onChange={e => setEditModele(p=>({...p,type:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline indicative</label>
                    <input className="form-input" value={editModele.deadline_indicative || ''} onChange={e => setEditModele(p=>({...p,deadline_indicative:e.target.value}))} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Montant max (€)</label>
                    <input className="form-input" type="number" value={editModele.montant_max || ''} onChange={e => setEditModele(p=>({...p,montant_max:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">URL formulaire</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" value={editModele.url || ''} onChange={e => setEditModele(p=>({...p,url:e.target.value}))} placeholder="https://..." style={{ flex: 1 }} />
                      <button className="btn" style={{ fontSize: 11, flexShrink: 0, background: 'var(--pk-blue-light)', color: 'var(--pk-blue)' }}
                        onClick={() => analyserFormulaireIA(editModele.url, setEditModele)} disabled={iaModeleLoading || !editModele.url}>
                        {iaModeleLoading ? '⏳' : '🤖 IA'}
                      </button>
                    </div>
                  </div>
                </div>
                {iaModeleError && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>⚠️ {iaModeleError}</div>}
                {iaModeleResult && <IaModeleResultPanel result={iaModeleResult} onClose={() => setIaModeleResult(null)} />}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={editModele.description || ''} onChange={e => setEditModele(p=>({...p,description:e.target.value}))} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pièces justificatives (séparées par virgule)</label>
                  <input className="form-input" value={typeof editModele.pieces === 'string' ? editModele.pieces : (editModele.pieces || []).join(', ')} onChange={e => setEditModele(p=>({...p,pieces:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Champs du formulaire (séparés par virgule)</label>
                  <input className="form-input" value={typeof editModele.champs === 'string' ? editModele.champs : (editModele.champs || []).join(', ')} onChange={e => setEditModele(p=>({...p,champs:e.target.value}))} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Couleur</label>
                    <input type="color" value={editModele.couleur || '#2834B7'} onChange={e => setEditModele(p=>({...p,couleur:e.target.value}))} style={{ height: 36, width: '100%', borderRadius: 6, border: '1px solid var(--border2)', cursor: 'pointer' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Icône (emoji)</label>
                    <input className="form-input" value={editModele.icone || '🏛'} onChange={e => setEditModele(p=>({...p,icone:e.target.value}))} style={{ fontSize: 20, textAlign: 'center' }} maxLength={2} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => { setEditModele(null); setIaModeleResult(null); setIaModeleError(''); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={saveEditModele} disabled={!editModele.nom || !editModele.organisme}>💾 Enregistrer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function IaModeleResultPanel({ result, onClose }) {
      return (
        <div style={{ background: 'var(--pk-blue-light)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid var(--pk-blue)30' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--pk-blue)' }}>🤖 Analyse IA — {result.nom_programme || result.organisme}</div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text3)' }} onClick={onClose}>✕</button>
          </div>
          {result.synthese && <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5, color: 'var(--text1)' }}>{result.synthese}</div>}
          {result.points_vigilance?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>⚠️ Points de vigilance</div>
              {result.points_vigilance.map((p, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 8px', marginBottom: 3, background: 'var(--warn-light)', borderRadius: 6, color: 'var(--text1)' }}>
                  <strong>{p.titre}</strong>{p.detail ? ` — ${p.detail}` : ''}
                </div>
              ))}
            </div>
          )}
          {result.documents_obligatoires?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>📄 Documents obligatoires</div>
              {result.documents_obligatoires.filter(d => d.obligatoire).map((d, i) => (
                <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)', color: 'var(--text1)' }}>
                  📎 <strong>{d.document}</strong>{d.precision ? ` — ${d.precision}` : ''}
                </div>
              ))}
            </div>
          )}
          {result.textes_a_rediger?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6A1B9A', marginBottom: 4 }}>✍️ Sections à rédiger</div>
              {result.textes_a_rediger.map((t, i) => (
                <div key={i} style={{ fontSize: 12, padding: '6px 8px', marginBottom: 4, background: 'white', borderRadius: 6, borderLeft: '3px solid #6A1B9A' }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.section}</div>
                  <div style={{ color: 'var(--text2)', lineHeight: 1.4 }}>{t.contenu_attendu}</div>
                  {t.conseils && <div style={{ color: 'var(--pk-blue)', fontSize: 11, marginTop: 2 }}>💡 {t.conseils}</div>}
                </div>
              ))}
            </div>
          )}
          {result.montant_info && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>💰 {result.montant_info}</div>}
          {result.conseils_globaux && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>💡 {result.conseils_globaux}</div>}
        </div>
      );
    }

    function AnnuaireView() {
      const [tab, setTab] = useState('interne');
      const [allContacts, setAllContacts] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [showNewDiff, setShowNewDiff] = useState(false);
      const [newContact, setNewContact] = useState({ nom: '', prenom: '', email: '', telephone: '', organisation: '', role: '', note: '' });
      const [newDiff, setNewDiff] = useState({ nom: '', email: '', liste: 'generale', organisation: '' });
      const [search, setSearch] = useState('');

      useEffect(() => {
        fetch(`${API}/annuaire`).then(r => r.json()).then(setAllContacts).catch(console.error);
      }, []);

      const contacts = allContacts.filter(c => !c.liste); // 'interne' has no liste defined
      const diffusion = allContacts.filter(c => c.liste);

      function saveContacts(list) {
        // Optimistic UI updates
        const merged = [...list, ...diffusion];
        setAllContacts(merged);
      }
      function saveDiffusion(list) {
        // Optimistic UI updates
        const merged = [...contacts, ...list];
        setAllContacts(merged);
      }

      async function apiSaveContact(c) {
        try {
          const res = await fetch(`${API}/annuaire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c)
          });
          if (res.ok) {
            const savedItem = await res.json();
            setAllContacts(prev => [savedItem, ...prev]);
          }
        } catch (e) {
          console.error(e);
        }
      }


      function addContact() {
        if (!newContact.email) return;
        const c = { ...newContact, created_at: new Date().toISOString(), source: 'manuel' };
        fetch(`${API}/annuaire`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(c) })
          .then(r => r.ok ? r.json() : null)
          .then(saved => { if (saved) setAllContacts(prev => [saved, ...prev]); })
          .catch(console.error);
        setShowNew(false);
        setNewContact({ nom: '', prenom: '', email: '', telephone: '', organisation: '', role: '', note: '' });
      }
      function addDiffusion() {
        if (!newDiff.email) return;
        const c = { ...newDiff, created_at: new Date().toISOString() };
        fetch(`${API}/annuaire`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(c) })
          .then(r => r.ok ? r.json() : null)
          .then(saved => { if (saved) setAllContacts(prev => [saved, ...prev]); })
          .catch(console.error);
        setShowNewDiff(false);
        setNewDiff({ nom: '', email: '', liste: 'generale', organisation: '' });
      }
      function deleteContact(id) {
        fetch(`${API}/annuaire/${id}`, { method: 'DELETE' }).catch(console.error);
        setAllContacts(prev => prev.filter(x => x.id !== id));
      }

      const filteredContacts = contacts.filter(c =>
        !search || [c.nom, c.prenom, c.email, c.organisation].some(v => v?.toLowerCase().includes(search.toLowerCase()))
      );
      const filteredDiff = diffusion.filter(c =>
        !search || [c.nom, c.email, c.organisation].some(v => v?.toLowerCase().includes(search.toLowerCase()))
      );

      const LISTES = { generale: { label: 'Générale', color: 'var(--pk-blue)' }, partenaires: { label: 'Partenaires', color: '#6A1B9A' }, presse: { label: 'Presse', color: '#E65100' }, artistes: { label: 'Artistes', color: 'var(--pk-orange)' }, institutions: { label: 'Institutions', color: 'var(--success)' } };

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[['interne', `📋 Annuaire interne (${contacts.length})`], ['diffusion', `📨 Liste de diffusion (${diffusion.length})`]].map(([k, l]) => (
                <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{ fontSize: 12, padding: '5px 10px', width: 180 }} />
              {tab === 'interne' && <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(true)}>+ Contact</button>}
              {tab === 'diffusion' && <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNewDiff(true)}>+ Abonné</button>}
            </div>
          </div>

          {/* ── ANNUAIRE INTERNE ── */}
          {tab === 'interne' && (
            <div>
              <div className="card" style={{ marginBottom: 12, background: 'var(--pk-blue-light)', border: '1px solid var(--pk-blue)20' }}>
                <div style={{ fontSize: 12, color: 'var(--pk-blue)' }}>
                  <strong>💡 Annuaire interne :</strong> contacts professionnels d'Océane (partenaires, financeurs, artistes, institutions...).
                  Intégration scan de boîte mail à venir — chaque nouveau contact pourra être accepté ou refusé avant intégration.
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">📋</div><div className="empty-text">{search ? 'Aucun résultat.' : 'Aucun contact. Ajoutez-en un ou connectez votre boîte mail.'}</div></div></div>
              ) : (
                <div className="card">
                  {filteredContacts.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--pk-blue-light)', color: 'var(--pk-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {(c.prenom?.[0] || '') + (c.nom?.[0] || '')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.prenom} {c.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.role}{c.organisation ? ` · ${c.organisation}` : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--pk-blue)' }}>{c.email}</div>
                      </div>
                      {c.telephone && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.telephone}</div>}
                  <button onClick={() => deleteContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LISTE DE DIFFUSION ── */}
          {tab === 'diffusion' && (
            <div>
              <div className="card" style={{ marginBottom: 12, background: 'var(--pk-orange-light)', border: '1px solid var(--pk-orange)20' }}>
                <div style={{ fontSize: 12, color: 'var(--pk-orange)' }}>
                  <strong>📨 Liste de diffusion :</strong> contacts pour vos futures campagnes emailing (newsletter, invitations, appels à candidatures...).
                  Chaque contact est segmenté par liste. Export CSV disponible pour vos outils d'emailing (Mailchimp, Brevo...).
                </div>
              </div>

              {/* Stats par liste */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {Object.entries(LISTES).map(([key, { label, color }]) => {
                  const count = diffusion.filter(c => c.liste === key).length;
                  if (!count) return null;
                  return <span key={key} style={{ background: color + '15', color, padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{label} : {count}</span>;
                })}
              </div>

              {filteredDiff.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">📨</div><div className="empty-text">{search ? 'Aucun résultat.' : 'Aucun abonné.'}</div></div></div>
              ) : (
                <div className="card">
                  {/* Export CSV & Copy */}
                  <div style={{ marginBottom: 12, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn" style={{ fontSize: 11 }} onClick={() => {
                      const emails = filteredDiff.map(c => c.email).filter(Boolean).join(', ');
                      navigator.clipboard.writeText(emails);
                      alert('Les ' + filteredDiff.length + ' emails ont été copiés dans le presse-papier ! Vous pouvez les coller dans le champ Cci / Bcc de Gmail.');
                    }}>📋 Copier les emails</button>
                    <button className="btn" style={{ fontSize: 11 }} onClick={() => {
                      const csv = ['Nom,Email,Organisation,Liste', ...filteredDiff.map(c => `${c.nom},${c.email},${c.organisation || ''},${c.liste}`)].join('\n');
                      const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                      a.download = 'liste_diffusion_pausekreyol.csv'; a.click();
                    }}>⬇️ Exporter CSV</button>
                  </div>
                  {filteredDiff.map(c => {
                    const listInfo = LISTES[c.liste] || LISTES.generale;
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{c.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--pk-blue)' }}>{c.email}</div>
                          {c.organisation && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.organisation}</div>}
                        </div>
                        <span style={{ background: listInfo.color + '15', color: listInfo.color, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{listInfo.label}</span>
                        <button onClick={() => deleteContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal contact interne */}
          {showNew && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
              <div className="modal">
                <div className="modal-title">📋 Nouveau contact</div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" value={newContact.prenom} onChange={e => setNewContact(p => ({ ...p, prenom: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={newContact.nom} onChange={e => setNewContact(p => ({ ...p, nom: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={newContact.telephone} onChange={e => setNewContact(p => ({ ...p, telephone: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Organisation</label><input className="form-input" value={newContact.organisation} onChange={e => setNewContact(p => ({ ...p, organisation: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Rôle / Fonction</label><input className="form-input" value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Note</label><input className="form-input" value={newContact.note} onChange={e => setNewContact(p => ({ ...p, note: e.target.value }))} /></div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowNew(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={addContact} disabled={!newContact.email}>Ajouter →</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal abonné diffusion */}
          {showNewDiff && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewDiff(false)}>
              <div className="modal">
                <div className="modal-title">📨 Nouvel abonné</div>
                <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={newDiff.nom} onChange={e => setNewDiff(p => ({ ...p, nom: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={newDiff.email} onChange={e => setNewDiff(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Organisation</label><input className="form-input" value={newDiff.organisation} onChange={e => setNewDiff(p => ({ ...p, organisation: e.target.value }))} /></div>
                <div className="form-group">
                  <label className="form-label">Liste</label>
                  <select className="form-input" value={newDiff.liste} onChange={e => setNewDiff(p => ({ ...p, liste: e.target.value }))}>
                    {Object.entries(LISTES).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setShowNewDiff(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={addDiffusion} disabled={!newDiff.email}>Ajouter →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

