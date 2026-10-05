import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/app.css";
import { DataProvider, useData } from "./data/store";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import { PAGE_LOADERS } from "./pages/loaders";
import { MODULES } from "./lib/modules";
import { canAccess } from "./lib/rbac";
import { ConfirmProvider } from "./components/ConfirmDialog";

const AUTH_KEY = "leasely:auth";

// Maps every module key to its page. Each sidebar entry resolves to a real screen;
// the catch-all route redirects any unmapped path back to the dashboard.
// Every page except the dashboard (the landing screen, imported statically) is
// code-split: its chunk loads on first visit, or earlier via sidebar prefetch.
const PAGES = Object.fromEntries(
  Object.entries(PAGE_LOADERS).map(([key, load]) => [key, lazy(load)])
);
PAGES.dashboard = Dashboard;

// The public (pre-auth) site is code-split so authenticated users never load
// marketing/legal code, and visitors never load the app shell.
const PublicSite = lazy(() => import("./marketing/PublicSite"));

const TowerDetail = lazy(() => import("./pages/TowerDetail"));
const ContractPrint = lazy(() => import("./pages/ContractPrint"));
const VoucherPrint = lazy(() => import("./pages/VoucherPrint"));
const BankStatementPrint = lazy(() => import("./pages/BankStatementPrint"));
const PnlPrint = lazy(() => import("./pages/PnlPrint"));

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

  if (!authed)
    return (
      <Suspense fallback={null}>
        <PublicSite onSignIn={signIn} />
      </Suspense>
    );

  return (
    <DataProvider>
      <ConfirmProvider>
      <Suspense fallback={null}>
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
      </Suspense>
      </ConfirmProvider>
    </DataProvider>
  );
}
