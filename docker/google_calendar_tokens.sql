-- ============================================================
-- Migration : Table de stockage des tokens Google Calendar
-- ============================================================

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at   TIMESTAMP WITH TIME ZONE
);

-- Index pour les recherches par email
CREATE INDEX IF NOT EXISTS idx_gct_email ON google_calendar_tokens(email);