import { useState } from "react";
import { motion } from "framer-motion";
import { X, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";

export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (next.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      toast.success("Password changed successfully");
      onClose();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="change-password-modal"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-royal/25 bg-panel p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-royal-light">
            <KeyRound size={20} className="text-royal" /> Change Password
          </h3>
          <button
            onClick={onClose}
            className="rounded-full border border-royal/30 p-2 text-royal-light transition-all hover:bg-royal hover:text-white"
            data-testid="change-password-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4" data-testid="change-password-form">
          <input
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className="input-dark"
            data-testid="current-password-input"
          />
          <input
            type="password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min 4 characters)"
            className="input-dark"
            data-testid="new-password-input"
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="input-dark"
            data-testid="confirm-password-input"
          />
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300" data-testid="change-password-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-royal w-full" data-testid="change-password-submit">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Save New Password
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
