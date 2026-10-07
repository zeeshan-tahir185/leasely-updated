-- =============================================================================
-- 0002_core_ledger.sql
-- Leasely backend — the rent-collection heart: contacts, towers, units, contracts,
-- cheques, receipts, vouchers, bills, bank_accounts.
--
-- Field names mirror src/data/seed.js (see backend/README.md for the few renames).
-- Multi-tenant integrity: every table has `unique (id, company_id)`, and child
-- FKs reference `(parent_id, company_id)` — so it is structurally impossible to
-- link a row to another tenant's record. Money is numeric(14,2) (exact decimal).
-- =============================================================================

-- ── contacts: tenants, owners, suppliers, buyers, leads (one row, many kinds) ──
create table contacts (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  kinds       contact_kind[] not null default '{}',   -- e.g. {tenant,buyer}
  name        text not null,
  email       citext,
  phone       text,
  emirates_id text,
  nationality text,
  org_name    text,            -- the contact's employer / free-zone entity (seed: `company`)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index contacts_company_idx on contacts (company_id);
create index contacts_kinds_idx   on contacts using gin (kinds);

-- ── towers (buildings) ─────────────────────────────────────────────────────────
create table towers (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  area        text,
  address     text,
  plot        text,
  floors      int,
  type        text,            -- Residential / Mixed Use / Commercial
  owner_name  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index towers_company_idx on towers (company_id);

-- ── units (a tower's lettable spaces) ───────────────────────────────────────────
create table units (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid not null,
  label       text not null,
  floor       int,
  unit_type   text check (unit_type in ('Studio','1BHK','2BHK','3BHK','4BHK','Office','Retail Shop')),
  beds        int,
  baths       int,
  sqft        int,
  annual_rent numeric(14,2),   -- market asking rent (yearly)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id, company_id) references towers (id, company_id) on delete cascade
);
create index units_tower_idx on units (tower_id);
create unique index units_tower_label_idx on units (tower_id, label);

-- ── contracts (tenancy) ─────────────────────────────────────────────────────────
create table contracts (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid not null,
  unit_id     uuid not null,
  tenant_id   uuid not null,
  contract_no text,
  type        contract_type   not null default 'Residential',
  annual_rent numeric(14,2)   not null,
  installments int            not null default 1 check (installments between 1 and 12),
  start_date  date not null,
  end_date    date not null,
  deposit     numeric(14,2)   not null default 0,
  commission  numeric(14,2)   not null default 0,
  status      contract_status not null default 'active',
  clauses     jsonb,          -- per-contract tenancy clauses; null → app defaults
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id,  company_id) references towers   (id, company_id),
  foreign key (unit_id,   company_id) references units    (id, company_id),
  foreign key (tenant_id, company_id) references contacts (id, company_id),
  check (end_date > start_date)
);
create index contracts_company_idx on contracts (company_id);
create index contracts_unit_idx    on contracts (unit_id);
create index contracts_tenant_idx  on contracts (tenant_id);

-- ── cheques (post-dated rent installments + outgoing) ───────────────────────────
-- The UAE core: an incoming cheque is a rent installment; clearing it books a
-- receipt (see 0003). replaces_id / replaced_by_id chain a bounced cheque to its
-- replacement.
create table cheques (
  id             uuid not null default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  tower_id       uuid,
  kind           cheque_kind   not null default 'in',
  contract_id    uuid,
  contact_id     uuid,
  amount         numeric(14,2) not null,
  due_date       date not null,
  bank_name      text,
  cheque_no      text,
  status         cheque_status not null default 'pending',
  cleared_date   date,
  replaces_id    uuid,          -- the bounced cheque this one replaces
  replaced_by_id uuid,          -- the fresh cheque that replaced this one
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id,       company_id) references towers    (id, company_id),
  foreign key (contract_id,    company_id) references contracts (id, company_id) on delete cascade,
  foreign key (contact_id,     company_id) references contacts  (id, company_id),
  foreign key (replaces_id,    company_id) references cheques   (id, company_id),
  foreign key (replaced_by_id, company_id) references cheques   (id, company_id),
  check (status <> 'cleared' or cleared_date is not null)
);
create index cheques_company_due_idx on cheques (company_id, due_date);
create index cheques_contract_idx    on cheques (contract_id);
create index cheques_status_idx      on cheques (company_id, status);

-- ── receipts (money in) ─────────────────────────────────────────────────────────
-- A cleared incoming cheque produces exactly one rent receipt; standalone receipts
-- (e.g. a deposit by bank transfer) carry no cheque_id.
create table receipts (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid,
  date        date not null default current_date,
  contact_id  uuid,
  amount      numeric(14,2) not null,
  method      payment_method  not null default 'cheque',
  cheque_id   uuid,           -- the incoming cheque this receipt was booked from
  against     receipt_against not null default 'rent',
  contract_id uuid,
  receipt_no  text,           -- RV-… (seed: voucherNo)
  reconciled  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id,    company_id) references towers    (id, company_id),
  foreign key (contact_id,  company_id) references contacts  (id, company_id),
  foreign key (cheque_id,   company_id) references cheques   (id, company_id) on delete cascade,
  foreign key (contract_id, company_id) references contracts (id, company_id) on delete cascade
);
create index receipts_company_date_idx on receipts (company_id, date desc);
-- one receipt per cleared cheque (mirrors the store's find-by-chequeId invariant)
create unique index receipts_cheque_idx on receipts (cheque_id) where cheque_id is not null;

-- ── bills (supplier invoices, money owed) ───────────────────────────────────────
create table bills (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid,
  supplier_id uuid,
  date        date not null default current_date,
  due_date    date,
  amount      numeric(14,2)   not null,
  category    expense_category not null default 'other',
  status      bill_status     not null default 'unpaid',   -- 'overdue' derived from due_date
  bill_no     text,
  paid_date   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id,    company_id) references towers   (id, company_id),
  foreign key (supplier_id, company_id) references contacts (id, company_id)
);
create index bills_company_status_idx on bills (company_id, status);

-- ── vouchers (payment vouchers, money out) ──────────────────────────────────────
-- Paying a bill books a voucher linked back via bill_id (see 0003).
create table vouchers (
  id          uuid not null default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  tower_id    uuid,
  date        date not null default current_date,
  payee_id    uuid,
  amount      numeric(14,2)   not null,
  category    expense_category not null default 'other',
  method      payment_method  not null default 'bank',
  ref         text,
  voucher_no  text,           -- PV-…
  bill_id     uuid,           -- the supplier bill this voucher paid
  reconciled  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id),
  unique (id, company_id),
  foreign key (tower_id, company_id) references towers   (id, company_id),
  foreign key (payee_id, company_id) references contacts (id, company_id),
  foreign key (bill_id,  company_id) references bills    (id, company_id) on delete cascade
);
create index vouchers_company_date_idx on vouchers (company_id, date desc);
-- one voucher per paid bill
create unique index vouchers_bill_idx on vouchers (bill_id) where bill_id is not null;

-- ── bank_accounts (the company's own accounts) ──────────────────────────────────
-- Balances & movements are DERIVED from receipts/vouchers that settle through a
-- bank (see Phase 5); only the account definitions + opening balance are stored.
create table bank_accounts (
  id           uuid not null default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  bank         text not null,
  label        text,
  account_type text,          -- Current / Escrow
  iban         text,
  kind         bank_account_kind not null default 'operating',
  opening      numeric(14,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (id),
  unique (id, company_id)
);
create index bank_accounts_company_idx on bank_accounts (company_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'contacts','towers','units','contracts','cheques','receipts','vouchers','bills','bank_accounts'
  ] loop
    execute format(
      'create trigger %1$s_set_updated_at before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- enable_company_rls(table, financial, posters_only):
--   financial=true    → SELECT requires can_view_financials() (hides money from employees)
--   posters_only=true → writes require can_post() (owner/manager/accountant)
select enable_company_rls('contacts');                 -- front desk manages contacts
select enable_company_rls('towers',        false, true);   -- managers manage property
select enable_company_rls('units',         false, true);
select enable_company_rls('contracts',     false, true);   -- employees view; create via RPC
select enable_company_rls('cheques',       false, true);   -- employees view; status via RPC
select enable_company_rls('receipts',      true,  true);   -- financial
select enable_company_rls('vouchers',      true,  true);
select enable_company_rls('bills',         true,  true);
select enable_company_rls('bank_accounts', true,  true);
