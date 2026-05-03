import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);

const IconBarChart = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/><line x1="3" y1="20" x2="21" y2="20"/>
  </svg>
);

function StatCard({ label, value, sub, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="premium-card"
      style={{ padding: '20px', textAlign: 'left', width: '100%', cursor: 'pointer', border: 'none', background: 'hsl(var(--card))' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{label}</p>
        <div style={{
          width: 32, height: 32, borderRadius: '8px',
          background: 'hsl(var(--muted))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'hsl(var(--muted-foreground))',
        }}>{icon}</div>
      </div>
      <p style={{ fontSize: '2rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>{sub}</p>}
    </button>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ candidates: 0, templates: 0, transformations: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/candidates').catch(() => ({ data: [] })),
      api.get('/templates').catch(() => ({ data: [] })),
    ]).then(([cands, tmpls]) => {
      setStats({
        candidates: cands.data.length,
        templates: tmpls.data.length,
        transformations: 0,
      });
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
          Bienvenue sur la plateforme RH Tritux
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/profiles')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '9999px',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', transition: 'box-shadow 0.2s',
            }}
          >
            ↑ Importer CV
          </button>
          <button
            onClick={() => navigate('/profiles')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '9999px',
              border: 'none',
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--card))',
              fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Nouveau profil
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Profils actifs" value={stats.candidates} sub="Candidats importés" icon={<IconUser />} onClick={() => navigate('/profiles')} />
        <StatCard label="Templates disponibles" value={stats.templates} sub="Prêts à l'emploi" icon={<IconFile />} onClick={() => navigate('/templates')} />
        <StatCard label="CV transformés" value={stats.transformations} sub="Ce mois-ci" icon={<IconRefresh />} onClick={() => navigate('/transformation')} />
      </div>

      {/* Quick actions */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 16px' }}>
          Actions rapides
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { label: '+ Importer un CV', path: '/profiles', primary: true },
            { label: 'Voir les templates', path: '/templates', primary: false },
            { label: 'Transformer un CV', path: '/transformation', primary: false },
          ].map(({ label, path, primary }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                padding: '10px 20px', borderRadius: '9999px',
                border: primary ? 'none' : '1px solid hsl(var(--border))',
                background: primary ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: primary ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                fontSize: '0.875rem', fontWeight: 500,
                cursor: 'pointer', transition: 'opacity 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 16px' }}>
          Activité récente
        </h2>
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'hsl(var(--muted-foreground))' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <IconBarChart />
          </div>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>Importez des profils pour voir votre activité ici</p>
        </div>
      </div>
    </div>
  );
}
