import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Lock, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";

const FIELDS = [
  ["name", "Full Name *", true],
  ["classification", "Classification", false],
  ["business", "Business / Firm", false],
  ["photo_url", "Photo URL", false],
  ["phone", "Phone Number", false],
  ["birthday", "Birthday (e.g. 12 March)", false],
  ["anniversary", "Wedding Anniversary", false],
  ["spouse", "Spouse Name", false],
  ["address", "Residential Address", false],
];

export default function MyProfileModal({ onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/profile")
      .then(({ data }) => {
        setForm({
          name: data.name || "", photo_url: data.photo_url || "",
          classification: data.classification || "", business: data.business || "",
          bio: data.bio || "", phone: data.phone || "", address: data.address || "",
          birthday: data.birthday || "", anniversary: data.anniversary || "",
          spouse: data.spouse || "",
        });
        setMeta(data);
      })
      .catch((e) => {
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Could not load your profile");
        onClose();
      });
  }, [onClose]);

  if (!form) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.put("/profile", form);
      toast.success("Profile updated successfully");
      onSaved?.();
      onClose();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Could not update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="my-profile-modal"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-royal/25 bg-panel p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-royal-light">
            <UserRound size={20} className="text-royal" /> Edit My Profile
          </h3>
          <button
            onClick={onClose}
            className="rounded-full border border-royal/30 p-2 text-royal-light transition-all hover:bg-royal hover:text-white"
            data-testid="my-profile-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {meta && (
          <div className="mb-6 grid gap-3 rounded-lg border border-royal/15 bg-black/30 p-4 sm:grid-cols-3">
            {[
              ["Login email", meta.email],
              ["Role", meta.role],
              ["Member since", meta.joined_year],
            ].map(([k, v]) => (
              <div key={k} data-testid="my-profile-locked-field">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                  <Lock size={10} className="text-royal/70" /> {k} — admin only
                </p>
                <p className="mt-1 truncate font-mono text-xs text-slate-300">{v || "—"}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" data-testid="my-profile-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([key, label, full]) => (
              <label key={key} className={full === "name" || key === "address" ? "block sm:col-span-2" : "block"}>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </span>
                {key === "bio" ? (
                  <textarea
                    rows={3}
                    className="input-dark"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    data-testid="my-profile-bio"
                  />
                ) : (
                  <input
                    className="input-dark"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    data-testid={`my-profile-${key.replace("_", "-")}`}
                  />
                )}
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Bio</span>
              <textarea
                rows={3}
                className="input-dark"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                data-testid="my-profile-bio"
              />
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300" data-testid="my-profile-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-royal w-full" data-testid="my-profile-submit">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Save My Profile
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
