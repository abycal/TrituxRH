package com.tritux.rh.controller;

import com.tritux.rh.model.JobOffer;
import com.tritux.rh.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Endpoints JobOffer
 *
 * PUBLIC :
 * GET /api/job-offers → liste des offres actives
 * GET /api/job-offers/{id} → détail d'une offre
 *
 * PROTÉGÉ RH :
 * GET /api/job-offers/all → toutes les offres
 * POST /api/job-offers → créer
 * PUT /api/job-offers/{id} → modifier
 * PATCH /api/job-offers/{id}/toggle → archiver / republier
 * DELETE /api/job-offers/{id} → supprimer définitivement
 */
@RestController
@RequestMapping("/api/job-offers")
@RequiredArgsConstructor
public class JobOfferController {

    private final JobOfferRepository jobOfferRepository;

    // ── Publics ────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<JobOffer>> getActiveOffers() {
        return ResponseEntity.ok(jobOfferRepository.findByActiveTrue());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobOffer> getOffer(@PathVariable UUID id) {
        return jobOfferRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Protégés RH ────────────────────────────────────────────────────────────

    /** Toutes les offres (actives + archivées) — vue interne Studio RH */
    @GetMapping("/all")
    public ResponseEntity<List<JobOffer>> getAllOffers() {
        return ResponseEntity.ok(jobOfferRepository.findAll());
    }

    /** Créer une nouvelle offre */
    @PostMapping
    public ResponseEntity<JobOffer> createOffer(@RequestBody JobOffer jobOffer) {
        return ResponseEntity.status(201).body(jobOfferRepository.save(jobOffer));
    }

    /** Modifier une offre existante */
    @PutMapping("/{id}")
    public ResponseEntity<JobOffer> updateOffer(
            @PathVariable UUID id,
            @RequestBody JobOffer updatedOffer) {
        return jobOfferRepository.findById(id)
                .map(existing -> {
                    updatedOffer.setId(existing.getId());
                    updatedOffer.setCreatedAt(existing.getCreatedAt());
                    // Préserver le statut actif si non fourni
                    if (updatedOffer.getActive() == null) {
                        updatedOffer.setActive(existing.getActive());
                    }
                    return ResponseEntity.ok(jobOfferRepository.save(updatedOffer));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Basculer active/archivée sans supprimer */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<JobOffer> toggleOffer(@PathVariable UUID id) {
        return jobOfferRepository.findById(id)
                .map(offer -> {
                    offer.setActive(!offer.getActive());
                    return ResponseEntity.ok(jobOfferRepository.save(offer));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Suppression physique définitive */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOffer(@PathVariable UUID id) {
        if (!jobOfferRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        jobOfferRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}