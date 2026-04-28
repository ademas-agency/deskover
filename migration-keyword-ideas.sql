-- Cache pour les résultats Google Ads Keyword Planner
-- Évite de re-taper l'API à chaque recherche : TTL ~30j sur les volumes mensuels.

create table if not exists keyword_ideas (
  keyword text primary key,
  avg_monthly_searches int,
  competition text,            -- LOW / MEDIUM / HIGH / UNSPECIFIED
  competition_index int,       -- 0-100
  low_top_of_page_bid_micros bigint,
  high_top_of_page_bid_micros bigint,
  related_keywords jsonb,      -- [{ keyword, avg_monthly_searches, competition, competition_index }]
  fetched_at timestamptz not null default now()
);

create index if not exists keyword_ideas_fetched_at_idx on keyword_ideas (fetched_at desc);
create index if not exists keyword_ideas_volume_idx on keyword_ideas (avg_monthly_searches desc);

-- RLS : lecture publique (le BO est derrière auth Supabase de toute façon)
alter table keyword_ideas enable row level security;

drop policy if exists "keyword_ideas read all" on keyword_ideas;
create policy "keyword_ideas read all" on keyword_ideas
  for select using (true);

drop policy if exists "keyword_ideas write service" on keyword_ideas;
create policy "keyword_ideas write service" on keyword_ideas
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
