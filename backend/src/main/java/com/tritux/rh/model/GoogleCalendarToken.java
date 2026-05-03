package com.tritux.rh.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * Stocke les tokens OAuth2 Google Calendar par email utilisateur (Keycloak).
 * Une ligne par utilisateur ayant autorisé l'accès à son calendrier.
 */
@Entity
@Table(name = "google_calendar_tokens")
@Data
public class GoogleCalendarToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Email du compte Keycloak — clé de liaison avec le JWT */
    @Column(unique = true, nullable = false)
    private String email;

    /** Token d'accès Google (courte durée) */
    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    /** Token de rafraîchissement Google (longue durée) */
    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    /** Date/heure d'expiration de l'access token */
    @Column(name = "expires_at")
    private Instant expiresAt;
}