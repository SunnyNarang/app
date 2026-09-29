import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X, LogOut, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LogoLockup } from "./Logo";
import ChangePasswordModal from "./ChangePasswordModal";

export const initialsOf = (name = "") =>
  name
    .replace(/Rtn\.|R'Ann|R'Annette|Er\.|Dr\.|Adv\.|Mr\.|Mrs\./g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "RI";

const NAV_LINKS = [
  { to: "/", label: "Home", id: "home" },
  { to: "/members", label: "Members", id: "members" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const linkCls = ({ isActive }) =>
    `text-sm font-semibold tracking-wide transition-colors duration-300 ${
      isActive ? "text-royal" : "text-slate-300 hover:text-royal-light"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="border-b border-royal/20 bg-obsidian/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link to="/" data-testid="nav-home-link" aria-label="Home">
            <LogoLockup />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.id} to={l.to} className={linkCls} data-testid={`nav-${l.id}-link`}>
                {l.label}
              </NavLink>
            ))}
            {user?.role === "admin" && (
              <NavLink to="/admin" className={linkCls} data-testid="nav-admin-link">
                <ShieldCheck size={15} className="mr-1 inline" />
                Admin
              </NavLink>
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div
                  className="flex items-center gap-2.5 rounded-full border border-royal/30 bg-royal/10 py-1.5 pl-1.5 pr-4"
                  data-testid="nav-user-chip"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-royal text-xs font-bold text-white">
                    {initialsOf(user.name)}
                  </span>
                  <div className="leading-tight">
                    <p className="text-xs font-bold text-slate-100">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-royal">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPwOpen(true)}
                  data-testid="nav-change-password-button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-royal/30 px-4 py-2 text-xs font-semibold text-royal-light transition-all duration-300 hover:border-royal/70 hover:bg-royal/10"
                >
                  <KeyRound size={14} /> Password
                </button>
                <button
                  onClick={logout}
                  data-testid="nav-logout-button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-royal/30 px-4 py-2 text-xs font-semibold text-royal-light transition-all duration-300 hover:border-royal/70 hover:bg-royal/10"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" data-testid="nav-login-button" className="btn-royal !px-5 !py-2.5">
                Member Login
              </Link>
            )}
          </div>

          <button
            className="text-royal md:hidden"
            onClick={() => setOpen((o) => !o)}
            data-testid="nav-mobile-toggle"
            aria-label="Toggle menu"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
        <motion.div
          style={{ scaleX: progress }}
          className="h-[2px] origin-left bg-gradient-to-r from-royal-dark via-royal to-royal-light"
        />
      </div>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-royal/20 bg-obsidian/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-6">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.id}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 font-display text-lg font-semibold ${
                      isActive ? "text-royal" : "text-slate-200"
                    }`
                  }
                  data-testid={`nav-mobile-${l.id}-link`}
                >
                  {l.label}
                </NavLink>
              ))}
              {user?.role === "admin" && (
                <NavLink to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-display text-lg font-semibold text-royal" data-testid="nav-mobile-admin-link">
                  Admin Portal
                </NavLink>
              )}
              <div className="mt-4 border-t border-royal/15 pt-4">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setOpen(false);
                        setPwOpen(true);
                      }}
                      data-testid="nav-mobile-password-button"
                      className="btn-ghost w-full"
                    >
                      <KeyRound size={15} /> Change Password
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setOpen(false);
                      }}
                      data-testid="nav-mobile-logout-button"
                      className="btn-ghost w-full"
                    >
                      <LogOut size={15} /> Logout ({user.name})
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setOpen(false)} data-testid="nav-mobile-login-button" className="btn-royal w-full">
                    Member Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
