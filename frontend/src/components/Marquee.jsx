import { Logo } from "./Logo";

const ITEMS = [
  "Service Above Self",
  "Innovation in Community",
  "Healthcare Drives",
  "Girl Child Education",
  "Clean Gwalior Initiative",
  "Youth Fellowship",
];

export const Marquee = () => (
  <div
    className="relative overflow-hidden border-y border-royal/20 bg-black/40 py-5"
    data-testid="home-marquee"
  >
    <div className="flex w-max animate-marquee">
      {[0, 1].map((dup) => (
        <div
          key={dup}
          aria-hidden={dup === 1}
          className="flex shrink-0 items-center"
        >
          {ITEMS.map((item) => (
            <span
              key={`${dup}-${item}`}
              className="flex items-center gap-10 pr-10 font-display text-sm sm:text-base font-semibold uppercase tracking-[0.3em] text-royal-light/80"
            >
              {item}
              <Logo size={18} />
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);
