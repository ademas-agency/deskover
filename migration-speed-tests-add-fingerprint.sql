-- =============================================================================
-- OuBosser — Ajout colonne fingerprint à speed_tests
-- Permet au BO de regrouper les speed tests par utilisateur (sans contrainte
-- d'unicité : un même fingerprint peut avoir plusieurs mesures sur un lieu).
-- =============================================================================

BEGIN;

ALTER TABLE speed_tests ADD COLUMN IF NOT EXISTS fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_speed_tests_fingerprint
  ON speed_tests (fingerprint);

COMMIT;
