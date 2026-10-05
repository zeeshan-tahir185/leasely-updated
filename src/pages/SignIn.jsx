import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Logo from "../components/Logo";

export default function SignIn({ onSignIn }) {
  const [email, setEmail] = useState("sarah@westwoodpm.ae");
  const [password, setPassword] = useState("demo1234");

  function submit(e) {
    e.preventDefault();
    onSignIn();
  }

  return (
    <div className="auth">
      <div className="auth-form-col">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-top">
            <Link to="/" className="logo-link" aria-label="Leasely home">
              <Logo />
            </Link>
            <Link to="/" className="auth-back">
              <ArrowLeft /> Back to site
            </Link>
          </div>

          <h1 className="auth-h">Welcome back</h1>
          <p className="auth-sub">Sign in to manage rent across your properties.</p>

          <div className="auth-fields">
            <label className="field">
              <span>Work email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span className="auth-row">
                Password
                <Link to="/forgot-password" className="auth-forgot">
                  Forgot password?
                </Link>
              </span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn btn-primary btn-block btn-lg" type="submit">
              Sign in <ArrowRight />
            </button>
          </div>

          <p className="auth-alt">
            New to Leasely? <Link to="/register">Register your company</Link>
          </p>
          <p className="auth-hint">Prototype — any credentials will sign you in.</p>
        </form>
      </div>

      <aside className="auth-aside">
        <Link to="/" className="auth-brandline">
          <Logo size={26} showWord={false} />
          <span className="logo-word">Leasely</span>
        </Link>
        <p className="auth-quote">
          Every month, know exactly who has paid, who hasn't, and who is late.
        </p>
        <div className="auth-aside-foot">
          <div>
            <div className="k">Collected this month</div>
            <div className="v tnum">AED 1.06M</div>
          </div>
          <div>
            <div className="k">On-time rate</div>
            <div className="v tnum">94%</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
