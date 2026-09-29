export const Logo = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="rotGold" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#C7D9FF" />
        <stop offset="55%" stopColor="#4169E1" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="21" stroke="url(#rotGold)" strokeWidth="3" />
    <path
      d="M24 8v9M24 31v9M8 24h9M31 24h9M12.7 12.7l6.4 6.4M28.9 28.9l6.4 6.4M35.3 12.7l-6.4 6.4M19.1 28.9l-6.4 6.4"
      stroke="url(#rotGold)"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <circle cx="24" cy="24" r="5" fill="url(#rotGold)" />
    <path d="M38 6l2 2-2 2-2-2 2-2z" fill="#C7D9FF" />
  </svg>
);

export const LogoLockup = ({ compact = false }) => (
  <div className="flex items-center gap-3" data-testid="brand-lockup">
    <Logo size={40} className="shrink-0 drop-shadow-[0_0_12px_rgba(65,105,225,0.45)]" />
    {!compact && (
      <div className="leading-tight">
        <div className="font-display font-bold tracking-wide text-royal-light text-sm sm:text-base">
          ROTARY CLUB OF
        </div>
        <div className="font-display font-bold tracking-widest text-royal text-sm sm:text-base">
          GWALIOR INNOVATORS
        </div>
      </div>
    )}
  </div>
);
