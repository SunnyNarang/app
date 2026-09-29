import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, CheckCircle2, Send } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";

export default function ApplyModal({ onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "Gwalior", profession: "", why_rotary: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/apply", form);
      setDone(true);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Could not submit your application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="apply-modal"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-royal/25 bg-panel p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-royal-light">Apply for Membership</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-royal/30 p-2 text-royal-light transition-all hover:bg-royal hover:text-white"
            data-testid="apply-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center" data-testid="apply-success">
            <CheckCircle2 size={56} className="text-emerald-400" />
            <p className="mt-5 font-display text-xl font-bold text-royal-light">Application received!</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Thank you for wanting to serve Gwalior with us. A member of our team will reach out
              to you soon — and you are always welcome at a Thursday fellowship.
            </p>
            <button onClick={onClose} className="btn-royal mt-8 !px-8" data-testid="apply-done-button">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" data-testid="apply-form">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name *</span>
              <input required className="input-dark" value={form.name} onChange={set("name")} placeholder="Your full name" data-testid="apply-name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number *</span>
                <input required type="tel" className="input-dark" value={form.phone} onChange={set("phone")} placeholder="+91 …" data-testid="apply-phone" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">City</span>
                <input className="input-dark" value={form.city} onChange={set("city")} placeholder="Gwalior" data-testid="apply-city" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Your Profession</span>
              <input className="input-dark" value={form.profession} onChange={set("profession")} placeholder="e.g. Chartered Accountant, Doctor, Teacher…" data-testid="apply-profession" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Why Rotary?</span>
              <textarea rows={4} className="input-dark" value={form.why_rotary} onChange={set("why_rotary")} placeholder="Tell us what draws you to service…" data-testid="apply-why" />
            </label>
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300" data-testid="apply-error">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-royal w-full" data-testid="apply-submit">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Application
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
