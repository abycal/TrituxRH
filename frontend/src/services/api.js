import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: 'http://localhost:9091/api',
  timeout: 120000,
});

// Injecte automatiquement le token JWT dans chaque requête
api.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Si le token expire → logout automatique
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      keycloak.logout();
    }
    return Promise.reject(error);
  }
);

export default api;