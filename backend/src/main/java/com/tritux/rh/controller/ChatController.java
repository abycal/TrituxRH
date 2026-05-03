package com.tritux.rh.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tritux.rh.model.Candidate;
import com.tritux.rh.service.CandidateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * ChatController — Workflow 3 (Chatbot RH)
 *
 * Deux endpoints :
 *   POST /api/candidates/{id}/chat        → message texte
 *   POST /api/candidates/{id}/chat-audio  → fichier audio (webm/mp3/wav)
 *
 * Spring Boot ne fait que proxy vers le webhook n8n.
 * C'est n8n qui appelle Groq (llama-3.3-70b-versatile) et met à jour Postgres.
 */
@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final CandidateService candidateService;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${n8n.chat.webhook.url}")
    private String n8nChatWebhookUrl;

    @Value("${n8n.chat-audio.webhook.url}")
    private String n8nChatAudioWebhookUrl;

    // ─────────────────────────────────────────────────────────────
    //  1. Chat TEXTE
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/{id}/chat")
    public ResponseEntity<Map<String, Object>> chat(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) throws Exception {

        Candidate candidate = candidateService.getById(id);

        // Construire un nouveau Map mutable avec toutes les données
        // (body reçu en @RequestBody peut être immuable)
        Map<String, Object> payload = new HashMap<>();
        payload.put("message", body.get("message"));
        payload.put("candidateId", id.toString());
        payload.put("currentProfile", candidate.getProfileData());

        String payloadJson = objectMapper.writeValueAsString(payload);
        log.info("[Chat] candidateId={} message={}", id, body.get("message"));

        String rawResponse = callN8n(n8nChatWebhookUrl, payloadJson);
        return buildResponse(id, rawResponse);
    }

    // ─────────────────────────────────────────────────────────────
    //  2. Chat AUDIO (multipart)
    // ─────────────────────────────────────────────────────────────
    @PostMapping(value = "/{id}/chat-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> chatAudio(
            @PathVariable UUID id,
            @RequestPart("audio") MultipartFile audioFile) throws Exception {

        Candidate candidate = candidateService.getById(id);
        String profileJson = objectMapper.writeValueAsString(candidate.getProfileData());

        log.info("[ChatAudio] candidateId={} audioSize={}", id, audioFile.getSize());

        // Envoyer le fichier audio + profil JSON à n8n via multipart
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("audio", new ByteArrayResource(audioFile.getBytes()) {
            @Override
            public String getFilename() {
                return audioFile.getOriginalFilename() != null
                        ? audioFile.getOriginalFilename()
                        : "audio.webm";
            }
        }).contentType(MediaType.parseMediaType(
                audioFile.getContentType() != null ? audioFile.getContentType() : "audio/webm"
        ));
        builder.part("candidateId", id.toString());
        builder.part("currentProfile", profileJson);

        WebClient client = webClientBuilder.baseUrl(n8nChatAudioWebhookUrl).build();
        String rawResponse;
        try {
            rawResponse = client.post()
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[ChatAudio] n8n error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(502).body(Map.of(
                    "reply", "Erreur de communication avec le service vocal.",
                    "error", e.getMessage()
            ));
        }

        return buildResponse(id, rawResponse);
    }

    // ─────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────
    private String callN8n(String webhookUrl, String jsonPayload) {
        WebClient client = webClientBuilder.baseUrl(webhookUrl).build();
        try {
            return client.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(jsonPayload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[Chat] n8n error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        }
    }

    /**
     * Parse la réponse n8n, sauvegarde le profil mis à jour si présent,
     * retourne { reply, updatedProfile }.
     */
    @SuppressWarnings("unchecked")
    private ResponseEntity<Map<String, Object>> buildResponse(UUID id, String rawResponse) throws Exception {
        if (rawResponse == null || rawResponse.isBlank()) {
            return ResponseEntity.status(502).body(Map.of("reply", "Réponse vide du service IA."));
        }

        JsonNode result = objectMapper.readTree(rawResponse);
        String reply = result.path("reply").asText("Profil mis à jour.");
        JsonNode updatedProfile = result.path("updatedProfile");

        // Persister le profil mis à jour si n8n l'a retourné
        if (!updatedProfile.isMissingNode() && !updatedProfile.isNull()) {
            candidateService.updateProfileData(id, updatedProfile);
            log.info("[Chat] Profil mis à jour pour candidateId={}", id);
        }

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "updatedProfile", updatedProfile.isMissingNode() ? objectMapper.nullNode() : updatedProfile
        ));
    }
}