-- Configuration du cron Supabase pour déclencher l'edge function seo-sync
-- chaque lundi à 9h UTC (soit 10h ou 11h Paris selon DST)

-- Étape 1 : activer pg_cron + pg_net si pas déjà fait
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Étape 2 : stocker les secrets dans Supabase Vault (recommandé)
-- ou alternativement dans une table protégée. Ici on utilise Vault.
-- Tu dois lancer ces 2 inserts manuellement avec tes vraies valeurs :
--
-- select vault.create_secret('https://kxfmpalgzbtiiboeceww.supabase.co/functions/v1/seo-sync', 'seo_sync_url');
-- select vault.create_secret('<TON_SEO_SYNC_SECRET>', 'seo_sync_secret');
--
-- Récupère-les ensuite dans le job.

-- Étape 3 : créer le cron job
-- Schedule "0 9 * * 1" = lundi 9h UTC
select cron.schedule(
  'seo-sync-weekly',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'seo_sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'seo_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Pour vérifier les jobs : select * from cron.job;
-- Pour voir l'historique : select * from cron.job_run_details order by start_time desc limit 10;
-- Pour supprimer : select cron.unschedule('seo-sync-weekly');
