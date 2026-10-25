-- Copilote démarches : schéma initial du MVP.
-- Voir SPECS-MVP.md (sections 4, 5 et 7) pour les règles RGxx citées ici.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.procedure_status as enum (
  'brouillon', 'en_preparation', 'deposee', 'en_attente_reponse', 'terminee', 'abandonnee'
);

create type public.document_category as enum (
  'identite', 'domicile', 'fiscal', 'retraite', 'famille', 'vehicule', 'autre'
);

create type public.reminder_kind as enum (
  'expiration_document', 'etape_demarche', 'echeance_officielle', 'courrier', 'relance'
);

create type public.deadline_confidence as enum ('explicite', 'calculee', 'incertaine', 'aucune');

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profils et abonnements
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  text_scale numeric(3, 2) not null default 1.00 check (text_scale in (1.00, 1.25, 1.50, 2.00)),
  voice_enabled boolean not null default false,
  tax_department text check (tax_department ~ '^([0-9]{2}|2A|2B|97[1-6])$'),
  timezone text not null default 'Europe/Paris',
  push_token text,
  disclaimer_accepted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Écrit uniquement par le webhook RevenueCat (rôle service).
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'gratuit' check (entitlement in ('gratuit', 'serenite')),
  expires_at timestamptz,
  provider_customer_id text,
  updated_at timestamptz not null default now()
);

-- Profil et abonnement gratuit créés à l'inscription.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.has_premium(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.entitlement = 'serenite'
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

-- Utilisée par les déclencheurs et les Edge Functions, pas exposée en RPC.
revoke execute on function public.has_premium(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Contenu public : catalogue des parcours et échéances officielles (RG02, RG13)
-- ---------------------------------------------------------------------------

create table public.procedures_catalog (
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  version int not null check (version > 0),
  title text not null,
  summary text not null,
  official_url text not null check (official_url like 'https://%'),
  source_url text not null check (source_url like 'https://%'),
  source_updated_at date not null,
  content jsonb not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (slug, version)
);

-- RG02 : une version publiée est figée.
create function public.freeze_published_procedure() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.is_published and (new.content is distinct from old.content
                           or new.slug <> old.slug or new.version <> old.version) then
    raise exception 'VERSION_PUBLIEE_FIGEE: créez une nouvelle version de %', old.slug;
  end if;
  return new;
end;
$$;

create trigger procedures_catalog_freeze before update on public.procedures_catalog
  for each row execute function public.freeze_published_procedure();

create table public.official_deadlines (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  year int not null check (year between 2025 and 2100),
  zone text not null check (zone in ('01-19', '20-54', '55-976', 'papier', 'toutes')),
  due_on date not null,
  source_url text not null check (source_url like 'https://%'),
  unique (slug, year, zone)
);

-- ---------------------------------------------------------------------------
-- Démarches de l'usager
-- ---------------------------------------------------------------------------

create table public.user_procedures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  procedure_slug text not null,
  procedure_version int not null,
  status public.procedure_status not null default 'brouillon',
  answers jsonb not null default '{}'::jsonb,
  current_step text,
  external_ref text check (char_length(external_ref) <= 64),
  target_date date,
  submitted_at timestamptz,
  expected_response_at date,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (procedure_slug, procedure_version)
    references public.procedures_catalog (slug, version)
);

create index user_procedures_user_idx on public.user_procedures (user_id, status);

create trigger user_procedures_updated_at before update on public.user_procedures
  for each row execute function public.set_updated_at();

create table public.procedure_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_procedure_id uuid not null references public.user_procedures (id) on delete cascade,
  kind text not null check (kind in ('etape_faite', 'depot', 'reponse_recue', 'relance', 'note', 'cloture')),
  note text check (char_length(note) <= 500),
  occurred_at timestamptz not null default now()
);

create index procedure_events_proc_idx on public.procedure_events (user_procedure_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Coffre-fort (RG11 : fichiers chiffrés côté client)
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category public.document_category not null,
  title text not null check (char_length(title) between 1 and 120),
  storage_path text not null unique,
  original_mime text not null check (original_mime in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes int not null check (size_bytes between 1 and 10485760),
  encryption_nonce text not null,
  issued_on date,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (storage_path like user_id::text || '/%')
);

create index documents_user_idx on public.documents (user_id, category);

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.procedure_documents (
  user_procedure_id uuid not null references public.user_procedures (id) on delete cascade,
  requirement_key text not null,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (user_procedure_id, requirement_key)
);

-- ---------------------------------------------------------------------------
-- Rappels (RG05, RG06, RG07)
-- ---------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.reminder_kind not null,
  title text not null check (char_length(title) between 1 and 140),
  due_at timestamptz not null,
  source_type text check (source_type in ('document', 'procedure', 'letter', 'deadline')),
  source_id uuid,
  sent_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_due_idx on public.reminders (due_at)
  where sent_at is null and dismissed_at is null;
create index reminders_user_idx on public.reminders (user_id, due_at);

-- RG05 : rappel d'expiration recalculé à chaque changement de expires_on.
create function public.sync_document_reminder() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lead_interval interval;
  tz text;
  due timestamptz;
begin
  if tg_op = 'UPDATE' and new.expires_on is not distinct from old.expires_on
     and new.title = old.title then
    return new;
  end if;

  delete from public.reminders r
  where r.source_type = 'document' and r.source_id = new.id and r.sent_at is null;

  if new.expires_on is null then
    return new;
  end if;

  lead_interval := case when new.category = 'identite' then interval '6 months' else interval '1 month' end;
  select coalesce(p.timezone, 'Europe/Paris') into tz from public.profiles p where p.id = new.user_id;
  due := ((new.expires_on - lead_interval)::date + time '09:00') at time zone coalesce(tz, 'Europe/Paris');

  insert into public.reminders (user_id, kind, title, due_at, source_type, source_id)
  values (new.user_id, 'expiration_document',
          left('Bientôt expiré : ' || new.title, 140),
          greatest(due, now()), 'document', new.id);
  return new;
end;
$$;

create trigger documents_reminder after insert or update on public.documents
  for each row execute function public.sync_document_reminder();

-- Un document supprimé emporte ses rappels non envoyés.
create function public.delete_document_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reminders r
  where r.source_type = 'document' and r.source_id = old.id and r.sent_at is null;
  return old;
end;
$$;

create trigger documents_reminder_cleanup after delete on public.documents
  for each row execute function public.delete_document_reminders();

-- ---------------------------------------------------------------------------
-- Courriers décodés et compteurs (écrits par l'Edge Function decode-letter)
-- Le texte du courrier n'est jamais stocké.
-- ---------------------------------------------------------------------------

create table public.decoded_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organism text check (char_length(organism) <= 120),
  letter_date date,
  summary text not null check (char_length(summary) <= 1200),
  actions jsonb not null default '[]'::jsonb,
  deadline date,
  deadline_confidence public.deadline_confidence not null default 'aucune',
  model text not null,
  created_at timestamptz not null default now(),
  check ((deadline is null) = (deadline_confidence = 'aucune'))
);

create index decoded_letters_user_idx on public.decoded_letters (user_id, created_at desc);

create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  period date not null check (extract(day from period) = 1),
  letters_decoded int not null default 0 check (letters_decoded >= 0),
  primary key (user_id, period)
);

-- RG12 : réserve atomiquement un décodage. Appelée par l'Edge Function avec le rôle service.
-- Renvoie false si la limite gratuite du mois est atteinte.
create function public.consume_letter_quota(uid uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_period date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  used int;
begin
  insert into public.usage_counters (user_id, period, letters_decoded)
  values (uid, current_period, 0)
  on conflict (user_id, period) do nothing;

  select letters_decoded into used from public.usage_counters
  where user_id = uid and period = current_period
  for update;

  if not public.has_premium(uid) and used >= 3 then
    return false;
  end if;

  update public.usage_counters set letters_decoded = letters_decoded + 1
  where user_id = uid and period = current_period;
  return true;
end;
$$;

revoke execute on function public.consume_letter_quota(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RG12 : limites de l'offre gratuite, vérifiées côté serveur
-- ---------------------------------------------------------------------------

create function public.enforce_free_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if public.has_premium(new.user_id) then
    return new;
  end if;

  if tg_table_name = 'user_procedures' then
    if new.status in ('terminee', 'abandonnee') then
      return new;
    end if;
    if tg_op = 'UPDATE' and old.status not in ('terminee', 'abandonnee') then
      return new;
    end if;
    select count(*) into n from public.user_procedures
    where user_id = new.user_id and status not in ('terminee', 'abandonnee') and id <> new.id;
    if n >= 1 then
      raise exception 'LIMITE_GRATUITE_DEMARCHES' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'documents' then
    select count(*) into n from public.documents where user_id = new.user_id;
    if n >= 5 then
      raise exception 'LIMITE_GRATUITE_DOCUMENTS' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger user_procedures_free_limit before insert or update of status on public.user_procedures
  for each row execute function public.enforce_free_limits();

create trigger documents_free_limit before insert on public.documents
  for each row execute function public.enforce_free_limits();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.procedures_catalog enable row level security;
alter table public.official_deadlines enable row level security;
alter table public.user_procedures enable row level security;
alter table public.procedure_events enable row level security;
alter table public.documents enable row level security;
alter table public.procedure_documents enable row level security;
alter table public.reminders enable row level security;
alter table public.decoded_letters enable row level security;
alter table public.usage_counters enable row level security;

-- Profil : lecture et mise à jour de son propre profil (création par déclencheur).
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Lecture seule pour les tables écrites par le serveur.
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy usage_counters_select on public.usage_counters for select to authenticated
  using (user_id = (select auth.uid()));
create policy decoded_letters_select on public.decoded_letters for select to authenticated
  using (user_id = (select auth.uid()));
create policy decoded_letters_delete on public.decoded_letters for delete to authenticated
  using (user_id = (select auth.uid()));

-- Contenu public : versions publiées seulement.
create policy procedures_catalog_select on public.procedures_catalog for select to authenticated
  using (is_published);
create policy official_deadlines_select on public.official_deadlines for select to authenticated
  using (true);

-- Tables de l'usager : tout sur ses propres lignes.
create policy user_procedures_all on public.user_procedures for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy documents_all on public.documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reminders_all on public.reminders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Les lignes liées doivent pointer vers des objets du même usager.
create policy procedure_events_all on public.procedure_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.user_procedures p
                where p.id = user_procedure_id and p.user_id = (select auth.uid()))
  );

create policy procedure_documents_all on public.procedure_documents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.user_procedures p
                where p.id = user_procedure_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.documents d
                where d.id = document_id and d.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Stockage : bucket privé du coffre, un dossier par usager
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('coffre', 'coffre', false, 10485760)
on conflict (id) do nothing;

create policy coffre_select on storage.objects for select to authenticated
  using (bucket_id = 'coffre' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy coffre_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'coffre' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy coffre_update on storage.objects for update to authenticated
  using (bucket_id = 'coffre' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy coffre_delete on storage.objects for delete to authenticated
  using (bucket_id = 'coffre' and (storage.foldername(name))[1] = (select auth.uid())::text);
