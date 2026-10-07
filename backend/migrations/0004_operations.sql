-- =============================================================================
-- 0004_operations.sql
-- Leasely backend — operations modules: maintenance, leads, bookings, cases,
-- inventory, purchase orders, documents, HR/payroll.
-- Plus the remaining store.jsx payroll actions as RPCs:
-- run_payroll / set_payroll_paid.
--
-- Visibility tiers (see backend/README.md):
--   • operational (any member)      — maintenance, leads, bookings
--   • financial   (can_view_financials, i.e. not employee) — inventory,
--                   purchase_orders, documents, payroll
--   • manage-only (can_manage, owner/manager) — cases (legal/police), employees (HR)
-- =============================================================================

-- ── enums (small, stable status/priority sets; category lists stay text+CHECK) ─
create type maintenance_priority as enum ('urgent','high','medium','low');
create type maintenance_status   as enum ('new','assigned','in_progress','resolved','closed');
create type lead_stage           as enum ('new','contacted','viewing','negotiation','won','lost');
create type booking_status       as enum ('held','confirmed','cancelled');
create type case_type            as enum ('legal','police');
create type case_status          as enum ('open','in_court','won','lost','closed');
create type employee_status      as enum ('active','inactive');
create type payroll_status       as enum ('pending','paid');
create type po_status            as enum ('ordered','received','cancelled');

-- ── third visibility tier: owner/manager only ─────────────────────────────────
create or replace function can_manage() returns boolean language sql stable
as $$ select coalesce(current_user_role() in ('owner','manager'), false) $$;
grant execute on function can_manage() to authenticated;

-- profiles need (id, company_id) unique so child tables can composite-FK to them
-- (keeps a lead's owner in the same company as the lead).
alter table profiles add constraint profiles_id_company_key unique (id, company_id);

-- ── maintenance / work orders ──────────────────────────────────────────────────
create table maintenance (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid,
  unit_id     uuid,
  reporter_id uuid,            -- the contact who reported it
  title       text not null,
  category    text check (category in
                ('AC / Cooling','Plumbing','Electrical','Carpentry','Appliances','Pest Control','Cleaning','General')),
  priority    maintenance_priority not null default 'medium',
  status      maintenance_status   not null default 'new',
  assignee    text,            -- supplier / crew name (free text in the prototype)
  cost        numeric(14,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id,    company_id) references towers   (id, company_id),
  foreign key (unit_id,     company_id) references units    (id, company_id),
  foreign key (reporter_id, company_id) references contacts (id, company_id)
);
create index maintenance_company_idx on maintenance (company_id, status);

-- ── leads (CRM pipeline) ─────────────────────────────────────────────────────────
create table leads (
  id         uuid not null default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid,
  tower_id   uuid,
  owner_id   uuid,             -- the agent (profile) who owns the lead
  source     text,             -- Property Finder / Bayut / Referral / …
  interest   text,
  budget     numeric(14,2),
  stage      lead_stage not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (contact_id, company_id) references contacts (id, company_id),
  foreign key (tower_id,   company_id) references towers   (id, company_id),
  foreign key (owner_id,   company_id) references profiles (id, company_id)
);
create index leads_company_idx on leads (company_id, stage);

-- ── bookings (unit holds before a contract) ──────────────────────────────────────
create table bookings (
  id         uuid not null default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  unit_id    uuid,
  contact_id uuid,
  amount     numeric(14,2),
  status     booking_status not null default 'held',
  date       date not null default current_date,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (unit_id,    company_id) references units    (id, company_id),
  foreign key (contact_id, company_id) references contacts (id, company_id)
);
create index bookings_company_idx on bookings (company_id, status);

-- ── legal / police cases (manage-only) ───────────────────────────────────────────
create table cases (
  id         uuid not null default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type       case_type   not null,
  title      text not null,
  contact_id uuid,
  tower_id   uuid,
  status     case_status not null default 'open',
  ref_no     text,            -- court / police reference
  opened_at  date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (contact_id, company_id) references contacts (id, company_id),
  foreign key (tower_id,   company_id) references towers   (id, company_id)
);
create index cases_company_idx on cases (company_id, status);

-- ── purchasing & inventory ────────────────────────────────────────────────────────
create table inventory_items (
  id            uuid not null default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  sku           text,
  category      text check (category in
                  ('HVAC','Electrical','Plumbing','Carpentry','Cleaning','Safety','General')),
  qty           int not null default 0,
  unit_cost     numeric(14,2) not null default 0,
  reorder_level int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index inventory_items_company_idx on inventory_items (company_id);

create table purchase_orders (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  supplier_id uuid,
  date        date not null default current_date,
  total       numeric(14,2) not null default 0,
  status      po_status not null default 'ordered',
  ref         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (supplier_id, company_id) references contacts (id, company_id)
);
create index purchase_orders_company_idx on purchase_orders (company_id, status);

-- ── documents (DMS) ───────────────────────────────────────────────────────────────
-- Metadata lives here; the file itself goes to Supabase Storage (bucket `documents`,
-- object path `<company_id>/<id>`). The storage.objects RLS that scopes the bucket
-- by the company_id path prefix is added with the Storage setup in Phase 6 — this
-- table tracks where the object lives and what it's linked to.
create table documents (
  id            uuid not null default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  type          text check (type in ('pdf','image','other')) default 'pdf',
  category      text check (category in
                  ('Contracts','Company','Towers','Tenants','Utilities','Financial','Maintenance','Other')),
  linked_type   text,            -- 'contract' | 'tower' | 'bill' | … (polymorphic)
  linked_id     uuid,
  size_kb       int,
  storage_bucket text not null default 'documents',
  storage_path  text,            -- object path within the bucket
  added_at      timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index documents_company_idx on documents (company_id, category);

-- ── HR: employees & payroll ─────────────────────────────────────────────────────
create table employees (
  id         uuid not null default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  title      text,
  department text check (department in
                ('Management','Operations','Leasing','Finance','Maintenance','Administration')),
  salary     numeric(14,2) not null default 0,
  join_date  date,
  status     employee_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index employees_company_idx on employees (company_id, status);

create table payroll (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  employee_id uuid not null,
  period      char(7) not null check (period ~ '^\d{4}-\d{2}$'),   -- YYYY-MM
  basic       numeric(14,2) not null default 0,
  allowances  numeric(14,2) not null default 0,
  deductions  numeric(14,2) not null default 0,
  net         numeric(14,2) not null default 0,
  status      payroll_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  unique (employee_id, period),
  foreign key (employee_id, company_id) references employees (id, company_id) on delete cascade
);
create index payroll_company_period_idx on payroll (company_id, period);

-- ── updated_at triggers ─────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'maintenance','leads','bookings','cases',
    'inventory_items','purchase_orders','documents','employees','payroll'
  ] loop
    execute format(
      'create trigger %1$s_set_updated_at before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────────
-- operational (any member can read + write)
select enable_company_rls('maintenance');
select enable_company_rls('leads');
select enable_company_rls('bookings');
-- financial (read = not employee; write = can_post)
select enable_company_rls('inventory_items', true, true);
select enable_company_rls('purchase_orders', true, true);
select enable_company_rls('documents',       true, true);
select enable_company_rls('payroll',         true, true);

-- manage-only (owner/manager) — cases (legal/police) & employees (HR/salaries)
do $$
declare t text;
begin
  foreach t in array array['cases','employees'] loop
    execute format('alter table %s enable row level security', t);
    execute format('grant select, insert, update, delete on %s to authenticated', t);
    execute format('create policy %1$s_select on %1$s for select to authenticated using (company_id = current_company_id() and can_manage())', t);
    execute format('create policy %1$s_insert on %1$s for insert to authenticated with check (company_id = current_company_id() and can_manage())', t);
    execute format('create policy %1$s_update on %1$s for update to authenticated using (company_id = current_company_id() and can_manage()) with check (company_id = current_company_id() and can_manage())', t);
    execute format('create policy %1$s_delete on %1$s for delete to authenticated using (company_id = current_company_id() and can_manage())', t);
  end loop;
end $$;

-- =============================================================================
-- RPCs — the remaining side-effecting store.jsx actions
-- =============================================================================

-- run_payroll: one line per active employee that doesn't already have one this
-- period; allowances 15% / deductions 5% of basic. Returns the number added.
create or replace function run_payroll(p_period text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); v_added int;
begin
  insert into payroll (company_id, employee_id, period, basic, allowances, deductions, net, status)
  select v_company, e.id, p_period, e.salary,
         round(e.salary * 0.15), round(e.salary * 0.05),
         e.salary + round(e.salary * 0.15) - round(e.salary * 0.05), 'pending'
    from employees e
   where e.company_id = v_company
     and e.status = 'active'
     and not exists (
       select 1 from payroll p
        where p.company_id = v_company and p.period = p_period and p.employee_id = e.id);
  get diagnostics v_added = row_count;
  perform write_audit(v_company, 'payroll.run', 'payroll', null, null, to_jsonb(p_period));
  return v_added;
end $$;

-- set_payroll_paid: flip every line in a period to paid (or back to pending).
create or replace function set_payroll_paid(p_period text, p_paid boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post();
begin
  update payroll
     set status = (case when p_paid then 'paid' else 'pending' end)::payroll_status
   where company_id = v_company and period = p_period;
  perform write_audit(v_company, 'payroll.paid:' || p_paid, 'payroll', null, null, to_jsonb(p_period));
end $$;

grant execute on function
  run_payroll(text),
  set_payroll_paid(text, boolean)
  to authenticated;
