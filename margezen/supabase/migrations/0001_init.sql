-- MargeZen — schéma initial et politiques de sécurité au niveau ligne (RLS).
--
-- Ce fichier est destiné à être appliqué sur un projet Supabase réel.
-- Le schéma `auth` (dont `auth.users` et la fonction `auth.uid()`) est déjà
-- fourni par Supabase : il n'est jamais créé ici.
--
-- Toutes les sommes d'argent sont stockées en centimes d'euro (entier),
-- jamais en flottant.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================================
-- Tables
-- ============================================================================

create table etablissement (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type_cuisine text not null,
  couverts_jour integer,
  ticket_moyen_cts integer,
  marge_cible_solides_pct numeric(5, 2) not null default 72,
  marge_cible_liquides_pct numeric(5, 2) not null default 87,
  cree_le timestamptz not null default now()
);

create table utilisateur_etablissement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  etablissement_id uuid not null references etablissement (id) on delete cascade,
  role text not null check (role in ('proprietaire', 'gerant', 'staff')),
  cree_le timestamptz not null default now(),
  unique (user_id, etablissement_id)
);

create table fournisseur (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissement (id) on delete cascade,
  nom text not null,
  siret text,
  cree_le timestamptz not null default now()
);

create table ingredient (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissement (id) on delete cascade,
  nom_normalise text not null,
  unite_ref text not null check (unite_ref in ('kg', 'L', 'piece')),
  prix_unitaire_cts integer not null check (prix_unitaire_cts >= 0),
  prix_precedent_cts integer check (prix_precedent_cts >= 0),
  maj_le timestamptz not null default now(),
  source text not null check (source in ('facture', 'manuel')),
  unique (etablissement_id, nom_normalise)
);

create table alias_ingredient (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredient (id) on delete cascade,
  libelle_fournisseur text not null,
  fournisseur_id uuid not null references fournisseur (id) on delete cascade,
  cree_le timestamptz not null default now(),
  unique (fournisseur_id, libelle_fournisseur)
);

create table facture (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissement (id) on delete cascade,
  fournisseur_id uuid references fournisseur (id) on delete set null,
  date_facture date,
  image_path text,
  total_ht_cts integer check (total_ht_cts >= 0),
  statut text not null default 'a_valider' check (statut in ('a_valider', 'validee', 'rejetee')),
  cree_le timestamptz not null default now()
);

create table ligne_facture (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references facture (id) on delete cascade,
  ingredient_id uuid references ingredient (id) on delete set null,
  libelle_brut text not null,
  quantite numeric(12, 4),
  unite text check (unite in ('kg', 'L', 'piece', 'carton')),
  prix_unitaire_cts integer check (prix_unitaire_cts >= 0),
  total_ht_cts integer check (total_ht_cts >= 0),
  confiance_ocr numeric(3, 2) check (confiance_ocr >= 0 and confiance_ocr <= 1),
  statut_rapprochement text not null default 'en_attente'
    check (statut_rapprochement in ('en_attente', 'rapproche', 'nouvel_ingredient', 'ignore'))
);

create table plat (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissement (id) on delete cascade,
  nom text not null,
  categorie text not null check (categorie in ('entree', 'plat', 'dessert', 'boisson')),
  prix_vente_ttc_cts integer check (prix_vente_ttc_cts >= 0),
  taux_tva numeric(4, 2) not null default 10,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create table fiche_technique (
  id uuid primary key default gen_random_uuid(),
  plat_id uuid not null references plat (id) on delete cascade,
  ingredient_id uuid not null references ingredient (id) on delete restrict,
  quantite numeric(12, 4) not null check (quantite >= 0),
  unite text not null check (unite in ('kg', 'L', 'piece')),
  unique (plat_id, ingredient_id)
);

create table snapshot_marge (
  id uuid primary key default gen_random_uuid(),
  plat_id uuid not null references plat (id) on delete cascade,
  date_calcul timestamptz not null default now(),
  cout_mp_cts integer check (cout_mp_cts >= 0),
  marge_brute_pct numeric(6, 2),
  coefficient_multiplicateur numeric(6, 2),
  declencheur text not null check (declencheur in ('facture', 'manuel', 'planifie'))
);

-- ============================================================================
-- Index
-- ============================================================================

create index idx_ingredient_etablissement on ingredient (etablissement_id);
create index idx_ingredient_nom_trgm on ingredient using gin (nom_normalise gin_trgm_ops);
create index idx_alias_libelle_trgm on alias_ingredient using gin (libelle_fournisseur gin_trgm_ops);
create index idx_facture_etablissement on facture (etablissement_id);
create index idx_ligne_facture_facture on ligne_facture (facture_id);
create index idx_plat_etablissement on plat (etablissement_id);
create index idx_fiche_technique_plat on fiche_technique (plat_id);
create index idx_snapshot_marge_plat on snapshot_marge (plat_id, date_calcul);
create index idx_utilisateur_etablissement_user on utilisateur_etablissement (user_id);

-- ============================================================================
-- Sécurité au niveau ligne (RLS) — isolation stricte multi-tenant
-- ============================================================================
--
-- Un établissement ne voit jamais les données d'un autre. La fonction
-- ci-dessous renvoie les établissements auxquels l'utilisateur courant a
-- accès ; toutes les policies s'appuient dessus, directement ou via une
-- jointure pour les tables qui n'ont pas de colonne etablissement_id propre.

create or replace function mes_etablissements()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select etablissement_id
  from utilisateur_etablissement
  where user_id = auth.uid()
$$;

alter table etablissement enable row level security;
alter table utilisateur_etablissement enable row level security;
alter table fournisseur enable row level security;
alter table ingredient enable row level security;
alter table alias_ingredient enable row level security;
alter table facture enable row level security;
alter table ligne_facture enable row level security;
alter table plat enable row level security;
alter table fiche_technique enable row level security;
alter table snapshot_marge enable row level security;

create policy "isolation etablissement" on etablissement
  for all
  using (id in (select mes_etablissements()))
  with check (id in (select mes_etablissements()));

create policy "isolation utilisateur_etablissement" on utilisateur_etablissement
  for all
  using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy "isolation fournisseur" on fournisseur
  for all
  using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy "isolation ingredient" on ingredient
  for all
  using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy "isolation alias_ingredient" on alias_ingredient
  for all
  using (
    ingredient_id in (
      select id from ingredient where etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    ingredient_id in (
      select id from ingredient where etablissement_id in (select mes_etablissements())
    )
  );

create policy "isolation facture" on facture
  for all
  using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy "isolation ligne_facture" on ligne_facture
  for all
  using (
    facture_id in (
      select id from facture where etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    facture_id in (
      select id from facture where etablissement_id in (select mes_etablissements())
    )
  );

create policy "isolation plat" on plat
  for all
  using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy "isolation fiche_technique" on fiche_technique
  for all
  using (
    plat_id in (
      select id from plat where etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    plat_id in (
      select id from plat where etablissement_id in (select mes_etablissements())
    )
  );

create policy "isolation snapshot_marge" on snapshot_marge
  for all
  using (
    plat_id in (
      select id from plat where etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    plat_id in (
      select id from plat where etablissement_id in (select mes_etablissements())
    )
  );
