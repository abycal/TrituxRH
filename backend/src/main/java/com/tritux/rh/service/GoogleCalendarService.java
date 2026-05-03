package com.tritux.rh.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tritux.rh.model.GoogleCalendarToken;
import com.tritux.rh.repository.GoogleCalendarTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleCalendarService {

    private final GoogleCalendarTokenRepository tokenRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    @Value("${google.oauth.redirect-uri}")
    private String redirectUri;

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private static final String SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

    // ─── Vérifie si l'utilisateur a déjà un token stocké ─────────────────────
    public boolean isConnected(String email) {
        return tokenRepository.findByEmail(email).isPresent();
    }

    // ─── Génère l'URL d'autorisation OAuth2 Google ────────────────────────────
    public String generateAuthUrl(String email) {
        return UriComponentsBuilder.fromHttpUrl(AUTH_URL)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPE)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", email) // on passe l'email en state pour le retrouver au callback
                .build()
                .toUriString();
    }

    // ─── Échange le code contre les tokens et les persiste ────────────────────
    public void exchangeCodeAndSave(String email, String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("redirect_uri", redirectUri);
        body.add("grant_type", "authorization_code");

        ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                TOKEN_URL, new HttpEntity<>(body, headers), JsonNode.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("Échec de l'échange du code OAuth2 Google");
        }

        JsonNode tokenData = response.getBody();

        GoogleCalendarToken token = tokenRepository.findByEmail(email)
                .orElse(new GoogleCalendarToken());
        token.setEmail(email);
        token.setAccessToken(tokenData.path("access_token").asText());
        token.setRefreshToken(tokenData.path("refresh_token").asText(token.getRefreshToken()));
        token.setExpiresAt(Instant.now().plusSeconds(tokenData.path("expires_in").asLong(3600)));

        tokenRepository.save(token);
        log.info("Token Google Calendar enregistré pour {}", email);
    }

    // ─── Rafraîchit le token si expiré ────────────────────────────────────────
    private String getValidAccessToken(String email) {
        GoogleCalendarToken token = tokenRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Aucun token Google Calendar pour " + email));

        // Token encore valide (avec 60s de marge)
        if (token.getExpiresAt() != null && Instant.now().isBefore(token.getExpiresAt().minusSeconds(60))) {
            return token.getAccessToken();
        }

        // Rafraîchissement
        if (token.getRefreshToken() == null || token.getRefreshToken().isEmpty()) {
            throw new RuntimeException("Pas de refresh token disponible pour " + email);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", token.getRefreshToken());
        body.add("grant_type", "refresh_token");

        ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                TOKEN_URL, new HttpEntity<>(body, headers), JsonNode.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("Échec du rafraîchissement du token Google");
        }

        JsonNode newTokenData = response.getBody();
        token.setAccessToken(newTokenData.path("access_token").asText());
        token.setExpiresAt(Instant.now().plusSeconds(newTokenData.path("expires_in").asLong(3600)));
        tokenRepository.save(token);

        return token.getAccessToken();
    }

    // ─── Récupère les événements du calendrier principal ──────────────────────
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getEvents(String email, String timeMin, String timeMax) {
        String accessToken = getValidAccessToken(email);

        String url = UriComponentsBuilder.fromHttpUrl(CALENDAR_URL)
                .queryParam("timeMin", timeMin)
                .queryParam("timeMax", timeMax)
                .queryParam("singleEvents", true)
                .queryParam("orderBy", "startTime")
                .queryParam("maxResults", 250)
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("Échec de la récupération des événements Google Calendar");
        }

        JsonNode items = response.getBody().path("items");
        List<Map<String, Object>> events = new ArrayList<>();
        items.forEach(item -> {
            try {
                Map<String, Object> ev = objectMapper.convertValue(item, new TypeReference<>() {});
                events.add(ev);
            } catch (Exception e) {
                log.warn("Erreur parsing événement: {}", e.getMessage());
            }
        });

        return events;
    }

    // ─── Supprime le token (déconnexion) ──────────────────────────────────────
    public void disconnect(String email) {
        tokenRepository.findByEmail(email).ifPresent(tokenRepository::delete);
        log.info("Token Google Calendar supprimé pour {}", email);
    }
}