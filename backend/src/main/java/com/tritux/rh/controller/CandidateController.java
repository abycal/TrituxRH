package com.tritux.rh.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.tritux.rh.model.Candidate;
import com.tritux.rh.service.CandidateService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class CandidateController {

    private final CandidateService candidateService;

    @PostMapping("/upload")
    public ResponseEntity<Candidate> uploadCV(@RequestParam("file") MultipartFile file) throws IOException {
        Candidate candidate = candidateService.uploadAndExtract(file);
        return ResponseEntity.ok(candidate);
    }

    @GetMapping
    public ResponseEntity<List<Candidate>> getAllCandidates() {
        return ResponseEntity.ok(candidateService.getAllCandidates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Candidate> getCandidate(@PathVariable UUID id) {
        return ResponseEntity.ok(candidateService.getById(id));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<Candidate> updateProfile(
            @PathVariable UUID id,
            @RequestBody JsonNode updatedData) {
        return ResponseEntity.ok(candidateService.updateProfileData(id, updatedData));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCandidate(@PathVariable UUID id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/cv-preview")
    public ResponseEntity<Resource> previewCV(@PathVariable UUID id) {
        Candidate candidate = candidateService.getById(id);
        String path = candidate.getCvOriginalPath();
        if (path == null) return ResponseEntity.notFound().build();
        File file = new File(path);
        if (!file.exists()) return ResponseEntity.notFound().build();
        Resource resource = new FileSystemResource(file);
        String contentType = path.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"cv.pdf\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(resource);
    }
}
