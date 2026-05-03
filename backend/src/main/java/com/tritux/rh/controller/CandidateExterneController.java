package com.tritux.rh.controller;

import com.tritux.rh.model.CandidateExterne;
import com.tritux.rh.service.CandidateExterneService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidats-externes")
@RequiredArgsConstructor
public class CandidateExterneController {

    private final CandidateExterneService candidateExterneService;

    /**
     * POST /api/candidats-externes/apply
     * Reçoit la candidature depuis le site web public (multipart/form-data).
     */
    @PostMapping("/apply")
    public ResponseEntity<Map<String, Object>> apply(
            @RequestParam("file") MultipartFile file,
            @RequestParam("fullName") String fullName,
            @RequestParam("email") String email,
            @RequestParam("phone") String phone,
            @RequestParam("country") String country,
            @RequestParam("jobOfferId") UUID jobOfferId) throws IOException {

        CandidateExterne candidate = candidateExterneService.applyFromWebsite(
                file, fullName, email, phone, country, jobOfferId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "id", candidate.getId().toString()
        ));
    }

    /**
     * GET /api/candidats-externes/offre/{jobOfferId}
     * Liste des candidats d'une offre, triés par score décroissant.
     */
    @GetMapping("/offre/{jobOfferId}")
    public ResponseEntity<List<CandidateExterne>> getByJobOffer(@PathVariable UUID jobOfferId) {
        return ResponseEntity.ok(candidateExterneService.getByJobOffer(jobOfferId));
    }

    /**
     * GET /api/candidats-externes/{id}/cv
     * Prévisualisation du PDF original du candidat.
     */
    @GetMapping("/{id}/cv")
    public ResponseEntity<Resource> getCv(@PathVariable UUID id) {
        CandidateExterne candidate = candidateExterneService.getById(id);
        String path = candidate.getCvPath();
        if (path == null) return ResponseEntity.notFound().build();
        File file = new File(path);
        if (!file.exists()) return ResponseEntity.notFound().build();
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"cv.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    /**
     * PATCH /api/candidats-externes/{id}/status
     * Mise à jour du statut : { "status": "SHORTLISTED" }
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<CandidateExterne> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(candidateExterneService.updateStatus(id, status));
    }

    /**
     * DELETE /api/candidats-externes/{id}
     * Supprime un candidat et son fichier CV du disque.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        candidateExterneService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── TODO : workflow n8n #3 ────────────────────────────────────────────────
    // POST /api/candidats-externes/{id}/approve
    // À activer quand le workflow d'envoi d'email personnalisé sera prêt.
    //
    // @PostMapping("/{id}/approve")
    // public ResponseEntity<Void> approve(@PathVariable UUID id) {
    //     candidateExterneService.approve(id);
    //     return ResponseEntity.ok().build();
    // }
}