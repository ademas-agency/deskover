-- Historique journalier par requête pour pouvoir tracer une courbe de progression
-- Permet la recherche libre "tape un mot-clé, vois sa progression"

create table if not exists gsc_query_daily (
  date date not null,
  query text not null,
  clicks int not null default 0,
  impressions int not null default 0,
  position numeric(6, 2),
  ctr numeric(6, 4),
  fetched_at timestamptz not null default now(),
  primary key (date, query)
);

create index if not exists gsc_query_daily_query_idx on gsc_query_daily (query);
create index if not exists gsc_query_daily_date_idx on gsc_query_daily (date desc);
