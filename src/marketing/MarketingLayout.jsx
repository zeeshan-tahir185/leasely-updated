import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";
import ScrollToTop from "./ScrollToTop";
import ThemeToggle from "../components/ThemeToggle";
import { SITE } from "./site";

const NAV = [
  { label: "Features", to: "/#features" },
  { label: "How it works", to: "/#how" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
];

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="m-footer">
      <div className="m-container">
        <div className="m-footer-grid">
          <div className="m-footer-brand">
            <Logo />
            <p className="m-footer-tag">
              The management office for Dubai real estate — rent, cheques,
              contracts, and accounts in one calm place.
            </p>
            <div className="m-footer-contact">
              <a href={`mailto:${SITE.email}`}>
                <Mail /> {SITE.email}
              </a>
              <a href={`tel:${SITE.phoneHref}`}>
                <Phone /> {SITE.phone}
              </a>
              <span>
                <MapPin /> {SITE.addressLine}
              </span>
            </div>
          </div>

          <div className="m-footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link to="/#features">Features</Link></li>
              <li><Link to="/#how">How it works</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/register">Register your company</Link></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>

          <div className="m-footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link to="/contact">Contact us</Link></li>
              <li><a href={`mailto:${SITE.supportEmail}`}>Support</a></li>
              <li><Link to="/#why">Why Leasely</Link></li>
            </ul>
          </div>

          <div className="m-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="m-footer-bottom">
          <span>© {year} {SITE.legalEntity}. All rights reserved.</span>
          <span className="m-footer-note">
            <span className="badge badge-neutral badge-dot">Prototype</span>
            Made for Dubai property management
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  // Nav border appears once the page has scrolled past the hero top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  return (
    <div className="m-site">
      <ScrollToTop />

      <header className="m-nav" data-scrolled={scrolled}>
        <div className="m-container m-nav-inner">
          <Link to="/" className="m-nav-brand" aria-label="Leasely home">
            <Logo />
          </Link>

          <nav className="m-nav-links" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="m-nav-link"
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="m-nav-actions">
            <ThemeToggle />
            <Link to="/login" className="m-nav-signin">Log in</Link>
            <Link to="/register" className="btn btn-primary">
              Register your company
            </Link>
            <button
              type="button"
              className="m-nav-toggle"
              aria-label="Open menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className="m-drawer" data-open={drawer} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="m-drawer-scrim" onClick={() => setDrawer(false)} />
        <div className="m-drawer-panel">
          <div className="m-drawer-head">
            <Logo />
            <button
              type="button"
              className="m-nav-toggle"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
            >
              <X />
            </button>
          </div>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="m-drawer-link"
              onClick={() => setDrawer(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="m-drawer-actions">
            <Link
              to="/login"
              className="btn btn-block"
              onClick={() => setDrawer(false)}
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="btn btn-primary btn-block"
              onClick={() => setDrawer(false)}
            >
              Register your company <ArrowRight />
            </Link>
          </div>
        </div>
      </div>

      <main className="m-main">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
