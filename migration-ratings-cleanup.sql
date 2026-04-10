-- =============================================================================
-- OuBosser — Migration : nettoyage colonnes ratings
-- L'app stockait par erreur "food" dans `noise` et "style" dans `comfort`
-- À exécuter manuellement sur le dashboard Supabase
-- =============================================================================

BEGIN;

-- 1. Ajouter les colonnes `food` et `style` si elles n'existent pas
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS food  SMALLINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS style SMALLINT;

-- 2. Migrer les données existantes : noise (qui contenait food) → food, comfort (qui contenait style) → style
-- On supprime d'abord les anciennes contraintes pour éviter les conflits
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_food_check;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_style_check;

UPDATE ratings SET food  = noise   WHERE food  IS NULL AND noise   IS NOT NULL;
UPDATE ratings SET style = comfort WHERE style IS NULL AND comfort IS NOT NULL;

-- 3. Nouvelles contraintes (1-3, cohérentes avec l'app)
ALTER TABLE ratings ADD CONSTRAINT ratings_food_check  CHECK (food  IS NULL OR food  BETWEEN 1 AND 3);
ALTER TABLE ratings ADD CONSTRAINT ratings_style_check CHECK (style IS NULL OR style BETWEEN 1 AND 3);

-- 4. Optionnel : effacer les colonnes legacy après migration
-- (à décommenter une fois qu'on est sûr que tout va bien)
-- ALTER TABLE ratings DROP COLUMN noise;
-- ALTER TABLE ratings DROP COLUMN comfort;

COMMIT;
