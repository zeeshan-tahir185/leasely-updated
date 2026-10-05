import { Link } from "react-router-dom";
import {
  MapPin,
  ArrowRight,
  Check,
  ReceiptText,
  FileText,
  LineChart,
  Wrench,
  Layers,
  Printer,
  Landmark,
  ShieldCheck,
  Coins,
  Building2,
  CheckCheck,
  ChevronDown,
} from "lucide-react";
import Reveal from "./Reveal";
import ProductPreview from "./ProductPreview";

const FAQ_TEASER = [
  {
    q: "How much does Leasely cost?",
    a: "Pricing is tailored to the size of your portfolio — the number of towers, units, and team members you manage. Tell us what you run and we'll put a clear quote in front of you, no obligation.",
  },
  {
    q: "Can I manage more than one company?",
    a: "Yes. Leasely is multi-company by design: one firm can hold several legal entities, each with its own towers and its own separate per-tower accounts.",
  },
  {
    q: "Does it handle bounced and replaced cheques?",
    a: "That's the core of it. Every post-dated cheque moves through pending → deposited → cleared or bounced → replaced, and the matching receipt or reversal is booked for you automatically.",
  },
  {
    q: "Who on my team can see the money?",
    a: "You decide. Access is scoped by role — owner, manager, accountant, or employee — and financial figures are masked from anyone who shouldn't see them.",
  },
];

export default function Landing() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="m-hero">
        <div className="m-container m-hero-grid">
          <div className="m-hero-copy">
            <span className="m-pill m-rise" style={{ animationDelay: "40ms" }}>
              <MapPin /> Built for Dubai real estate
            </span>
            <h1 className="m-h1 m-rise" style={{ animationDelay: "100ms" }}>
              Know exactly where rent stands — every month.
            </h1>
            <p className="m-lede m-rise" style={{ animationDelay: "170ms" }}>
              Leasely runs your whole property office: post-dated cheques,
              receipts, contracts, and accounts for every tower you manage.
              No spreadsheets, no guessing who has paid.
            </p>
            <div className="m-cta-row m-rise" style={{ animationDelay: "240ms" }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Register your company <ArrowRight />
              </Link>
              <Link to="/login" className="btn btn-lg">
                Log in
              </Link>
            </div>
            <ul className="m-hero-trust m-rise" style={{ animationDelay: "310ms" }}>
              <li className="m-hero-trust-item"><Check /> UAE post-dated cheques</li>
              <li className="m-hero-trust-item"><Check /> Role-based access</li>
              <li className="m-hero-trust-item"><Check /> Print-ready documents</li>
            </ul>
          </div>

          <div className="m-hero-visual m-rise" style={{ animationDelay: "260ms" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <div className="m-trustline">
        <span className="m-trustline-item">
          <Coins /> <strong>AED-native</strong>
        </span>
        <span className="m-trustline-item">
          <Building2 /> <strong>Multi-company, multi-tower</strong>
        </span>
        <span className="m-trustline-item">
          <FileText /> <strong>Tenancy contracts &amp; renewals</strong>
        </span>
        <span className="m-trustline-item">
          <ShieldCheck /> <strong>Role-based, privacy-aware</strong>
        </span>
      </div>

      {/* ---------- Features (bento) ---------- */}
      <section className="m-section" id="features">
        <div className="m-container">
          <Reveal className="m-section-head">
            <h2 className="m-h2">One office, every department.</h2>
            <p className="m-lede">
              Rent collection sits at the centre. Around it, the departments that
              keep a building running — leasing, finance, operations — share one
              set of records and one way of working.
            </p>
          </Reveal>

          <Reveal className="m-features">
            <article className="m-feature m-feature-lead">
              <span className="m-feature-ic"><ReceiptText /></span>
              <h3>Rent &amp; post-dated cheques</h3>
              <p>
                The heart of Leasely. Split annual rent into post-dated cheques,
                deposit them, and watch each one clear, bounce, or get replaced —
                with receipts booked automatically.
              </p>
              <div className="m-feature-list">
                <span><CheckCheck /> Full cheque lifecycle, tracked by due date</span>
                <span><CheckCheck /> Receipts &amp; payment vouchers booked for you</span>
                <span><CheckCheck /> Bounced-cheque alerts and replacements</span>
              </div>
            </article>

            <article className="m-feature m-feature-span3">
              <span className="m-feature-ic"><FileText /></span>
              <h3>Leasing &amp; contracts</h3>
              <p>
                Tenancy contracts, renewals, bookings, and a tenant CRM — every
                unit's story in one place, from enquiry to move-out.
              </p>
            </article>

            <article className="m-feature m-feature-span3">
              <span className="m-feature-ic"><LineChart /></span>
              <h3>Finance &amp; P&amp;L</h3>
              <p>
                Receipts, supplier bills, banking with reconciliation, and a
                profit &amp; loss view for each tower — the numbers the owner asks for.
              </p>
            </article>

            <article className="m-feature m-feature-span2">
              <span className="m-feature-ic"><Wrench /></span>
              <h3>Operations</h3>
              <p>Maintenance, purchasing, inventory, and legal cases — the day-to-day of the building.</p>
            </article>

            <article className="m-feature m-feature-span2">
              <span className="m-feature-ic"><Layers /></span>
              <h3>Multi-company &amp; roles</h3>
              <p>Several entities, each with its own towers and accounts, and access scoped by role.</p>
            </article>

            <article className="m-feature m-feature-span2">
              <span className="m-feature-ic"><Printer /></span>
              <h3>Documents &amp; print</h3>
              <p>Contracts, vouchers, statements, and P&amp;L that print like the paper your office files.</p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="m-section m-section-tight" id="how">
        <div className="m-container">
          <Reveal className="m-section-head m-section-head-center">
            <h2 className="m-h2">Up and running in an afternoon.</h2>
            <p className="m-lede">
              No migration project, no consultant. Set up your firm, record your
              first contracts, and start tracking rent the same day.
            </p>
          </Reveal>

          <Reveal className="m-steps m-steps-flow">
            <div className="m-step">
              <span className="m-step-n" />
              <h3>Register your company</h3>
              <p>
                Add your firm, your towers, and your team. Decide who sees money
                and who doesn't — in a few minutes.
              </p>
            </div>
            <div className="m-step">
              <span className="m-step-n" />
              <h3>Add units, tenants &amp; cheques</h3>
              <p>
                Record each contract and its post-dated cheques. Leasely keeps
                every due date and deposit on track for you.
              </p>
            </div>
            <div className="m-step">
              <span className="m-step-n" />
              <h3>Track money &amp; print documents</h3>
              <p>
                See where rent stands at a glance, clear cheques, and print the
                contracts and vouchers your office needs to file.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Why Leasely ---------- */}
      <section className="m-section" id="why">
        <div className="m-container m-why">
          <Reveal>
            <span className="m-pill"><Landmark /> Made for the UAE</span>
            <h2 className="m-h2" style={{ marginTop: 18 }}>
              Not another blue proptech dashboard.
            </h2>
            <p className="m-lede" style={{ marginTop: 14, marginBottom: 28 }}>
              Leasely is built around how a Dubai management office actually
              runs — the cheque in the drawer, the contract in the file, the
              figure the owner asks about on the phone.
            </p>
            <div className="m-why-points">
              <div className="m-why-point">
                <span className="m-why-ic"><Landmark /></span>
                <div>
                  <h3>Post-dated cheques, done right</h3>
                  <p>
                    Pending, deposited, cleared, bounced, replaced — the UAE rent
                    reality modelled exactly, with receipts booked on clearance.
                  </p>
                </div>
              </div>
              <div className="m-why-point">
                <span className="m-why-ic"><ShieldCheck /></span>
                <div>
                  <h3>Money stays need-to-know</h3>
                  <p>
                    Role-based access masks financial figures from team members
                    who shouldn't see them. The owner sees everything; front-desk
                    sees what they need.
                  </p>
                </div>
              </div>
              <div className="m-why-point">
                <span className="m-why-ic"><Printer /></span>
                <div>
                  <h3>Paper that looks filed</h3>
                  <p>
                    Contracts, receipt and payment vouchers, bank statements, and
                    P&amp;L print like documents your office already uses.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="m-lifecycle">
              <div className="m-section-head" style={{ marginBottom: 20 }}>
                <span className="t-label">A cheque's journey in Leasely</span>
              </div>
              <div className="m-lifecycle-track">
                <div className="m-lc-step">
                  <span className="badge badge-dot badge-neutral m-lc-badge">Pending</span>
                  <span className="m-lc-label">Cheque recorded against the contract</span>
                </div>
                <div className="m-lc-line" />
                <div className="m-lc-step">
                  <span className="badge badge-dot badge-accent m-lc-badge">Deposited</span>
                  <span className="m-lc-label">Handed to the bank on its due date</span>
                </div>
                <div className="m-lc-line" />
                <div className="m-lc-step">
                  <span className="badge badge-dot badge-paid m-lc-badge">Cleared</span>
                  <span className="m-lc-label"><strong>Receipt booked automatically</strong></span>
                </div>
                <div className="m-lc-line" />
                <div className="m-lc-step">
                  <span className="m-lc-ic" style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}>
                    <Coins style={{ width: 17, height: 17 }} />
                  </span>
                  <span className="m-lc-label">
                    <strong>AED 95,000</strong> added to this month's collected rent
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- FAQ teaser ---------- */}
      <section className="m-section m-section-tight" id="faq-teaser">
        <div className="m-container">
          <Reveal className="m-section-head m-section-head-center">
            <h2 className="m-h2">Questions, answered.</h2>
            <p className="m-lede">The things property managers ask us first.</p>
          </Reveal>
          <Reveal className="m-faq">
            {FAQ_TEASER.map((item) => (
              <details className="m-faq-item" key={item.q}>
                <summary>
                  {item.q}
                  <span className="m-faq-chev"><ChevronDown /></span>
                </summary>
                <div className="m-faq-answer"><p>{item.a}</p></div>
              </details>
            ))}
          </Reveal>
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link to="/faq" className="btn">
              See all FAQs <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="m-section m-section-tight">
        <div className="m-container">
          <Reveal className="m-cta-band">
            <h2>Ready to get your month under control?</h2>
            <p>
              Register your company and see where your rent stands today — or book
              a walkthrough and we'll show you Leasely on your own portfolio.
            </p>
            <div className="m-cta-row">
              <Link to="/register" className="btn btn-on-primary btn-lg">
                Register your company <ArrowRight />
              </Link>
              <Link to="/contact" className="btn btn-ghost-on-primary btn-lg">
                Book a demo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
