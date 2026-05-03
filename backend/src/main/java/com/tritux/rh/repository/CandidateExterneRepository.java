package com.tritux.rh.repository;

import com.tritux.rh.model.CandidateExterne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CandidateExterneRepository extends JpaRepository<CandidateExterne, UUID> {

    List<CandidateExterne> findByJobOfferIdOrderByScoreDesc(UUID jobOfferId);
}