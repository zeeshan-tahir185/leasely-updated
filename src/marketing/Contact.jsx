import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  Send,
  CheckCheck,
} from "lucide-react";
import Reveal from "./Reveal";
import { SITE } from "./site";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <header className="m-pagehead">
        <div className="m-container">
          <nav className="m-breadcrumb" aria-label="Breadcrumb">
            <Link to="/"><Home style={{ width: 14, height: 14 }} /></Link>
            <ChevronRight />
            <span>Contact</span>
          </nav>
          <h1 className="m-h1">Talk to us</h1>
          <p className="m-lede">
            Questions about Leasely, pricing for your portfolio, or want a
            walkthrough on your own towers? Send a note — we usually reply within
            one business day.
          </p>
        </div>
      </header>

      <section className="m-section">
        <div className="m-container m-contact">
          <Reveal className="m-contact-form">
            {!sent ? (
              <form onSubmit={submit}>
                <div className="m-form-fields">
                  <div className="m-form-row">
                    <label className="field">
                      <span>Your name</span>
                      <input
                        className="input"
                        type="text"
                        value={form.name}
                        onChange={set("name")}
                        autoComplete="name"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Work email</span>
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        autoComplete="email"
                        required
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Company</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="Your management firm"
                      value={form.company}
                      onChange={set("company")}
                      autoComplete="organization"
                    />
                  </label>
                  <label className="field">
                    <span>How can we help?</span>
                    <textarea
                      className="input"
                      rows={5}
                      placeholder="Tell us about your portfolio — how many towers and units you manage, and what you're hoping Leasely can do."
                      value={form.message}
                      onChange={set("message")}
                      required
                    />
                  </label>
                  <button className="btn btn-primary btn-lg" type="submit">
                    <Send /> Send message
                  </button>
                  <p className="auth-hint" style={{ textAlign: "left", marginTop: 4 }}>
                    Prefer email? Write to{" "}
                    <a href={`mailto:${SITE.email}`} style={{ color: "var(--primary)" }}>
                      {SITE.email}
                    </a>
                    .
                  </p>
                </div>
              </form>
            ) : (
              <div className="m-form-success">
                <span className="m-form-success-ic"><CheckCheck /></span>
                <h2 className="m-h3">Message sent</h2>
                <p className="m-lede" style={{ fontSize: "0.9375rem" }}>
                  Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""} — we've
                  got it and will reply to <strong>{form.email}</strong> within one
                  business day.
                </p>
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setForm({ name: "", email: "", company: "", message: "" });
                    setSent(false);
                  }}
                >
                  Send another
                </button>
              </div>
            )}
          </Reveal>

          <Reveal className="m-contact-aside" delay={100}>
            <div className="m-contact-card">
              <span className="m-contact-card-ic"><Mail /></span>
              <div>
                <h3>Email us</h3>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </div>
            </div>
            <div className="m-contact-card">
              <span className="m-contact-card-ic"><Phone /></span>
              <div>
                <h3>Call us</h3>
                <a href={`tel:${SITE.phoneHref}`}>{SITE.phone}</a>
              </div>
            </div>
            <div className="m-contact-card">
              <span className="m-contact-card-ic"><MapPin /></span>
              <div>
                <h3>Visit us</h3>
                <p>{SITE.addressFull}</p>
              </div>
            </div>
            <div className="m-contact-card">
              <span className="m-contact-card-ic"><CalendarClock /></span>
              <div>
                <h3>Office hours</h3>
                <p>Sunday – Thursday, 9:00 – 18:00 (GST)</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
