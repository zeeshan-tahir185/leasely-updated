import { Link } from "react-router-dom";
import { Home, ChevronRight, AlertTriangle } from "lucide-react";
import { SITE } from "./site";

/**
 * Shared chrome for Terms / Privacy: breadcrumb + title + "last updated",
 * a sticky table of contents built from the sections, the mandatory
 * review-before-launch note, and the prose column.
 *
 * sections: [{ id, heading, content: <JSX> }]
 */
export default function LegalDoc({ title, intro, sections }) {
  return (
    <>
      <header className="m-pagehead">
        <div className="m-container">
          <nav className="m-breadcrumb" aria-label="Breadcrumb">
            <Link to="/"><Home style={{ width: 14, height: 14 }} /></Link>
            <ChevronRight />
            <span>{title}</span>
          </nav>
          <h1 className="m-h1">{title}</h1>
          <p className="m-doc-updated">Last updated: {SITE.lastUpdated}</p>
          {intro && <p className="m-lede" style={{ marginTop: 14 }}>{intro}</p>}
        </div>
      </header>

      <section className="m-section">
        <div className="m-container m-doc">
          <aside className="m-doc-toc" aria-label="On this page">
            <span className="m-doc-toc-title">On this page</span>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>{s.heading}</a>
            ))}
          </aside>

          <div className="m-prose">
            <div className="m-legal-note" role="note">
              <AlertTriangle />
              <span>
                <strong>Template — review before you rely on it.</strong> This
                document is a starting draft tailored to a UAE SaaS. It is not
                legal advice. Have it reviewed and finalised by a qualified lawyer
                in {SITE.jurisdiction} before launch.
              </span>
            </div>

            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2>{s.heading}</h2>
                {s.content}
              </section>
            ))}

            <p style={{ marginTop: "2.4em", color: "var(--muted)", fontSize: "0.875rem" }}>
              Questions about this document? Contact us at{" "}
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
