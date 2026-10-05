import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * On route change, jump to the top — or to the element matching the URL hash
 * (e.g. /#features) when one is present. Keeps multi-page navigation sane.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);

  return null;
}
