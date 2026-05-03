package com.tritux.rh.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidates_externes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateExterne {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    private String phone;

    private String country;

    /** Chemin local du PDF sauvegardé dans uploads/externes/ */
    @Column(name = "cv_path")
    private String cvPath;

    /** Lien vers l'offre d'emploi */
    @Column(name = "job_offer_id", nullable = false)
    private UUID jobOfferId;

    /** Score 0-100 calculé par Groq via n8n, null si non encore scoré */
    private Integer score;

    /** JSON retourné par n8n avec le détail du scoring */
    @Column(name = "scoring_details", columnDefinition = "TEXT")
    private String scoringDetails;

    /**
     * Statut du candidat : NEW, REVIEWED, SHORTLISTED, REJECTED
     */
    @Builder.Default
    @Column(nullable = false)
    private String status = "NEW";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}