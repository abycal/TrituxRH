package com.tritux.rh.repository;

import com.tritux.rh.model.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobOfferRepository extends JpaRepository<JobOffer, UUID> {

    /** Offres publiées (active = true) — utilisé par le site web public */
    List<JobOffer> findByActiveTrue();
}