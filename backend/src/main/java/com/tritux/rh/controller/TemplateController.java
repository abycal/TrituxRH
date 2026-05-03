package com.tritux.rh.controller;

import com.tritux.rh.model.Template;
import com.tritux.rh.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class TemplateController {

    private final TemplateRepository templateRepository;

    @GetMapping
    public ResponseEntity<List<Template>> getAllTemplates() {
        return ResponseEntity.ok(templateRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Template> getTemplate(@PathVariable UUID id) {
        return templateRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadTemplate(@PathVariable UUID id) {
        return templateRepository.findById(id).map(t -> {
            File file = new File(t.getFilePath());
            if (!file.exists())
                return ResponseEntity.<Resource>notFound().build();
            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .<Resource>body(resource);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewTemplate(@PathVariable UUID id) {
        return templateRepository.findById(id).map(t -> {
            String pdfPath = t.getFilePath().replace(".docx", ".pdf");
            File file = new File(pdfPath);
            if (!file.exists())
                return ResponseEntity.<Resource>notFound().build();
            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"template.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .<Resource>body(resource);
        }).orElse(ResponseEntity.notFound().build());
    }
}
