-- =============================================================================
-- OuBosser — Migration : table dédiée speed_tests
-- Les speed tests deviennent indépendants des ratings et des utilisateurs.
-- Plusieurs mesures par lieu (et par user) sont autorisées.
-- À exécuter manuellement sur le dashboard Supabase.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS speed_tests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  fingerprint TEXT,
  download    NUMERIC(6,2) NOT NULL,
  upload      NUMERIC(6,2) NOT NULL,
  ping        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speed_tests_place_recent
  ON speed_tests (place_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_speed_tests_fingerprint
  ON speed_tests (fingerprint);

-- RLS : tout le monde peut lire et insérer (pas de fingerprint, pas d'auth)
ALTER TABLE speed_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS speed_tests_select_all ON speed_tests;
CREATE POLICY speed_tests_select_all ON speed_tests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS speed_tests_insert_anon ON speed_tests;
CREATE POLICY speed_tests_insert_anon ON speed_tests
  FOR INSERT WITH CHECK (true);

-- Suppression des colonnes legacy dans ratings (plus rattachées aux avis)
DROP INDEX IF EXISTS idx_ratings_speedtest_recent;
ALTER TABLE ratings DROP COLUMN IF EXISTS wifi_download;
ALTER TABLE ratings DROP COLUMN IF EXISTS wifi_upload;
ALTER TABLE ratings DROP COLUMN IF EXISTS wifi_ping;

COMMIT;
