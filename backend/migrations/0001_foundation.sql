-- =============================================================================
-- 0001_foundation.sql
-- Leasely backend — foundation: tenancy, auth-linked profiles, RLS helpers, audit.
--
-- Target: self-hosted Supabase (Postgres 15+) on AWS me-central-1 (Dubai).
-- Tenancy: ONE COMPANY PER ACCOUNT. `company_id` is THE tenant boundary; every
-- domain row carries it and RLS scopes by current_company_id().
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email

-- ── enums ────────────────────────────────────────────────────────────────────
-- Stable, small value sets from src/lib/constants.js. (Category lists that firms
-- may want to customise later are kept as enums for now; widen via ALTER TYPE.)
create type user_role        as enum ('owner','manager','accountant','employee');
create type contact_kind     as enum ('tenant','owner','supplier','buyer','lead');
create type cheque_kind      as enum ('in','out');
create type cheque_status    as enum ('pending','deposited','cleared','bounced','replaced');
create type contract_type    as enum ('Residential','Commercial');
create type contract_status  as enum ('active','expiring','expired','terminated');
create type payment_method   as enum ('cheque','bank','cash');
create type receipt_against  as enum ('rent','deposit','commission','other');
create type bill_status      as enum ('unpaid','paid');   -- 'overdue' derived from due_date
create type expense_category as enum
  ('maintenance','cleaning','utility','security','insurance','management','owner-payout','other');
create type bank_account_kind as enum ('operating','deposit');

-- ── shared trigger: keep updated_at fresh ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── tenant root: companies ────────────────────────────────────────────────────
create table companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  license       text,                 -- trade-licence no (e.g. CN-1184422)
  address       text,
  phone         text,
  email         citext,
  trn           text,                 -- tax registration number
  brand_text    text,                 -- short brand label for printed docs
  -- billing (Stripe) — populated in Phase 6
  stripe_customer_id  text,
  subscription_status text,           -- e.g. trialing / active / past_due / canceled
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger companies_set_updated_at before update on companies
  for each row execute function set_updated_at();

-- ── per-company settings (alert thresholds, channels) ─────────────────────────
create table company_settings (
  company_id        uuid primary key references companies(id) on delete cascade,
  renewal_lead_days int     not null default 60,   -- contract-expiry alert window
  cheque_alert_days int     not null default 7,    -- cheque-due alert window
  email_alerts      boolean not null default true,
  sms_alerts        boolean not null default true,
  updated_at        timestamptz not null default now()
);
create trigger company_settings_set_updated_at before update on company_settings
  for each row execute function set_updated_at();

-- ── profiles: one row per auth user, bound to a company + role ────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  email      citext,
  role       user_role not null default 'employee',
  title      text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_company_id_idx on profiles (company_id);
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ── RLS helper functions ──────────────────────────────────────────────────────
-- current_company_id / current_user_role read the caller's profile. SECURITY
-- DEFINER so policies can resolve them without recursing into profiles' own RLS.
create or replace function current_company_id()
returns uuid language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;

create or replace function current_user_role()
returns user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

-- Who may see money: everyone except front-desk employees (ROLE_CAPS.viewFinancials).
create or replace function can_view_financials()
returns boolean language sql stable
as $$ select coalesce(current_user_role() <> 'employee', false) $$;

-- Who may post/mutate financial entities (ROLE_CAPS.post: owner/manager/accountant).
create or replace function can_post()
returns boolean language sql stable
as $$ select coalesce(current_user_role() in ('owner','manager','accountant'), false) $$;

-- ── standard tenant RLS, applied uniformly to every domain table ──────────────
-- One definition of "the policy" so the whole surface is auditable in one place.
--   financial      → SELECT also requires can_view_financials()
--   posters_only   → writes require can_post() (else any company member may write)
-- All policies are company-scoped via current_company_id(); reads/writes only ever
-- touch the caller's own company. Table owner (migration role) bypasses RLS, so
-- the SECURITY DEFINER RPC functions in later phases can maintain invariants.
create or replace function enable_company_rls(
  tbl regclass, financial boolean default false, posters_only boolean default false
) returns void language plpgsql as $$
declare
  t         text := tbl::text;
  sel_extra text := case when financial    then ' and can_view_financials()' else '' end;
  wr_extra  text := case when posters_only then ' and can_post()'            else '' end;
begin
  execute format('alter table %s enable row level security', t);
  execute format('grant select, insert, update, delete on %s to authenticated', t);
  execute format(
    'create policy %1$s_select on %1$s for select to authenticated using (company_id = current_company_id()%2$s)',
    t, sel_extra);
  execute format(
    'create policy %1$s_insert on %1$s for insert to authenticated with check (company_id = current_company_id()%2$s)',
    t, wr_extra);
  execute format(
    'create policy %1$s_update on %1$s for update to authenticated using (company_id = current_company_id()%2$s) with check (company_id = current_company_id()%2$s)',
    t, wr_extra);
  execute format(
    'create policy %1$s_delete on %1$s for delete to authenticated using (company_id = current_company_id()%2$s)',
    t, wr_extra);
end $$;

-- ── RLS for the foundation tables (hand-written: these aren't plain company_id) ─
alter table companies        enable row level security;
alter table company_settings enable row level security;
alter table profiles         enable row level security;
grant select, insert, update, delete on companies, company_settings, profiles to authenticated;

-- companies: see/update only your own. Inserts happen via the signup trigger.
create policy companies_select on companies for select to authenticated
  using (id = current_company_id());
create policy companies_update on companies for update to authenticated
  using (id = current_company_id() and current_user_role() in ('owner','manager'))
  with check (id = current_company_id());

create policy company_settings_select on company_settings for select to authenticated
  using (company_id = current_company_id());
create policy company_settings_update on company_settings for update to authenticated
  using (company_id = current_company_id() and current_user_role() in ('owner','manager'))
  with check (company_id = current_company_id());

-- profiles: see colleagues; owners/managers manage users (manageUsers cap); a
-- user may always update their own row, but never delete themselves.
create policy profiles_select on profiles for select to authenticated
  using (company_id = current_company_id());
create policy profiles_insert on profiles for insert to authenticated
  with check (company_id = current_company_id() and current_user_role() in ('owner','manager'));
create policy profiles_update on profiles for update to authenticated
  using (company_id = current_company_id() and (current_user_role() in ('owner','manager') or id = auth.uid()))
  with check (company_id = current_company_id());
create policy profiles_delete on profiles for delete to authenticated
  using (company_id = current_company_id() and current_user_role() in ('owner','manager') and id <> auth.uid());

-- ── signup onboarding ─────────────────────────────────────────────────────────
-- One company per account: a fresh signup creates its company + owner profile.
-- `company_name` / `full_name` come from the signup metadata; sensible fallbacks
-- otherwise. (Inviting teammates into an EXISTING company is a separate RPC that
-- inserts a profile with the existing company_id — added with the auth phase.)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_company_id uuid;
  company_name   text := coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'My Company');
  full_name      text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1));
begin
  -- Only auto-provision when the signup didn't target an existing company
  -- (invite flows set 'company_id' in metadata and pre-create the profile).
  if new.raw_user_meta_data ? 'company_id' then
    return new;
  end if;
  insert into public.companies (name, email) values (company_name, new.email)
    returning id into new_company_id;
  insert into public.company_settings (company_id) values (new_company_id);
  insert into public.profiles (id, company_id, name, email, role)
    values (new.id, new_company_id, full_name, new.email, 'owner');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Append-only financial/operational trail. Rows are written ONLY by SECURITY
-- DEFINER RPC functions (no client INSERT policy), so they can't be forged or
-- altered from the app. Readable to financial-capable roles within the company.
create table audit_log (
  id        bigint generated always as identity primary key,
  company_id uuid not null,
  actor_id  uuid,            -- auth.users id; null for system/cron jobs
  action    text not null,   -- e.g. 'cheque.clear', 'contract.create', 'bill.pay'
  entity    text not null,   -- table name
  entity_id uuid,
  before    jsonb,
  after     jsonb,
  at        timestamptz not null default now()
);
create index audit_log_company_at_idx on audit_log (company_id, at desc);
create index audit_log_entity_idx     on audit_log (entity, entity_id);

alter table audit_log enable row level security;
grant select on audit_log to authenticated;
create policy audit_log_select on audit_log for select to authenticated
  using (company_id = current_company_id() and can_view_financials());

-- Helper used by RPC functions to record an audited change.
create or replace function write_audit(
  p_company_id uuid, p_action text, p_entity text, p_entity_id uuid,
  p_before jsonb default null, p_after jsonb default null
) returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, before, after)
  values (p_company_id, auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after)
$$;

-- ── grants: let authenticated callers resolve the helper functions ────────────
grant usage on schema public to authenticated, anon;
grant execute on function
  current_company_id(), current_user_role(), can_view_financials(), can_post()
  to authenticated;
