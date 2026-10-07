export default function Logo({ showWord = true, size = 30 }) {
  return (
    <span className="logo">
      <svg
        className="logo-mark"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path
          d="M16 6.6 24.6 13.4 V24.4 a1 1 0 0 1-1 1 H8.4 a1 1 0 0 1-1-1 V13.4 Z"
          fill="var(--primary-ink)"
        />
      </svg>
      {showWord && <span className="logo-word">Leasely</span>}
    </span>
  );
}
