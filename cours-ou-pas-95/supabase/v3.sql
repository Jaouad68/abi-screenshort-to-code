-- Cours ou Pas ? 95 : mise à jour V3 (veille presse automatique).
-- À exécuter une fois dans Supabase > SQL Editor, après v2.sql.

-- Articles de presse rattachés à un lycée.
create table if not exists public.news_mentions (
  id            text primary key,
  uai           text not null,
  title         text not null,
  url           text not null,
  source        text not null default '',
  published_at  timestamptz not null,
  hidden        boolean not null default false,
  detected_at   timestamptz not null default now()
);
create index if not exists news_mentions_published_idx on public.news_mentions (published_at desc);

-- Petites valeurs techniques (ex. date de la dernière veille).
create table if not exists public.app_meta (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.news_mentions enable row level security;
alter table public.app_meta      enable row level security;
