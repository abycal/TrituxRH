import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
          Templates de CV disponibles pour la transformation
        </p>
        <button
          style={{
            padding: '8px 18px', borderRadius: '9999px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Demander un template
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {templates.map(t => (
          <div key={t.id} className="premium-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ height: '192px', background: 'hsl(var(--muted))', overflow: 'hidden' }}>
              <iframe
                src={`http://localhost:9091/api/templates/${t.id}/preview`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={t.name}
              />
            </div>
            <div style={{ padding: '16px 20px' }}>
              <h3 style={{ fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 4px' }}>{t.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: '0 0 12px' }}>
                {t.description || 'Template officiel Tritux'}
              </p>
              <a
                href={`http://localhost:9091/api/templates/${t.id}/download`}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '6px 14px', borderRadius: '9999px',
                  background: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontSize: '0.75rem', fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                ↓ Télécharger
              </a>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 24px', color: 'hsl(var(--muted-foreground))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'hsl(var(--muted-foreground))' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Aucun template disponible</p>
          </div>
        )}
      </div>
    </div>
  );
}
