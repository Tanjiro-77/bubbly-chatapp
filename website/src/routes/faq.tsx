import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, MessageCircle, Github, Mail } from "lucide-react";
import { PageHero, CtaBand, GITHUB_URL, FEEDBACK_EMAIL } from "@/components/site/shared";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Bubbly Chat App" },
      {
        name: "description",
        content:
          "Answers to common questions about installing and using the Bubbly Android chat app.",
      },
      { property: "og:title", content: "FAQ — Bubbly Chat App" },
      {
        property: "og:description",
        content: "Common questions about installing and using Bubbly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "Is Bubbly free?",
    a: "Yes. It's a personal project shared for testing — there's nothing to pay.",
    emoji: "💸",
    category: "General",
  },
  {
    q: "Is it on the Play Store?",
    a: "Not yet. For now you install it directly from the APK file on the Download page.",
    emoji: "🏪",
    category: "Install",
  },
  {
    q: "Why does Android show a warning?",
    a: "Android warns about any app installed outside the Play Store. Only install it if you trust the source.",
    emoji: "⚠️",
    category: "Install",
  },
  {
    q: "Does it work on iPhone?",
    a: "Currently Bubbly is available for Android only.",
    emoji: "📱",
    category: "General",
  },
  {
    q: "Why does it ask for permissions?",
    a: "Camera, microphone and notifications are only needed for features like calls, voice notes and alerts.",
    emoji: "🔐",
    category: "Privacy",
  },
  {
    q: "Can I see the code?",
    a: "Yes — the full source code is on GitHub.",
    emoji: "👨‍💻",
    category: "General",
  },
  {
    q: "How do I report a bug?",
    a: "Use the Send feedback link on the Story page, or open an issue on GitHub.",
    emoji: "🐛",
    category: "Support",
  },
];

const categoryColor: Record<string, string> = {
  General: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Install: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Privacy: "text-green-400 bg-green-400/10 border-green-400/20",
  Support: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions? Bubbled up answers."
        text="Quick answers to what people ask most."
      />

      {/* ── FAQ List ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-24">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        {/* Ambient orb */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-warm)" }}
        />

        <div className="relative mx-auto max-w-3xl">
          {/* Count badge */}
          <div className="mb-8 flex items-center justify-between">
            <span className="chip inline-flex">
              <MessageCircle className="h-3 w-3" />
              {faqs.length} questions answered
            </span>
            <span className="font-mono text-xs text-muted-foreground/50 tracking-widest uppercase">
              Updated regularly
            </span>
          </div>

          <div className="space-y-3">
            {faqs.map(({ q, a, emoji, category }, i) => (
              <details
                key={q}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 open:border-primary/40"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                {/* Left accent bar — visible when open */}
                <div className="absolute inset-y-0 left-0 w-0.5 rounded-l-2xl bg-linear-to-b from-primary/80 to-primary/20 opacity-0 transition-opacity duration-300 group-open:opacity-100" />

                {/* Top shimmer when open */}
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-open:opacity-100" />

                <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-5">
                  {/* Emoji badge */}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-lg transition-transform duration-200 group-open:scale-110">
                    {emoji}
                  </span>

                  {/* Question text */}
                  <span className="flex-1 font-bold text-foreground">{q}</span>

                  {/* Category pill — hidden on mobile */}
                  <span
                    className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest uppercase sm:inline-flex ${categoryColor[category]}`}
                  >
                    {category}
                  </span>

                  {/* Chevron */}
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                </summary>

                {/* Answer */}
                <div className="px-6 pb-5 pl-17">
                  <div className="h-px w-full bg-border mb-4" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Still have questions card */}
          <div
            className="relative mt-10 overflow-hidden rounded-3xl border border-border bg-card p-7"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

            {/* Glow blob */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full opacity-20 blur-2xl"
              style={{ background: "var(--gradient-warm)" }}
            />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Still have a question?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reach out directly — I read every message.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <a
                  href={FEEDBACK_EMAIL}
                  className="btn-base btn-primary py-2.5! px-5! text-sm!"
                >
                  <Mail className="h-4 w-4" />
                  Email me
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-base btn-ghost-outline py-2.5! px-5! text-sm!"
                >
                  <Github className="h-4 w-4" />
                  Open an issue
                </a>
              </div>
            </div>
          </div>

          {/* Bottom mono tag */}
          <p className="mt-8 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Bubbly · FAQ
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}