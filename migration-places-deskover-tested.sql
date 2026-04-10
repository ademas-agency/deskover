-- =============================================================================
-- OuBosser — Ajout de la date de test sur place par Deskover
-- Permet de marquer un lieu comme « Validé par Deskover » sur la fiche front
-- quand l'équipe est allée tester sur place.
-- =============================================================================

BEGIN;

ALTER TABLE places ADD COLUMN IF NOT EXISTS deskover_tested_at TIMESTAMPTZ;

COMMIT;
