import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/app.css";
import { DataProvider, useData } from "./data/store";
import AppShell from "./components/AppShell";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Towers from "./pages/Towers";
import TowerDetail from "./pages/TowerDetail";
import Contacts from "./pages/Contacts";
import Leads from "./pages/Leads";
import Contracts from "./pages/Contracts";
import ContractPrint from "./pages/ContractPrint";
import Cheques from "./pages/Cheques";
import Maintenance from "./pages/Maintenance";
import Bills from "./pages/Bills";
import Bookings from "./pages/Bookings";
import Assets from "./pages/Assets";
import Utilities from "./pages/Utilities";
import Inventory from "./pages/Inventory";
import Cases from "./pages/Cases";
import Documents from "./pages/Documents";
import HR from "./pages/HR";
import Receipts from "./pages/Receipts";
import Vouchers from "./pages/Vouchers";
import VoucherPrint from "./pages/VoucherPrint";
import Accounting from "./pages/Accounting";
import PnlPrint from "./pages/PnlPrint";
import Banking from "./pages/Banking";
import BankStatementPrint from "./pages/BankStatementPrint";
import Reports from "./pages/Reports";
import { MODULES } from "./lib/modules";
import { canAccess } from "./lib/rbac";
import { ConfirmProvider } from "./components/ConfirmDialog";

const AUTH_KEY = "hearth:auth";

// Maps every module key to its page. Each sidebar entry resolves to a real screen;
// the catch-all route redirects any unmapped path back to the dashboard.
const PAGES = {
  dashboard: Dashboard, notifications: Notifications, towers: Towers, contacts: Contacts,
  leads: Leads, contracts: Contracts, cheques: Cheques, receipts: Receipts, vouchers: Vouchers,
  accounting: Accounting, maintenance: Maintenance, bills: Bills, bookings: Bookings, assets: Assets,
  utilities: Utilities, inventory: Inventory, cases: Cases, documents: Documents, hr: HR,
  banking: Banking, reports: Reports, settings: Settings,
};

// Redirect to the dashboard if the current role can't access a module by URL.
function Guard({ moduleKey, children }) {
  const { role } = useData();
  if (!canAccess(role, moduleKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === "1");

  function signIn() {
    localStorage.setItem(AUTH_KEY, "1");
    setAuthed(true);
  }
  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }

  if (!authed) return <SignIn onSignIn={signIn} />;

  return (
    <DataProvider>
      <ConfirmProvider>
      <Routes>
        {/* Print views render full-bleed, outside the app shell */}
        <Route path="/contracts/:id/print" element={<ContractPrint />} />
        <Route path="/receipts/:id/print" element={<VoucherPrint kind="receipt" />} />
        <Route path="/vouchers/:id/print" element={<VoucherPrint kind="payment" />} />
        <Route path="/banking/:accountId/print" element={<BankStatementPrint />} />
        <Route path="/accounting/print" element={<PnlPrint />} />
        <Route element={<AppShell onSignOut={signOut} />}>
          <Route index element={<Dashboard />} />
          {MODULES.filter((m) => m.key !== "dashboard").map((m) => {
            const El = PAGES[m.key];
            if (!El) return null;
            return (
              <Route
                key={m.key}
                path={m.path.replace(/^\//, "")}
                element={<Guard moduleKey={m.key}><El /></Guard>}
              />
            );
          })}
          <Route path="towers/:id" element={<Guard moduleKey="towers"><TowerDetail /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </ConfirmProvider>
    </DataProvider>
  );
}
