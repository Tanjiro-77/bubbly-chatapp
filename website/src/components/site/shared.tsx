import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  Users,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Phone,
  Video,
  BarChart3,
  MapPin,
  PhoneCall,
  Sparkles,
  Bell,
  UserRound,
  ShieldCheck,
  Gauge,
  Download,
  Github,
  Sun,
  Moon,
  ArrowUpRight,
  Menu,
  X,
  Zap,
} from "lucide-react";

export const APK_DOWNLOAD_LINK =
  "https://github.com/Tanjiro-77/bubbly-chatapp/releases/download/Bubbly_v1.0.0/bubbly.apk";
export const GITHUB_URL = "https://github.com/Tanjiro-77/bubbly-chatapp";
export const FEEDBACK_EMAIL =
  "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Feedback&body=Hi%20Arnav%2C%0A%0AHere%27s%20my%20feedback%20on%20Bubbly%3A%0A%0A-%20%5BDescribe%20the%20issue%20or%20idea%5D%0A%0ADevice%3A%20%5BYour%20phone%20model%5D%0AAndroid%20version%3A%20%5BYour%20Android%20version%5D%0A%0AThanks%21";

export const featureGroups = [
  {
    name: "Messaging",
    items: [
      { icon: MessageCircle, title: "Real-time messaging", text: "Messages arrive instantly, with delivery state." },
      { icon: Users, title: "One-to-one chats", text: "Private conversations between two users." },
      { icon: Mic, title: "Voice messages", text: "Record and send a quick voice note." },
      { icon: BarChart3, title: "Polls", text: "Create a poll and collect answers." },
    ],
  },
  {
    name: "Media & sharing",
    items: [
      { icon: ImageIcon, title: "Photos & videos", text: "Share images and clips right inside a chat." },
      { icon: Paperclip, title: "File sharing", text: "Send documents and other files." },
      { icon: MapPin, title: "Location sharing", text: "Share your current location in a chat." },
    ],
  },
  {
    name: "Calls",
    items: [
      { icon: Phone, title: "Voice calls", text: "Call another Bubbly user directly." },
      { icon: Video, title: "Video calls", text: "Face-to-face calls from inside the chat." },
      { icon: PhoneCall, title: "Call history", text: "Calls show up as messages so nothing is lost." },
    ],
  },
  {
    name: "Experience",
    items: [
      { icon: Sparkles, title: "Modern chat UI", text: "Clean bubbles, smooth scrolling, dark mode." },
      { icon: Bell, title: "Notifications", text: "Get notified about new messages and calls." },
      { icon: UserRound, title: "User profiles", text: "Name, photo and basic profile details." },
      { icon: ShieldCheck, title: "Secure authentication", text: "Account sign-in with protected sessions." },
      { icon: Gauge, title: "Smooth experience", text: "Built to stay responsive on everyday phones." },
    ],
  },
];

export const allFeatures = featureGroups.flatMap((g) => g.items);

export const tech = [
  "React Native",
  "Expo",
  "TypeScript",
  "Node.js / NestJS",
  "MongoDB",
  "Real-time communication",
  "Agora",
  "NativeWind",
];

// ── Reveal hook ─────────────────────────────────────────────
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && (e.target.classList.add("is-in"), io.unobserve(e.target)),
        ),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Download button ──────────────────────────────────────────
export function DownloadButton({
  className = "",
  label = "Download APK",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a href={APK_DOWNLOAD_LINK} className={`btn-base btn-primary ${className}`} download>
      <Download className="h-4 w-4" /> {label}
    </a>
  );
}

// ── Page hero ────────────────────────────────────────────────
export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="glow-backdrop grid-bg relative overflow-hidden px-5 pb-16 pt-20 text-center">
      {/* Side orbs */}
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--gradient-warm)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--gradient-warm)" }}
      />

      <div className="relative">
        <span className="chip mx-auto inline-flex">
          <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
        </span>

        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground sm:text-lg">{text}</p>

        {/* Shimmer divider */}
        <div className="mx-auto mt-8 h-px w-24 bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </section>
  );
}

// ── Theme toggle ─────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("bubbly-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bubbly-theme", next ? "dark" : "light");
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="btn-base btn-ghost-outline h-10 w-10 p-0! transition-all duration-200"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ── Nav links ────────────────────────────────────────────────
const nav = [
  { to: "/features", label: "Features" },
  { to: "/download", label: "Download" },
  { to: "/about", label: "Story" },
  { to: "/faq", label: "FAQ" },
] as const;

// ── Site header ──────────────────────────────────────────────
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      {/* Pill navbar */}
      <div
        className="mx-auto flex max-w-6xl items-center gap-3 rounded-full border border-border bg-background/80 px-3 py-2 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 pl-1 transition-opacity hover:opacity-80"
          onClick={() => setOpen(false)}
        >
          <div className="relative">
            {/* Logo glow */}
            <div
              className="absolute inset-0 rounded-xl opacity-50 blur-md"
              style={{ background: "var(--gradient-warm)" }}
            />
            {/* ✅ Fixed: public path instead of logo.url */}
            <img
              src="/icon-foreground.png"
              alt="Bubbly logo"
              className="relative h-8 w-8 rounded-xl object-contain"
            />
          </div>
          <span className="font-display text-lg font-extrabold">Bubbly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
              activeProps={{ className: "!bg-accent !text-foreground font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <DownloadButton
            className="hidden! px-4! py-2! text-sm! sm:inline-flex!"
            label="Get APK"
          />
          <button
            className="btn-base btn-ghost-outline h-10 w-10 p-0! md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-border bg-card p-3 md:hidden"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          {/* Top shimmer */}
          <div className="mb-2 h-px w-full bg-linear-to-r from-transparent via-primary/30 to-transparent" />

          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-3 font-semibold transition-colors hover:bg-muted"
              activeProps={{ className: "!bg-accent" }}
            >
              {n.label}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}

          <div className="mt-2 h-px w-full bg-border" />
          <DownloadButton className="mt-3 w-full" />
        </div>
      )}
    </header>
  );
}

// ── CTA band ─────────────────────────────────────────────────
export function CtaBand() {
  return (
    <section className="px-5 py-20">
      <div
        data-reveal
        className="reveal cta-band relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-7 py-16 text-center sm:px-14"
      >
        {/* Corner orbs inside the band */}
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        {/* App icon with glow */}
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div
            className="absolute inset-0 rounded-3xl opacity-60 blur-xl float-soft"
            style={{ background: "var(--gradient-warm)" }}
          />
          {/* ✅ Fixed: public path instead of logo.url */}
          <img
            src="/icon-foreground.png"
            alt=""
            aria-hidden
            className="relative float-soft h-20 w-20 rounded-3xl object-contain [animation-delay:0.5s]"
          />
        </div>

        {/* Trust chip */}
        <div className="relative mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
          <Zap className="h-3.5 w-3.5" />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase opacity-80">
            Free · No Play Store needed
          </span>
        </div>

        <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-extrabold sm:text-5xl">
          Ready to start bubbling?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl opacity-75">
          Grab the APK, install it on your Android phone, and send your first message.
        </p>

        {/* Shimmer divider */}
        <div className="mx-auto my-7 h-px w-24 bg-linear-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative flex flex-wrap justify-center gap-3">
          <DownloadButton label="Download Bubbly APK" />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-base btn-ghost-outline"
          >
            <Github className="h-4 w-4" /> Star on GitHub
          </a>
        </div>

        {/* Bottom mono tag */}
        <p className="relative mt-8 font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
          Bubbly · Built by Arnav
        </p>
      </div>
    </section>
  );
}

// ── Site footer ──────────────────────────────────────────────
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface px-5 pb-8 pt-14">
      {/* Ambient orb */}
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--gradient-warm)" }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        {/* Brand col */}
        <div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl opacity-40 blur-md"
                style={{ background: "var(--gradient-warm)" }}
              />
              {/* ✅ Fixed: public path instead of logo.url */}
              <img
                src="/icon-foreground.png"
                alt=""
                aria-hidden
                className="relative h-10 w-10 rounded-xl object-contain"
              />
            </div>
            <p className="font-display text-xl font-extrabold">Bubbly</p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Built with curiosity, code and a lot of debugging.
          </p>

          {/* Social row */}
          <div className="mt-5 flex gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost-outline px-3! py-2! text-xs!"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
            <a
              href={FEEDBACK_EMAIL}
              className="btn-base btn-ghost-outline px-3! py-2! text-xs!"
            >
              Feedback
            </a>
          </div>
        </div>

        {/* Explore col */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Explore
          </p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="group inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                >
                  {n.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Links col */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Links
          </p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                GitHub <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
            <li>
              <a
                href={APK_DOWNLOAD_LINK}
                download
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Download APK
              </a>
            </li>
            <li>
              <a
                href={FEEDBACK_EMAIL}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Send feedback
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative mx-auto mt-12 max-w-6xl border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bubbly. A personal project by Arnav.
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Made with ♥ and TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}