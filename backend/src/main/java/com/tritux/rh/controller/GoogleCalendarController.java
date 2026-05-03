package com.tritux.rh.controller;

import com.tritux.rh.service.GoogleCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class GoogleCalendarController {

    private final GoogleCalendarService calendarService;

    /**
     * Vérifie si l'utilisateur a déjà lié son Google Calendar.
     * GET /api/calendar/status  ← protégé JWT Keycloak
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> getStatus(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        boolean connected = calendarService.isConnected(email);
        return ResponseEntity.ok(Map.of("connected", connected));
    }

    /**
     * Génère l'URL d'autorisation Google OAuth2.
     * GET /api/calendar/oauth/url  ← protégé JWT Keycloak
     */
    @GetMapping("/oauth/url")
    public ResponseEntity<Map<String, String>> getOAuthUrl(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String url = calendarService.generateAuthUrl(email);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * Callback Google OAuth2 — PUBLIC, sans JWT Keycloak.
     * L'email vient du paramètre "state" que Google nous renvoie
     * (on l'avait passé lors de generateAuthUrl).
     * POST /api/calendar/oauth/callback
     */
    @PostMapping("/oauth/callback")
    public ResponseEntity<Map<String, String>> handleCallback(
            @RequestBody Map<String, String> body) {

        String code  = body.get("code");
        String email = body.get("state"); // email passé dans le state Google

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "code manquant"));
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "state (email) manquant"));
        }

        calendarService.exchangeCodeAndSave(email, code);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    /**
     * Récupère les événements Google Calendar de l'utilisateur.
     * GET /api/calendar/events?timeMin=...&timeMax=...  ← protégé JWT Keycloak
     */
    @GetMapping("/events")
    public ResponseEntity<List<Map<String, Object>>> getEvents(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String timeMin,
            @RequestParam String timeMax) {
        String email = jwt.getClaimAsString("email");
        List<Map<String, Object>> events = calendarService.getEvents(email, timeMin, timeMax);
        return ResponseEntity.ok(events);
    }

    /**
     * Déconnecte Google Calendar (supprime le token).
     * DELETE /api/calendar/disconnect  ← protégé JWT Keycloak
     */
    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        calendarService.disconnect(email);
        return ResponseEntity.noContent().build();
    }
}