import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  Bug,
  Wand2,
  Lightbulb,
  Gauge,
  Github,
  Mail,
  Send,
  CheckCircle2,
  Code2,
  Server,
} from "lucide-react";
import {
  PageHero,
  techStack,
  GITHUB_URL,
  FEEDBACK_EMAIL,
  DEVELOPER_NAME,
  useReveal,
} from "@/components/site/shared";
import { sounds } from "@/lib/sound";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `The Story Behind Bubbly — Built by ${DEVELOPER_NAME}` },
      {
        name: "description",
        content: `Discover how Bubbly was conceived and engineered by ${DEVELOPER_NAME}: a self-built full-stack messaging application combining Socket.IO, Agora calling, and React Native.`,
      },
      { property: "og:title", content: "The Story Behind Bubbly" },
      {
        property: "og:description",
        content: `A full-stack journey from first socket message to production Android APK release.`,
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

export function AboutPage() {
  useReveal();

  const [feedbackCategory, setFeedbackCategory] = useState("Feature Idea");
  const [feedbackText, setFeedbackText] = useState("");
  const [deviceModel, setDeviceModel] = useState("Android Device");
  const [submitted, setSubmitted] = useState(false);

  const journeyChapters = [
    {
      chapter: "01",
      title: "The Vision & Core Architecture",
      text: "The goal was simple yet rigorous: don't just build a toy chat demo with third-party wrappers, but architect the entire stack from scratch — Node.js 22, Express 5, MongoDB Mongoose models, and a dedicated Socket.IO event cluster.",
      emoji: "💡",
      tag: "Foundation",
    },
    {
      chapter: "02",
      title: "Agora RTC Calling Integration",
      text: "Voice and video calls present real challenges: token generation, permission handshakes, animated vibration timers, and audio device cleanup. Integrating Agora with Express token endpoints gave Bubbly high-definition call reliability.",
      emoji: "📞",
      tag: "Real-Time RTC",
    },
    {
      chapter: "03",
      title: "Story Studio & Visual Identity",
      text: "Messaging is also about social expression. Story Studio was built with 7 bespoke color gradient presets, Instagram-style segmented progress timers, emoji reactions, and photo captioning — styled with our warm Honey Amber aesthetic.",
      emoji: "🎨",
      tag: "Creative Canvas",
    },
    {
      chapter: "04",
      title: "v4.1.5: Persistent Auth, Speed & GIFs",
      text: "Bubbly v4.1.5 removes 30-day session timeouts, optimizes startup, sockets, and scroll speed, sends animated GIFs seamlessly, enforces required email & phone discovery, and ships 4 selectable call ringtones.",
      emoji: "🚀",
      tag: "Production Release",
    },
  ];

  const feedbackTypes = [
    { label: "Bug Report", icon: Bug, emoji: "🐛", color: "text-rose-400" },
    { label: "UI / UX Polish", icon: Wand2, emoji: "✨", color: "text-purple-400" },
    { label: "Feature Idea", icon: Lightbulb, emoji: "💡", color: "text-amber-400" },
    { label: "Performance", icon: Gauge, emoji: "⚡", color: "text-emerald-400" },
  ];

  const generateFeedbackLink = () => {
    const subject = encodeURIComponent(`Bubbly Feedback: [${feedbackCategory}]`);
    const body = encodeURIComponent(
      `Hi Arnav,\n\nHere is my feedback on Bubbly:\n\nCategory: ${feedbackCategory}\nDevice: ${deviceModel}\n\nDetails:\n${feedbackText || "[Type your details here]"}\n\nThanks!`,
    );
    return `mailto:arnavkhari.77@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <PageHero
        eyebrow="Mission & Story"
        title="Why Bubbly was built."
        text="A transparent, self-built real-world engineering project created to understand modern messaging, real-time protocols, and mobile UX end-to-end."
        badge={`Created by ${DEVELOPER_NAME}`}
      />

      {/* ── Creator Profile Spotlight ── */}
      <section className="relative overflow-hidden px-5 pb-24 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Creator Portrait */}
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="absolute -inset-4 -z-10 rounded-[3rem] opacity-45 blur-3xl float-soft"
                style={{ background: "var(--gradient-warm)" }}
              />
              <div className="spotlight-card rounded-[2.5rem] p-3.5">
                <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-surface">
                  <img
                    src="/developer-photo.png"
                    alt={`${DEVELOPER_NAME} — Creator of Bubbly`}
                    className="h-full w-full object-cover object-top transition-transform duration-700 hover:scale-103"
                  />
                  {/* Subtle bottom gradient scrim for legibility */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/75 via-black/30 to-transparent" />

                  {/* Floating glass badge inside photo */}
                  <div className="absolute inset-x-3.5 bottom-3.5 flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/55 px-3.5 py-2.5 backdrop-blur-xl">
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-white">
                        {DEVELOPER_NAME}
                      </p>
                      <p className="truncate text-[11px] text-white/75">
                        Creator & Full-Stack Architect
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Dev
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div data-reveal className="reveal space-y-6">
              <span className="chip">
                <Code2 className="h-3.5 w-3.5 text-primary" /> Philosophy
              </span>

              <h2 className="font-display text-3xl font-extrabold sm:text-5xl text-foreground">
                Built with curiosity, code, and countless late nights.
              </h2>

              <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
                Most messaging apps are walled gardens with closed architectures, tracking scripts,
                and invasive ads. Bubbly was born out of a desire to prove that a modern,
                feature-rich chatting experience — with real-time sockets, HD calls, and dynamic
                stories — could be built completely cleanly and transparently.
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                <div>
                  <p className="font-display text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">TypeScript Strict Typing</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-primary">Zero</p>
                  <p className="text-xs text-muted-foreground">Ad Networks or Trackers</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => sounds.playTap()}
                  className="btn-base btn-primary"
                >
                  <Github className="h-4 w-4" /> View GitHub Repository
                </a>
                <a
                  href={FEEDBACK_EMAIL}
                  onClick={() => sounds.playTap()}
                  className="btn-base btn-ghost-outline"
                >
                  <Mail className="h-4 w-4" /> Email Arnav
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 4-Chapter Journey Timeline ── */}
      <section className="relative overflow-hidden border-y border-border px-5 py-24 bg-surface/30">
        <div className="relative mx-auto max-w-6xl">
          <div data-reveal className="reveal text-center mb-16">
            <span className="chip mx-auto mb-3 inline-flex">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Progression
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
              From First Socket to v4.1.5 Release.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {journeyChapters.map((ch) => (
              <div key={ch.chapter} data-reveal className="reveal spotlight-card rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-2xl">
                    {ch.emoji}
                  </span>
                  <span className="font-mono text-xl font-extrabold text-muted-foreground/30">
                    {ch.chapter}
                  </span>
                </div>

                <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {ch.tag}
                </span>

                <h3 className="font-display text-lg font-bold text-foreground mt-3">{ch.title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ch.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Feedback & Bug Submission Hub ── */}
      <section className="relative overflow-hidden px-5 py-24">
        <div className="relative mx-auto max-w-3xl">
          <div className="spotlight-card rounded-[2.5rem] p-8 sm:p-12">
            <div className="text-center mb-8">
              <span className="chip mx-auto mb-3 inline-flex">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Community & Feedback
              </span>
              <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                Share your ideas or report a bug.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your feedback directly influences upcoming Bubbly releases.
              </p>
            </div>

            {/* Feedback Categories */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-6">
              {feedbackTypes.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setFeedbackCategory(t.label);
                  }}
                  className={`rounded-2xl border p-3 text-center transition-all ${
                    feedbackCategory === t.label
                      ? "border-primary bg-primary/15 shadow-xs scale-102 font-bold"
                      : "border-border bg-surface hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="text-xl block mb-1">{t.emoji}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Device Model & Android Version
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g. Pixel 8, Samsung Galaxy S23 (Android 14)"
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Feedback Details
                </label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Describe your suggestion, feedback, or steps to reproduce an issue..."
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-hidden focus:border-primary resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={generateFeedbackLink()}
                  onClick={() => {
                    sounds.playPop();
                    setSubmitted(true);
                  }}
                  className="btn-base btn-primary flex-1 justify-center"
                >
                  <Send className="h-4 w-4" /> Send Feedback via Email
                </a>
                <a
                  href={`${GITHUB_URL}/issues/new`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-base btn-ghost-outline flex-1 justify-center"
                >
                  <Github className="h-4 w-4" /> Open GitHub Issue
                </a>
              </div>

              {submitted && (
                <div className="pop-in rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-500 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Your email client has been opened. Thank you
                  for your feedback!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Technology Stack Directory ── */}
      <section className="relative overflow-hidden border-t border-border px-5 py-24 bg-surface/40">
        <div className="relative mx-auto max-w-6xl text-center">
          <span className="chip mx-auto mb-3 inline-flex">
            <Server className="h-3.5 w-3.5 text-primary" /> Full Stack
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-foreground">
            Technologies & Frameworks
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Every library and framework chosen for production performance and Developer Experience.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="rounded-2xl border border-border bg-card p-4 text-left shadow-xs hover:border-primary/40 transition-colors"
              >
                <p className="font-display font-bold text-sm text-foreground">{tech.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tech.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
