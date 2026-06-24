import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Runs `onClick` if given, else goes to `to`, else steps back in history.
export default function BackButton({ to, onClick, label = "Back", style }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ marginBottom: 16, ...style }}
      onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}
    >
      <ArrowLeft /> {label}
    </button>
  );
}
