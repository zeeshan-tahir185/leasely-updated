-- Hearth backend foundation: tenancy, identity, and the Row-Level Security spine.
--
-- Tenant model: an ORGANIZATION is a property-management firm (the billing/login
-- boundary). An org owns one or more COMPANIES (legal entities, e.g. Westwood +
-- Marina). A user is a PROFILE (1:1 with auth.users) and joins an org through a
-- MEMBERSHIP that carries their role. Every domain table (next migration) is
-- isolated by org_id and gated by the helper functions defined here, so one firm
-- can never read another firm's data even if the client is tampered with.

create extension if not exists pgcrypto;          -- gen_random_uuid()

-- ---------- roles ----------
create type app_role as enum ('owner', 'manager', 'accountant', 'employee');

-- ---------- shared updated_at trigger ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tenancy + identity tables
-- ============================================================

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_org_updated before update on organizations
  for each row execute function set_updated_at();

-- One row per auth user. Auto-created on signup by the trigger below.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profile_updated before update on profiles
  for each row execute function set_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table companies (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null,
  license     text,
  trn         text,
  address     text,
  phone       text,
  email       text,
  brand_text  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on companies (org_id);
create trigger trg_company_updated before update on companies
  for each row execute function set_updated_at();

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  user_id     uuid not null references profiles (id) on delete cascade,
  role        app_role not null default 'employee',
  title       text,
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on memberships (user_id);
create index on memberships (org_id);

create table company_settings (
  company_id        uuid primary key references companies (id) on delete cascade,
  org_id            uuid not null references organizations (id) on delete cascade,
  renewal_lead_days int  not null default 60,
  cheque_alert_days int  not null default 7,
  email_alerts      bool not null default true,
  sms_alerts        bool not null default true,
  updated_at        timestamptz not null default now()
);
create trigger trg_settings_updated before update on company_settings
  for each row execute function set_updated_at();

-- ============================================================
-- RLS helper functions
-- security definer + a pinned search_path so they read memberships WITHOUT
-- recursing through RLS (which would otherwise loop on the memberships policy).
-- ============================================================

create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and org_id = p_org);
$$;

create or replace function has_org_role(p_org uuid, variadic p_roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and org_id = p_org and role = any (p_roles)
  );
$$;

-- True if the current user shares any org with p_user (for the profiles roster).
create or replace function shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m1
    join memberships m2 on m1.org_id = m2.org_id
    where m1.user_id = auth.uid() and m2.user_id = p_user
  );
$$;

-- ============================================================
-- RLS on the foundation tables
-- ============================================================
alter table organizations    enable row level security;
alter table profiles         enable row level security;
alter table companies        enable row level security;
alter table memberships      enable row level security;
alter table company_settings enable row level security;

create policy org_select on organizations for select using (is_org_member(id));
create policy org_update on organizations for update
  using (has_org_role(id, 'owner')) with check (has_org_role(id, 'owner'));

create policy profile_self on profiles for select using (id = auth.uid());
create policy profile_roster on profiles for select using (shares_org_with(id));
create policy profile_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy company_select on companies for select using (is_org_member(org_id));
create policy company_write on companies for all
  using (has_org_role(org_id, 'owner', 'manager'))
  with check (has_org_role(org_id, 'owner', 'manager'));

create policy membership_select on memberships for select using (is_org_member(org_id));
create policy membership_write on memberships for all
  using (has_org_role(org_id, 'owner', 'manager'))
  with check (has_org_role(org_id, 'owner', 'manager'));

create policy settings_select on company_settings for select using (is_org_member(org_id));
create policy settings_write on company_settings for all
  using (has_org_role(org_id, 'owner', 'manager', 'accountant'))
  with check (has_org_role(org_id, 'owner', 'manager', 'accountant'));

-- ============================================================
-- Bootstrap: a freshly signed-up user has no membership yet, so they cannot
-- see or create anything through RLS. This security-definer RPC creates their
-- first org + company + owner membership + default settings in one shot.
-- ============================================================
create or replace function create_organization(p_org_name text, p_company_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org     uuid;
  v_company uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into organizations (name) values (p_org_name) returning id into v_org;
  insert into memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  insert into companies (org_id, name) values (v_org, coalesce(p_company_name, p_org_name)) returning id into v_company;
  insert into company_settings (company_id, org_id) values (v_company, v_org);
  return v_org;
end;
$$;
