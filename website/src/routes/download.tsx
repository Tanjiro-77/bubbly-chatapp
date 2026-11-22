import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  ShieldAlert,
  Settings,
  Smartphone,
  PartyPopper,
  CheckCircle2,
  Zap,
  Shield,
} from "lucide-react";
import { DownloadButton, PageHero, useReveal } from "@/components/site/shared";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Bubbly APK for Android" },
      {
        name: "description",
        content:
          "Download the Bubbly APK and follow the simple steps to install the chat app on your Android phone.",
      },
      { property: "og:title", content: "Download Bubbly APK for Android" },
      {
        property: "og:description",
        content: "Get the Bubbly APK and install it on your Android phone in four steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadPage,
});

const steps = [
  {
    icon: Download,
    title: "Download the APK",
    text: "Tap the button above to save the file to your phone.",
    emoji: "📥",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/25",
    glow: "from-blue-400/10",
  },
  {
    icon: Settings,
    title: "Allow the install",
    text: "If asked, allow installs from your browser or file manager.",
    emoji: "⚙️",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/25",
    glow: "from-yellow-400/10",
  },
  {
    icon: Smartphone,
    title: "Open and install",
    text: "Open the downloaded file and tap Install.",
    emoji: "📱",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/25",
    glow: "from-purple-400/10",
  },
  {
    icon: PartyPopper,
    title: "Sign up and chat",
    text: "Create your account and send your first message.",
    emoji: "🎉",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/25",
    glow: "from-green-400/10",
  },
];

const stats = [
  { label: "File size", value: "[APK_SIZE]" },
  { label: "Compatibility", value: "[ANDROID_VERSION]" },
  { label: "Last updated", value: "[LAST_UPDATED]" },
];

const trust = [
  { icon: Shield, text: "No trackers or ads" },
  { icon: Zap, text: "Lightweight APK" },
  { icon: CheckCircle2, text: "Open source code" },
];

function DownloadPage() {
  useReveal();
  return (
    <>
      <PageHero
        eyebrow="Download"
        title="Get Bubbly on your Android phone."
        text="One file, a few taps, and you're chatting."
      />

      {/* ── Download Card Section ─────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        {/* Centre glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto max-w-2xl">
          {/* Main download card */}
          <div
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center sm:p-12"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            {/* Top shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
            {/* Bottom shimmer */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

            {/* Watermark icon */}
            <div className="pointer-events-none absolute right-6 top-6 opacity-5 select-none">
              <img src="/icon-foreground.png" alt="" className="h-20 w-20" />
            </div>

            {/* App icon */}
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div
                className="absolute inset-0 rounded-3xl opacity-50 blur-xl float-soft"
                style={{ background: "var(--gradient-warm)" }}
              />
              <img
                src="/icon-foreground.png"
                alt="Bubbly icon"
                className="relative h-20 w-20 rounded-3xl border border-border object-cover"
                style={{ boxShadow: "var(--shadow-glow)" }}
              />
            </div>

            <h3 className="font-display text-xl font-bold text-foreground">Bubbly for Android</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct APK — no Play Store needed
            </p>

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {trust.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  {text}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-auto my-7 h-px w-32 bg-linear-to-r from-transparent via-border to-transparent" />

            {/* CTA */}
            <DownloadButton
              className="w-full py-4! text-base! sm:w-auto"
              label="Download Bubbly APK"
            />

            {/* Stats row */}
            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Card outer glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-30 blur-2xl"
            style={{ background: "var(--gradient-warm)", transform: "scale(0.9) translateY(20px)" }}
          />
        </div>
      </section>

      {/* ── Steps Section ─────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border px-5 py-24">
        <div className="absolute inset-0 bg-surface" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-48 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto max-w-6xl">
          {/* Heading */}
          <div className="mb-14 text-center">
            <span className="chip mx-auto mb-4 inline-flex">
              <span>📋</span>
              Quick install
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Install in four steps.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              No account needed to download. Just tap and go.
            </p>
          </div>

          {/* Connector line — desktop only */}
          <div className="relative">
            <div className="pointer-events-none absolute left-0 right-0 top-13 hidden h-px bg-linear-to-r from-transparent via-border to-transparent lg:block" />

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, text, emoji, color, bg, glow }, i) => (
                <li
                  key={title}
                  data-reveal
                  style={{ transitionDelay: `${i * 100}ms` }}
                  className="reveal group relative"
                >
                  <div
                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5"
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    {/* Coloured top bar */}
                    <div className={`absolute inset-x-0 top-0 h-0.5 ${color.replace("text-", "bg-")}`} />

                    {/* Step number — top right */}
                    <span className="absolute right-4 top-4 font-display text-5xl font-extrabold text-foreground/5 select-none">
                      {i + 1}
                    </span>

                    {/* Icon node with connector dot */}
                    <div className="relative mb-5 inline-flex">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl ${bg}`}
                      >
                        {emoji}
                      </div>
                      {/* Connector dot — desktop */}
                      {i < steps.length - 1 && (
                        <span className={`absolute -right-2.5 top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full lg:block ${color.replace("text-", "bg-")}`} />
                      )}
                    </div>

                    <h3 className={`font-bold ${color}`}>{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Security Notice ───────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-15" />

        <div className="relative mx-auto max-w-3xl">
          <div
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-7"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            {/* Top shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

            <div className="flex gap-5">
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/25 bg-yellow-400/10">
                <ShieldAlert className="h-5 w-5 text-yellow-400" />
              </div>

              <div>
                <h3 className="font-display font-bold text-foreground">Security heads-up</h3>
                <div className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  <p className="flex gap-2">
                    <span className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400">⚠</span>
                    Android may show a security warning because this APK is installed directly rather than through the Google Play Store. Only install it if you trust this source.
                  </p>
                  <p className="flex gap-2">
                    <span className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400">⚠</span>
                    Some features may ask for permissions like camera, microphone or notifications. Grant only what you need for the features you want to try.
                  </p>
                </div>

                {/* Reassurance chips */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {trust.map(({ icon: Icon, text }) => (
                    <span
                      key={text}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <Icon className="h-3 w-3 text-primary" />
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}