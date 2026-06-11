import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/app.css";
import { DataProvider } from "./data/store";
import AppShell from "./components/AppShell";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";

const AUTH_KEY = "hearth:auth";

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
      <Routes>
        <Route element={<AppShell onSignOut={signOut} />}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
