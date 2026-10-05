import { Link } from "react-router-dom";
import { Home, ChevronRight, ChevronDown, ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

const GROUPS = [
  {
    title: "Getting started",
    items: [
      {
        q: "How quickly can I get set up?",
        a: "Most firms are up and running the same afternoon. You register your company, add your towers and units, record a few contracts with their cheques, and you're tracking rent. There's no migration project and no consultant required.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. Leasely runs in your browser on any modern device — desktop in the office, phone between showings. Nothing to install or update.",
      },
      {
        q: "Can I bring my existing tenants and contracts across?",
        a: "Yes. You can enter contracts and tenants directly, and we can help you bring an existing portfolio over in bulk. Talk to us about your current records and we'll map out the quickest route.",
      },
    ],
  },
  {
    title: "Rent & cheques",
    items: [
      {
        q: "How does Leasely handle post-dated cheques?",
        a: "The way a Dubai office actually works. Annual rent is split into post-dated cheques, each with its own due date. Every cheque moves through a clear lifecycle — pending, deposited, cleared, bounced, or replaced — so you always know exactly which cheque is where.",
      },
      {
        q: "What happens when a cheque bounces?",
        a: "Leasely flags the bounced cheque, reverses anything booked against it, and lets you record a replacement cheque in its place — keeping the contract's payment history accurate and the tenant's standing up to date.",
      },
      {
        q: "Does it book receipts automatically?",
        a: "Yes. Clearing a cheque books the matching receipt for you, and paying a supplier bill books a payment voucher. The accounting stays consistent without double entry.",
      },
    ],
  },
  {
    title: "Team & access",
    items: [
      {
        q: "Who on my team can see financial figures?",
        a: "You decide. Access is scoped by role — owner, manager, accountant, and employee. Financial figures are masked from team members who don't need them, so front-desk staff can do their job without seeing the money.",
      },
      {
        q: "Can I manage more than one company?",
        a: "Yes. Leasely is multi-company by design. One firm can hold several legal entities, each with its own towers and its own separate per-tower accounts — all from a single login.",
      },
    ],
  },
  {
    title: "Pricing & billing",
    items: [
      {
        q: "How much does Leasely cost?",
        a: "Pricing is tailored to the size of your portfolio — the number of towers, units, and team members you manage. Tell us what you run and we'll send a clear quote, with no obligation.",
      },
      {
        q: "Is there a trial or a demo?",
        a: "We'll walk you through Leasely on a live demo, set against a portfolio that looks like yours, so you can see exactly how it fits your office before committing.",
      },
    ],
  },
  {
    title: "Security & data",
    items: [
      {
        q: "Is my data secure?",
        a: "Security is built in: access is role-based, financial visibility is restricted by role, and your company's records are isolated from every other firm on the platform. See our Privacy Policy for the full detail on how data is handled.",
      },
      {
        q: "Can I export my data?",
        a: "Yes. Your records are yours. Key documents — contracts, receipts and payment vouchers, bank statements, and P&L — are print- and export-ready, and you can request a full export of your data at any time.",
      },
    ],
  },
];

export default function Faq() {
  return (
    <>
      <header className="m-pagehead">
        <div className="m-container">
          <nav className="m-breadcrumb" aria-label="Breadcrumb">
            <Link to="/"><Home style={{ width: 14, height: 14 }} /></Link>
            <ChevronRight />
            <span>FAQ</span>
          </nav>
          <h1 className="m-h1">Frequently asked questions</h1>
          <p className="m-lede">
            Everything property managers ask us before getting started. Can't find
            your answer? <Link to="/contact" style={{ color: "var(--primary)" }}>Contact us</Link>.
          </p>
        </div>
      </header>

      <section className="m-section">
        <div className="m-container">
          <div className="m-faq">
            {GROUPS.map((group, gi) => (
              <Reveal key={group.title} delay={gi * 40}>
                <h2
                  className="m-h3"
                  style={{
                    marginTop: gi === 0 ? 0 : 40,
                    marginBottom: 4,
                    color: "var(--primary)",
                  }}
                >
                  {group.title}
                </h2>
                {group.items.map((item) => (
                  <details className="m-faq-item" key={item.q}>
                    <summary>
                      {item.q}
                      <span className="m-faq-chev"><ChevronDown /></span>
                    </summary>
                    <div className="m-faq-answer"><p>{item.a}</p></div>
                  </details>
                ))}
              </Reveal>
            ))}
          </div>

          <Reveal className="m-cta-band" delay={60} style={{ marginTop: 64 }}>
            <h2>Still have a question?</h2>
            <p>
              Tell us about your portfolio and we'll show you exactly how Leasely
              fits your office.
            </p>
            <div className="m-cta-row">
              <Link to="/contact" className="btn btn-on-primary btn-lg">
                Contact us <ArrowRight />
              </Link>
              <Link to="/register" className="btn btn-ghost-on-primary btn-lg">
                Register your company
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
