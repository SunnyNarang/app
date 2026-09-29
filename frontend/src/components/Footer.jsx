import { Link } from "react-router-dom";
import { MapPin, Mail, Clock } from "lucide-react";
import { Logo, LogoLockup } from "./Logo";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-royal/20 bg-black/60">
      <Logo
        size={420}
        className="pointer-events-none absolute -bottom-32 -right-24 opacity-[0.04]"
      />
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <LogoLockup />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
            A fellowship of Gwalior&apos;s professionals and change-makers, taking on the city&apos;s
            toughest challenges in health, education and environment — with innovation as our
            compass and service as our creed.
          </p>
          <div className="mt-6 flex items-start gap-3 text-sm text-slate-300" data-testid="footer-meeting-info">
            <Clock size={16} className="mt-0.5 shrink-0 text-royal" />
            <span>
              Weekly Fellowship — Every Thursday, 7:00 PM
              <br />
              <span className="text-slate-500">Hotel Landmark, Link Road, Gwalior</span>
            </span>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-5">Explore</p>
          <ul className="space-y-3 text-sm">
            <li><Link to="/" className="text-slate-300 transition-colors hover:text-royal" data-testid="footer-home-link">Home</Link></li>
            <li><Link to="/members" className="text-slate-300 transition-colors hover:text-royal" data-testid="footer-members-link">Members&apos; Directory</Link></li>
            <li><Link to="/login" className="text-slate-300 transition-colors hover:text-royal" data-testid="footer-login-link">Member Login</Link></li>
            <li><Link to="/admin" className="text-slate-300 transition-colors hover:text-royal" data-testid="footer-admin-link">Admin Portal</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-5">Reach Us</p>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-royal" />
              Gwalior, Madhya Pradesh, India
            </li>
            <li className="flex items-start gap-3">
              <Mail size={16} className="mt-0.5 shrink-0 text-royal" />
              club@rotarygwalior.org
            </li>
          </ul>
          <p className="mt-6 font-mono text-xs text-royal/70">Rotary International · District 3053</p>
        </div>
      </div>
      <div className="border-t border-royal/10 py-6 text-center text-xs text-slate-500">
        © 2025-26 Rotary Club of Gwalior Innovators · Service Above Self
      </div>
    </footer>
  );
}
