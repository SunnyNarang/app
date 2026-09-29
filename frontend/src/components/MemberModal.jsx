import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X, Lock, Phone, Mail, MapPin, Cake, HeartHandshake, Users2, CalendarHeart, MessageCircle,
} from "lucide-react";
import { Avatar, slugOf } from "../pages/Members";

const PRIVATE_ROWS = (m) => [
  { icon: Phone, label: "Phone Number", value: m.phone, testId: "phone", href: m.phone ? `tel:${m.phone.replace(/\s/g, "")}` : null },
  { icon: Mail, label: "Email", value: m.email, testId: "email", href: m.email ? `mailto:${m.email}` : null },
  { icon: MapPin, label: "Residential Address", value: m.address, testId: "address", href: null },
  { icon: Cake, label: "Birthday", value: m.birthday, testId: "birthday", href: null },
  { icon: CalendarHeart, label: "Wedding Anniversary", value: m.anniversary, testId: "anniversary", href: null },
  { icon: Users2, label: "Spouse", value: m.spouse, testId: "spouse", href: null },
];

export default function MemberModal({ member, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const locked = member.locked;
  const rows = PRIVATE_ROWS(member);
  const waDigits = (member.phone || "").replace(/\D/g, "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      data-testid="member-biodata-modal"
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-royal/25 bg-panel shadow-[0_20px_80px_rgba(0,0,0,0.7)] sm:rounded-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-royal/30 bg-black/60 p-2 text-royal-light transition-all hover:bg-royal hover:text-white"
          data-testid="biodata-close-button"
          aria-label="Close biodata"
        >
          <X size={18} />
        </button>

        <div className="grid gap-0 md:grid-cols-5">
          <div className="relative border-b border-royal/15 bg-black/30 p-8 text-center md:col-span-2 md:border-b-0 md:border-r">
            <div className="flex justify-center">
              <Avatar member={member} size="h-56 w-56" initialsSize="text-5xl" />
            </div>
            <h2 className="mt-6 font-display text-xl font-bold leading-snug" data-testid="biodata-name">
              {member.name}
            </h2>
            {member.role && (
              <p className="mt-2 inline-block rounded-full border border-royal/30 bg-royal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-royal-light" data-testid="biodata-role">
                {member.role}
              </p>
            )}
            <dl className="mt-8 space-y-4 text-left text-sm" data-testid="biodata-public-details">
              {[
                ["Classification", member.classification],
                ["Business / Firm", member.business],
                ["Member since", member.joined_year],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-royal/10 pb-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-200">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {member.paul_harris && (
              <p className="mt-6 rounded-lg border border-royal/30 bg-royal/10 p-3 text-xs text-royal-light" data-testid="biodata-phf-badge">
                Paul Harris Fellow — recognised for exceptional giving to The Rotary Foundation.
              </p>
            )}
          </div>

          <div className="p-6 sm:p-8 md:col-span-3">
            <p className="eyebrow mb-3">About</p>
            <p className="text-sm leading-relaxed text-slate-300" data-testid="biodata-bio">
              {member.bio || "Biography coming soon."}
            </p>

            <div className="mt-8">
              <p className="eyebrow mb-4">Members-Only Biodata</p>

              {locked ? (
                <div className="relative overflow-hidden rounded-xl border border-royal/25" data-testid="biodata-locked-panel">
                  <div className="pointer-events-none select-none space-y-3 p-5 opacity-60 blur-[6px]" aria-hidden="true">
                    {rows.map((r) => (
                      <div key={r.testId} className="flex items-center justify-between gap-4 rounded-lg bg-black/30 px-4 py-3">
                        <span className="text-xs text-slate-400">{r.label}</span>
                        <span className="font-mono text-xs text-slate-300">████ ████</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 p-6 text-center backdrop-blur-[2px]">
                    <span className="rounded-full border border-royal/40 bg-royal/15 p-3 text-royal">
                      <Lock size={20} />
                    </span>
                    <p className="text-sm font-semibold text-royal-light" data-testid="biodata-locked-message">
                      Members-only information
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-slate-400">
                      Personal details — phone, address, birthday and spouse — are visible to
                      signed-in club members only.
                    </p>
                    <Link
                      to="/login"
                      className="btn-royal !px-5 !py-2.5 !text-xs"
                      data-testid="biodata-login-cta"
                    >
                      <Lock size={13} /> Member Login to Unlock
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3" data-testid="biodata-unlocked-panel">
                  {rows.map((r, i) => (
                    <motion.div
                      key={r.testId}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.08 + i * 0.07 }}
                      className="flex items-center justify-between gap-4 rounded-lg border border-royal/15 bg-black/30 px-4 py-3 transition-colors hover:border-royal/40"
                      data-testid={`biodata-${r.testId}-unlocked`}
                    >
                      <span className="flex items-center gap-2.5 text-xs text-slate-400">
                        <r.icon size={15} className="text-royal" /> {r.label}
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-100">
                        {r.value || "—"}
                      </span>
                    </motion.div>
                  ))}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {member.phone && (
                      <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="btn-ghost !px-4 !py-2 !text-xs" data-testid="biodata-call-button">
                        <Phone size={13} /> Call
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="btn-ghost !px-4 !py-2 !text-xs" data-testid="biodata-email-button">
                        <Mail size={13} /> Email
                      </a>
                    )}
                    {waDigits && (
                      <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="btn-ghost !px-4 !py-2 !text-xs" data-testid="biodata-whatsapp-button">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
