import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'tritux',
  clientId: 'tritux-rh-app',
});

export default keycloak;