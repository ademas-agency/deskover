-- =============================================================================
-- OuBosser — Migration : ajouter source sur ratings
-- Permet de distinguer les notes données au moment de la création d'un lieu
-- (source='creation') des vrais avis postés sur une fiche existante.
-- Les notes 'creation' sont filtrées de la vue Avis du BO.
-- À exécuter manuellement sur le dashboard Supabase.
-- =============================================================================

BEGIN;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS source TEXT;

COMMIT;
