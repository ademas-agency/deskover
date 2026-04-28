# Edge function `seo-sync`

Sync automatique GSC + GA4 vers Supabase, déclenché par pg_cron une fois par semaine.

## Architecture

```
┌─────────────┐  cron lundi 9h   ┌──────────────────┐  OAuth refresh  ┌─────────────┐
│  pg_cron    │ ───────────────> │  edge function   │ ──────────────> │  Google API │
│  pg_net     │                  │  seo-sync (Deno) │                 │  GSC + GA4  │
└─────────────┘                  └──────────────────┘                 └─────────────┘
                                          │
                                          ▼
                              upsert dans gsc_snapshots,
                              gsc_query_daily, ga4_snapshots
```

## Setup initial (une seule fois)

### 1. Installer la CLI Supabase

```bash
brew install supabase/tap/supabase
supabase login
cd /Users/adelaideblot/Documents/oubosser
supabase link --project-ref kxfmpalgzbtiiboeceww
```

### 2. Configurer les secrets de la edge function

```bash
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="172748901046-l0m61ru9045o31k8tp0okvg78kailp83.apps.googleusercontent.com"
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="<copier depuis .secrets/oauth-client.json>"
supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN="<copier depuis .secrets/oauth-token.json>"
supabase secrets set GSC_SITE_URL="https://www.deskover.fr/"
supabase secrets set GA4_PROPERTY_ID="531430422"
supabase secrets set SEO_SYNC_SECRET="$(openssl rand -hex 32)"  # ← génère un secret aléatoire pour sécuriser l'endpoint
```

Note les valeurs de `SEO_SYNC_SECRET` qui s'affichent — tu en auras besoin pour le cron.

### 3. Déployer la fonction

```bash
supabase functions deploy seo-sync
```

URL résultante : `https://kxfmpalgzbtiiboeceww.supabase.co/functions/v1/seo-sync`

### 4. Tester manuellement

```bash
curl -X POST "https://kxfmpalgzbtiiboeceww.supabase.co/functions/v1/seo-sync" \
  -H "Authorization: Bearer <SEO_SYNC_SECRET>"
```

Si ça retourne `{"ok":true,...}`, c'est gagné.

### 5. Configurer le cron Supabase

Dans Supabase SQL Editor :

```sql
-- Activer les extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Stocker les secrets dans Vault (1 fois)
select vault.create_secret(
  'https://kxfmpalgzbtiiboeceww.supabase.co/functions/v1/seo-sync',
  'seo_sync_url'
);
select vault.create_secret(
  '<TON_SEO_SYNC_SECRET>',
  'seo_sync_secret'
);

-- Créer le cron : lundi 9h UTC
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
```

## Vérification

```sql
-- Voir les jobs cron actifs
select * from cron.job;

-- Historique des runs
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 10;
```

## Désactivation

```sql
select cron.unschedule('seo-sync-weekly');
```

## Maintenance

- **Si le refresh_token expire** (rare, mais si tu changes le compte Google d'auth) : relancer `node --env-file=.env scripts/seo/gsc-sync.js --all` localement pour régénérer un token, puis copier le nouveau `refresh_token` dans `supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN=...`.
- **Logs** : `supabase functions logs seo-sync` ou via le dashboard Supabase.
