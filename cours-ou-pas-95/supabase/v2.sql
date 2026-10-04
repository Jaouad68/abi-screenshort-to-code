-- Cours ou Pas ? 95 : mise à jour V2 (référents vérifiés + notifications push).
-- À exécuter une fois dans Supabase > SQL Editor, après schema.sql.

-- Référents vérifiés : seule l'empreinte du code d'accès est stockée.
create table if not exists public.referents (
  id          uuid primary key default gen_random_uuid(),
  uai         text not null check (char_length(uai) = 8),
  label       text not null check (char_length(label) between 2 and 60),
  code_hash   text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

-- Un signalement peut provenir d'un référent.
alter table public.reports add column if not exists referent_id uuid references public.referents (id) on delete set null;

-- Appareils abonnés aux notifications, avec les lycées qu'ils suivent.
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  uais        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_uais_idx on public.push_subscriptions using gin (uais);

-- Dernier statut notifié par lycée et par jour (évite les doublons).
create table if not exists public.notified (
  uai         text not null,
  day         date not null,
  status      text not null check (status in ('normal', 'perturbe', 'bloque')),
  updated_at  timestamptz not null default now(),
  primary key (uai, day)
);

-- Accès réservé au serveur (clé secrète).
alter table public.referents          enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notified           enable row level security;
