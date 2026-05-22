/* PauseKreyol — Application React */
/* Modifier ce fichier pour changer le comportement de l'interface */

const { useState, useEffect, useRef } = React;

    const API = 'https://web-production-ac84a.up.railway.app';

    // ── Mock data (utilisé si l'API n'est pas encore lancée) ─────────────────────
    const MOCK = {
      dashboard: {
        nb_clients: 2,
        nb_alertes_urgentes: 3,
        clients: [
          { slug: 'House_of_Bastet__HOB_', nom: 'House of Bastet (HOB)', siret: '93280087300014', nb_projets: 1, created_at: '2026-03-20' },
          { slug: 'Cie_Tropik', nom: 'Cie Tropik', siret: '88412034500021', nb_projets: 2, created_at: '2026-02-10' },
        ],
        alertes: [
          { organisme: 'Licence spectacle Type 1', statut: 'EXPIRÉ', client: 'Cie Tropik', date_expiration: '2026-01-15' },
          { organisme: 'URSSAF — dernier paiement', statut: 'URGENT', client: 'House of Bastet (HOB)', date_expiration: '2026-04-05' },
          { organisme: 'Mutuelle obligatoire', statut: 'Attention', client: 'Cie Tropik', date_expiration: '2026-06-01' },
          { organisme: 'GUSO — compte actif', statut: 'OK', client: 'House of Bastet (HOB)', date_expiration: '2027-01-01' },
        ]
      },
      taches: [
        { id: 1, titre: 'Valider les modifications du budget HOB', client: 'House of Bastet (HOB)', priorite: 'URGENT', date: '2026-03-25', done: false, source: 'Gmail' },
        { id: 2, titre: 'Dossier Mairie Paris — deadline 16 avril', client: 'House of Bastet (HOB)', priorite: 'URGENT', date: '2026-04-16', done: false, source: 'IA' },
        { id: 3, titre: 'Renouveler licence Cie Tropik', client: 'Cie Tropik', priorite: 'Attention', date: '2026-04-30', done: false, source: 'Alerte' },
        { id: 4, titre: 'Collecter statuts de Cie Tropik', client: 'Cie Tropik', priorite: 'Normal', date: '2026-05-01', done: true, source: 'Manuel' },
      ],
      pipeline: {
        'À préparer': [
          { nom: 'DRAC IDF', client: 'House of Bastet (HOB)', montant: '15 000€' },
          { nom: 'Région IDF', client: 'Cie Tropik', montant: '8 000€' },
        ],
        'Déposée': [
          { nom: 'Mairie Paris AAP', client: 'House of Bastet (HOB)', montant: '10 000€' },
        ],
        'En instruction': [
          { nom: 'CNM', client: 'Cie Tropik', montant: '5 000€' },
        ],
        'Accordée': [
          { nom: 'CAF93', client: 'Cie Tropik', montant: '3 500€' },
        ],
        'Versée': [
          { nom: 'FDVA', client: 'House of Bastet (HOB)', montant: '2 000€' },
        ],
      }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────────

    function initials(name) {
      return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    function Badge({ statut }) {
      const map = {
        'EXPIRÉ': 'badge-danger',
        'URGENT': 'badge-warn',
        'Attention': 'badge-warn',
        'OK': 'badge-green',
        '—': 'badge-gray',
        'en_construction': 'badge-info',
        'Normal': 'badge-gray',
      };
      return <span className={`badge ${map[statut] || 'badge-gray'}`}>{statut}</span>;
    }

    function AlertDot({ statut }) {
      const map = { 'EXPIRÉ': 'dot-danger', 'URGENT': 'dot-warn', 'Attention': 'dot-warn', 'OK': 'dot-ok' };
      return <div className={`alert-dot ${map[statut] || 'dot-gray'}`} />;
    }

    // ── Calendar strip ────────────────────────────────────────────────────────────

    function CalendarStrip({ taches = [] }) {
      const today = new Date();
      const days = [];
      for (let i = -2; i <= 12; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
      }
      const names = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      // Dates avec vraies tâches (deadlines)
      const deadlineDates = new Set(
        taches.filter(t => !t.done && t.deadline).map(t => t.deadline)
      );

      return (
        <div className="calendar-strip">
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const hasEvent = deadlineDates.has(dStr);
            return (
              <div key={i} className={`cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}>
                <div className="cal-day-name">{names[d.getDay()]}</div>
                <div className="cal-day-num">{d.getDate()}</div>
                {hasEvent && <div className="cal-dot" />}
              </div>
            );
          })}
        </div>
      );
    }

