-- =============================================================================
-- OuBosser — Migration : remplacer food/style par pricing/mood dans ratings
-- - food (Boissons/Snacks/Repas) → pricing (Gratuit/Payant)
-- - style (Cozy/Design/Canon) → mood (Calme/Animé)
-- À exécuter manuellement sur le dashboard Supabase
-- =============================================================================

BEGIN;

-- 1. Nouvelles colonnes (binaire 1-2)
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS pricing SMALLINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS mood    SMALLINT;

-- 2. Contraintes (1 = première option, 2 = seconde option)
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_pricing_check;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_mood_check;
ALTER TABLE ratings ADD CONSTRAINT ratings_pricing_check CHECK (pricing IS NULL OR pricing BETWEEN 1 AND 2);
ALTER TABLE ratings ADD CONSTRAINT ratings_mood_check    CHECK (mood    IS NULL OR mood    BETWEEN 1 AND 2);

-- Note : on ne migre PAS les anciennes données food/style vers pricing/mood
-- car la sémantique est totalement différente (Boissons/Snacks/Repas n'a rien
-- à voir avec Gratuit/Payant). Les colonnes food et style restent en place
-- comme legacy mais ne seront plus écrites.

COMMIT;
