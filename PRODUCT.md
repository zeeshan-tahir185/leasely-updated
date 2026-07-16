# Product

## Register

product

## Users

Dubai real-estate management firms: the owner, property managers, an accountant, and front-desk staff, together running one or more residential/commercial towers. They are busy people between showings, cheque runs, and maintenance calls, not software enthusiasts. Each role opens the app to answer its own question fast — the manager: who has paid this month and what's expiring; the accountant: which cheques to deposit and where the P&L stands; the owner: how each tower is performing.

## Product Purpose

Hearth runs the whole management office. The core loop is UAE rent collection — annual rent split into post-dated cheques, deposited, cleared, bounced, or replaced, with receipts booked automatically — surrounded by the departments that keep a building running: leasing (contracts, bookings, CRM), finance (receipts, payment vouchers, supplier bills, accounting & P&L, banking with reconciliation, fixed assets), operations (maintenance, utility meters, purchasing & inventory, legal cases, documents), people (HR & payroll), and admin (reports, notifications, settings). It is multi-company: one firm can manage several legal entities, each with its own towers and separate per-tower accounts. Modules are role-gated (owner / manager / accountant / employee); money is masked for roles without financial visibility.

Success is still glanceable money: a manager sees where rent stands and acts in two clicks; the printed artifacts (tenancy contract, receipt/payment vouchers, bank statement, P&L) look like documents a Dubai office would actually file.

This build is a local, seeded prototype to demonstrate the product's look and feel. Data persists in the browser; auth and billing are simulated. A real Postgres/Supabase backend is being built in `backend/`.

## Brand Personality

Grounded, calm, dependable. Three words: warm, organized, trustworthy. It should feel like a well-kept ledger, not a flashy fintech app. Voice is plain and concrete: "3 tenants overdue," never "optimize your revenue streams."

## Anti-references

- Cold navy-and-gold fintech dashboards (Mint-era heaviness).
- The blue/teal proptech monoculture (every rent app looks identical).
- AI-purple-on-white SaaS template, hero-metric gradient cards, eyebrow kickers on every panel.
- Cluttered enterprise property-management software (Yardi/AppFolio density without hierarchy). Hearth now has that breadth of modules; it must never have that noise.

## Design Principles

1. **The month is the unit of thought.** Every screen answers "where does money stand this month" before anything else.
2. **Status is glanceable.** Paid / due / overdue / bounced must be readable in a sweep, by color and position, not by reading numbers. Never color alone.
3. **Earned familiarity.** Standard product patterns (grouped side nav, tables, drawers, segmented filters). One component vocabulary across all modules; the tool disappears into the task.
4. **Quiet until it matters.** Neutral surface; color and weight reserved for money and overdue states.
5. **Real data shape.** Companies → Towers → Units → Contracts → Cheques → Receipts/Vouchers, so it reads like software a firm could actually run its buildings on. The cheque lifecycle (pending → deposited → cleared / bounced → replaced) is the domain's heart; side effects stay consistent (clearing a cheque books a receipt, paying a bill books a voucher).
6. **Paper still matters.** UAE offices print and file. Print views (contract, vouchers, bank statement, P&L) are first-class surfaces, not afterthoughts.

## Accessibility & Inclusion

WCAG AA: body text ≥4.5:1, large/bold ≥3:1. Status never encoded by color alone (always a label + icon). Full keyboard navigation on interactive controls. `prefers-reduced-motion` honored on every transition. Usable from a phone: the sidebar collapses to a drawer and wide tables scroll within their cards.
