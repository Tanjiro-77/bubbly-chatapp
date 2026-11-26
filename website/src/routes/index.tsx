import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  Github,
  Zap,
  ShieldCheck,
  CheckCircle2,
  BellRing,
  Lock,
} from "lucide-react";
import {
  DownloadButton,
  GITHUB_URL,
  APP_VERSION,
  allFeatures,
  useReveal,
  CtaBand,
} from "@/components/site/shared";
import { PhoneSimulator } from "@/components/site/phone-simulator";
import { ScreenshotsTour } from "@/components/site/screenshots-tour";
import { ArchitectureSection } from "@/components/site/architecture-section";
import { ComparisonMatrix } from "@/components/site/comparison-matrix";
import { sounds } from "@/lib/sound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bubbly v4.0.2 — Connect Beyond Messages | Real-Time Chat & Calls" },
      {
        name: "description",
        content:
          "Bubbly is a full-stack, real-time messaging application with instant chat, 20 new flagship features (Checklists, Reminders, Focus Mode, Chat Insights, Archives, Games), Agora voice & video calls, Story Studio, and Biometric Vault.",
      },
      { property: "og:title", content: "Bubbly v4.0.2 — Connect Beyond Messages" },
      {
        property: "og:description",
        content:
          "Experience real-time messaging, background calls, Agora HD voice/video, and Story Studio. Zero ads or trackers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function IndexPage() {
  useReveal();
  const [greeting, setGreeting] = useState("Welcome to Bubbly");

  useEffect(() => {
    setGreeting(`${getTimeGreeting()} · Welcome to Bubbly`);
  }, []);

  return (
    <>
      {/* ─────────────────── HERO SECTION ─────────────────── */}
      <section className="glow-backdrop grid-bg relative overflow-hidden px-5 pb-28 pt-16">
        {/* Large ambient floating warm orbs */}
        <div
          className="pointer-events-none absolute -left-36 top-1/4 h-80 w-80 rounded-full opacity-25 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          className="pointer-events-none absolute -right-36 top-1/2 h-80 w-80 rounded-full opacity-20 blur-3xl float-soft"
          style={{ background: "var(--gradient-warm)", animationDelay: "3s" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Value Proposition */}
          <div>
            {/* Live time-aware pill */}
            <div className="inline-flex items-center gap-2">
              <span className="chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {greeting}
              </span>
              <span className="rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                {APP_VERSION} Live
              </span>
            </div>

            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
              Connect beyond <br />
              <span className="text-gradient">messages.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A full-stack, real-time messaging application for conversations, groups, stories, and
              audio/video communication. Wrapped in our signature Honey Amber identity.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <DownloadButton label="Download APK" />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => sounds.playTap()}
                className="btn-base btn-ghost-outline"
              >
                <Github className="h-4 w-4" /> Source Code
              </a>
            </div>

            {/* Metric counters */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/70 pt-8">
              {[
                [`${allFeatures.length}+`, "Features Built"],
                ["< 50ms", "Socket Latency"],
                [APP_VERSION, "Latest Release"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-extrabold text-gradient">{n}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {l}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick feature tick badges */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 20 New v4.0.2 Features
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Agora HD Calling
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Checklists & Reminders
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Zero Ads
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive Phone Playground */}
          <div className="relative">
            <PhoneSimulator initialTab="chat" />
          </div>
        </div>
      </section>

      {/* ─────────────────── MARQUEE TICKER ─────────────────── */}
      <div className="overflow-hidden border-y border-border bg-surface py-3.5">
        <div className="marquee flex w-max gap-8 items-center">
          {[...allFeatures, ...allFeatures].map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              <f.icon className="h-3.5 w-3.5 text-primary" /> {f.title}
              <span className="text-border mx-2">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────── BENTO HIGHLIGHTS ─────────────────── */}
      <section className="relative overflow-hidden px-5 py-24">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          <div data-reveal className="reveal mb-14 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip mb-3 inline-flex">
                <Zap className="h-3 w-3 text-primary" /> Core Pillars
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
                Engineered for everyday flow.
              </h2>
            </div>
            <Link
              to="/features"
              onClick={() => sounds.playTap()}
              className="btn-base btn-ghost-outline"
            >
              Explore all {allFeatures.length}+ features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Bento Card 1: Real-Time Engine (Large) */}
            <div data-reveal className="reveal spotlight-card lg:col-span-2 group rounded-3xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-400 via-orange-500 to-yellow-500 opacity-85" />
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl border border-amber-500/20">
                  ⚡
                </span>
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-primary">
                    Socket.IO & Push Engine
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-foreground">
                    Instant Messaging & Background Alerts
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-lg">
                Messages transmit in sub-50ms with single, double, and blue read receipts — plus
                WhatsApp-style high-priority push notifications even when your screen is locked.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Delivery & Read Acks
                </span>
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Push Deep-Links
                </span>
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Scheduled Messages
                </span>
              </div>
            </div>

            {/* Bento Card 2: Agora RTC HD Calls */}
            <div data-reveal className="reveal spotlight-card group rounded-3xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-purple-500 to-indigo-500 opacity-85" />
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <BellRing className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-400">
                  Wake-On-Call
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-extrabold text-foreground">
                Closed-App Voice & Video
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Receive incoming Agora HD voice & video calls with Accept/Decline actions even when
                Bubbly is closed.
              </p>
            </div>

            {/* Bento Card 3: Story Studio */}
            <div data-reveal className="reveal spotlight-card group rounded-3xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-pink-500 to-rose-500 opacity-85" />
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-2xl border border-pink-500/20">
                🎨
              </span>
              <h3 className="mt-5 font-display text-2xl font-extrabold text-foreground">
                Story Studio
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                7 custom background presets (Sunset Amber, Midnight Neon, etc.), segmented progress
                viewer, and live emoji reactions.
              </p>
            </div>

            {/* Bento Card 4: Translation & Audio (Large) */}
            <div data-reveal className="reveal spotlight-card lg:col-span-2 group rounded-3xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-85" />
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl border border-emerald-500/20">
                  🌐
                </span>
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                    v4.0.2 Superpowers
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-foreground">
                    6-Language Translation, Checklists & Chat Insights
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-lg">
                Translate messages across 6 languages on the fly, run shared live checklists and
                countdown timers in chat, roll icebreaker games, set message reminder alarms, and
                customize every bubble shape and folder tag.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Shared Checklists & Timers
                </span>
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Focus Mode & Silent Send
                </span>
                <span className="rounded-full bg-surface px-3 py-1 border border-border">
                  Bubble Studio & Folders
                </span>
              </div>
            </div>

            {/* Bento Card 5: Biometric Vault & Security */}
            <div data-reveal className="reveal spotlight-card lg:col-span-3 group rounded-3xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 via-emerald-500 to-teal-500 opacity-80" />
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Lock className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-500">
                      Privacy-First Architecture
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-extrabold text-foreground">
                    Biometric Lock, PIN Vault & PhonePe Indus Compliant
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Protect private notes in an encrypted PIN Vault, lock chats behind biometrics,
                    send View-Once media or Disappearing Messages, and inspect every security
                    control openly.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <Link
                    to="/security"
                    onClick={() => sounds.playTap()}
                    className="btn-base btn-primary px-4! py-2.5! text-xs!"
                  >
                    <ShieldCheck className="h-4 w-4" /> Security & Data Safety
                  </Link>
                  <Link
                    to="/privacy-policy"
                    onClick={() => sounds.playTap()}
                    className="btn-base btn-ghost-outline px-4! py-2.5! text-xs!"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── SCREENSHOTS TOUR ─────────────────── */}
      <ScreenshotsTour />

      {/* ─────────────────── ARCHITECTURE DEEP DIVE ─────────────────── */}
      <ArchitectureSection />

      {/* ─────────────────── COMPARISON MATRIX ─────────────────── */}
      <ComparisonMatrix />

      {/* ─────────────────── STORY / VISION PREVIEW ─────────────────── */}
      <section className="relative overflow-hidden px-5 py-24 bg-surface/40">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div data-reveal className="reveal">
            <span className="chip mb-4 inline-flex">
              <Sparkles className="h-3 w-3 text-primary" /> The Story
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
              Built to learn. <br />
              Shipped to share.
            </h2>
            <p className="mt-5 text-muted-foreground text-base leading-relaxed sm:text-lg">
              Bubbly started as an ambitious full-stack exploration by Arnav Khari to build a
              production-grade messaging platform from scratch — from MongoDB schemas and Socket.IO
              event clusters to Agora RTC integration and Expo mobile builds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/about" onClick={() => sounds.playTap()} className="btn-base btn-primary">
                Read Creator Story <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost-outline"
              >
                <Github className="h-4 w-4" /> Star Repository
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div
              className="absolute inset-0 -z-10 scale-90 rounded-3xl opacity-40 blur-3xl float-soft"
              style={{ background: "var(--gradient-warm)" }}
            />
            <img
              src="/welcome.png"
              alt="Bubbly Welcome Illustration"
              className="w-full drop-shadow-2xl rounded-3xl border border-border/60"
            />
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA BAND ─────────────────── */}
      <CtaBand />
    </>
  );
}
