# Product

## Register

product

## Users

Property and building managers who oversee a handful to a few dozen rental units. They are not accountants; they live in spreadsheets and group texts today. Their context is a busy desk between showings and maintenance calls. They open this to answer one question fast: who has paid this month, who hasn't, and who is late.

## Product Purpose

Hearth tracks rent collection across properties, units, leases, and payments. It replaces the manager's rent spreadsheet with a clear monthly picture: expected vs collected, occupancy, and an overdue list they can act on. Success is a manager glancing at the dashboard and knowing exactly where money stands, then marking payments in two clicks.

This build is a local, seeded prototype to demonstrate the product's look and feel. Data persists in the browser; auth and billing are simulated.

## Brand Personality

Grounded, calm, dependable. Three words: warm, organized, trustworthy. It should feel like a well-kept ledger, not a flashy fintech app. Voice is plain and concrete: "3 tenants overdue," never "optimize your revenue streams."

## Anti-references

- Cold navy-and-gold fintech dashboards (Mint-era heaviness).
- The blue/teal proptech monoculture (every rent app looks identical).
- AI-purple-on-white SaaS template, hero-metric gradient cards, eyebrow kickers on every panel.
- Cluttered enterprise property-management software (Yardi/AppFolio density without hierarchy).

## Design Principles

1. **The month is the unit of thought.** Every screen answers "where does rent stand this month" before anything else.
2. **Status is glanceable.** Paid / due / overdue must be readable in a sweep, by color and position, not by reading numbers.
3. **Earned familiarity.** Standard product patterns (side nav, tables, drawers). The tool disappears into the task.
4. **Quiet until it matters.** Neutral surface; color and weight reserved for money and overdue states.
5. **Real data shape.** Properties → Units → Leases → Payments, so it reads like software a manager could actually run a building on.

## Accessibility & Inclusion

WCAG AA: body text ≥4.5:1, large/bold ≥3:1. Status never encoded by color alone (always a label + icon). Full keyboard navigation on interactive controls. `prefers-reduced-motion` honored on every transition.
