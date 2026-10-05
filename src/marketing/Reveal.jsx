import { useEffect, useRef } from "react";

/**
 * Scroll-reveal wrapper. Self-contained: the element renders fully visible by
 * default (server / headless / no-JS / reduced-motion all stay visible), and
 * only arms the hidden-then-reveal state once its own effect runs and confirms
 * motion is allowed. It never depends on a parent-set class, so effect ordering
 * can't leave a section stuck invisible.
 */
export default function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return; // stay visible

    // Arm the hidden state now, then observe — both in the same tick.
    el.classList.add("reveal-armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
