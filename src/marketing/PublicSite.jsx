import { Routes, Route, Navigate } from "react-router-dom";
import "./marketing.css";
import MarketingLayout from "./MarketingLayout";
import Landing from "./Landing";
import Contact from "./Contact";
import Faq from "./Faq";
import Terms from "./Terms";
import Privacy from "./Privacy";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import SignIn from "../pages/SignIn";

/**
 * Everything an unauthenticated visitor sees. Marketing + support + legal share
 * the nav/footer layout; the auth screens render chromeless full-bleed.
 */
export default function PublicSite({ onSignIn }) {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<Landing />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<Faq />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
      </Route>
      <Route path="login" element={<SignIn onSignIn={onSignIn} />} />
      <Route path="register" element={<Register onSignIn={onSignIn} />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
