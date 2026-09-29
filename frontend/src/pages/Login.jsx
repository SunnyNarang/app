import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Loader2, UserRound, ShieldCheck } from "lucide-react";
import { formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/members", { replace: true });
  }, [user, navigate]);

  const doLogin = async (em, pw) => {
    setError("");
    setBusy(true);
    try {
      const u = await login(em, pw);
      navigate(u.role === "admin" ? "/admin" : "/members", { replace: true });
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-obsidian px-4 py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-royal/10 blur-[140px]" />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="animate-royal-pan rounded-2xl bg-[linear-gradient(120deg,#C7D9FF,#4169E1,#1E3A8A,#C7D9FF)] bg-[length:300%_300%] p-[1.5px]">
          <div className="rounded-2xl bg-panel p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <Logo size={52} className="drop-shadow-[0_0_16px_rgba(65,105,225,0.5)]" />
              <h1 className="mt-5 font-display text-2xl font-bold" data-testid="login-heading">
                Member &amp; Admin Portal
              </h1>
              <p className="mt-2 text-xs text-slate-400">
                Rotary Club of Gwalior Innovators — sign in to unlock the full directory,
                schedules and member biodata.
              </p>
            </div>

            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                doLogin(email, password);
              }}
              data-testid="login-form"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="input-dark"
                data-testid="login-email-input"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-dark"
                data-testid="login-password-input"
              />
              {error && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300" data-testid="login-error">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn-royal w-full" data-testid="login-submit-button">
                {busy ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={17} /> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-royal/20 bg-black/30 p-4">
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Quick demo access
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => doLogin("member@rotarygwalior.org", "member123")}
                  disabled={busy}
                  className="btn-ghost !px-3 !py-2.5 !text-xs"
                  data-testid="demo-member-login-button"
                >
                  <UserRound size={14} /> Member Demo
                </button>
                <button
                  onClick={() => doLogin("admin@rotarygwalior.org", "admin123")}
                  disabled={busy}
                  className="btn-ghost !px-3 !py-2.5 !text-xs"
                  data-testid="demo-admin-login-button"
                >
                  <ShieldCheck size={14} /> Admin Demo
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Not a member yet?{" "}
              <Link to="/members" className="text-royal hover:text-royal-light">
                Browse the public directory
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
