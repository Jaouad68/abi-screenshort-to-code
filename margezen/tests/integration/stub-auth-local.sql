-- Stub local du schéma `auth` fourni par Supabase, utilisé UNIQUEMENT pour
-- les tests d'intégration RLS en local (pas de Docker/Supabase CLI
-- disponible dans cet environnement). Ne fait pas partie de la migration
-- appliquée à un vrai projet Supabase : là-bas, `auth.users` et
-- `auth.uid()` existent déjà.
--
-- Reproduit fidèlement le comportement réel de `auth.uid()` : lit le
-- claim `sub` du JWT posé par PostgREST/GoTrue via `request.jwt.claim.sub`.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Rôle applicatif à privilèges restreints, comme en production Supabase :
-- ni superutilisateur, ni BYPASSRLS, donc soumis aux policies RLS.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin nosuperuser nobypassrls;
  end if;
end
$$;
