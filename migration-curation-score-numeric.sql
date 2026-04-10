-- =============================================================================
-- OuBosser — Passage de places.curation_score à NUMERIC pour pas de 0,1
-- =============================================================================

BEGIN;

ALTER TABLE places
  ALTER COLUMN curation_score TYPE NUMERIC(4,1)
  USING curation_score::NUMERIC(4,1);

ALTER TABLE places ALTER COLUMN curation_score SET DEFAULT 0;

COMMENT ON COLUMN places.curation_score IS 'Poids manuel de classement (pas de 0,1) : positif = boost, négatif = rétrograde, 0 = neutre';

COMMIT;
