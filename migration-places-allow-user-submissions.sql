-- =============================================================================
-- OuBosser — Migration : autoriser les users anonymes à ajouter des lieux
-- Les lieux ajoutés via /ajouter sont insérés avec status='pending' et source='user'
-- Ils sont visibles dans le BO mais pas sur le site public (qui filtre status='approved')
-- À exécuter manuellement sur le dashboard Supabase.
-- =============================================================================

BEGIN;

-- S'assurer que la colonne source existe
ALTER TABLE places ADD COLUMN IF NOT EXISTS source TEXT;

-- RLS : autoriser l'insert anonyme uniquement si status='pending' et source='user'
DROP POLICY IF EXISTS places_insert_user_submission ON places;
CREATE POLICY places_insert_user_submission ON places
  FOR INSERT
  WITH CHECK (status = 'pending' AND source = 'user');

COMMIT;
