import { createFileRoute } from "@tanstack/react-router";
import {
  Bug,
  Lightbulb,
  Wand2,
  HelpCircle,
  Gauge,
  Github,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { PageHero, tech, GITHUB_URL, FEEDBACK_EMAIL, useReveal } from "@/components/site/shared";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "The Story Behind Bubbly — Built by Arnav" },
      {
        name: "description",
        content:
          "Why and how Bubbly was built: a self-made Android chat app created to learn real-world app development.",
      },
      { property: "og:title", content: "The Story Behind Bubbly" },
      {
        property: "og:description",
        content: "A self-made Android chat app created to learn real-world app development.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const journey = [
  {
    title: "The idea",
    text: "Learn how a modern messaging app really works by building one end to end.",
    emoji: "💡",
    color: "from-yellow-400/20 to-amber-400/10",
    accent: "bg-yellow-400",
    border: "border-yellow-400/30",
  },
  {
    title: "The hard parts",
    text: "Sockets dropping, calls not connecting, notifications firing twice.",
    emoji: "🔥",
    color: "from-orange-400/20 to-red-400/10",
    accent: "bg-orange-400",
    border: "border-orange-400/30",
  },
  {
    title: "The fixes",
    text: "Trial, error and debugging taught more than any tutorial did.",
    emoji: "🛠️",
    color: "from-blue-400/20 to-cyan-400/10",
    accent: "bg-blue-400",
    border: "border-blue-400/30",
  },
  {
    title: "Today",
    text: "A working Android build, shared for testing and feedback.",
    emoji: "🚀",
    color: "from-primary/20 to-accent/10",
    accent: "bg-primary",
    border: "border-primary/30",
  },
];

const feedback = [
  {
    icon: Bug,
    label: "Bugs",
    text: "Crashes, errors, things that don't work.",
    emoji: "🐛",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
    glow: "group-hover:shadow-red-400/10",
  },
  {
    icon: Wand2,
    label: "UI / UX",
    text: "Anything that feels clumsy or unclear.",
    emoji: "✨",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
    glow: "group-hover:shadow-purple-400/10",
  },
  {
    icon: Lightbulb,
    label: "Feature ideas",
    text: "Something you expected and didn't find.",
    emoji: "💡",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
    glow: "group-hover:shadow-yellow-400/10",
  },
  {
    icon: Gauge,
    label: "Performance",
    text: "Lag, slow loading, battery drain.",
    emoji: "⚡",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/20",
    glow: "group-hover:shadow-green-400/10",
  },
  {
    icon: HelpCircle,
    label: "Confusing bits",
    text: "Screens or wording that don't make sense.",
    emoji: "🤔",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    glow: "group-hover:shadow-blue-400/10",
  },
];

function AboutPage() {
  useReveal();
  return (
    <>
      <PageHero
        eyebrow="The story"
        title="Why I built Bubbly."
        text="A self-built project for learning, experimenting and testing real-world app development."
      />

      {/* ── Story Section ─────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-32 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        {/* Side orbs */}
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          className="pointer-events-none absolute -right-32 top-1/3 h-48 w-48 rounded-full opacity-10 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)", animationDelay: "3s" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          {/* ── Image side ── */}
          <div className="relative mx-auto w-full max-w-md">
            {/* Outer decorative ring */}
            <div className="absolute -inset-6 rounded-[2.5rem] border border-dashed border-border/60 opacity-70" />
            {/* Inner decorative ring */}
            <div className="absolute -inset-2 rounded-3xl border border-border/40" />

            {/* Glow blob */}
            <div
              className="absolute inset-0 -z-10 scale-95 rounded-3xl opacity-50 blur-3xl float-soft"
              style={{ background: "var(--gradient-warm)" }}
            />

            {/* Image */}
            <img
              src="/welcome.png"
              alt="Illustration of a person chatting on a phone"
              className="relative w-full drop-shadow-2xl"
            />

            {/* Floating badge — bottom right */}
            <div
              className="pop-in absolute -bottom-5 -right-3 flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3"
              style={{ boxShadow: "var(--shadow-soft)", animationDelay: "0.4s" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-lg">🚀</span>
              <div>
                <p className="text-xs font-bold text-foreground">Live on Android</p>
                <p className="text-[10px] text-muted-foreground">Open for testing</p>
              </div>
            </div>

            {/* Floating badge — top left */}
            <div
              className="pop-in absolute -top-4 -left-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2"
              style={{ boxShadow: "var(--shadow-soft)", animationDelay: "0.6s" }}
            >
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-xs font-semibold text-foreground">100% self-built</p>
            </div>
          </div>

          {/* ── Timeline side ── */}
          <div className="relative">
            <div className="mb-10">
              <span className="chip mb-4 inline-flex">
                <Sparkles className="h-3 w-3" />
                The journey
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                From idea to working app.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Four chapters. A lot of late nights. One shipping app.
              </p>
            </div>

            <ol className="relative space-y-4">
              {/* Vertical connector line */}
              <div className="absolute bottom-6 left-5 top-6 w-px bg-linear-to-b from-primary/50 via-border/60 to-transparent" />

              {journey.map((j, i) => (
                <li
                  key={j.title}
                  data-reveal
                  style={{ transitionDelay: `${i * 110}ms` }}
                  className="reveal relative flex gap-4"
                >
                  {/* Step emoji node */}
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-card text-lg ${j.border}`}
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    {j.emoji}
                    {/* Active dot */}
                    <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card ${j.accent}`} />
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 rounded-2xl border bg-linear-to-br p-4 transition-all duration-300 hover:-translate-y-0.5 ${j.color} ${j.border}`}
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${j.accent}`} />
                      <h3 className="font-bold text-foreground">{j.title}</h3>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground/50 tracking-widest">
                        0{i + 1}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{j.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Feedback Section ──────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border px-5 py-24">
        {/* Background */}
        <div className="absolute inset-0 bg-surface" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        {/* Top glow */}
        <div
          className="pointer-events-none absolute left-1/2 -top-32 h-64 w-125 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />
        {/* Bottom glow */}
        <div
          className="pointer-events-none absolute left-1/3 -bottom-24 h-48 w-80 rounded-full opacity-15 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)", animationDelay: "2s" }}
        />

        <div className="relative mx-auto max-w-6xl">
          {/* Heading row */}
          <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="chip mb-4 inline-flex">
                <span>🧪</span>
                Beta testing
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Test it &amp; give me feedback.
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                This version is shared for testing. Tell me anything that could be better — every note helps shape what's next.
              </p>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden shrink-0 flex-col gap-2.5 sm:flex">
              <a href={FEEDBACK_EMAIL} className="btn-base btn-primary whitespace-nowrap">
                Send feedback
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost-outline whitespace-nowrap"
              >
                <Github className="h-4 w-4" />
                Source on GitHub
              </a>
            </div>
          </div>

          {/* Feedback cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {feedback.map(({ label, text, emoji, color, bg, glow }, i) => (
              <div
                key={label}
                data-reveal
                style={{
                  transitionDelay: `${i * 70}ms`,
                  boxShadow: "var(--shadow-soft)",
                }}
                className={`reveal group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${glow}`}
              >
                {/* Coloured top accent bar */}
                <div className={`absolute inset-x-0 top-0 h-0.5 ${color.replace("text-", "bg-")}`} />

                {/* Corner shimmer on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at top left, color-mix(in oklab, currentColor 6%, transparent), transparent 60%)" }}
                />

                {/* Icon badge */}
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${bg}`}>
                  {emoji}
                </div>

                <p className={`text-sm font-bold ${color}`}>{label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* Mobile CTAs */}
          <div className="mt-8 flex flex-wrap gap-3 sm:hidden">
            <a href={FEEDBACK_EMAIL} className="btn-base btn-primary">
              Send me feedback
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost-outline"
            >
              <Github className="h-4 w-4" />
              Source on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Tech Stack Section ────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-28 text-center">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        {/* Centre glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto max-w-3xl">
          <span className="chip mx-auto mb-5 inline-flex">
            <span>⚙️</span>
            Technologies used
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">The stack.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Every tool chosen to ship a real, production-quality Android app.
          </p>

          {/* Shimmer divider */}
          <div className="mx-auto my-8 h-px w-32 bg-linear-to-r from-transparent via-primary/50 to-transparent" />

          <ul className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2.5">
            {tech.map((t, i) => (
              <li
                key={t}
                data-reveal
                style={{ transitionDelay: `${i * 40}ms` }}
                className="reveal"
              >
                <span className="chip lift cursor-default px-4 py-2 text-sm transition-all duration-200 hover:border-primary/50 hover:bg-primary/10">
                  {t}
                </span>
              </li>
            ))}
          </ul>

          {/* Bottom mono tag */}
          <p className="mt-12 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Bubbly · Built by Arnav
          </p>
        </div>
      </section>
    </>
  );
}