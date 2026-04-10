-- =============================================================================
-- OuBosser — Migration : stockage des résultats de speed test WiFi
-- À exécuter manuellement sur le dashboard Supabase
-- =============================================================================

BEGIN;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS wifi_download NUMERIC(6,2);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS wifi_upload   NUMERIC(6,2);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS wifi_ping     INTEGER;

-- Rendre les colonnes de note qualitative nullable (l'app permet maintenant
-- de soumettre uniquement certaines dimensions, ou juste un speed test)
ALTER TABLE ratings ALTER COLUMN wifi    DROP NOT NULL;
ALTER TABLE ratings ALTER COLUMN power   DROP NOT NULL;
ALTER TABLE ratings ALTER COLUMN noise   DROP NOT NULL;
ALTER TABLE ratings ALTER COLUMN comfort DROP NOT NULL;

-- Index pour récupérer rapidement la dernière mesure d'un lieu
CREATE INDEX IF NOT EXISTS idx_ratings_speedtest_recent
  ON ratings (place_id, created_at DESC)
  WHERE wifi_download IS NOT NULL;

COMMIT;
