# Leasely — Backend

The SaaS backend for Leasely (the Dubai/AED property-management platform). The
front-end is a high-fidelity React/Vite app that currently persists to
`localStorage`. This directory turns it into a real multi-tenant product.

## Decisions (locked 2026-06-29)

| Decision | Choice | Consequence |
|---|---|---|
| **Data residency** | UAE, from day one | **Self-hosted Supabase on AWS `me-central-1` (Dubai)** — Supabase has no native UAE region, so we run our own. Keeps Supabase DX (Postgres + GoTrue auth + Storage + auto REST + `auth.uid()` RLS) with data in-country. Schema is plain Postgres, so it stays portable. |
| **Tenancy** | One company per account | `company_id` **is** the tenant boundary. No org layer. Every row carries `company_id`; RLS scopes everything by `current_company_id()`. One company still owns many towers/units. |
| **Scope** | Production-grade up front | Full schema, audit log, billing, alerts, PDPL handling — delivered in reviewable phases. |

## Why the migration is small

Every write in the app already funnels through ~21 actions in
`src/data/store.jsx` (`createContract`, `setChequeStatus`, `setBillPaid`,
`runPayroll`, …), and every read is `companyId`-scoped through `scopeData` in
`src/lib/domain.js`. So:

1. The `companyId` filter maps **1:1** onto RLS policies — tenants are isolated
   *in the database*, not just the UI (today's RBAC is client-side only, i.e.
   not security).
2. The side-effecting actions become **server-side RPC functions** (atomic +
   authorized). These ledger invariants *must not* live in the browser.
3. The 28 pages keep calling the same ~21 actions; only their implementation
   swaps from `localStorage` to Supabase + TanStack Query.

## Architecture

```
React/Vite SPA  ──HTTPS──▶  Supabase (self-hosted, AWS me-central-1)
  TanStack Query              ├─ Postgres 15  (schema + RLS + RPC functions)
  supabase-js                 ├─ GoTrue       (auth → auth.users)
                              ├─ PostgREST    (auto REST API, RLS-enforced)
                              ├─ Storage      (documents, cheque/contract scans)
                              └─ Edge/cron    (alert engine: renewal & cheque due)
Stripe (AED Billing)  ──webhook──▶  Supabase
```

### Security model (RBAC → RLS)

The prototype's client-side roles (`owner` / `manager` / `accountant` /
`employee`) become enforced in the database:

- **Tenant isolation** — every policy requires `company_id = current_company_id()`.
- **Financial visibility** — financial tables (receipts, vouchers, bills,
  banking, accounting, payroll, inventory) add `can_view_financials()`
  (everyone *except* `employee`), mirroring `ROLE_CAPS.viewFinancials`.
- **Posting** — writes to financial entities require `can_post()`
  (`owner`/`manager`/`accountant`). Operational tables (contacts, leads,
  maintenance, bookings) are writable by any company member, including
  front-desk employees.
- Ledger mutations route through **`SECURITY DEFINER` RPC functions** that
  re-check role + company and write `audit_log`. Direct-table policies are
  defense-in-depth.

## Layout

```
backend/
  README.md                      ← this file
  migrations/
    0001_foundation.sql          ← extensions, enums, companies, profiles,
                                    RLS helpers, signup onboarding, audit_log
    0002_core_ledger.sql         ← contacts, towers, units, contracts, cheques,
                                    receipts, vouchers, bills, bank_accounts + RLS
    0003_ledger_functions.sql    ← the ledger invariants as SECURITY DEFINER RPCs
                                    (create_contract, set_cheque_status, …)
    (0004+ added per phase — see the task list)
  test/
    validate.mjs                 ← runs the migrations against real Postgres +
                                    asserts invariants, RLS, and RBAC
    shim.sql                     ← LOCAL-only Supabase environment stub
```

## Field-name mapping (prototype → DB)

The schema mirrors `src/data/seed.js`, with a few renames to remove ambiguity.
The Phase-7 API client maps between them.

| Prototype (`store`/`seed`) | DB column | Note |
|---|---|---|
| `contact.kind` (`["tenant","buyer"]`) | `contacts.kinds` | array, renamed plural |
| `contact.company` | `contacts.org_name` | the contact's employer/free-zone entity (avoid clash with the tenant `company_id`) |
| `receipt.voucherNo` (`RV-…`) | `receipts.receipt_no` | it's a receipt no., not a payment voucher |
| `voucher.voucherNo` (`PV-…`) | `vouchers.voucher_no` | payment voucher |
| `*.isNew`, `*.createdTs` | — | UI-only "new record" highlight; dropped (derive from `created_at` client-side) |
| string ids (`co-westwood`) | `uuid` PKs | semantic ids were demo-only |
| integer AED | `numeric(14,2)` | exact decimal money |

## Validating locally

No `psql`/`docker`/`supabase` CLI is needed. The harness runs the **real
migrations, unmodified**, against a genuine Postgres engine (PGlite — Postgres
compiled to WASM, in-process) on top of a small Supabase-environment shim, and
asserts the invariants, tenant isolation, and RBAC:

```bash
cd backend/test
npm install        # once — pulls @electric-sql/pglite
npm test           # → applies 0001–0004, runs 34 assertions
```

Current status: **34/34 passing** — schema applies clean; contract→cheques (exact
sum), clear→receipt, bill→voucher all hold; a second tenant sees zero of the
first's rows; an `employee` can't read receipts, insert them, or call a posting
RPC. The shim (`test/shim.sql`) stubs only what Supabase provides for real
(`auth.users`, `auth.uid()`, the `authenticated`/`anon` roles) — **never run it
against Supabase.**

## Deploying (when an instance exists)

```bash
# against a Supabase project (self-hosted on AWS me-central-1):
supabase db reset                      # applies migrations/ in order, or:
psql "$DATABASE_URL" -f migrations/0001_foundation.sql
psql "$DATABASE_URL" -f migrations/0002_core_ledger.sql
psql "$DATABASE_URL" -f migrations/0003_ledger_functions.sql
```
