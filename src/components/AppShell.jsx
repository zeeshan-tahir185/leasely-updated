import { Suspense, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronsUpDown, RotateCcw, LogOut, Bell, Check, Building, UserCog, Menu,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useData } from "../data/store";
import { GROUPS, MODULES, moduleEnabled } from "../lib/modules";
import { canAccess, ROLES } from "../lib/rbac";
import { scopeData } from "../lib/domain";
import { buildAlerts } from "../lib/alerts";
import { periodLabelLong, CUR_PERIOD, initials } from "../lib/format";
import { useConfirm } from "./ConfirmDialog";
import { PAGE_LOADERS } from "../pages/loaders";

// Shown while a code-split page's chunk streams in (only on a cold visit to a
// deep link; hover prefetch and router transitions cover in-app navigation).
function RouteFallback() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading page">
      <div className="skel skel-title" />
      <div className="skel skel-sub" />
      <div className="skel skel-block" />
    </div>
  );
}

export default function AppShell({ onSignOut }) {
  const { db, company, user, role, companyId, setActiveCompany, setCurrentUser, resetDemo } = useData();
  const confirm = useConfirm();
  const [coOpen, setCoOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  // The drawer (narrow screens) closes on Escape; choosing a destination closes
  // it via the NavLinks' own onClick.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const alerts = useMemo(() => buildAlerts(scopeData(db, companyId), role), [db, companyId, role]);
  const companyUsers = db.users.filter((u) => u.companyId === companyId);

  // Group the modules this role may see and that are enabled for the company.
  const grouped = useMemo(() => {
    const visible = MODULES.filter((m) => canAccess(role, m.key) && moduleEnabled(db.settings, m.key));
    return GROUPS.map((g) => ({ group: g, items: visible.filter((m) => m.group === g) })).filter((g) => g.items.length);
  }, [role, db.settings]);

  return (
    <div className="shell">
      {navOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar${navOpen ? " open" : ""}`} id="app-sidebar">
        <div className="sidebar-head">
          <Logo />
          <div className="co-switch">
            <button className="co-btn" onClick={() => setCoOpen((o) => !o)} aria-haspopup="menu" aria-expanded={coOpen}>
              <span className="co-mark"><Building strokeWidth={2.2} /></span>
              <span className="co-meta">
                <span className="co-name">{company.name}</span>
                <span className="co-sub">{company.license}</span>
              </span>
              <ChevronsUpDown className="co-chev" />
            </button>
            {coOpen && (
              <>
                <div className="menu-catcher" onClick={() => setCoOpen(false)} />
                <div className="popover co-menu" role="menu">
                  <div className="popover-label">Switch company</div>
                  {db.companies.map((c) => (
                    <button key={c.id} role="menuitem" onClick={() => { setActiveCompany(c.id); setCoOpen(false); }}>
                      <span className="co-mark sm"><Building strokeWidth={2.2} /></span>
                      <span className="co-menu-name">{c.name}</span>
                      {c.id === company.id && <Check className="co-check" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="nav nav-grouped">
          {grouped.map(({ group, items }) => (
            <div className="nav-group" key={group}>
              <div className="nav-group-label">{group}</div>
              {items.map(({ path, label, Icon, end, key }) => (
                <NavLink
                  key={key}
                  to={path}
                  end={end}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                  onClick={() => setNavOpen(false)}
                  onMouseEnter={() => PAGE_LOADERS[key]?.()}
                  onFocus={() => PAGE_LOADERS[key]?.()}
                >
                  <Icon strokeWidth={2} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          {userOpen && (
            <>
              <div className="menu-catcher" onClick={() => setUserOpen(false)} />
              <div className="popover user-menu" role="menu">
                <div className="popover-label"><UserCog size={13} /> View as (role demo)</div>
                {companyUsers.map((u) => (
                  <button key={u.id} role="menuitem" onClick={() => { setCurrentUser(u.id); setUserOpen(false); }}>
                    <span className="avatar avatar-sm">{initials(u.name)}</span>
                    <span className="user-menu-meta">
                      <span className="user-menu-name">{u.name}</span>
                      <span className="user-menu-role">{ROLES[u.role]?.label || u.role}</span>
                    </span>
                    {u.id === user.id && <Check className="co-check" />}
                  </button>
                ))}
                <div className="popover-sep" />
                <button role="menuitem" onClick={async () => {
                  setUserOpen(false);
                  if (await confirm({ title: "Reset demo data?", message: "Every change you've made will be replaced with the original sample data. This can't be undone.", confirmLabel: "Reset data" })) resetDemo();
                }}>
                  <RotateCcw /> Reset demo data
                </button>
                <button role="menuitem" onClick={onSignOut}>
                  <LogOut /> Sign out
                </button>
              </div>
            </>
          )}
          <button className="user-card" onClick={() => setUserOpen((o) => !o)} aria-haspopup="menu" aria-expanded={userOpen}>
            <span className="avatar avatar-sm">{initials(user.name)}</span>
            <span className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{ROLES[role]?.label || role}</span>
            </span>
            <ChevronsUpDown className="user-chev" />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-lead">
            <button
              className="icon-btn nav-toggle"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
              aria-controls="app-sidebar"
            >
              <Menu strokeWidth={2} />
            </button>
            <div className="workspace">
              <span className="workspace-name">{company.name}</span>
              <span className="workspace-sep">/</span>
              <span className="t-muted">{periodLabelLong(CUR_PERIOD)}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="bell" onClick={() => navigate("/notifications")} aria-label={`${alerts.length} alerts`}>
              <Bell strokeWidth={2} />
              {alerts.length > 0 && <span className="bell-count">{alerts.length}</span>}
            </button>
          </div>
        </header>
        <div className="page-scroll">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
