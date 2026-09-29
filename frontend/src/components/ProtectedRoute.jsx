import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian">
        <div className="flex flex-col items-center gap-4" data-testid="auth-check-loader">
          <Logo size={56} className="animate-spin [animation-duration:3s]" />
          <p className="eyebrow">Verifying your session…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== "admin") return <Navigate to="/" replace />;

  return children;
};
