import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Phone,
  Video,
  BarChart3,
  Mic,
  ArrowUpRight,
  Github,
  Sparkles,
  ArrowRight,
  Check,
  CheckCheck,
  MapPin,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import {
  DownloadButton,
  GITHUB_URL,
  allFeatures,
  tech,
  useReveal,
  CtaBand,
} from "@/components/site/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bubbly — Android Chat App | Download APK" },
      {
        name: "description",
        content:
          "Bubbly is a self-built Android messaging app with real-time chat, calls, media sharing and more. Download the APK or browse the source code.",
      },
      { property: "og:title", content: "Bubbly — Chat. Connect. Bubbly." },
      {
        property: "og:description",
        content:
          "A modern Android messaging app built as a real-world coding project. Download the APK or view the source on GitHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function PhoneMockup() {
  return (
    // ✅ max-w-[300px] → max-w-75
    <div className="relative mx-auto w-full max-w-75">
      <div
        className="absolute -inset-12 -z-10 rounded-full opacity-40 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)" }}
      />
      <div
        className="absolute -inset-6 -z-10 rounded-full opacity-20 blur-2xl float-soft"
        style={{ background: "var(--gradient-warm)", animationDelay: "1.5s" }}
      />

      <div
        className="float-soft rounded-[2.75rem] border border-border bg-ink p-2.5"
        style={{ boxShadow: "var(--shadow-soft)", animationDelay: "0.5s" }}
      >
        <div className="mx-auto mb-1.5 h-1.5 w-16 rounded-full bg-border/40" />

        <div className="overflow-hidden rounded-[2.2rem] bg-card">
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <div className="relative">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                A
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Aarav</p>
              <p className="text-[11px] text-green-400">online</p>
            </div>
            <div className="ml-auto flex gap-3 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <Video className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-5 text-[13px]">
            <p className="bubble-in pop-in max-w-[80%] px-3 py-2 text-sm">
              did you finish the app?
            </p>
            <p className="bubble-out pop-in ml-auto flex max-w-[80%] items-end gap-1 px-3 py-2 text-sm [animation-delay:.4s]">
              yep, testing build is ready{" "}
              <CheckCheck className="h-3 w-3 shrink-0 opacity-80" />
            </p>
            <div className="bubble-in pop-in max-w-[85%] px-3 py-2 [animation-delay:.8s]">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <BarChart3 className="h-3.5 w-3.5" /> Poll · Try it tonight?
              </span>
              <span className="mt-2 block h-1.5 w-full rounded-full bg-primary/20">
                <span className="block h-1.5 w-2/3 rounded-full bg-primary" />
              </span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                67% · 3 votes
              </span>
            </div>
            <p className="bubble-out pop-in ml-auto flex max-w-[70%] items-center gap-2 px-3 py-2 [animation-delay:1.2s]">
              <Mic className="h-3.5 w-3.5 shrink-0" />
              <span className="flex h-3 items-end gap-0.5">
                {[2, 3, 1, 3, 2, 3, 1, 2].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded bg-current opacity-80"
                    style={{ height: `${h * 4}px` }}
                  />
                ))}
              </span>
              <span className="text-xs">0:12</span>
            </p>
            <p className="bubble-in pop-in max-w-[60%] px-3 py-2 text-muted-foreground [animation-delay:1.6s]">
              typing
              <span className="ml-0.5 inline-flex gap-0.5">
                <span className="animate-bounce text-primary [animation-delay:0ms]">.</span>
                <span className="animate-bounce text-primary [animation-delay:150ms]">.</span>
                <span className="animate-bounce text-primary [animation-delay:300ms]">.</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <span className="flex-1 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
              Message
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <div
        className="surface-card pop-in absolute -left-12 top-14 hidden items-center gap-2 px-3 py-2 text-xs font-semibold sm:flex [animation-delay:2s]"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <Video className="h-4 w-4 text-primary" /> Video call · 12:04
      </div>
      <div
        className="surface-card pop-in absolute -right-10 bottom-24 hidden items-center gap-2 px-3 py-2 text-xs font-semibold sm:flex [animation-delay:2.4s]"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <MapPin className="h-4 w-4 text-primary" /> Location shared
      </div>
      <div
        className="surface-card pop-in absolute -right-8 top-10 hidden items-center gap-2 px-3 py-2 text-xs font-semibold sm:flex [animation-delay:2.8s]"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <Zap className="h-4 w-4 text-primary" /> Instant delivery
      </div>
    </div>
  );
}

const bento = [
  {
    title: "Talk in real time",
    text: "Messages land instantly with delivered and seen ticks.",
    icon: Check,
    span: "lg:col-span-2",
    emoji: "💬",
    color: "text-blue-400",
    bg: "bg-blue-400/5",
  },
  {
    title: "Call anyone",
    text: "Crisp voice and video calls, straight from the chat.",
    icon: Video,
    span: "",
    emoji: "📹",
    color: "text-purple-400",
    bg: "bg-purple-400/5",
  },
  {
    title: "Share everything",
    text: "Photos, videos, files, voice notes and your location.",
    icon: ImageIcon,
    span: "",
    emoji: "🖼️",
    color: "text-green-400",
    bg: "bg-green-400/5",
  },
  {
    title: "Ask the group",
    text: "Quick polls to settle anything in seconds.",
    icon: BarChart3,
    span: "lg:col-span-2",
    emoji: "📊",
    color: "text-yellow-400",
    bg: "bg-yellow-400/5",
  },
];

function Index() {
  useReveal();
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="glow-backdrop grid-bg relative overflow-hidden px-5 pb-28 pt-16">
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full opacity-10 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)", animationDelay: "2s" }}
        />
        <div
          className="pointer-events-none absolute -right-32 bottom-0 h-48 w-48 rounded-full opacity-10 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)", animationDelay: "4s" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="chip">
              <Sparkles className="h-3.5 w-3.5" /> Now testing on Android
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] sm:text-7xl">
              Chat. Connect.
              <br />
              <span className="text-gradient">Bubbly.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              A chat app I built myself — real-time messaging, voice &amp; video calls,
              media sharing, polls and more, wrapped in a bright little bubble.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <DownloadButton />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost-outline"
              >
                <Github className="h-4 w-4" /> View Source Code
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-8">
              {[
                [`${allFeatures.length}+`, "features built"],
                ["2", "call types"],
                ["100%", "self-made"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-extrabold text-gradient">{n}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <PhoneMockup />
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-border bg-surface py-4">
        <div className="marquee flex w-max gap-10">
          {[...allFeatures, ...allFeatures].map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-muted-foreground"
            >
              <f.icon className="h-4 w-4 text-primary" /> {f.title}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bento highlights ─────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-24">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div data-reveal className="reveal mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip mb-3 inline-flex">
                <Sparkles className="h-3 w-3" />
                Highlights
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
                Everything a chat needs.
              </h2>
            </div>
            <Link to="/features" className="btn-base btn-ghost-outline">
              All features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {bento.map(({ title, text, icon: Icon, span, emoji, color, bg }, i) => (
              <div
                key={title}
                data-reveal
                style={{
                  // ✅ Fix: merged both style props into one object
                  transitionDelay: `${i * 80}ms`,
                  boxShadow: "var(--shadow-soft)",
                }}
                className={`reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1.5 ${span} ${bg}`}
              >
                {/* Top accent bar on hover */}
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 ${color.replace("text-", "bg-")} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-2xl transition-transform duration-200 group-hover:scale-110">
                  {emoji}
                </span>

                <h3 className="mt-6 font-display text-2xl font-extrabold">{title}</h3>
                <p className="mt-2 max-w-sm text-muted-foreground">{text}</p>

                <Icon
                  className={`absolute -bottom-6 -right-6 h-36 w-36 transition-opacity duration-300 ${color} opacity-5 group-hover:opacity-10`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story Section ─────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border px-5 py-24">
        <div className="absolute inset-0 bg-surface" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        {/* ✅ w-[500px] → w-125 */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="relative mx-auto w-full max-w-md" data-reveal>
            {/* Glow blob */}
            <div
              className="absolute inset-0 -z-10 scale-90 rounded-3xl opacity-40 blur-3xl float-soft"
              style={{ background: "var(--gradient-warm)" }}
            />
            {/* Decorative ring */}
            <div className="absolute -inset-4 rounded-3xl border border-dashed border-border/60 opacity-60" />

            <img
              src="/welcome.png"
              alt="Illustration of a person chatting on a phone"
              className="relative mx-auto w-full max-w-md drop-shadow-2xl"
            />
          </div>

          <div data-reveal className="reveal">
            <span className="chip mb-4 inline-flex">
              <span>📖</span>
              The story
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
              Built to learn.
              <br />
              Shipped to share.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Bubbly started as a real-world coding project to learn how modern messaging
              actually works — frontend, backend, APIs, real-time communication and mobile,
              all at once.
            </p>
            <Link to="/about" className="btn-base btn-ghost-outline mt-7 inline-flex">
              Read the story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-24">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        {/* ✅ w-[400px] → w-100 */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto max-w-6xl text-center">
          <span data-reveal className="reveal chip mx-auto mb-5 inline-flex">
            <span>⚙️</span>
            Under the hood
          </span>
          <h2 data-reveal className="reveal font-display text-3xl font-extrabold sm:text-5xl">
            Built with a modern stack.
          </h2>
          <p data-reveal className="reveal mx-auto mt-3 max-w-md text-muted-foreground">
            Every tool chosen to build and ship a real production-quality Android app.
          </p>

          <div className="mx-auto my-8 h-px w-32 bg-linear-to-r from-transparent via-primary/50 to-transparent" />

          <ul className="flex flex-wrap justify-center gap-3">
            {tech.map((t, i) => (
              <li
                key={t}
                data-reveal
                style={{ transitionDelay: `${i * 50}ms` }}
                className="reveal"
              >
                <span className="chip lift cursor-default px-5 py-2.5 text-sm transition-all duration-200 hover:border-primary/50 hover:bg-primary/10">
                  {t}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-14 flex justify-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl opacity-40 blur-xl float-soft"
                style={{ background: "var(--gradient-warm)" }}
              />
              <img
                src="/icon-foreground.png"
                alt="Bubbly logo"
                className="relative h-16 w-16 rounded-2xl object-contain opacity-90"
              />
            </div>
          </div>

          <p className="mt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Bubbly · Built by Arnav
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}