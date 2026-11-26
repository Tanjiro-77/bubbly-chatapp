/* eslint-disable react-refresh/only-export-components */
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import {
  MessageSquare,
  Users,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Phone,
  Video,
  BarChart3,
  MapPin,
  Sparkles,
  Bell,
  UserRound,
  ShieldCheck,
  Zap,
  Download,
  Github,
  Sun,
  Moon,
  ArrowUpRight,
  Menu,
  X,
  Volume2,
  VolumeX,
  CheckCheck,
  Languages,
  Pin,
  Clock,
  Layers,
  Heart,
  Palette,
  Eye,
  Radio,
  Search,
  Lock,
  QrCode,
  Timer,
  CheckSquare,
  Gamepad2,
  AlarmClock,
  Archive,
  Tag,
  BarChart2,
  Sliders,
  BellOff,
  Hourglass,
  Smile,
  Type,
  ShieldAlert,
} from "lucide-react";
import { sounds } from "@/lib/sound";

export const APP_VERSION = "v4.0.2";
export const PACKAGE_ID = "com.arnav5569.chat";
export const APK_DOWNLOAD_LINK = "https://github.com/Tanjiro-77/bubbly-chatapp/releases/latest";
export const APK_BACKUP_DOWNLOAD_LINK =
  "https://github.com/Tanjiro-77/bubbly-chatapp/releases/latest";
export const GITHUB_URL = "https://github.com/Tanjiro-77/bubbly-chatapp";
export const FEEDBACK_EMAIL =
  "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20v4.0.2%20Feedback&body=Hi%20Arnav%2C%0A%0AHere%27s%20my%20feedback%20on%20Bubbly%20v4.0.2%3A%0A%0A-%20%5BDescribe%20the%20feedback%2C%20idea%20or%20bug%5D%0A%0ADevice%3A%20%5BYour%20phone%20model%5D%0AAndroid%20%2F%20iOS%20version%3A%20%5BVersion%5D%0A%0AThanks%21";
export const DEVELOPER_NAME = "Arnav Khari";

export const featureGroups = [
  {
    name: "Real-Time Messaging",
    badge: "Core Engine",
    color: "from-amber-500/20 to-orange-500/10",
    textCol: "text-amber-500",
    items: [
      {
        icon: MessageSquare,
        title: "Sub-50ms Socket Delivery",
        text: "Direct real-time communication via Socket.IO with delivery & read receipts.",
      },
      {
        icon: CheckCheck,
        title: "Sent, Delivered & Read Receipts",
        text: "Clear tick indicators for single ticks, double ticks and blue read status.",
      },
      {
        icon: Languages,
        title: "Live 6-Language Translation",
        text: "Instantly translate incoming or outgoing messages across English, Spanish, French, German, Hindi & Japanese.",
      },
      {
        icon: Pin,
        title: "Pinned Messages & Chats",
        text: "Keep essential messages anchored at the top of chats with quick jump action.",
      },
      {
        icon: Clock,
        title: "Scheduled Background Messages",
        text: "Draft messages ahead of time and let the background worker dispatch on schedule.",
      },
      {
        icon: Heart,
        title: "Double-Tap Heart Reactions",
        text: "Double-tap any message to react with an animated popping heart interaction.",
      },
    ],
  },
  {
    name: "HD Voice & Video Calls",
    badge: "Agora Powered",
    color: "from-purple-500/20 to-indigo-500/10",
    textCol: "text-purple-400",
    items: [
      {
        icon: Phone,
        title: "Crystal Clear Voice Calls",
        text: "Low-latency RTC audio powered by Agora with speakerphone and mute controls.",
      },
      {
        icon: Video,
        title: "Full-Screen HD Video Calling",
        text: "High-definition video communication with floating preview and camera-flip shortcut.",
      },
      {
        icon: Radio,
        title: "Active Call HUD & Pulsing Avatar",
        text: "Visual sound-wave pulses, active elapsed call timers and connection health metrics.",
      },
      {
        icon: Bell,
        title: "Background Push & Call Alerts",
        text: "Receive WhatsApp-style message alerts and incoming voice/video calls with Accept & Decline actions even when the app is closed.",
      },
    ],
  },
  {
    name: "Privacy, Security & Vault",
    badge: "Zero Tracking",
    color: "from-emerald-500/20 to-lime-500/10",
    textCol: "text-emerald-400",
    items: [
      {
        icon: Lock,
        title: "Biometric App Lock & PIN Vault",
        text: "Protect Bubbly with biometric/passcode lock and store private notes inside a dedicated PIN-protected Vault.",
      },
      {
        icon: Eye,
        title: "View-Once Media",
        text: "Send photos and videos that vanish automatically after being opened once by the recipient.",
      },
      {
        icon: Timer,
        title: "Disappearing Messages",
        text: "Configure automatic self-destruct timers per conversation for ephemeral, clutter-free chats.",
      },
      {
        icon: QrCode,
        title: "QR Profiles & Contact Sync",
        text: "Share your personal Bubbly QR code or optionally sync phonebook contacts to discover friends in one tap.",
      },
    ],
  },
  {
    name: "Story Studio & Social Sharing",
    badge: "Creative Canvas",
    color: "from-pink-500/20 to-rose-500/10",
    textCol: "text-pink-400",
    items: [
      {
        icon: Palette,
        title: "7 Text Story Presets",
        text: "Sunset Amber, Midnight Neon, Cyber Mint, Berry Ruby, Deep Charcoal, Ocean Dusk & Warm Espresso.",
      },
      {
        icon: ImageIcon,
        title: "Photo Stories & Captions",
        text: "Pick high-resolution images from your library, preview, and add expressive captions.",
      },
      {
        icon: Layers,
        title: "Segmented Story Viewer",
        text: "Instagram-style auto-progressing story bars. Press-and-hold to pause, release to resume.",
      },
      {
        icon: Eye,
        title: "Live Story Views & Reactions",
        text: "Real-time viewer lists and 6 instant emoji reactions (❤️, 🔥, 😂, 👏, 😍, 😮).",
      },
    ],
  },
  {
    name: "Groups & Collaboration",
    badge: "Community",
    color: "from-blue-500/20 to-cyan-500/10",
    textCol: "text-blue-400",
    items: [
      {
        icon: Users,
        title: "Dynamic Group Chats",
        text: "Multi-participant groups with custom avatars, descriptions and admin permissions.",
      },
      {
        icon: BarChart3,
        title: "Interactive Group Polls",
        text: "Create multi-option polls in chats and watch real-time voting percentages update instantly.",
      },
      {
        icon: Layers,
        title: "Shared Media & Docs Gallery",
        text: "Dedicated tabbed gallery separating photos, documents and shared links for each group.",
      },
      {
        icon: UserRound,
        title: "Instant Participant Search",
        text: "Quick-search your contacts by name or email when assembling a team or squad.",
      },
    ],
  },
  {
    name: "Media, Audio & Storage",
    badge: "Rich Attachments",
    color: "from-emerald-500/20 to-teal-500/10",
    textCol: "text-emerald-400",
    items: [
      {
        icon: Mic,
        title: "Voice Notes with 1.0x / 1.5x / 2.0x",
        text: "Record voice notes with waveform scrubbing and variable playback speed controls.",
      },
      {
        icon: Zap,
        title: "Cloudinary Cloud Media Storage",
        text: "Optimized compression and high-speed global CDN delivery for photos and voice clips.",
      },
      {
        icon: MapPin,
        title: "Live Location Sharing",
        text: "Drop your pin or coordinates directly inside conversations for effortless meetups.",
      },
      {
        icon: Paperclip,
        title: "Document & File Attachments",
        text: "Seamlessly exchange PDFs, code snippets, archives and media files up to full size.",
      },
    ],
  },
  {
    name: "Design & Mobile Experience",
    badge: "Honey Amber",
    color: "from-yellow-500/20 to-amber-500/10",
    textCol: "text-yellow-400",
    items: [
      {
        icon: Sparkles,
        title: "Signature Honey Amber UI",
        text: "Carefully calibrated golden amber tones, warm dark surfaces, and smooth glass borders.",
      },
      {
        icon: Clock,
        title: "Time-Aware Greetings",
        text: "Home dashboard adapts its greeting and layout dynamically based on the time of day.",
      },
      {
        icon: ShieldCheck,
        title: "JWT Authentication & bcrypt",
        text: "Enterprise-grade hashed passwords, encrypted session tokens and protected REST APIs.",
      },
      {
        icon: ArrowUpRight,
        title: "Custom Deep Links (bubbly://)",
        text: "Direct deep-link integration for opening specific conversations and invitations.",
      },
    ],
  },
  {
    name: "v4.0.2 Rich Messaging & Play",
    badge: "New in 4.0.2",
    color: "from-amber-500/25 to-yellow-500/10",
    textCol: "text-amber-500",
    items: [
      {
        icon: Type,
        title: "Quick Formatting Toolbar & Quotes",
        text: "1-tap Bold, Italic, Strike, Inline Code, and styled amber > blockquote rendering inside chat.",
      },
      {
        icon: Zap,
        title: "Slash Command Quick Replies",
        text: "Type '/' in the composer for instant reusable snippets (/omw, /busy, /thx) plus custom templates.",
      },
      {
        icon: CheckSquare,
        title: "Interactive Shared Checklists",
        text: "Create real-time collaborative checklists in chat with live task completion progress bars.",
      },
      {
        icon: Gamepad2,
        title: "Chat Icebreakers & Mini-Games",
        text: "Roll D6 dice, flip a coin, ask Magic 8-Ball, or throw Rock-Paper-Scissors directly in chat.",
      },
      {
        icon: Hourglass,
        title: "Live Event Countdown Stickers",
        text: "Drop real-time ticking countdown cards (days, hours, mins, secs) for launches and meetups.",
      },
      {
        icon: Pin,
        title: "Multi-Pinned Message Carousel",
        text: "Cycle cleanly through all pinned messages in a chat and jump directly to any anchored note.",
      },
    ],
  },
  {
    name: "Productivity, Focus & Analytics",
    badge: "Smart Workflows",
    color: "from-indigo-500/20 to-sky-500/10",
    textCol: "text-sky-400",
    items: [
      {
        icon: CheckCheck,
        title: "Multi-Message Bulk Selection Dock",
        text: "Select multiple bubbles to bulk-copy, bulk-star, or batch-delete messages effortlessly.",
      },
      {
        icon: AlarmClock,
        title: "Message Reminder Alarms",
        text: "Long-press any message to schedule real OS notification alarms (15m, 1h, Tomorrow 9 AM) with a Reminders drawer.",
      },
      {
        icon: Moon,
        title: "Focus / Quiet Mode Timer",
        text: "Silence foreground sounds and toast banners for 30m, 1h, 2h, or manually with a live timer badge.",
      },
      {
        icon: BellOff,
        title: "Silent Send Delivery",
        text: "Long-press Send or toggle Silent mode to deliver messages quietly without ringing notifications.",
      },
      {
        icon: BarChart2,
        title: "In-Chat Insights & Analytics",
        text: "Inspect message counts, sent/received split, voice minutes, peak hour, active days, and top reactions.",
      },
      {
        icon: Search,
        title: "Unified Quick Jump Switcher & Outbox",
        text: "Jump in one tap across chats, Vault, Settings, Focus Mode, and inspect/flush queued offline messages.",
      },
      {
        icon: Phone,
        title: "Clickable Phone, Email & @Mention Chips",
        text: "Automatically detect inline phone numbers, email addresses, URLs, and @mentions inside message bubbles.",
      },
    ],
  },
  {
    name: "Organization, Status & Personalization",
    badge: "Your Bubbly",
    color: "from-rose-500/20 to-fuchsia-500/10",
    textCol: "text-rose-400",
    items: [
      {
        icon: Archive,
        title: "Chat Archive System",
        text: "Archive quieter threads out of your main inbox with a dedicated collapsible Archived Chats filter.",
      },
      {
        icon: Tag,
        title: "Smart Chat Folders (Work/Friends/Family/VIP)",
        text: "Label conversations with color-coded tags and filter your inbox by category in one tap.",
      },
      {
        icon: UserRound,
        title: "Private Contact Nicknames & Notes",
        text: "Assign private aliases and personal notes to any contact or group across your device.",
      },
      {
        icon: Smile,
        title: "Live Custom Activity Status",
        text: "Display custom emoji + activity statuses (Deep work, Listening, Coffee break) on your profile and headers.",
      },
      {
        icon: Sliders,
        title: "Appearance & Bubble Corner Studio",
        text: "Personalize bubble shapes (Rounded, Crisp, Minimal), chat text scale, and accent highlight swatches.",
      },
      {
        icon: Palette,
        title: "Story Typography Fonts & Stickers",
        text: "Style Story Studio text with Classic, Serif, Mono, and Neon fonts plus interactive mood stickers.",
      },
      {
        icon: ShieldAlert,
        title: "Lock-Screen Notification Privacy Shield",
        text: "Mask sender content in foreground banners and configure biometric Auto-Lock grace periods.",
      },
    ],
  },
];

export const allFeatures = featureGroups.flatMap((g) => g.items);

export const techStack = [
  { name: "React Native", role: "Mobile Client Framework", category: "frontend" },
  { name: "Expo SDK 57", role: "Mobile Architecture & EAS", category: "frontend" },
  { name: "Expo Router", role: "File-based Mobile Routing", category: "frontend" },
  { name: "TypeScript", role: "Full-Stack Strict Typing", category: "core" },
  { name: "Node.js 22", role: "High-Performance Backend", category: "backend" },
  { name: "Express 5", role: "REST API Architecture", category: "backend" },
  { name: "Socket.IO", role: "Real-Time Event Gateway", category: "realtime" },
  { name: "MongoDB & Mongoose", role: "Document Persistence", category: "database" },
  { name: "Agora RTC", role: "HD Voice & Video Streams", category: "media" },
  { name: "Cloudinary", role: "Cloud Media Assets CDN", category: "media" },
  { name: "TanStack Start & Vite", role: "Production Website", category: "website" },
  { name: "Tailwind CSS v4", role: "Design System & Styling", category: "website" },
];

export const appScreenshots = [
  {
    src: "/screenshots/1.png",
    title: "Authentication & Onboarding",
    tag: "Security",
    desc: "Seamless JWT authentication, warm Honey Amber visuals, and clear permission flows.",
  },
  {
    src: "/screenshots/2.png",
    title: "Home Dashboard & Stories",
    tag: "Navigation",
    desc: "Time-aware greeting, conversation filters (All/Unread/Pinned), and gradient story rings.",
  },
  {
    src: "/screenshots/3.png",
    title: "Real-Time Messaging & Voice",
    tag: "Core Chat",
    desc: "Instant message delivery, voice notes with 1.0x-2.0x playback, Spanish translation & polls.",
  },
  {
    src: "/screenshots/4.png",
    title: "Story Studio Creation",
    tag: "Expression",
    desc: "7 background presets (Sunset Amber, Cyber Mint, etc.), text alignment and photo stories.",
  },
  {
    src: "/screenshots/5.png",
    title: "Profile & Settings Hub",
    tag: "Personalization",
    desc: "Avatar selection, online visibility, permission management, and deep links.",
  },
];

// ── Reveal hook ─────────────────────────────────────────────
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1 },
    );
    const observeAll = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        io.observe(el);
      });
    };
    observeAll();
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}

// ── Download button ──────────────────────────────────────────
export function DownloadButton({
  className = "",
  label = "Download APK",
  variant = "primary",
}: {
  className?: string;
  label?: string;
  variant?: "primary" | "outline";
}) {
  const handleClick = () => {
    sounds.playPop();
  };

  if (variant === "outline") {
    return (
      <a
        href={APK_DOWNLOAD_LINK}
        onClick={handleClick}
        className={`btn-base btn-ghost-outline ${className}`}
        download
      >
        <Download className="h-4 w-4 text-primary" /> {label}
      </a>
    );
  }

  return (
    <a
      href={APK_DOWNLOAD_LINK}
      onClick={handleClick}
      className={`btn-base btn-primary group ${className}`}
      download
    >
      <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
      <span>{label}</span>
      <span className="ml-1 rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-bold tracking-wide">
        {APP_VERSION}
      </span>
    </a>
  );
}

// ── Sound Toggle Component ───────────────────────────────────
export function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sounds.isMuted());
    const unsub = sounds.subscribe((m) => setMuted(m));
    return unsub;
  }, []);

  const toggle = () => {
    const next = sounds.toggleMute();
    setMuted(next);
    if (!next) {
      sounds.playPop();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={muted ? "Unmute audio effects" : "Mute audio effects"}
      aria-label="Toggle UI sound effects"
      className="btn-base btn-ghost-outline h-10 w-10 p-0! transition-all duration-200"
    >
      {muted ? (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Volume2 className="h-4 w-4 text-primary animate-pulse" />
      )}
    </button>
  );
}

// ── Theme toggle ─────────────────────────────────────────────
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark =
      localStorage.getItem("bubbly-theme") === "dark" ||
      (!("bubbly-theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    const onThemeChange = (e: Event) => {
      const next = Boolean((e as CustomEvent).detail);
      setDark(next);
    };
    window.addEventListener("bubbly-theme-change", onThemeChange);
    return () => window.removeEventListener("bubbly-theme-change", onThemeChange);
  }, []);

  const toggle = () => {
    sounds.playTap();
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bubbly-theme", next ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("bubbly-theme-change", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="btn-base btn-ghost-outline h-10 w-10 p-0! transition-all duration-200"
    >
      {dark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ── Page hero ────────────────────────────────────────────────
export function PageHero({
  eyebrow,
  title,
  text,
  badge,
}: {
  eyebrow: string;
  title: string;
  text: string;
  badge?: string;
}) {
  return (
    <section className="glow-backdrop grid-bg relative overflow-hidden px-5 pb-16 pt-24 text-center">
      {/* Side ambient orbs */}
      <div
        className="pointer-events-none absolute -left-28 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)" }}
      />
      <div
        className="pointer-events-none absolute -right-28 top-1/3 h-56 w-56 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)", animationDelay: "2.5s" }}
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="inline-flex items-center gap-2">
          <span className="chip">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {eyebrow}
          </span>
          {badge && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              {badge}
            </span>
          )}
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.12] sm:text-6xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{text}</p>

        {/* Shimmer divider */}
        <div className="mx-auto mt-8 h-1 w-20 rounded-full bg-linear-to-r from-transparent via-primary/70 to-transparent" />
      </div>
    </section>
  );
}

// ── Nav items ────────────────────────────────────────────────
export const navLinks = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/download", label: "Download" },
  { to: "/about", label: "Story" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/security", label: "Security" },
  { to: "/faq", label: "FAQ" },
] as const;

// ── Site header ──────────────────────────────────────────────
export function SiteHeader({ onOpenCommand }: { onOpenCommand?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      {/* Floating Pill Header */}
      <div
        className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-border/80 bg-background/82 px-3.5 py-2 backdrop-blur-2xl transition-all duration-300"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          onClick={() => {
            sounds.playPop();
            setOpen(false);
          }}
        >
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl opacity-60 blur-md"
              style={{ background: "var(--gradient-warm)" }}
            />
            <img
              src="/icon-foreground.png"
              alt="Bubbly"
              className="relative h-8 w-8 rounded-xl object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg font-extrabold tracking-tight">Bubbly</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
              {APP_VERSION}
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
          {navLinks.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => sounds.playTap()}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground whitespace-nowrap"
              activeProps={{
                className: "!bg-primary/16 !text-foreground font-semibold shadow-xs",
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          {onOpenCommand && (
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onOpenCommand();
              }}
              aria-label="Open quick search"
              title="Quick jump (Ctrl+K)"
              className="btn-base btn-ghost-outline hidden! h-9 gap-2 px-3! py-0! text-xs! text-muted-foreground xl:inline-flex!"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Search</span>
              <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </button>
          )}

          <SoundToggle />
          <ThemeToggle />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Star Bubbly on GitHub"
            onClick={() => sounds.playTap()}
            className="btn-base btn-ghost-outline hidden! h-9 w-9 p-0! sm:inline-flex!"
          >
            <Github className="h-4 w-4" />
          </a>

          <DownloadButton
            className="hidden! px-3.5! py-2! text-xs! sm:inline-flex!"
            label="Get APK"
          />

          <button
            className="btn-base btn-ghost-outline h-9 w-9 p-0! lg:hidden"
            aria-label="Toggle navigation menu"
            onClick={() => {
              sounds.playTap();
              setOpen((o) => !o);
            }}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div
          className="pop-in mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl border border-border bg-card/95 p-4 backdrop-blur-2xl lg:hidden"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Navigation Menu
            </span>
            <span className="chip text-[11px]">
              <Sparkles className="h-3 w-3 text-primary" /> {APP_VERSION} Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {navLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => {
                  sounds.playTap();
                  setOpen(false);
                }}
                className="flex items-center justify-between rounded-2xl border border-transparent px-3.5 py-2.5 text-sm font-semibold transition-colors hover:border-border hover:bg-muted"
                activeProps={{
                  className: "!bg-primary/15 !border-primary/30 !text-foreground font-bold",
                }}
              >
                <span>{n.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <DownloadButton
              className="flex-1 justify-center py-3!"
              label={`Download APK (${APP_VERSION})`}
            />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost-outline flex-1 justify-center"
            >
              <Github className="h-4 w-4" /> View Source on GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

// ── CTA Band ─────────────────────────────────────────────────
export function CtaBand() {
  return (
    <section className="px-5 py-24">
      <div
        data-reveal
        className="reveal cta-band relative mx-auto max-w-6xl overflow-hidden rounded-[2.8rem] px-7 py-20 text-center sm:px-16"
      >
        {/* Glow orbs inside CTA */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        {/* Brand Icon */}
        <div className="relative mx-auto mb-7 h-24 w-24">
          <div
            className="absolute inset-0 rounded-3xl opacity-70 blur-2xl float-soft"
            style={{ background: "var(--gradient-warm)" }}
          />
          <img
            src="/icon-foreground.png"
            alt="Bubbly"
            className="relative float-soft h-24 w-24 rounded-3xl object-contain drop-shadow-2xl"
          />
        </div>

        {/* Pill */}
        <div className="relative mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
          <Zap className="h-3.5 w-3.5 text-yellow-300" />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase text-white/90">
            Version {APP_VERSION} Available Now · Free & Open Source
          </span>
        </div>

        <h2 className="relative mx-auto max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
          Ready to experience <br />
          <span className="text-gradient">modern connection?</span>
        </h2>

        <p className="relative mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
          Background push & call alerts, Agora HD voice/video calls, Story Studio, and Biometric
          Vault — zero ads or trackers.
        </p>

        <div className="mx-auto my-8 h-1 w-24 rounded-full bg-linear-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative flex flex-wrap justify-center gap-4">
          <DownloadButton label="Download Bubbly APK" />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-base btn-ghost-outline border-white/20! bg-white/10! text-white! hover:bg-white/20!"
          >
            <Github className="h-4 w-4" /> Explore Code on GitHub
          </a>
        </div>

        <p className="relative mt-8 font-mono text-[11px] tracking-[0.2em] uppercase text-white/50">
          Crafted with curiosity by {DEVELOPER_NAME} · {PACKAGE_ID}
        </p>
      </div>
    </section>
  );
}

// ── Site Footer ──────────────────────────────────────────────
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface px-5 pb-10 pt-16">
      <div
        className="pointer-events-none absolute -left-28 bottom-0 h-64 w-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--gradient-warm)" }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
        {/* Col 1: Brand & Creator */}
        <div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl opacity-50 blur-md"
                style={{ background: "var(--gradient-warm)" }}
              />
              <img
                src="/icon-foreground.png"
                alt="Bubbly"
                className="relative h-10 w-10 rounded-xl object-contain"
              />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold tracking-tight">Bubbly</p>
              <p className="text-xs text-muted-foreground">Connect Beyond Messages.</p>
            </div>
          </div>

          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A full-stack, real-time messaging application for conversations, groups, stories, and
            audio/video calling.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Status:</span>
            <span className="text-foreground">All Systems {APP_VERSION} Operational</span>
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium">
            {navLinks.map((n) => (
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

        {/* Col 3: Resources & Links */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Resources
          </p>
          <ul className="mt-4 space-y-2.5 text-sm font-medium">
            <li>
              <a
                href={APK_DOWNLOAD_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Direct APK ({APP_VERSION})
              </a>
            </li>
            <li>
              <a
                href={APK_BACKUP_DOWNLOAD_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                GitHub Releases
              </a>
            </li>
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                GitHub Repository
              </a>
            </li>
            <li>
              <Link
                to="/privacy-policy"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                to="/security"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Security & Data Safety
              </Link>
            </li>
            <li>
              <a
                href={FEEDBACK_EMAIL}
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Developer Contact
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Developer Badge */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
            Project Creator
          </p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{DEVELOPER_NAME}</p>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Full-stack developer building real-time applications with React Native, Node.js, and
            TypeScript.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="https://github.com/Tanjiro-77"
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost-outline px-3! py-1.5! text-xs!"
            >
              <Github className="h-3.5 w-3.5" /> @Tanjiro-77
            </a>
            <a href={FEEDBACK_EMAIL} className="btn-base btn-primary px-3! py-1.5! text-xs!">
              Email Arnav
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="relative mx-auto mt-14 max-w-6xl border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Bubbly. Built with passion and TypeScript by{" "}
            {DEVELOPER_NAME}.
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60">
            {APP_VERSION} · {PACKAGE_ID} · Open Source
          </p>
        </div>
      </div>
    </footer>
  );
}
