package com.tritux.rh.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.tritux.rh.model.Candidate;
import com.tritux.rh.service.CandidateService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.UUID;

@RestController
@RequestMapping("/api/transform")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class TransformController {

    private final CandidateService candidateService;
    private final WebClient.Builder webClientBuilder;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    @PostMapping("/{candidateId}")
    public ResponseEntity<byte[]> transformCV(
            @PathVariable UUID candidateId,
            @RequestParam(defaultValue = "false") boolean anonymous) {

        Candidate candidate = candidateService.getById(candidateId);
        JsonNode profileData = candidate.getProfileData();

        WebClient client = webClientBuilder
        .baseUrl(pythonServiceUrl)
        .codecs(configurer -> 
            configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024) // 10 MB
        )
        .build();

        byte[] docxBytes = client.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/transform")
                        .queryParam("anonymous", anonymous)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(profileData.toString())
                .retrieve()
                .bodyToMono(byte[].class)
                .block();

        String filename = "CV_" + candidate.getNom().replace(" ", "_") + ".docx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(docxBytes);
    }
}
