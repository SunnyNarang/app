import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import MemberModal from "../components/MemberModal";
import { Reveal } from "../components/Reveal";
import { initialsOf } from "../components/Navbar";

export const slugOf = (name = "") =>
  name
    .toLowerCase()
    .replace(/rtn\.|r'ann|er\.|dr\.|adv\.|mrs\.|mr\.|/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "member";

const FILTERS = [
  { id: "all", label: "All Members" },
  { id: "board", label: "Board & Directors" },
  { id: "past", label: "Past Presidents" },
  { id: "phf", label: "Paul Harris Fellows" },
];

export const Avatar = ({ member, size = "h-24 w-24" }) => (
  <div
    className={`${size} shrink-0 overflow-hidden rounded-full ring-2 ring-royal/40 ring-offset-2 ring-offset-obsidian`}
  >
    {member.photo_url ? (
      <img
        src={member.photo_url}
        alt={member.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-hover to-panel">
        <span className="royal-text font-display text-2xl font-bold">
          {initialsOf(member.name)}
        </span>
      </div>
    )}
  </div>
);

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/members")
      .then(({ data }) => setMembers(data))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ =
        !q ||
        [m.name, m.role, m.classification, m.business]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchF =
        filter === "all" ||
        (filter === "board" && m.board_member) ||
        (filter === "past" && m.past_president) ||
        (filter === "phf" && m.paul_harris);
      return matchQ && matchF;
    });
  }, [members, query, filter]);

  return (
    <main className="min-h-screen bg-obsidian pb-28 pt-28 sm:pt-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal mount>
          <p className="eyebrow mb-4">The Directory</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
              Distinguished Fellows &amp; <span className="royal-text">Innovators.</span>
            </h1>
            {user ? (
              <p className="rounded-full border border-royal/30 bg-royal/10 px-4 py-2 text-xs font-semibold text-royal-light" data-testid="unlocked-banner">
                Signed in — full biodata unlocked
              </p>
            ) : (
              <p className="rounded-full border border-royal/25 bg-black/40 px-4 py-2 text-xs text-slate-400" data-testid="locked-banner">
                <Lock size={12} className="mr-1.5 inline text-royal" />
                Personal details are members-only
              </p>
            )}
          </div>
        </Reveal>

        <Reveal mount delay={0.1}>
          <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-royal/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, classification, business…"
                className="input-dark pl-11"
                data-testid="member-search-input"
              />
            </div>
            <div className="flex flex-wrap gap-2" data-testid="member-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  data-testid={`member-filter-${f.id}`}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-300 ${
                    filter === f.id
                      ? "border-royal bg-royal text-white shadow-[0_0_18px_rgba(65,105,225,0.35)]"
                      : "border-royal/25 text-slate-300 hover:border-royal/60 hover:text-royal-light"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {loading ? (
          <div className="mt-16 text-center text-slate-400" data-testid="members-loading">
            Loading the fellowship…
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: (i % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setSelected(m)}
                data-testid={`member-card-${slugOf(m.name)}`}
                className="glass-card group relative flex flex-col items-center p-7 text-center"
              >
                <Avatar member={m} />
                <h3 className="mt-5 font-display text-base font-bold leading-snug sm:text-lg">
                  {m.name}
                </h3>
                {m.role && (
                  <span className="mt-2 rounded-full border border-royal/30 bg-royal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-royal-light">
                    {m.role}
                  </span>
                )}
                <p className="mt-3 font-mono text-xs text-royal/70">{m.classification}</p>
                {m.business && <p className="mt-1 text-xs text-slate-500">{m.business}</p>}
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-royal opacity-0 transition-all duration-300 group-hover:opacity-100">
                  View full biodata <ArrowRight size={13} />
                </span>
                {m.locked && (
                  <Lock size={13} className="absolute right-4 top-4 text-royal/50" data-testid={`member-card-lock-${slugOf(m.name)}`} />
                )}
              </motion.button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full mt-6 text-center text-slate-400" data-testid="members-empty-state">
                No members match that search — try a different name or classification.
              </p>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <MemberModal member={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </main>
  );
}
