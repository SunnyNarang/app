import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView, animate, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowDown, HeartPulse, BookOpen, Leaf, Briefcase,
  Clock, MapPin, Mic2, Quote, Maximize2,
} from "lucide-react";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { photoSrcOf } from "../components/PhotoUpload";
import Lightbox from "../components/Lightbox";
import ApplyModal from "../components/ApplyModal";
import { Reveal, MaskedLine } from "../components/Reveal";
import { Marquee } from "../components/Marquee";
import { Logo } from "../components/Logo";
import { initialsOf } from "../components/Navbar";

const HERO_BG =
  "https://images.unsplash.com/photo-1643269877099-ea5393b80320?crop=entropy&cs=srgb&fm=jpg&q=85";
const FORT_IMG =
  "https://images.unsplash.com/photo-1773846012618-0d05a562d792?crop=entropy&cs=srgb&fm=jpg&q=85";

const PILLARS = [
  {
    icon: HeartPulse, title: "Medical & Health Camps",
    stat: "9,400+ citizens screened",
    desc: "Cardiac, anaemia and paediatric screening camps led by our doctors, with free follow-up care.",
    img: "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
  {
    icon: BookOpen, title: "Literacy & Girl-Child Education",
    stat: "300 girls kept in school",
    desc: "Nano Udaan sponsorships, learning kits and mentoring circles for first-generation learners.",
    img: "https://images.unsplash.com/photo-1524069290683-0457abfe42c3?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
  {
    icon: Leaf, title: "Green & Clean Gwalior",
    stat: "12 tonnes of waste cleared",
    desc: "Plantation drives, ward-level sanitation sprints and a heritage-zone citizen wardens' club.",
    img: FORT_IMG,
  },
  {
    icon: Briefcase, title: "Vocational & Women Empowerment",
    stat: "60 women trained to earn",
    desc: "Loom-to-livelihood weaving cohorts, coding bootcamps for schoolgirls and vocational scholarships.",
    img: "https://images.unsplash.com/photo-1569173675610-42c361a86e37?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
];

const STATS = [
  { to: 25000, suffix: "+", label: "Lives Touched", decimals: 0, prefix: "" },
  { to: 140, suffix: "+", label: "Service Projects", decimals: 0, prefix: "" },
  { to: 1.2, suffix: " Cr", label: "Community Investment", decimals: 1, prefix: "₹" },
  { to: 11, suffix: "", label: "Years of Innovation", decimals: 0, prefix: "" },
];

const Counter = ({ to, suffix, prefix, decimals }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref} className="royal-text font-display text-4xl font-bold sm:text-5xl" data-testid="impact-counter">
      {prefix}
      {val.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};

const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.22]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section ref={ref} className="grain relative flex min-h-[100svh] items-end overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img
          src={HERO_BG}
          alt="Gwalior cityscape at dusk"
          className="h-full w-full object-cover"
          data-testid="hero-background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-obsidian" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/85 via-transparent to-obsidian/40" />
      </motion.div>

      <motion.div
        style={{ opacity: fade }}
        className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 sm:pb-28"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-7 inline-flex items-center gap-3 rounded-full border border-royal/40 bg-black/50 px-4 py-2 backdrop-blur"
          data-testid="hero-badge"
        >
          <Logo size={16} />
          <span className="eyebrow !text-royal-light">Rotary International · District 3053 · Gwalior</span>
        </motion.div>

        <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-6xl lg:text-7xl">
          <MaskedLine delay={0.2}>Service Above Self.</MaskedLine>
          <MaskedLine delay={0.38}>
            <span className="royal-text">Innovated for Gwalior.</span>
          </MaskedLine>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg"
        >
          The Rotary Club of Gwalior Innovators is a fellowship of the city&apos;s builders,
          doctors, engineers and dreamers — turning Rotary&apos;s century-old promise into
          measurable change, one project at a time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <a href="#impact" data-testid="hero-explore-button" className="btn-royal">
            Explore Our Impact <ArrowRight size={17} />
          </a>
          <Link to="/members" data-testid="hero-members-button" className="btn-ghost">
            Members&apos; Directory
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ opacity: fade }}
        className="absolute bottom-8 right-6 z-10 hidden items-center gap-2 text-royal/70 md:flex"
      >
        <span className="eyebrow !text-royal/60">Scroll</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ArrowDown size={16} />
        </motion.span>
      </motion.div>
    </section>
  );
};

const Mission = () => (
  <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
    <div className="grid items-center gap-14 lg:grid-cols-2">
      <Reveal>
        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl border border-royal/25" />
          <img
            src={FORT_IMG}
            alt="Gwalior Fort heritage"
            className="relative aspect-[4/3] w-full rounded-xl object-cover"
            data-testid="mission-image"
          />
          <div className="glass-card absolute -bottom-8 -right-4 max-w-[240px] p-5 sm:-right-8">
            <p className="font-display text-3xl font-bold text-royal" data-testid="mission-since">2015</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              Chartered in Gwalior, serving ever since
            </p>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="eyebrow mb-4">Our Mission</p>
        <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">
          Take on Gwalior&apos;s hardest problems —{" "}
          <span className="royal-text">with a maker&apos;s mindset.</span>
        </h2>
        <p className="mt-6 leading-relaxed text-slate-300">
          We are not a chequebook club. Every Innovator rolls up their sleeves: our engineers
          design the sanitation blocks, our doctors run the camps, our journalists carry the
          stories, our hoteliers host the village. The result is service you can touch, visit
          and measure.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            ["Fellowship first", "Thursday evenings that feed the soul as much as the agenda."],
            ["Projects with P&Ls", "Every rupee tracked, every beneficiary followed up."],
            ["Innovation as tradition", "From water ATMs to code bootcamps — new tools, old values."],
          ].map(([t, d]) => (
            <li key={t} className="flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-royal" />
              <span>
                <span className="font-bold text-slate-100">{t}</span>
                <span className="text-slate-400"> — {d}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  </section>
);

const Pillars = () => (
  <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32">
    <Reveal>
      <p className="eyebrow mb-4">Where We Serve</p>
      <h2 className="max-w-2xl font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
        Four pillars, one promise — <span className="royal-text">a better Gwalior.</span>
      </h2>
    </Reveal>
    <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {PILLARS.map((p, i) => (
        <Reveal
          key={p.title}
          delay={i * 0.08}
          className={i === 0 ? "lg:col-span-2" : i === 3 ? "lg:col-span-2" : ""}
        >
          <article
            className={`glass-card group relative h-full min-h-[280px] overflow-hidden ${i === 0 || i === 3 ? "lg:flex" : ""}`}
            data-testid={`pillar-card-${i}`}
          >
            <div className={`relative min-h-[160px] ${i === 0 || i === 3 ? "lg:w-2/5" : ""}`}>
              <img
                src={p.img}
                alt={p.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent lg:bg-gradient-to-r" />
            </div>
            <div className={`relative p-6 sm:p-8 ${i === 0 || i === 3 ? "lg:w-3/5" : ""}`}>
              <p.icon size={26} className="text-royal" />
              <h3 className="mt-4 font-display text-xl font-bold sm:text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.desc}</p>
              <p className="mt-5 inline-block rounded-full border border-royal/30 bg-royal/10 px-4 py-1.5 font-mono text-xs text-royal-light">
                {p.stat}
              </p>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  </section>
);

const Impact = () => (
  <section id="impact" className="border-y border-royal/15 bg-black/40">
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <p className="eyebrow mb-4">Impact, Counted</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
          Numbers we are <span className="royal-text">proud to repeat.</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} className="text-center">
            <Counter to={s.to} suffix={s.suffix} prefix={s.prefix} decimals={s.decimals} />
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400 sm:text-sm">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const Schedule = () => {
  const [meetings, setMeetings] = useState([]);
  useEffect(() => {
    api
      .get("/meetings")
      .then(({ data }) => setMeetings(data.slice(0, 3)))
      .catch(() => setMeetings([]));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
      <Reveal>
        <p className="eyebrow mb-4">Club Schedule</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
          This month at the <span className="royal-text">weekly wheel.</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 lg:grid-cols-3" data-testid="schedule-preview">
        {meetings.length === 0 && (
          <p className="text-slate-400" data-testid="schedule-empty-hint">
            The next schedule is being finalised by the Sergeant-at-Arms — check back soon.
          </p>
        )}
        {meetings.map((m, i) => (
          <Reveal key={m.id} delay={i * 0.08}>
            <article className="glass-card flex h-full flex-col p-6 sm:p-7" data-testid={`schedule-card-${i}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-lg border border-royal/30 bg-royal/10 px-4 py-3 text-center">
                  <p className="font-display text-2xl font-bold text-royal" data-testid={`schedule-date-${i}`}>
                    {dayjs(m.date).format("DD")}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-royal-light">
                    {dayjs(m.date).format("MMM")}
                  </p>
                </div>
                <span className="rounded-full border border-royal/25 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-royal/80">
                  {m.kind}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{m.title}</h3>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Clock size={13} className="text-royal" /> {dayjs(m.date).format("dddd")} · {m.time}
              </p>
              <p className="mt-1.5 flex items-start gap-2 text-xs text-slate-400">
                <MapPin size={13} className="mt-0.5 shrink-0 text-royal" /> {m.venue}
              </p>
              {m.speaker && (
                <p className="mt-4 flex items-center gap-2 border-t border-royal/10 pt-4 text-xs text-royal-light">
                  <Mic2 size={13} /> {m.speaker} — <span className="text-slate-400">{m.topic}</span>
                </p>
              )}
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <p className="mt-8 text-sm text-slate-400" data-testid="schedule-rsvp-hint">
          Members can view the full year&apos;s schedule and RSVP from the members&apos; area.{" "}
          <Link to="/login" className="font-semibold text-royal hover:text-royal-light">
            Log in
          </Link>
        </p>
      </Reveal>
    </section>
  );
};

const LEADERS = [
  {
    name: "Rtn. Dr. Sunita Raj", role: "Club Secretary & Medical Lead",
    photo: "https://images.unsplash.com/photo-1770627000564-3feb36aecbcd?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
  {
    name: "Rtn. Vikrant Agarwal", role: "Treasurer & Youth Director",
    photo: "https://images.unsplash.com/photo-1771244678811-50c22f17c791?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
  {
    name: "Rtn. Rajesh Soni", role: "Community Service Chair",
    photo: "https://images.unsplash.com/photo-1771244688590-1e481dba1b5a?crop=entropy&cs=srgb&fm=jpg&q=85",
  },
];

const Leadership = () => {
  const [leaders, setLeaders] = useState([]);
  useEffect(() => {
    api
      .get("/members")
      .then(({ data }) => {
        const slots = [
          { key: "president", label: "Club President", match: (r) => r.includes("president") && !r.includes("past") },
          { key: "secretary", label: "Club Secretary", match: (r) => r.includes("secretary") && !r.includes("past") },
          { key: "treasurer", label: "Treasurer", match: (r) => r.includes("treasurer") && !r.includes("past") },
        ];
        const picked = slots
          .map((slot) => {
            const active = data.find((m) => slot.match((m.role || "").toLowerCase()));
            if (active) return { ...slot, member: active };
            const past = data.find((m) => (m.role || "").toLowerCase().includes(slot.key));
            return past ? { ...slot, label: `Past ${slot.label}`, member: past } : null;
          })
          .filter(Boolean);
        setLeaders(picked);
      })
      .catch(() => setLeaders([]));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32">
      <Reveal>
        <p className="eyebrow mb-4">Club Leadership</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
          The team that <span className="royal-text">turns the wheel.</span>
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="leadership-grid">
        {leaders.map((l, i) => (
          <Reveal key={l.key} delay={i * 0.08}>
            <Link
              to="/members"
              className="glass-card group flex h-full flex-col items-center p-7 text-center transition-all duration-300 hover:-translate-y-1"
              data-testid={`leader-tile-${l.key}`}
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-royal/40 ring-offset-2 ring-offset-obsidian transition-transform duration-500 group-hover:scale-105">
                {l.member.photo_url ? (
                  <img
                    src={photoSrcOf(l.member.photo_url)}
                    alt={l.member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-hover to-panel">
                    <span className="royal-text font-display text-2xl font-bold">
                      {initialsOf(l.member.name)}
                    </span>
                  </div>
                )}
              </div>
              <span className="mt-5 inline-block rounded-full border border-royal/30 bg-royal/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-royal-light">
                {l.label}
              </span>
              <p className="mt-3 font-display text-base font-bold">{l.member.name}</p>
              <p className="mt-1 text-xs text-slate-400">{l.member.role}</p>
              <p className="mt-2 font-mono text-xs text-royal/70">{l.member.classification}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

const Gallery = () => {
  const [items, setItems] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  useEffect(() => {
    api
      .get("/gallery")
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  const shown = items.slice(0, 6);
  const spanFor = (i) =>
    i === 0 ? "col-span-2 row-span-2" : i === 3 || i === 5 ? "col-span-2" : "";

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32" data-testid="home-gallery">
      <Reveal>
        <p className="eyebrow mb-4">Gallery</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
          Moments from our <span className="royal-text">service.</span>
        </h2>
      </Reveal>
      <div className="mt-12 grid auto-rows-[150px] grid-flow-dense grid-cols-2 gap-4 sm:auto-rows-[190px] md:grid-cols-4">
        {shown.map((g, i) => (
          <Reveal key={g.id} delay={i * 0.06} className={spanFor(i)}>
            <button
              onClick={() => setLightbox(i)}
              className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-xl border border-royal/20 transition-colors duration-300 hover:border-royal/60"
              data-testid={`gallery-thumb-${i}`}
            >
              <img
                src={photoSrcOf(g.image_url)}
                alt={g.caption || "Gallery moment"}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                data-testid={`gallery-photo-${i}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              {g.caption && (i === 0 || i === 3 || i === 5) && (
                <span className="absolute bottom-0 left-0 right-0 block p-4 text-left">
                  <span
                    className="line-clamp-2 border-l-2 border-royal/60 pl-3 text-[11px] leading-relaxed text-slate-200 sm:text-sm"
                    data-testid={`gallery-caption-${i}`}
                  >
                    {g.caption}
                  </span>
                </span>
              )}
              <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 p-2 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100">
                <Maximize2 size={14} />
              </span>
            </button>
          </Reveal>
        ))}
      </div>
      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox
            items={shown}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onNavigate={setLightbox}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

const JoinBand = () => {
  const [applyOpen, setApplyOpen] = useState(false);
  return (
    <section className="relative overflow-hidden border-t border-royal/20 bg-black/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal>
          <p className="eyebrow mb-4">Join The Wheel</p>
          <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Your time. Your talent. <span className="royal-text">Your Gwalior.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-400">
            Membership is by invitation of the board — but every journey starts with a
            conversation. Tell us who you are and why you want to serve.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <button onClick={() => setApplyOpen(true)} className="btn-royal" data-testid="apply-membership-button">
              Apply for Membership <ArrowRight size={17} />
            </button>
            <Link to="/login" data-testid="join-login-button" className="btn-ghost">
              Member Login
            </Link>
          </div>
        </Reveal>
      </div>
      <AnimatePresence>
        {applyOpen && <ApplyModal onClose={() => setApplyOpen(false)} />}
      </AnimatePresence>
    </section>
  );
};

export default function Home() {
  return (
    <main className="bg-obsidian">
      <Hero />
      <Marquee />
      <Mission />
      <Pillars />
      <Impact />
      <Schedule />
      <Leadership />
      <Gallery />
      <JoinBand />
    </main>
  );
}
