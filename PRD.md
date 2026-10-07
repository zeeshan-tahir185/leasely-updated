# Leasely — Product Requirements Document

**Status:** Draft · **Last updated:** 2026-09-22 · **Owner:** Mohammed Jaas
**Related:** [`PRODUCT.md`](./PRODUCT.md) (product brief) · [`backend/README.md`](./backend/README.md) (backend plan)

---

## 1. Summary

Leasely is a property-management platform for Dubai/UAE real-estate firms. It runs
the whole management office around one core loop — **UAE rent collection via
post-dated cheques** — surrounded by the departments that keep a building
running: leasing, finance, operations, people, and admin.

A firm manages one or more legal entities (companies), each owning towers, units,
tenants, and contracts. Annual rent is split into post-dated cheques that move
through a lifecycle (pending → deposited → cleared / bounced → replaced), booking
receipts automatically as they clear. The product is multi-company and role-gated,
and it treats printed artifacts (tenancy contract, vouchers, bank statement, P&L)
as first-class surfaces, because UAE offices print and file.

**Current state:** a high-fidelity, seeded front-end prototype (React/Vite,
`localStorage`) demonstrating the full product surface — 19 modules / 26 pages.
A production Postgres/Supabase backend is scoped and partially built in
`backend/` (schema + ledger RPCs + RLS, validated against real Postgres).

---

## 2. Problem & Context

UAE residential/commercial leasing runs on a payment instrument most global rent
software does not model: the **post-dated cheque**. A tenant signs an annual
tenancy contract and hands over 1–12 cheques dated across the year. The managing
office deposits each on its date; it clears, or it bounces — and a bounced cheque
is a legal event (police case, RERA/court recovery), not just a failed charge.

Firms today juggle this across spreadsheets, WhatsApp, physical cheque drawers,
and generic accounting tools that don't understand cheques, Ejari, security
deposits, or the Dubai document set. The office also has to run everything
*around* rent: leasing pipelines, supplier bills, maintenance, HR/payroll,
legal cases, and an owner-facing P&L per tower.

**Existing tools miss the mark in one of two ways:**
- Generic proptech (blue/teal monoculture) models monthly rent + card payments,
  not annual post-dated cheques or the UAE document set.
- Enterprise suites (Yardi/AppFolio) have the breadth but bury it in
  cluttered, high-density UI a small Dubai office won't adopt.

Leasely's bet: the *breadth* of an enterprise suite with the *calm, glanceable*
feel of a well-kept ledger, built natively around the cheque lifecycle and UAE
paperwork.

---

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Make money glanceable.** Every screen answers "where does rent stand this
   month?" before anything else. A manager sees paid / due / overdue / bounced in
   a sweep and acts in two clicks.
2. **Model the cheque lifecycle natively**, with automatic, consistent side
   effects (clearing books a receipt; paying a bill books a voucher).
3. **Run the whole office**, not just rent — leasing, finance, operations,
   people, admin — under one component vocabulary so the tool disappears into the
   task.
4. **Produce filing-grade paper.** Printed contract, vouchers, bank statement,
   and P&L look like documents a Dubai office would actually file.
5. **Be multi-company and role-safe.** One firm, several legal entities; modules
   gated by role; money masked from roles without financial visibility.
6. **Keep data in-country.** UAE data residency and PDPL handling from day one.

### 3.2 Non-Goals (for the current phase)

- **Tenant-facing / self-service portal.** Leasely is an office tool for staff;
  tenants do not log in.
- **Payment processing / online rent collection.** Cheques and bank transfers are
  recorded, not initiated. (Stripe is scoped only for Leasely's own SaaS billing.)
- **Full double-entry general ledger / IFRS accounting.** Leasely produces a
  management P&L and cash view, not audited statutory accounts.
- **Native mobile apps.** The web app is responsive (usable from a phone); no
  iOS/Android build.
- **Multi-country tax engines.** Built for the UAE (AED, DEWA, Ejari, RERA);
  other jurisdictions are out of scope.

---

## 4. Users & Personas

A single firm's staff, each opening the app to answer their own question fast.
Roles map 1:1 to the access model in `src/lib/rbac.js`.

| Persona | Role key | Opens Leasely to… | Sees money? |
|---|---|---|---|
| **Owner / GM** | `owner` | See how each tower performs; consolidated P&L; full control incl. company settings & users. | Yes |
| **Property Manager** | `manager` | Run day-to-day leasing + operations: who's paid, what's expiring, maintenance, bookings. Full module access + users. | Yes |
| **Accountant** | `accountant` | Which cheques to deposit, receipts/vouchers/bills to post, banking reconciliation, P&L. Finance + reports, no operations/HR/CRM. | Yes |
| **Front-desk Employee** | `employee` | Log contacts, leads, maintenance requests, bookings; look up contracts/cheques. **Money is masked.** | No |

**Shared traits:** busy, non-technical, moving between showings, cheque runs, and
maintenance calls. They need answers in a glance and actions in a couple of
clicks — not dashboards to configure.

---

## 5. Success Metrics

Because this is a prototype pre-revenue, metrics are split into product-quality
signals (now) and business signals (post-launch).

**Product quality (demonstrable now):**
- A manager can answer "where does rent stand this month?" within ~2s of load.
- Any rent state (paid / due / overdue / bounced) is identifiable without reading
  numbers — by color **and** position/label (never color alone).
- Every ledger side effect holds: contract cheques sum exactly to annual rent;
  clearing a cheque books exactly one receipt; paying a bill books exactly one
  voucher. (Backend: 21/21 invariant + RLS + RBAC assertions passing.)
- Print views render as filing-grade A4 documents.

**Business (post-launch targets, to be set with first customers):**
- Time-to-first-value: firm imports a tower and sees its cheque calendar in < 30 min.
- Weekly active use by ≥ 2 roles per firm (manager + accountant).
- Cheque-run accuracy: % of due cheques actioned on-date via Leasely vs. missed.
- Renewal capture: % of expiring contracts renewed before end date.

---

## 6. Domain Model

The data shape is deliberately real, so it reads like software a firm could run
its buildings on.

```
Company (legal entity)
  └─ Tower (building/house)
       └─ Unit (Studio / 1–4BHK / Office / Retail Shop)
            └─ Contract (Residential | Commercial, annual)
                 ├─ Cheque × N   (post-dated rent instalments)
                 │     └─ Receipt (booked on clear)
                 ├─ Security deposit
                 └─ Ejari / commission / booking fees
Contact (tenant | buyer)  ── party to contracts, cheques, cases
```

Supporting entities: leads, bookings, supplier bills → payment vouchers, bank
accounts + movements, maintenance work orders, purchase orders + inventory,
legal/police cases, HR employees + payroll, documents, notifications/alerts.

### 6.1 The cheque lifecycle (the heart)

```
   pending ──deposit──▶ deposited ──clear──▶ cleared  ──(books Receipt)
      │                     │
      │                     └──bounce──▶ bounced ──replace──▶ replaced
      └───────────────────────────────────────────────▶ (new cheque issued)
```

Statuses (`src/lib/constants.js` → `CHEQUE_STATUSES`):
`pending`, `deposited`, `cleared`, `bounced`, `replaced`.

**Invariants (must hold in every implementation):**
- Creating a contract generates cheques whose amounts **sum exactly** to the
  annual rent (per the chosen split: 1/2/4/6/12 instalments).
- Setting a cheque to `cleared` books **one** receipt (money in) against the
  contract, tower, and company.
- A `bounced` cheque can be `replaced` by a new pending cheque; the replacement
  chain is preserved (and may spawn a legal/police case).
- Paying a supplier bill books **one** payment voucher (money out).
- Every receipt/voucher carries `company_id` + `tower_id` so P&L and banking
  reconcile per tower and consolidate per company.

These invariants live server-side as `SECURITY DEFINER` RPCs in the backend
(`create_contract`, `set_cheque_status`, `set_bill_paid`, `run_payroll`, …); the
prototype enforces them in `src/data/store.jsx`.

---

## 7. Scope — Modules & Functional Requirements

19 modules in 6 sidebar groups (`src/lib/modules.js`). Each is **Built** in the
prototype today. Requirements below describe intended behavior.

### 7.1 Workspace

- **Dashboard** — The month at a glance: collected vs. expected this month,
  overdue/bounced counts, occupancy, expiring contracts, collections trend
  (6-mo), per-tower performance, alert feed. Money masked for `employee`.
- **Contacts** — Tenants and buyers (kinds are multi-valued). Contact detail,
  org/employer, links to their contracts, cheques, and cases.
- **Leads & CRM** — Leasing pipeline: enquiry → viewing → negotiation → won/lost,
  source, assigned agent, convert-to-contract. *(Not visible to `accountant`.)*
- **Towers & Units** — Tower list + detail (`TowerDetail`), unit inventory with
  type/beds/rent/occupancy, bulk unit creation, per-tower financial rollup.

### 7.2 Leasing

- **Contracts** — Create/renew annual tenancy; sets rent, term, deposit, cheque
  split, clauses. Generates the cheque schedule. **Print:** Ejari-style tenancy
  contract (`ContractPrint`) with editable clauses (`DEFAULT_CONTRACT_CLAUSES`).
- **Bookings** — Reservations/holds against units with booking amounts and
  status. *(Not visible to `accountant`.)*
- **Cheque Management** — The cheque register: filter by status/tower/bank/date;
  deposit, clear, bounce, replace. Due-soon and overdue surfacing. Clearing books
  a receipt; bouncing can open a case. Visible to all roles incl. `employee`
  (money masked).

### 7.3 Finance *(hidden from `employee`; `viewFinancials` required)*

- **Receipts** — Money-in register (rent, deposits, commission, Ejari, booking,
  other). **Print:** receipt voucher (`VoucherPrint`). Numbered `RV-…`.
- **Payment Vouchers** — Money-out register (supplier, salary, owner payout,
  commission, misc). **Print:** payment voucher. Numbered `PV-…`.
- **Supplier Bills** — Vendor bills by category; paid/unpaid (overdue derived from
  due date). Paying a bill books a payment voucher.
- **Accounting & P&L** — Management P&L over a period, filterable by tower/date;
  income vs. expense categories (`src/lib/pnl.js`). **Print:** P&L (`PnlPrint`).
- **Banking** — Bank accounts, movements, running balances, reconciliation of
  receipts/vouchers against statements. **Print:** bank statement
  (`BankStatementPrint`).

### 7.4 Operations *(`employee` sees Maintenance only; `accountant` sees none)*

- **Maintenance** — Work orders: category, priority (urgent→low), status
  (new → assigned → in_progress → resolved → closed), assignment. Employees can
  create.
- **Purchasing & Inventory** — Spare-parts stock + purchase orders
  (ordered → received → cancelled).
- **Legal & Police** — Cases (legal | police), typically from a bounced cheque or
  rent recovery: open → in_court → won/lost → closed.
- **Documents** — Document archive (DMS) by category (Contracts, Company, Towers,
  Tenants, Utilities, Financial, Maintenance, Other) with uploads/scans.

### 7.5 People

- **HR & Payroll** — Employees by department; salary breakdown (basic +
  allowances − deductions → net) and payroll runs (books vouchers).
  *(Owner/Manager only.)*

### 7.6 Admin

- **Reports** — Cross-module reporting per privilege (collections, occupancy,
  P&L, cheque aging).
- **Notifications** — Alert feed: renewals due, cheques due/overdue, bounced,
  bills overdue (`src/lib/alerts.js`). Visible to all roles.
- **Settings** — Company profile, company switcher, users/roles, preferences.
  Company-level admin is owner-only (`manageCompany`).

---

## 8. Roles & Permissions

Module access (`ROLE_MODULES`) and action caps (`ROLE_CAPS`) from
`src/lib/rbac.js`. ✅ = has access.

### 8.1 Module access matrix

| Module | Owner | Manager | Accountant | Employee |
|---|:--:|:--:|:--:|:--:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Contacts | ✅ | ✅ | ✅ | ✅ |
| Leads & CRM | ✅ | ✅ | — | ✅ |
| Towers & Units | ✅ | ✅ | ✅ | ✅ |
| Contracts | ✅ | ✅ | ✅ | ✅ |
| Bookings | ✅ | ✅ | — | ✅ |
| Cheque Management | ✅ | ✅ | ✅ | ✅ |
| Receipts | ✅ | ✅ | ✅ | — |
| Payment Vouchers | ✅ | ✅ | ✅ | — |
| Supplier Bills | ✅ | ✅ | ✅ | — |
| Accounting & P&L | ✅ | ✅ | ✅ | — |
| Banking | ✅ | ✅ | ✅ | — |
| Maintenance | ✅ | ✅ | — | ✅ |
| Purchasing & Inventory | ✅ | ✅ | — | — |
| Legal & Police | ✅ | ✅ | — | — |
| Documents | ✅ | ✅ | — | — |
| HR & Payroll | ✅ | ✅ | — | — |
| Reports | ✅ | ✅ | ✅ | — |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | — |

### 8.2 Action capabilities

| Capability | Owner | Manager | Accountant | Employee |
|---|:--:|:--:|:--:|:--:|
| `viewFinancials` (see money, un-masked) | ✅ | ✅ | ✅ | — |
| `post` (write financial entities) | ✅ | ✅ | ✅ | — |
| `manageUsers` | ✅ | ✅ | — | — |
| `manageCompany` | ✅ | — | — | — |

> **Note:** In the prototype, RBAC is **client-side only** (UI gating, not
> security). The backend re-implements every rule as Postgres **RLS + RPC role
> checks** so tenants and roles are enforced *in the database*. Tenant isolation
> (`company_id = current_company_id()`) is non-negotiable.

---

## 9. Key User Flows

1. **New tenancy → cheque schedule.** Manager creates a contract (unit, tenant,
   rent, term, deposit, split) → Leasely generates N post-dated cheques summing to
   annual rent → prints the tenancy contract for signature.
2. **Cheque run.** Accountant filters cheques due this week → deposits them → on
   clearance marks `cleared`, which books a receipt and updates the month's
   collected figure and the tower P&L.
3. **Bounced cheque → recovery.** Accountant marks a cheque `bounced` → opens a
   police/legal case → issues a replacement cheque → tracks the case to closure.
4. **Supplier bill → payment.** Manager records a supplier bill → on payment,
   Leasely books a payment voucher (money out) reflected in banking and P&L.
5. **Renewal.** Notifications surface contracts expiring within 60 days →
   manager renews → new cheque schedule generated.
6. **Owner review.** Owner opens Dashboard/Reports → consolidated + per-tower P&L,
   occupancy, collections trend → prints P&L.
7. **Front-desk intake.** Employee logs a walk-in as a contact/lead and files a
   maintenance request — without ever seeing financial figures.

---

## 10. Design & UX Requirements

From `PRODUCT.md`. Brand personality: **grounded, calm, dependable** — "a
well-kept ledger, not a flashy fintech app." Voice is plain and concrete
("3 tenants overdue," never "optimize your revenue streams").

**Principles (binding):**
1. **The month is the unit of thought** — every screen leads with "where does
   money stand this month?"
2. **Status is glanceable** — paid / due / overdue / bounced readable in a sweep
   by color **and** position, **never color alone** (always label + icon).
3. **Earned familiarity** — one component vocabulary across all 19 modules
   (grouped side nav, tables, drawers, segmented filters).
4. **Quiet until it matters** — neutral surface; color/weight reserved for money
   and overdue states.
5. **Real data shape** — Companies → Towers → Units → Contracts → Cheques →
   Receipts/Vouchers.
6. **Paper still matters** — print views are first-class surfaces.

**Anti-references (do not become):** cold navy-and-gold fintech; blue/teal
proptech monoculture; AI-purple SaaS template with gradient hero-metric cards;
cluttered enterprise density (Yardi/AppFolio noise). Leasely has that *breadth* —
it must never have that *noise*.

---

## 11. Non-Functional Requirements

- **Accessibility (WCAG AA):** body text ≥ 4.5:1, large/bold ≥ 3:1; status never
  encoded by color alone (label + icon); full keyboard nav on interactive
  controls; `prefers-reduced-motion` honored on every transition.
- **Responsive:** usable from a phone — sidebar collapses to a drawer, wide tables
  scroll within their cards, KPIs reflow. (Done: mobile shell pass, 2026-07-17.)
- **Performance:** route-level code splitting; every page route lazy-loaded;
  stable vendor chunk (~98 KB gzip initial). Fast first paint; the month view
  loads without a spinner-wall.
- **Internationalization:** UAE-first — AED currency, `dd/mm/yyyy`, English UI
  (Arabic/RTL a future consideration, not committed).
- **Data residency & privacy:** UAE from day one — self-hosted Supabase on AWS
  `me-central-1` (Dubai); PDPL handling; audit log on ledger mutations.
- **Security:** tenant isolation and role enforcement in the database (RLS +
  `SECURITY DEFINER` RPCs), not just the client.

---

## 12. Technical Architecture

### 12.1 Current prototype (built)

- **React 19 + Vite 8**, React Router 7 (lazy routes), `lucide-react` icons,
  Inter variable font.
- **State:** single store (`src/data/store.jsx`) over `localStorage`; ~19 write
  actions funnel every mutation; reads are `companyId`-scoped via `scopeData`
  (`src/lib/domain.js`).
- **Seeded demo data** (`src/data/seed.js`): multiple companies, towers, units,
  contracts, generated cheques/receipts, bills, vouchers, leads, bookings, cases,
  employees, payroll, inventory, documents.
- **Auth/billing:** simulated (`SignIn` page, role picker).

### 12.2 Backend plan (scoped; partially built in `backend/`)

- **Self-hosted Supabase on AWS `me-central-1`** (no native UAE region) —
  Postgres 15 + GoTrue auth + Storage + PostgREST + Edge/cron.
- **Tenancy:** `company_id` **is** the tenant boundary (no org layer); every row
  carries it; RLS scopes everything by `current_company_id()`.
- **Ledger invariants** become `SECURITY DEFINER` RPCs (atomic + authorized +
  audit-logged); direct-table RLS is defense-in-depth.
- **Migration is small by design:** the 26 pages keep calling the same ~19
  actions; only the implementation swaps `localStorage` → Supabase + TanStack
  Query. The client `companyId` filter maps 1:1 onto RLS.
- **Billing:** Stripe (AED) → Supabase webhook, for Leasely's own SaaS
  subscription (not tenant rent).
- **Migrations delivered:** `0001_foundation` (extensions, enums, companies,
  profiles, RLS helpers, signup onboarding, audit_log), `0002_core_ledger`
  (contacts, towers, units, contracts, cheques, receipts, vouchers, bills, bank
  accounts + RLS), `0003_ledger_functions` (ledger RPCs), `0004_operations`.
- **Validation:** migrations run unmodified against real Postgres (PGlite/WASM)
  via `backend/test/validate.mjs` — **21/21 assertions passing** (invariants +
  tenant isolation + RBAC).

---

## 13. Release Phases

| Phase | Scope | Status |
|---|---|---|
| **0 — Prototype** | Full front-end surface (19 modules), seeded, `localStorage`, print views, responsive shell, RBAC (client). | ✅ Complete & committed (`main`) |
| **1 — DB foundation** | Schema, enums, companies/profiles, RLS helpers, audit log, signup onboarding. | ✅ `0001` |
| **2 — Core ledger** | Contacts→…→cheques/receipts/vouchers/bills/bank + RLS. | ✅ `0002` |
| **3 — Ledger RPCs** | Invariants as `SECURITY DEFINER` functions. | ✅ `0003` |
| **4 — Operations tables** | Maintenance, meters, inventory, cases, docs, HR. | ✅ `0004` (validated) |
| **5 — Auth wiring** | GoTrue sign-in/up, profile→company onboarding, session. | ⏳ Planned |
| **6 — API client swap** | Pages call Supabase + TanStack Query behind the same ~19 actions. | ⏳ Planned |
| **7 — Storage + alerts** | Document/scan storage; Edge/cron alert engine (renewals, cheque-due). | ⏳ Planned |
| **8 — Billing** | Stripe AED subscription + webhooks. | ⏳ Planned |
| **9 — Deploy** | Self-hosted Supabase on AWS `me-central-1`; PDPL review. | ⏳ Planned |

---

## 14. Open Questions & Risks

- **Self-hosting Supabase in `me-central-1`** carries real ops cost (backups,
  upgrades, monitoring, HA). Is a managed alternative with a UAE region viable, or
  is self-host firmly required for PDPL? *(Currently: self-host locked.)*
- **Arabic/RTL:** committed for launch, or fast-follow? Affects print templates
  and layout mirroring.
- **Statutory accounting:** will customers expect VAT-ready / audit-grade output,
  or is a management P&L sufficient for the target segment?
- **Ejari integration:** manual print vs. official Ejari system integration.
- **Cheque digitization:** is cheque-image capture/OCR in scope, or is manual
  entry acceptable at launch?
- **Go-to-market:** ICP within Dubai (independent management offices vs. developer
  in-house teams); pricing per company / per tower / per unit.

---

*This PRD describes Leasely as built (prototype) and as planned (backend). Where the
two differ, the prototype is the current source of truth for behavior and the
backend README is the source of truth for the production data model.*
