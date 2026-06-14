import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ReceiptText,
  BarChart3,
  Settings,
  ChevronsUpDown,
  RotateCcw,
  LogOut,
} from "lucide-react";
import Logo from "./Logo";
import { useData } from "../data/store";
import { periodLabelLong, CUR_PERIOD, initials } from "../lib/format";

const NAV = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/properties", label: "Properties", Icon: Building2 },
  { to: "/tenants", label: "Tenants", Icon: Users },
  { to: "/payments", label: "Payments", Icon: ReceiptText },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: Settings },
];

const USER = { name: "Sarah Mansour", email: "sarah@westwoodpm.ae" };

export default function AppShell({ onSignOut }) {
  const { resetDemo } = useData();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav className="nav">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Icon strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          {menuOpen && (
            <>
              <div className="menu-catcher" onClick={() => setMenuOpen(false)} />
              <div className="popover user-menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    if (confirm("Reset all demo data to its original state?")) resetDemo();
                    setMenuOpen(false);
                  }}
                >
                  <RotateCcw /> Reset demo data
                </button>
                <button role="menuitem" onClick={onSignOut}>
                  <LogOut /> Sign out
                </button>
              </div>
            </>
          )}
          <button
            className="user-card"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="avatar avatar-sm">{initials(USER.name)}</span>
            <span className="user-meta">
              <span className="user-name">{USER.name}</span>
              <span className="user-email">{USER.email}</span>
            </span>
            <ChevronsUpDown className="user-chev" />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="workspace">
            <span className="workspace-name">Westwood Property Mgmt</span>
            <span className="workspace-sep">/</span>
            <span className="t-muted">{periodLabelLong(CUR_PERIOD)}</span>
          </div>
        </header>
        <div className="page-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
