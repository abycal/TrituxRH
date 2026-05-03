package com.tritux.rh.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "job_offers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Titre bilingue */
    @Column(nullable = false)
    private String titleFr;

    @Column(nullable = false)
    private String titleEn;

    /** Description courte bilingue (affichée sur la liste) */
    @Column(columnDefinition = "TEXT")
    private String descriptionFr;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    /** Description longue bilingue (page détail) */
    @Column(columnDefinition = "TEXT")
    private String fullDescriptionFr;

    @Column(columnDefinition = "TEXT")
    private String fullDescriptionEn;

    /** Localisation affichée, ex: "🇹🇳 Tunis, Tunisia" */
    @Column(nullable = false)
    private String location;

    /** CDI, CDD, Stage… */
    private String typeFr;
    private String typeEn;

    /** Ex: "3–5 ans" */
    private String experienceFr;
    private String experienceEn;

    /** Département / équipe */
    private String departmentFr;
    private String departmentEn;

    /**
     * Tags techniques séparés par des virgules, ex: "Vue.js,Node.js,AWS"
     * (choix simple pour éviter une table de jointure superflue)
     */
    @Column(length = 512)
    private String tags;

    /**
     * true → visible sur le site public
     * false → brouillon / archivée
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ── helpers ────────────────────────────────────────────────────────────────

    /** Retourne les tags sous forme de liste (split sur la virgule). */
    @Transient
    @JsonIgnore
    public List<String> getTagList() {
        if (tags == null || tags.isBlank())
            return List.of();
        return List.of(tags.split(","));
    }
}