package com.tritux.rh.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tritux.rh.model.CandidateExterne;
import com.tritux.rh.repository.CandidateExterneRepository;
import com.tritux.rh.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateExterneService {

    private final CandidateExterneRepository candidateExterneRepository;
    private final JobOfferRepository jobOfferRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    @Value("${uploads.externes.dir}")
    private String uploadsExternesDir;

    /**
     * Point d'entrée principal : reçoit la candidature depuis le site web,
     * sauvegarde le fichier, crée l'entité, extrait le texte via FastAPI,
     * puis envoie à n8n pour le scoring (non bloquant).
     */
    public CandidateExterne applyFromWebsite(
            MultipartFile file,
            String fullName,
            String email,
            String phone,
            String country,
            UUID jobOfferId) throws IOException {

        // 1. Sauvegarder le fichier PDF dans uploads/externes/
        Files.createDirectories(Paths.get(uploadsExternesDir));
        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadsExternesDir, filename);
        Files.write(filePath, file.getBytes());

        // 2. Créer et sauvegarder l'entité avec status = NEW
        CandidateExterne candidate = CandidateExterne.builder()
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .country(country)
                .cvPath(filePath.toString())
                .jobOfferId(jobOfferId)
                .status("NEW")
                .build();

        CandidateExterne saved = candidateExterneRepository.save(candidate);

        // 3. Lire les bytes du fichier MAINTENANT, avant que Tomcat nettoie le fichier
        // temporaire
        final byte[] fileBytes = file.getBytes();
        final String originalFilename = file.getOriginalFilename();

        // 4. Extraction texte + scoring en arrière-plan (non bloquant)
        triggerScoringAsync(saved, fileBytes, originalFilename, jobOfferId);

        return saved;
    }

    /**
     * Appelle FastAPI POST /api/extract-and-score (extraction texte + appel n8n
     * Groq).
     * FastAPI orchestre tout et retourne { candidate_id, score, scoringDetails }.
     * Non bloquant — les erreurs sont loguées, le candidat reste sauvegardé avec
     * score = null.
     */
    private void triggerScoringAsync(CandidateExterne candidate, byte[] fileBytes, String originalFilename,
            UUID jobOfferId) {
        new Thread(() -> {
            try {
                // Récupérer les infos de l'offre
                String jobTitle = "";
                String jobDescription = "";
                try {
                    var jobOffer = jobOfferRepository.findById(jobOfferId);
                    if (jobOffer.isPresent()) {
                        jobTitle = jobOffer.get().getTitleFr();
                        jobDescription = jobOffer.get().getDescriptionFr() != null
                                ? jobOffer.get().getDescriptionFr()
                                : "";
                    }
                } catch (Exception e) {
                    log.warn("[CandidateExterneService] Impossible de récupérer l'offre {}: {}", jobOfferId,
                            e.getMessage());
                }

                // Appel unique à FastAPI — extraction + n8n scoring en une seule requête
                callExtractAndScore(candidate.getId(), fileBytes, originalFilename, jobTitle, jobDescription);

            } catch (Exception e) {
                log.error("[CandidateExterneService] Erreur scoring pour candidat {}: {}", candidate.getId(),
                        e.getMessage());
            }
        }).start();
    }

    /**
     * Envoie le fichier PDF à FastAPI /api/extract-and-score avec les infos de
     * l'offre.
     * FastAPI extrait le texte, appelle n8n/Groq, et retourne le score.
     * Spring Boot met ensuite à jour le candidat en base.
     */
    private void callExtractAndScore(UUID candidateId, byte[] fileBytes, String originalFilename, String jobTitle,
            String jobDescription) {
        try {
            WebClient client = webClientBuilder.baseUrl(pythonServiceUrl).build();

            MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
            bodyBuilder.part("file", new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return originalFilename != null ? originalFilename : "cv.pdf";
                }
            }).contentType(MediaType.APPLICATION_OCTET_STREAM);
            bodyBuilder.part("candidate_id", candidateId.toString());
            bodyBuilder.part("job_title", jobTitle);
            bodyBuilder.part("job_description", jobDescription);

            String jsonResponse = client.post()
                    .uri("/api/extract-and-score")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (jsonResponse == null) {
                log.warn("[CandidateExterneService] Réponse FastAPI vide pour candidat {}", candidateId);
                return;
            }

            // Parser la réponse et mettre à jour le candidat
            JsonNode result = objectMapper.readTree(jsonResponse);

            final Integer finalScore;
            if (result.has("score") && !result.get("score").isNull()) {
                int raw = result.get("score").asInt();
                finalScore = Math.max(0, Math.min(100, raw));
            } else {
                finalScore = null;
            }

            final String scoringDetails = result.has("scoringDetails")
                    ? result.get("scoringDetails").asText("{}")
                    : "{}";

            candidateExterneRepository.findById(candidateId).ifPresent(c -> {
                c.setScore(finalScore);
                c.setScoringDetails(scoringDetails);
                candidateExterneRepository.save(c);
                log.info("[CandidateExterneService] Score {} attribué au candidat {}", finalScore, candidateId);
            });

        } catch (Exception e) {
            log.error("[CandidateExterneService] Erreur callExtractAndScore pour {}: {}", candidateId, e.getMessage());
        }
    }

    public List<CandidateExterne> getByJobOffer(UUID jobOfferId) {
        return candidateExterneRepository.findByJobOfferIdOrderByScoreDesc(jobOfferId);
    }

    public CandidateExterne getById(UUID id) {
        return candidateExterneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidat externe non trouvé: " + id));
    }

    public CandidateExterne updateStatus(UUID id, String status) {
        CandidateExterne candidate = getById(id);
        candidate.setStatus(status);
        return candidateExterneRepository.save(candidate);
    }

    public void delete(UUID id) {
        CandidateExterne candidate = getById(id);

        // Supprimer le fichier CV du disque si présent
        if (candidate.getCvPath() != null) {
            try {
                Files.deleteIfExists(Paths.get(candidate.getCvPath()));
            } catch (IOException e) {
                log.warn("[CandidateExterneService] Impossible de supprimer le fichier CV : {}", e.getMessage());
            }
        }

        candidateExterneRepository.deleteById(id);
        log.info("[CandidateExterneService] Candidat {} supprimé", id);
    }

}