-- Cours ou Pas ? 95 : schéma Supabase
-- À exécuter une fois dans Supabase > SQL Editor.

-- Signalements participatifs (un par appareil, par lycée et par jour).
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  uai         text not null check (char_length(uai) = 8),
  day         date not null,
  status      text not null check (status in ('normal', 'perturbe', 'bloque')),
  device_id   text not null,
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (uai, day, device_id)
);
create index if not exists reports_day_idx on public.reports (day);
create index if not exists reports_ip_idx on public.reports (ip_hash, created_at);
create index if not exists reports_created_idx on public.reports (created_at desc);

-- Décisions de modération (« Vérifié »), prioritaires sur les signalements.
create table if not exists public.overrides (
  uai         text not null,
  day         date not null,
  status      text not null check (status in ('normal', 'perturbe', 'bloque')),
  note        text check (char_length(note) <= 280),
  updated_at  timestamptz not null default now(),
  primary key (uai, day)
);

-- Événements « quelque chose a changé », diffusés en temps réel aux navigateurs.
-- Ne contient aucune donnée sensible.
create table if not exists public.updates (
  id          bigint generated always as identity primary key,
  uai         text not null,
  day         date not null,
  created_at  timestamptz not null default now()
);

-- Sécurité : seules les routes serveur (clé service_role) lisent et écrivent
-- reports et overrides. Le public peut uniquement écouter la table updates.
alter table public.reports   enable row level security;
alter table public.overrides enable row level security;
alter table public.updates   enable row level security;

drop policy if exists "updates lisibles par tous" on public.updates;
create policy "updates lisibles par tous" on public.updates for select using (true);

-- Active le temps réel sur la table updates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'updates'
  ) then
    alter publication supabase_realtime add table public.updates;
  end if;
end $$;

-- Optionnel : purge des vieux événements (à planifier avec pg_cron si besoin).
-- delete from public.updates where created_at < now() - interval '2 days';
