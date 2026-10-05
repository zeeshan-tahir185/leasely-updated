import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Info } from "lucide-react";
import Logo from "../components/Logo";

const BENEFITS = [
  "Track rent and post-dated cheques across every tower",
  "Tenancy contracts, receipts, and P&L in one place",
  "Role-based access — money stays need-to-know",
  "Print-ready documents your office can file",
];

export default function Register({ onSignIn }) {
  const [form, setForm] = useState({
    company: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    agree: false,
  });

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  function submit(e) {
    e.preventDefault();
    // Prototype: account creation is simulated — sign straight in.
    onSignIn();
  }

  return (
    <div className="auth">
      <div className="auth-form-col">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-top">
            <Link to="/" aria-label="Leasely home">
              <Logo />
            </Link>
            <Link to="/" className="auth-back">
              <ArrowLeft /> Back to site
            </Link>
          </div>

          <h1 className="auth-h">Create your company account</h1>
          <p className="auth-sub">
            Start managing rent across your towers in minutes.
          </p>

          <div className="auth-fields">
            <label className="field">
              <span>Company name</span>
              <input
                className="input"
                type="text"
                placeholder="e.g. Westwood Property Management"
                value={form.company}
                onChange={set("company")}
                autoComplete="organization"
                required
              />
            </label>

            <div className="auth-fields-2">
              <label className="field">
                <span>Your name</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={set("name")}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  className="input"
                  type="tel"
                  placeholder="+971 50 000 0000"
                  value={form.phone}
                  onChange={set("phone")}
                  autoComplete="tel"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Work email</span>
              <input
                className="input"
                type="email"
                placeholder="you@company.ae"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label className="auth-check">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={set("agree")}
                required
              />
              <span>
                I agree to Leasely's{" "}
                <Link to="/terms">Terms &amp; Conditions</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
              </span>
            </label>

            <button className="btn btn-primary btn-block btn-lg" type="submit">
              Create account <ArrowRight />
            </button>
          </div>

          <p className="auth-alt">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
          <p className="auth-note">
            <Info /> Prototype — this creates a demo workspace and signs you in. No
            payment or email verification is required.
          </p>
        </form>
      </div>

      <aside className="auth-aside">
        <Link to="/" className="auth-brandline">
          <Logo size={26} showWord={false} />
          <span className="logo-word">Leasely</span>
        </Link>
        <div>
          <p className="auth-quote">Your whole property office, from day one.</p>
          <ul className="auth-aside-list auth-aside-ul">
            {BENEFITS.map((b) => (
              <li key={b}><Check /> {b}</li>
            ))}
          </ul>
        </div>
        <div className="auth-aside-foot">
          <div>
            <div className="k">Set-up time</div>
            <div className="v">One afternoon</div>
          </div>
          <div>
            <div className="k">Towers</div>
            <div className="v tnum">Unlimited</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
