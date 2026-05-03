import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import keycloak from './keycloak';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import Profiles from './components/pages/Profiles';
import ProfileDetail from './components/pages/ProfileDetail';
import Templates from './components/pages/Templates';
import Transformation from './components/pages/Transformation';
import ComingSoon from './components/pages/ComingSoon';
import JobOffers from './components/pages/JobOffers';
import JobOfferDetail from './components/pages/JobOfferDetail';
import Agenda from './components/pages/Agenda';
import GoogleCallback from './components/pages/GoogleCallback';

// ─── Détection IMMÉDIATE avant tout — avant Keycloak, avant React Router ──────
// Si on est sur /google-callback, on court-circuite tout et on rend juste
// le composant GoogleCallback sans initialiser Keycloak en mode login-required.
const IS_GOOGLE_CALLBACK = window.location.pathname === '/google-callback';

let keycloakInitialized = false;

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(!IS_GOOGLE_CALLBACK);

  useEffect(() => {
    // Sur la page callback Google → on n'initialise PAS Keycloak
    // Il intercepterait le ?code= de Google et planterait avec "Invalid redirect uri"
    if (IS_GOOGLE_CALLBACK) return;

    if (keycloakInitialized) return;
    keycloakInitialized = true;

    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      })
      .then((auth) => {
        setAuthenticated(auth);
        setLoading(false);
        if (auth) {
          setInterval(() => {
            keycloak.updateToken(300).catch(() => {});
          }, 60000);
        }
      })
      .catch((err) => {
        console.error('Keycloak init error', err);
        setLoading(false);
      });
  }, []);

  // ── Page callback Google : rendu immédiat, sans Keycloak ──────────────────
  if (IS_GOOGLE_CALLBACK) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/google-callback" element={<GoogleCallback />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ── Chargement Keycloak ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontFamily: 'sans-serif', fontSize: '18px', color: '#555',
      }}>
        Connexion en cours...
      </div>
    );
  }

  if (!authenticated) {
    keycloak.login();
    return null;
  }

  // ── App principale ────────────────────────────────────────────────────────
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="profiles/:id" element={<ProfileDetail />} />
          <Route path="templates" element={<Templates />} />
          <Route path="transformation" element={<Transformation />} />
          <Route path="offres" element={<JobOffers />} />
          <Route path="offres/:id" element={<JobOfferDetail />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="parametres" element={<ComingSoon title="Paramètres" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}