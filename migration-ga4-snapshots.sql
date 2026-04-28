-- Stockage des snapshots Google Analytics 4
-- Complète gsc_snapshots (qui parle de la SERP) avec les données comportementales (post-clic)

create table if not exists ga4_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  period_days int not null,
  totals jsonb not null,                 -- { activeUsers, sessions, screenPageViews, engagementRate, avgEngagementTime }
  pages jsonb not null,                  -- top pages [{ page, views, users, sessions, engagementRate, avgEngagementTime }]
  sources jsonb not null,                -- top sources [{ source, medium, sessions, users }]
  events jsonb not null,                 -- top events [{ name, count, users }]
  countries jsonb not null,              -- [{ country, users, sessions }]
  devices jsonb not null,                -- [{ category, users, sessions }]
  fetched_at timestamptz not null default now(),
  unique (period_start, period_end)
);

create index if not exists ga4_snapshots_fetched_idx on ga4_snapshots (fetched_at desc);
create index if not exists ga4_snapshots_period_idx on ga4_snapshots (period_end desc);
