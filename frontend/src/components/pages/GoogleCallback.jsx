import { useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * Page callback Google OAuth2.
 * Route : /google-callback  — hors Keycloak, hors Layout.
 *
 * On utilise axios DIRECTEMENT (pas api.js) car keycloak.token
 * n'est pas disponible ici — Keycloak n'est pas initialisé.
 *
 * Le backend reçoit { code, state } où state = email de l'utilisateur.
 * La route /api/calendar/oauth/callback est en permitAll dans SecurityConfig.
 */
export default function GoogleCallback() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code  = params.get('code');
    const state = params.get('state'); // email passé lors du generateAuthUrl
    const error = params.get('error');

    if (error || !code) {
      // Accès refusé ou annulé — on repart vers /agenda proprement
      window.location.replace('/agenda');
      return;
    }

    // Appel direct sans Authorization header — backend en permitAll
    axios.post('http://localhost:9091/api/calendar/oauth/callback', {
      code,
      state, // l'email
    })
      .then(() => {
        // Rechargement complet pour que Keycloak reparte proprement
        window.location.replace('/agenda');
      })
      .catch((err) => {
        console.error('Erreur callback Google:', err?.response?.data || err.message);
        window.location.replace('/agenda');
      });
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16,
      fontFamily: 'sans-serif', color: '#555',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
        stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 15 }}>Connexion à Google Calendar...</p>
      <p style={{ margin: 0, fontSize: 12, color: '#999' }}>Vous serez redirigé automatiquement</p>
    </div>
  );
}