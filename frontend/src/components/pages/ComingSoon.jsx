import React from 'react';

export default function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div className="premium-card" style={{ padding: '64px', textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'hsl(var(--muted-foreground))' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 8px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
          Cette section sera disponible prochainement
        </p>
      </div>
    </div>
  );
}
