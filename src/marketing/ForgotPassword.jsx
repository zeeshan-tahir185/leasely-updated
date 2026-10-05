import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    // Prototype: no email is actually sent.
    setSent(true);
  }

  return (
    <div className="auth">
      <div className="auth-form-col">
        <div className="auth-card">
          <div className="auth-top">
            <Link to="/" aria-label="Leasely home">
              <Logo />
            </Link>
            <Link to="/login" className="auth-back">
              <ArrowLeft /> Back to log in
            </Link>
          </div>

          {!sent ? (
            <form onSubmit={submit}>
              <h1 className="auth-h">Reset your password</h1>
              <p className="auth-sub">
                Enter the work email tied to your account and we'll send a link to
                set a new password.
              </p>

              <div className="auth-fields">
                <label className="field">
                  <span>Work email</span>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@company.ae"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </label>
                <button className="btn btn-primary btn-block btn-lg" type="submit">
                  <Mail /> Send reset link
                </button>
              </div>

              <p className="auth-alt">
                Remembered it? <Link to="/login">Log in</Link>
              </p>
            </form>
          ) : (
            <div>
              <div className="m-form-success" style={{ padding: "16px 0 8px" }}>
                <span className="m-form-success-ic"><MailCheck /></span>
                <h1 className="auth-h">Check your inbox</h1>
                <p className="auth-sub" style={{ margin: "6px 0 0" }}>
                  If an account exists for <strong>{email}</strong>, a link to
                  reset your password is on its way. It expires in 60 minutes.
                </p>
              </div>
              <div className="auth-fields" style={{ marginTop: 20 }}>
                <Link to="/login" className="btn btn-primary btn-block btn-lg">
                  Back to log in
                </Link>
                <button
                  type="button"
                  className="btn btn-block"
                  onClick={() => setSent(false)}
                >
                  Use a different email
                </button>
              </div>
              <p className="auth-hint">
                Didn't get it? Check your spam folder, or try again in a minute.
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="auth-aside">
        <Link to="/" className="auth-brandline">
          <Logo size={26} showWord={false} />
          <span className="logo-word">Leasely</span>
        </Link>
        <p className="auth-quote">
          Back to your month in a minute — right where the rent left off.
        </p>
        <div className="auth-aside-foot">
          <div>
            <div className="k">Secure by design</div>
            <div className="v">Role-based access</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
