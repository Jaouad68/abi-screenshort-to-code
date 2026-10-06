-- Dar Tanja : schéma de la base Supabase.
-- À exécuter une fois dans l'éditeur SQL de Supabase (SQL Editor > New query).

create extension if not exists pgcrypto;

-- Promoteurs ---------------------------------------------------------------
create table if not exists promoteurs (
  id text primary key default gen_random_uuid()::text,
  nom text not null,
  annee_creation int,
  projets_livres int not null default 0,
  tf_remis_a_temps numeric check (tf_remis_a_temps between 0 and 100),
  whatsapp text,
  site_web text,
  score_fiabilite numeric check (score_fiabilite between 0 and 10),
  note_admin text,
  cree_le timestamptz not null default now()
);

-- Programmes ---------------------------------------------------------------
create table if not exists programmes (
  id text primary key default gen_random_uuid()::text,
  promoteur_id text not null references promoteurs(id),
  nom text not null,
  quartier text not null,
  adresse text not null default '',
  lat double precision not null,
  lng double precision not null,
  livraison_prevue date,
  livre boolean not null default false,
  avancement_chantier int not null default 0 check (avancement_chantier between 0 and 100),
  statut_tf text not null default 'non_communique'
    check (statut_tf in ('tf_individuel', 'tf_mere', 'en_cours', 'non_communique')),
  numero_tf text,
  conservation_fonciere text,
  confiance_tf text not null default 'inconnu' check (confiance_tf in ('verifie', 'declaratif', 'inconnu')),
  date_verification_tf date,
  source_tf text,
  eligible_dispositif boolean not null default false,
  confiance_aide text not null default 'inconnu' check (confiance_aide in ('verifie', 'declaratif', 'inconnu')),
  autorisation_construire text not null default 'inconnu' check (autorisation_construire in ('verifie', 'declaratif', 'inconnu')),
  garantie_achevement text not null default 'inconnu' check (garantie_achevement in ('verifie', 'declaratif', 'inconnu')),
  photos text[] not null default '{}',
  description text not null default '',
  publie boolean not null default false,
  mis_a_jour_le timestamptz not null default now(),
  -- Un titre « vérifié » doit toujours porter sa date de contrôle.
  constraint verification_datee check (confiance_tf <> 'verifie' or date_verification_tf is not null)
);

-- Lots (appartements) -------------------------------------------------------
create table if not exists lots (
  id text primary key default gen_random_uuid()::text,
  programme_id text not null references programmes(id) on delete cascade,
  prix_ttc numeric not null check (prix_ttc > 0),
  surface numeric not null check (surface > 0),
  chambres int not null check (chambres >= 0),
  etage int not null default 0,
  ascenseur boolean not null default false,
  vue_mer text not null default 'aucune' check (vue_mer in ('aucune', 'partielle', 'degagee')),
  parking boolean not null default false,
  disponible boolean not null default true,
  mis_a_jour_le timestamptz not null default now()
);
create index if not exists lots_programme on lots(programme_id);

-- Historique des prix (alimente les alertes « baisse de prix ») --------------
create table if not exists historique_prix (
  id bigint generated always as identity primary key,
  lot_id text not null references lots(id) on delete cascade,
  ancien_prix numeric not null,
  nouveau_prix numeric not null,
  le timestamptz not null default now()
);

create or replace function noter_changement_prix() returns trigger language plpgsql as $$
begin
  if new.prix_ttc <> old.prix_ttc then
    insert into historique_prix (lot_id, ancien_prix, nouveau_prix) values (new.id, old.prix_ttc, new.prix_ttc);
  end if;
  new.mis_a_jour_le := now();
  return new;
end $$;

drop trigger if exists lots_prix on lots;
create trigger lots_prix before update on lots for each row execute function noter_changement_prix();

-- Barème de l'aide de l'État (modifiable sans republier l'app) ---------------
create table if not exists regles_aide (
  version text primary key,
  date_effet date not null,
  date_fin date,
  tranches jsonb not null, -- [{"prixMax": 300000, "aide": 100000}, ...]
  lien_officiel text not null,
  verifie_le date not null
);

insert into regles_aide (version, date_effet, date_fin, tranches, lien_officiel, verifie_le)
values ('2024-lancement', '2024-01-01', '2028-12-31',
        '[{"prixMax": 300000, "aide": 100000}, {"prixMax": 700000, "aide": 70000}]',
        'https://daamsakane.ma', '2024-01-01')
on conflict (version) do nothing;

-- Justificatifs (certificats de propriété, autorisations...) : JAMAIS publics -
create table if not exists justificatifs (
  id text primary key default gen_random_uuid()::text,
  programme_id text not null references programmes(id) on delete cascade,
  type text not null check (type in ('certificat_propriete', 'autorisation_construire', 'contrat_vefa', 'garantie_achevement')),
  chemin_fichier text not null, -- chemin dans le bucket privé « justificatifs »
  date_document date,
  valide_par_admin boolean not null default false,
  valide_le timestamptz,
  cree_le timestamptz not null default now()
);

-- Sécurité (RLS) ------------------------------------------------------------
alter table promoteurs enable row level security;
alter table programmes enable row level security;
alter table lots enable row level security;
alter table historique_prix enable row level security;
alter table regles_aide enable row level security;
alter table justificatifs enable row level security;

-- Lecture publique du catalogue publié uniquement. Aucune écriture publique :
-- le back-office écrit avec la clé de service, côté serveur.
drop policy if exists "lecture promoteurs" on promoteurs;
create policy "lecture promoteurs" on promoteurs for select using (true);
drop policy if exists "lecture programmes publies" on programmes;
create policy "lecture programmes publies" on programmes for select using (publie);
drop policy if exists "lecture lots publies" on lots;
create policy "lecture lots publies" on lots for select
  using (exists (select 1 from programmes p where p.id = programme_id and p.publie));
drop policy if exists "lecture bareme" on regles_aide;
create policy "lecture bareme" on regles_aide for select using (true);
-- historique_prix et justificatifs : aucune politique, donc aucun accès public.

-- Temps réel : chaque modification est poussée aux téléphones connectés --------
do $$
begin
  begin alter publication supabase_realtime add table programmes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table lots; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table regles_aide; exception when duplicate_object then null; end;
end $$;

-- Bucket privé pour les justificatifs (Storage)
insert into storage.buckets (id, name, public) values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;
