-- Hearth domain tables. Each row carries org_id (tenant) + company_id (legal
-- entity), mirroring the front-end's scopeData(companyId). Money is numeric(14,2)
-- AED. RLS at the bottom: every org member can read; writes are tiered by role.

-- ---------- leasing: property + people ----------
create table towers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null, area text, address text, plot text,
  floors int, type text, owner_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete cascade,
  label text not null, floor int, unit_type text,
  beds int, baths int, sqft int,
  annual_rent numeric(14,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  kind text[] not null default '{}',
  name text not null, email text, phone text,
  emirates_id text, nationality text, company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  unit_id uuid references units (id) on delete set null,
  tenant_id uuid references contacts (id) on delete set null,
  contract_no text, type text,
  annual_rent numeric(14,2) not null default 0,
  installments int not null default 1,
  start_date date, end_date date,
  deposit numeric(14,2) default 0, commission numeric(14,2) default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- money: cheques, receipts, vouchers, bills, accounts ----------
create table cheques (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  contract_id uuid references contracts (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  kind text not null default 'in',          -- 'in' | 'out'
  amount numeric(14,2) not null,
  due_date date not null,
  bank_name text, cheque_no text,
  status text not null default 'pending',   -- pending|deposited|cleared|bounced|replaced
  cleared_date date,
  replaces_id uuid references cheques (id) on delete set null,
  replaced_by_id uuid references cheques (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  contact_id uuid references contacts (id) on delete set null,
  contract_id uuid references contracts (id) on delete cascade,
  cheque_id uuid references cheques (id) on delete set null,
  date date not null, amount numeric(14,2) not null,
  method text, against text, voucher_no text,
  reconciled bool not null default false,
  created_at timestamptz not null default now()
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  payee_id uuid references contacts (id) on delete set null,
  bill_id uuid,
  date date not null, amount numeric(14,2) not null,
  category text, method text, ref text, voucher_no text,
  reconciled bool not null default false,
  created_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  supplier_id uuid references contacts (id) on delete set null,
  date date, due_date date, amount numeric(14,2) not null,
  category text, status text not null default 'unpaid', paid_date date, bill_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- vouchers.bill_id closes the loop once bills exists
alter table vouchers add constraint vouchers_bill_fk
  foreign key (bill_id) references bills (id) on delete set null;

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  bank text not null, label text, type text, iban text,
  kind text not null default 'operating',   -- operating | deposit
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- operations ----------
create table maintenance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  unit_id uuid references units (id) on delete set null,
  reporter_id uuid references contacts (id) on delete set null,
  category text, priority text, status text not null default 'new',
  assignee text, cost numeric(14,2), title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  source text, interest text, budget numeric(14,2),
  stage text not null default 'new',
  tower_id uuid references towers (id) on delete set null,
  owner_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  unit_id uuid references units (id) on delete set null,
  contact_id uuid references contacts (id) on delete set null,
  amount numeric(14,2), status text not null default 'held',
  date date, expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  type text, title text,
  contact_id uuid references contacts (id) on delete set null,
  tower_id uuid references towers (id) on delete set null,
  status text not null default 'open', ref_no text, opened_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  name text, category text, purchase_date date,
  cost numeric(14,2), useful_life_years int, status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  tower_id uuid references towers (id) on delete set null,
  type text, number text, rate numeric(14,4), last_reading numeric(14,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table readings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  meter_id uuid references meters (id) on delete cascade,
  date date, reading numeric(14,2), units numeric(14,2), amount numeric(14,2),
  collected bool not null default false,
  created_at timestamptz not null default now()
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text, sku text, category text,
  qty int default 0, unit_cost numeric(14,2), reorder_level int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  supplier_id uuid references contacts (id) on delete set null,
  date date, total numeric(14,2), status text not null default 'ordered', ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- people ----------
create table employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null, title text, department text,
  salary numeric(14,2) default 0, join_date date, status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payroll (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  employee_id uuid references employees (id) on delete cascade,
  period text not null,
  basic numeric(14,2), allowances numeric(14,2), deductions numeric(14,2), net numeric(14,2),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- admin ----------
create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null, type text, category text,
  linked_type text, linked_id uuid, storage_path text, size_kb int,
  added_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  type text, severity text, title text, body text, link text,
  read bool not null default false,
  created_at timestamptz not null default now()
);

-- ---------- hot-path indexes ----------
create index on units (company_id);
create index on units (tower_id);
create index on contacts (company_id);
create index on contracts (company_id);
create index on contracts (end_date);
create index on cheques (company_id);
create index on cheques (due_date);
create index on cheques (contract_id);
create index on receipts (company_id);
create index on receipts (date);
create index on vouchers (company_id);
create index on bills (company_id);
create index on maintenance (company_id);
create index on leads (company_id);
create index on readings (meter_id);
create index on payroll (employee_id);

-- ============================================================
-- RLS: org members read; writes tiered by role.
--   Operational tables: any member may write (front-desk work).
--   Finance tables: owner / manager / accountant only.
-- updated_at trigger attached to every table that has the column.
-- ============================================================
do $$
declare t text;
begin
  -- attach updated_at trigger where the column exists
  foreach t in array array[
    'towers','units','contacts','contracts','bills','bank_accounts','maintenance',
    'leads','bookings','cases','assets','meters','inventory_items','purchase_orders',
    'employees','payroll'
  ] loop
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;

  -- operational: read = member, write = member
  foreach t in array array[
    'towers','units','contacts','contracts','maintenance','leads','bookings',
    'cases','meters','readings','inventory_items','purchase_orders','documents','notifications'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_org_member(org_id))', t || '_sel', t);
    execute format('create policy %I on %I for all using (is_org_member(org_id)) with check (is_org_member(org_id))', t || '_rw', t);
  end loop;

  -- finance: read = member, write = owner/manager/accountant
  foreach t in array array[
    'cheques','receipts','vouchers','bills','assets','employees','payroll','bank_accounts'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_org_member(org_id))', t || '_sel', t);
    execute format($p$create policy %I on %I for all using (has_org_role(org_id,'owner','manager','accountant')) with check (has_org_role(org_id,'owner','manager','accountant'))$p$, t || '_rw', t);
  end loop;
end $$;
