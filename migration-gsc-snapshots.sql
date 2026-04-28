-- Stockage des snapshots Google Search Console
-- Permet de comparer l'évolution dans le temps et alimenter le dashboard SEO du BO

create table if not exists gsc_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  period_days int not null,
  totals jsonb not null,                 -- { clicks, impressions, ctr, position }
  queries jsonb not null,                -- top N requêtes [{ query, clicks, impressions, ctr, position }]
  pages jsonb not null,                  -- top N pages
  pairs jsonb not null,                  -- query × page (pour insights)
  insights jsonb,                        -- résultat de generateInsights()
  fetched_at timestamptz not null default now(),
  unique (period_start, period_end)
);

create index if not exists gsc_snapshots_fetched_idx on gsc_snapshots (fetched_at desc);
create index if not exists gsc_snapshots_period_idx on gsc_snapshots (period_end desc);
