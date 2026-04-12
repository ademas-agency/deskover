-- =============================================================================
-- OuBosser — Migration : ajouter submitter_email pour notifier les users
-- quand leur lieu ajouté est validé
-- À exécuter manuellement sur le dashboard Supabase.
-- =============================================================================

BEGIN;

ALTER TABLE places ADD COLUMN IF NOT EXISTS submitter_email TEXT;

-- Autoriser l'update anonyme uniquement sur les lieux pending en user submission,
-- et uniquement pour remplir l'email s'il n'est pas encore défini
DROP POLICY IF EXISTS places_update_submitter_email ON places;
CREATE POLICY places_update_submitter_email ON places
  FOR UPDATE
  USING (status = 'pending' AND source = 'user' AND submitter_email IS NULL)
  WITH CHECK (status = 'pending' AND source = 'user');

COMMIT;
