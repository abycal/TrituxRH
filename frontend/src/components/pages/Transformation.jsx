import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function Transformation() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('id');
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(preselectedId || '');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get('/candidates').then(r => setCandidates(r.data)).catch(() => {});
  }, []);

  const handleTransform = async () => {
    if (!selectedId) return;
    setLoading(true);
    setDone(false);
    try {
      const res = await api.post(
        `/transform/${selectedId}?anonymous=${anonymous}`,
        {},
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      const candidate = candidates.find(c => c.id === selectedId);
      link.href = url;
      link.setAttribute('download', `CV_${candidate?.nom || 'candidat'}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDone(true);
    } catch {
      alert('Erreur lors de la transformation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
        Transformez un profil selon votre template 
      </p>

      <div style={{ maxWidth: '560px' }}>
        <div className="premium-card" style={{ padding: '32px' }}>
          {/* Candidate select */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: '8px' }}>
              Choisir un candidat
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
                fontSize: '0.875rem', outline: 'none',
              }}
            >
              <option value="">— Sélectionner —</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Anonymous toggle */}
          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => setAnonymous(!anonymous)}
              style={{
                width: 44, height: 24, borderRadius: '12px',
                background: anonymous ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: anonymous ? '22px' : '2px',
                width: 20, height: 20, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }} />
            </div>
            <label style={{ fontSize: '0.875rem', color: 'hsl(var(--foreground))', cursor: 'pointer' }}
              onClick={() => setAnonymous(!anonymous)}>
              CV anonyme (masquer le nom du candidat)
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleTransform}
            disabled={!selectedId || loading}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px', border: 'none',
              background: !selectedId || loading ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
              color: !selectedId || loading ? 'hsl(var(--muted-foreground))' : 'white',
              fontSize: '0.9375rem', fontWeight: 600,
              cursor: !selectedId || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid hsl(var(--muted-foreground))',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Génération en cours…
              </>
            ) : 'Générer le CV Tritux'}
          </button>

          {done && (
            <div style={{
              marginTop: '16px', padding: '12px 16px',
              borderRadius: '12px',
              background: 'hsl(var(--primary) / 0.08)',
              border: '1px solid hsl(var(--primary) / 0.2)',
              color: 'hsl(var(--primary))',
              fontSize: '0.875rem', textAlign: 'center',
            }}>
              CV généré et téléchargé avec succès !
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
