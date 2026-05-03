package com.tritux.rh.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tritux.rh.model.Candidate;
import com.tritux.rh.repository.CandidateRepository;
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
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    public Candidate uploadAndExtract(MultipartFile file) throws IOException {
        // 1. Sauvegarder le fichier localement
        String uploadDir = "uploads/";
        Files.createDirectories(Paths.get(uploadDir));
        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, filename);
        Files.write(filePath, file.getBytes());

        // 2. Appeler le service Python pour extraction
        WebClient client = webClientBuilder.baseUrl(pythonServiceUrl).build();

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("file", new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        }).contentType(MediaType.APPLICATION_OCTET_STREAM);

        String jsonResponse = client.post()
                .uri("/api/extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .retrieve()
                .bodyToMono(String.class)
                .block();

        // 3. Parser le JSON retourné par Python/Gemini
        JsonNode profileData = objectMapper.readTree(jsonResponse);
        String nomCandidat = profileData.path("nom_candidat").asText("Inconnu");

        // 4. Sauvegarder en base
        Candidate candidate = Candidate.builder()
                .nom(nomCandidat)
                .email(extractEmail(profileData))
                .cvOriginalPath(filePath.toString())
                .profileData(profileData)
                .build();

        return candidateRepository.save(candidate);
    }

    public List<Candidate> getAllCandidates() {
        return candidateRepository.findAll();
    }

    public Candidate getById(UUID id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé: " + id));
    }

    public Candidate updateProfileData(UUID id, JsonNode updatedData) {
        Candidate candidate = getById(id);
        candidate.setProfileData(updatedData);
        String nom = updatedData.path("nom_candidat").asText(candidate.getNom());
        candidate.setNom(nom);
        return candidateRepository.save(candidate);
    }

    public void deleteCandidate(UUID id) {
        candidateRepository.deleteById(id);
    }

    private String extractEmail(JsonNode profileData) {
        JsonNode email = profileData.path("email");
        return email.isMissingNode() ? null : email.asText();
    }
}
