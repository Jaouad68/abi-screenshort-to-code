-- Tests de la migration 0001 sur un Postgres nu.
-- Crée des bouchons minimaux pour auth.* et storage.* (fournis par Supabase en vrai),
-- applique la migration, puis vérifie RLS, limites gratuites et rappels.
-- Usage : psql -v ON_ERROR_STOP=1 -d <base vide> -f supabase/tests/0001_init_test.sql

\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Bouchons Supabase
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function storage.foldername(text) to authenticated;
grant all on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;

\ir ../migrations/0001_init.sql

-- ---------------------------------------------------------------------------
-- Données de test
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

insert into public.procedures_catalog
  (slug, version, title, summary, official_url, source_url, source_updated_at, content, is_published)
values
  ('cni-passeport', 1, 'Carte d''identité / passeport', 'Test', 'https://ants.gouv.fr',
   'https://www.service-public.gouv.fr', '2026-10-01', '{}'::jsonb, true),
  ('brouillon-interne', 1, 'Non publié', 'Test', 'https://example.test',
   'https://example.test', '2026-10-01', '{}'::jsonb, false);

create function pg_temp.expect_error(stmt text, expected text) returns void language plpgsql as $$
declare
  err text;
begin
  begin
    execute stmt;
  exception when others then
    err := sqlerrm;
  end;
  if err is null then
    raise exception 'ÉCHEC : aucune erreur levée pour : %', stmt;
  elsif position(expected in err) = 0 then
    raise exception 'ÉCHEC : erreur inattendue pour % : %', stmt, err;
  end if;
end;
$$;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'OK : %', label;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

set client_min_messages = notice;

-- ---------------------------------------------------------------------------
-- 1. Inscription : profil et abonnement gratuit créés
-- ---------------------------------------------------------------------------

select pg_temp.check((select count(*) = 2 from public.profiles), 'profils créés à l''inscription');
select pg_temp.check((select bool_and(entitlement = 'gratuit') from public.subscriptions), 'abonnements gratuits créés');

-- ---------------------------------------------------------------------------
-- 2. Alice, usager gratuit
-- ---------------------------------------------------------------------------

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select pg_temp.check((select count(*) = 1 from public.procedures_catalog), 'seules les versions publiées sont visibles');

insert into public.user_procedures (id, procedure_slug, procedure_version)
values ('10000000-0000-0000-0000-000000000001', 'cni-passeport', 1);
select pg_temp.check(true, 'première démarche acceptée');

select pg_temp.expect_error(
  $q$insert into public.user_procedures (procedure_slug, procedure_version) values ('cni-passeport', 1)$q$,
  'LIMITE_GRATUITE_DEMARCHES');
select pg_temp.check(true, 'deuxième démarche active refusée (RG12)');

update public.user_procedures set status = 'terminee' where id = '10000000-0000-0000-0000-000000000001';
insert into public.user_procedures (id, procedure_slug, procedure_version)
values ('10000000-0000-0000-0000-000000000002', 'cni-passeport', 1);
select pg_temp.check(true, 'nouvelle démarche acceptée après clôture');

select pg_temp.expect_error(
  $q$update public.user_procedures set status = 'en_preparation' where id = '10000000-0000-0000-0000-000000000001'$q$,
  'LIMITE_GRATUITE_DEMARCHES');
select pg_temp.check(true, 'réouverture d''une démarche close refusée si limite atteinte');

-- Documents et rappels
insert into public.documents (id, category, title, storage_path, original_mime, size_bytes, encryption_nonce, expires_on)
values ('20000000-0000-0000-0000-000000000001', 'identite', 'Carte d''identité',
        '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001.bin',
        'image/jpeg', 1000, 'n', current_date + 400);

select pg_temp.check(
  (select count(*) = 1 and min(due_at) = (((current_date + 400) - interval '6 months')::date + time '09:00')
                                           at time zone 'Europe/Paris'
   from public.reminders where source_id = '20000000-0000-0000-0000-000000000001'),
  'rappel d''expiration à J-6 mois, 9 h Paris (RG05)');

update public.documents set expires_on = current_date + 10 where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check(
  (select count(*) = 1 and min(due_at) <= now() + interval '1 minute'
   from public.reminders where source_id = '20000000-0000-0000-0000-000000000001'),
  'rappel remplacé, et immédiat si l''échéance est passée');

update public.documents set expires_on = null where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check(
  (select count(*) = 0 from public.reminders where source_id = '20000000-0000-0000-0000-000000000001'),
  'rappel supprimé quand la date d''expiration est effacée');

select pg_temp.expect_error(
  $q$insert into public.documents (category, title, storage_path, original_mime, size_bytes, encryption_nonce)
     values ('autre', 'Mauvais chemin', '00000000-0000-0000-0000-00000000000b/x.bin', 'application/pdf', 10, 'n')$q$,
  'documents_check');
select pg_temp.check(true, 'chemin de stockage hors du dossier de l''usager refusé');

insert into public.documents (category, title, storage_path, original_mime, size_bytes, encryption_nonce)
select 'autre', 'Doc ' || i, '00000000-0000-0000-0000-00000000000a/doc' || i || '.bin', 'application/pdf', 10, 'n'
from generate_series(2, 5) i;
select pg_temp.expect_error(
  $q$insert into public.documents (category, title, storage_path, original_mime, size_bytes, encryption_nonce)
     values ('autre', 'Doc 6', '00000000-0000-0000-0000-00000000000a/doc6.bin', 'application/pdf', 10, 'n')$q$,
  'LIMITE_GRATUITE_DOCUMENTS');
select pg_temp.check(true, 'sixième document refusé (RG12)');


-- Tables écrites par le serveur : aucune écriture usager
update public.subscriptions set entitlement = 'serenite';
select pg_temp.check((select entitlement from public.subscriptions) = 'gratuit',
  'abonnement non modifiable par l''usager');
select pg_temp.expect_error(
  $q$insert into public.decoded_letters (user_id, summary, model) values (auth.uid(), 'x', 'm')$q$,
  'row-level security');
select pg_temp.check(true, 'courrier décodé non insérable par l''usager');
select pg_temp.expect_error($q$select public.has_premium(auth.uid())$q$, 'permission denied');
select pg_temp.expect_error($q$select public.consume_letter_quota(auth.uid())$q$, 'permission denied');
select pg_temp.check(true, 'fonctions internes non appelables par l''usager');

-- Stockage
insert into storage.objects (bucket_id, name) values ('coffre', '00000000-0000-0000-0000-00000000000a/a.bin');
select pg_temp.expect_error(
  $q$insert into storage.objects (bucket_id, name) values ('coffre', '00000000-0000-0000-0000-00000000000b/a.bin')$q$,
  'row-level security');
select pg_temp.check(true, 'dépôt dans le dossier d''un autre usager refusé');

-- ---------------------------------------------------------------------------
-- 3. Bob ne voit rien d'Alice
-- ---------------------------------------------------------------------------

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

select pg_temp.check((select count(*) = 0 from public.user_procedures), 'Bob ne voit pas les démarches d''Alice');
select pg_temp.check((select count(*) = 0 from public.documents), 'Bob ne voit pas les documents d''Alice');
select pg_temp.check((select count(*) = 0 from public.reminders), 'Bob ne voit pas les rappels d''Alice');
select pg_temp.check((select count(*) = 1 from public.profiles), 'Bob ne voit que son profil');
select pg_temp.check((select count(*) = 0 from storage.objects), 'Bob ne voit pas les fichiers d''Alice');

select pg_temp.expect_error(
  $q$insert into public.procedure_events (user_procedure_id, kind) values ('10000000-0000-0000-0000-000000000002', 'note')$q$,
  'row-level security');
select pg_temp.check(true, 'Bob ne peut pas écrire dans la frise d''Alice');

update public.documents set title = 'piraté';
select pg_temp.check(true, 'mise à jour sans effet sur les lignes d''autrui');

-- ---------------------------------------------------------------------------
-- 4. Quota de courriers (rôle service) et abonnement premium
-- ---------------------------------------------------------------------------

reset role;

select pg_temp.check(
  (select array_agg(public.consume_letter_quota('00000000-0000-0000-0000-00000000000a')) from generate_series(1, 4))
    = array[true, true, true, false],
  '3 courriers par mois en gratuit, le 4e refusé (RG12)');

update public.subscriptions set entitlement = 'serenite', expires_at = now() + interval '1 month'
where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(public.consume_letter_quota('00000000-0000-0000-0000-00000000000a'), 'courriers illimités en Sérénité');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.user_procedures set status = 'en_preparation' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.check(true, 'plusieurs démarches actives en Sérénité');
select pg_temp.check((select title from public.documents where id = '20000000-0000-0000-0000-000000000001') = 'Carte d''identité',
  'le document d''Alice n''a pas été modifié par Bob');
reset role;

update public.subscriptions set expires_at = now() - interval '1 day'
where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(not public.consume_letter_quota('00000000-0000-0000-0000-00000000000a'),
  'abonnement expiré : retour aux limites gratuites');

-- ---------------------------------------------------------------------------
-- 5. Catalogue figé (RG02) et suppression de compte
-- ---------------------------------------------------------------------------

select pg_temp.expect_error(
  $q$update public.procedures_catalog set content = '{"x":1}' where slug = 'cni-passeport'$q$,
  'VERSION_PUBLIEE_FIGEE');
select pg_temp.check(true, 'version publiée non modifiable (RG02)');

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(
  (select count(*) = 0 from public.documents) and (select count(*) = 0 from public.reminders)
  and (select count(*) = 0 from public.user_procedures) and (select count(*) = 0 from public.usage_counters),
  'suppression du compte : toutes les lignes supprimées en cascade');

\echo 'Tous les tests sont passés.'
