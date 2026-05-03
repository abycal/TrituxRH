package com.tritux.rh.repository;

import com.tritux.rh.model.GoogleCalendarToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoogleCalendarTokenRepository extends JpaRepository<GoogleCalendarToken, Long> {
    Optional<GoogleCalendarToken> findByEmail(String email);
}