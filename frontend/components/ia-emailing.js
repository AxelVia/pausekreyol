// ═══════════════════════════════════════════════════════════════════════════════
// MODULE IA — Tableau de bord des consommations
// ═══════════════════════════════════════════════════════════════════════════════

function IAUsageView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const FEATURE_LABELS = {
    prospect: 'Analyse prospect',
    sync_projet: 'Synchronisation projet',
    faisabilite: 'Faisabilité financière',
    email: 'Génération email',
    strategie: 'Analyse stratégie',
    analyse_formulaire_subvention: 'Analyse formulaire subvention',
  };

  // Coût estimé Claude Sonnet : ~$3/M input, ~$15/M output (tarifs Anthropic indicatifs)
  function estimateCost(input, output) {
    return ((input / 1_000_000) * 3 + (output / 1_000_000) * 15).toFixed(4);
  }

  async function loadUsage() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/ia/usage`);
      if (!res.ok) throw new Error('Erreur chargement');
      setData(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { loadUsage(); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>⏳ Chargement des données…</div>;
  if (error) return <div style={{ padding: 24, color: 'var(--danger)' }}>⚠️ {error}</div>;
  if (!data) return null;

  const costEst = estimateCost(data.total_input_tokens, data.total_output_tokens);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>🤖 Consommation IA</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>État des lieux des appels API Claude sur ce site</div>
        </div>
        <button className="btn" style={{ fontSize: 12 }} onClick={loadUsage}>🔄 Actualiser</button>
      </div>

      {/* Cartes KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          ['🔢 Appels total', data.total_appels, '', 'var(--pk-blue)'],
          ['📥 Tokens entrants', (data.total_input_tokens || 0).toLocaleString('fr-FR'), 'tokens', 'var(--success)'],
          ['📤 Tokens sortants', (data.total_output_tokens || 0).toLocaleString('fr-FR'), 'tokens', 'var(--accent)'],
          ['💰 Coût estimé', `$${costEst}`, '(indicatif)', 'var(--warn)'],
        ].map(([label, val, sub, color]) => (
          <div key={label} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            {sub && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Répartition par feature */}
      {Object.keys(data.par_feature || {}).length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">📊 Répartition par fonctionnalité</div></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Fonctionnalité', 'Appels', 'Tokens entrants', 'Tokens sortants', 'Total tokens', 'Coût estimé'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.par_feature).sort((a, b) => b[1].appels - a[1].appels).map(([feature, stats]) => (
                  <tr key={feature} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{FEATURE_LABELS[feature] || feature}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--pk-blue)' }}>{stats.appels}</td>
                    <td style={{ padding: '8px 10px' }}>{(stats.input_tokens || 0).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '8px 10px' }}>{(stats.output_tokens || 0).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{((stats.input_tokens || 0) + (stats.output_tokens || 0)).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--warn)' }}>${estimateCost(stats.input_tokens || 0, stats.output_tokens || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique récent */}
      {(data.historique || []).length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">🕐 Historique des 100 derniers appels</div></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Date & heure', 'Fonctionnalité', 'Modèle', 'Tokens in', 'Tokens out'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.historique.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: i > 0 && i % 2 === 0 ? 0.85 : 1 }}>
                    <td style={{ padding: '5px 10px', color: 'var(--text3)' }}>{new Date(e.ts).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '5px 10px', fontWeight: 500 }}>{FEATURE_LABELS[e.feature] || e.feature}</td>
                    <td style={{ padding: '5px 10px', color: 'var(--text3)', fontSize: 11 }}>{(e.model || '').replace('claude-', '')}</td>
                    <td style={{ padding: '5px 10px' }}>{(e.input_tokens || 0).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '5px 10px' }}>{(e.output_tokens || 0).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total_appels === 0 && (
        <div className="empty">
          <div className="empty-icon">🤖</div>
          <div className="empty-text">Aucun appel IA enregistré pour l'instant. Les consommations apparaîtront ici lors des prochaines analyses.</div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
        ℹ️ Coût estimé basé sur les tarifs Claude Sonnet indicatifs ($3/M tokens entrants, $15/M tokens sortants). Se référer au tableau de bord Anthropic pour les montants réels.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EMAILING & NEWSLETTER
// ═══════════════════════════════════════════════════════════════════════════════

function EmailingView() {
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState('config'); // 'config', 'calendar', 'stats'
  const [showForm, setShowForm] = useState(false);
  
  // Nouveaux champs pour la campagne
  const [draft, setDraft] = useState({ 
    sujet: '', cible: '', contenu: '', 
    date_envoi: '', statut: 'brouillon',
    stats: { ouvertures: 0, clics: 0, reponses: 0 }
  });

  useEffect(() => { loadCampaigns(); }, []);
  function loadCampaigns() { fetch(`${API}/campaigns`).then(r=>r.json()).then(setCampaigns); }
  
  function saveCampaign() {
    fetch(`${API}/campaigns`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(draft) })
    .then(()=> { loadCampaigns(); setShowForm(false); setDraft({ sujet: '', cible: '', contenu: '', date_envoi: '', statut: 'brouillon', stats: {ouvertures:0, clics:0, reponses:0} }); });
  }

  function updateStatus(cmp, stat) {
    fetch(`${API}/campaigns/${cmp.id}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({statut: stat}) }).then(loadCampaigns);
  }
  function updateStats(cmp, st) {
    fetch(`${API}/campaigns/${cmp.id}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({stats: st}) }).then(loadCampaigns);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Campagnes Emailing & Newsletter</h2>
        {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle Campagne</button>}
      </div>

      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', marginBottom: 24, paddingBottom: 8 }}>
        <button className={`btn ${tab === 'config' ? 'btn-primary' : ''}`} onClick={() => setTab('config')}>Configuration</button>
        <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')}>Calendrier d'Envoi</button>
        <button className={`btn ${tab === 'stats' ? 'btn-primary' : ''}`} onClick={() => setTab('stats')}>Suivi des retours</button>
      </div>
      
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderTop: '4px solid #FF795A' }}>
          <div className="card-header"><div className="card-title">📝 Édition de Campagne</div></div>
          <div className="form-group"><label className="form-label">Sujet de l'email</label><input className="form-input" value={draft.sujet} onChange={e=>setDraft({...draft, sujet: e.target.value})} placeholder="Ex: Voeux 2027" /></div>
          <div className="form-group"><label className="form-label">Audience Ciblée</label><input className="form-input" value={draft.cible} onChange={e=>setDraft({...draft, cible: e.target.value})} placeholder="Ex: Clients 2025" /></div>
          <div className="form-group"><label className="form-label">Date d'envoi prévue</label><input type="date" className="form-input" value={draft.date_envoi} onChange={e=>setDraft({...draft, date_envoi: e.target.value})} /></div>
          
          <div className="form-group">
            <label className="form-label">Contenu de l'email</label>
            <textarea className="form-input" style={{ height: 300, fontFamily: 'sans-serif' }} value={draft.contenu} onChange={e=>setDraft({...draft, contenu: e.target.value})}></textarea>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveCampaign} disabled={!draft.sujet}>Enregistrer la campagne</button>
          </div>
        </div>
      )}

      {!showForm && tab === 'config' && (
        <div className="card">
          {campaigns.length === 0 ? <div className="empty"><div className="empty-text">Aucune campagne configurée.</div></div> : 
           campaigns.map(c => (
            <div key={c.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
               <div>
                 <div style={{ fontWeight: 600, fontSize: 16 }}>{c.sujet}</div>
                 <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Cible : {c.cible}</div>
                 <div style={{ fontSize: 13, color: 'var(--text2)' }}>Prévu le : {c.date_envoi ? new Date(c.date_envoi).toLocaleDateString('fr-FR') : 'Non défini'}</div>
               </div>
               <div>
                 <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 11, background: c.statut==='envoyé'?'#E0F2FE': c.statut==='planifié'?'#FEF3C7':'#F3F4F6', color: c.statut==='envoyé'?'#0369A1': c.statut==='planifié'?'#D97706':'#374151', textTransform: 'uppercase', fontWeight: 600 }}>{c.statut}</span>
                 {c.statut !== 'envoyé' && (
                   <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                     <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => updateStatus(c, 'planifié')}>Planifier</button>
                     <button className="btn" style={{ padding: '4px 8px', fontSize: 12, borderColor: '#0369A1', color: '#0369A1' }} onClick={() => updateStatus(c, 'envoyé')}>Marquer Envoyé</button>
                   </div>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="card" style={{ minHeight: 300, background: '#fafafa' }}>
           <h3 style={{ marginBottom: 16 }}>Prochains Envois</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             {campaigns.filter(c => c.statut === 'planifié').sort((a,b)=> new Date(a.date_envoi) - new Date(b.date_envoi)).map(c => (
               <div key={c.id} style={{ background: 'white', padding: 16, borderRadius: 6, borderLeft: '4px solid #D97706', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginBottom: 4 }}>{c.date_envoi ? new Date(c.date_envoi).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}</div>
                  <div style={{ fontWeight: 600 }}>{c.sujet}</div>
               </div>
             ))}
             {campaigns.filter(c => c.statut === 'planifié').length === 0 && <div className="empty-text">Aucun envoi planifié.</div>}
           </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid-2">
          {campaigns.filter(c => c.statut === 'envoyé').map(c => (
            <div key={c.id} className="card">
               <div className="card-header"><div className="card-title">{c.sujet} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({new Date(c.date_envoi).toLocaleDateString('fr-FR')})</span></div></div>
               <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                 <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Ouvertures</label>
                    <input type="number" className="form-input" value={c.stats?.ouvertures || 0} onChange={e => updateStats(c, {...c.stats, ouvertures: e.target.value})} />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Clics</label>
                    <input type="number" className="form-input" value={c.stats?.clics || 0} onChange={e => updateStats(c, {...c.stats, clics: e.target.value})} />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Réponses</label>
                    <input type="number" className="form-input" value={c.stats?.reponses || 0} onChange={e => updateStats(c, {...c.stats, reponses: e.target.value})} />
                 </div>
               </div>
            </div>
          ))}
          {campaigns.filter(c => c.statut === 'envoyé').length === 0 && <div className="empty-text">Aucune campagne envoyée pour le moment.</div>}
        </div>
      )}
    </div>
  );
}

