import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, Github, Mail, Search, HelpCircle, ShieldCheck, FileText } from "lucide-react";
import {
  PageHero,
  CtaBand,
  GITHUB_URL,
  FEEDBACK_EMAIL,
  APP_VERSION,
} from "@/components/site/shared";
import { sounds } from "@/lib/sound";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `Frequently Asked Questions — Bubbly ${APP_VERSION}` },
      {
        name: "description",
        content:
          "Answers to common questions about installing the Bubbly APK, Agora voice/video calls, Story Studio, privacy, and permissions.",
      },
      { property: "og:title", content: "Bubbly FAQ — All Questions Answered" },
      {
        property: "og:description",
        content: "Common questions about installing and using Bubbly v4.1.5.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "Is Bubbly completely free to use?",
    a: "Yes, 100% free! Bubbly is an open-source, full-stack messaging application built by Arnav Khari. There are zero subscriptions, paywalls, or in-app purchases.",
    category: "General",
    emoji: "💸",
  },
  {
    q: "Why is Bubbly distributed as an APK rather than through Google Play?",
    a: "Direct APK distribution alongside PhonePe Indus Appstore allows rapid v4.1.5 release iteration and gives users direct access to the newest features without gatekeeping.",
    category: "Installation",
    emoji: "📦",
  },
  {
    q: "Why does Android show a 'File might be harmful' warning during download?",
    a: "Android shows this standard notification whenever you download any executable (.apk) from a web browser instead of the Play Store. It is normal security behavior. You can safely tap 'Download anyway'.",
    category: "Installation",
    emoji: "⚠️",
  },
  {
    q: "How does Agora power Voice and Video calling in Bubbly?",
    a: "Bubbly integrates the Agora RTC SDK. When you initiate a call, our Express backend generates a dynamic, secure RTC channel token. Agora then delivers low-latency, peer-to-peer audio and video streams.",
    category: "Calls & Voice",
    emoji: "📞",
  },
  {
    q: "How does Story Studio work and what are the 7 presets?",
    a: "Story Studio lets you share ephemeral text and photo stories. For text stories, you can choose from 7 bespoke color gradient presets: Sunset Amber, Midnight Neon, Cyber Mint, Berry Ruby, Deep Charcoal, Ocean Dusk, and Warm Espresso, with text alignment and segmented timer bars.",
    category: "Story Studio",
    emoji: "🎨",
  },
  {
    q: "How does on-the-fly multi-language translation work?",
    a: "Inside any conversation, long-pressing any text message lets you translate it across 6 languages (English, Spanish, French, German, Hindi, Japanese) with cached results and an instant Show Original toggle.",
    category: "Features",
    emoji: "🌐",
  },
  {
    q: "What permissions does Bubbly request and why?",
    a: "Camera (for video calling and story photos), Microphone (for voice notes and calls), Storage/Photos (for sending attachments), and Notifications (for message alerts). You can deny optional permissions and still use core messaging.",
    category: "Privacy & Security",
    emoji: "🔐",
  },
  {
    q: "Can I inspect the full source code?",
    a: "Yes! The complete source code — including the React Native frontend, Node.js/Express backend, MongoDB models, and TanStack Start website — is publicly available on GitHub.",
    category: "Open Source",
    emoji: "💻",
  },
  {
    q: "Does Bubbly work on iPhones (iOS)?",
    a: "Bubbly is built with React Native and Expo, meaning the codebase is cross-platform. While direct .apk sideloading is specific to Android, developers can run Bubbly on iOS using Expo Go or by generating an iOS development profile with EAS.",
    category: "General",
    emoji: "🍎",
  },
  {
    q: "Can I receive calls and messages when Bubbly is closed?",
    a: "Yes! v4.1.5 supports time-sensitive high-priority push notifications for new messages and incoming voice/video calls with Accept & Decline lock-screen actions even when Bubbly is closed or the screen is off — complete with custom alert chimes and 4 selectable incoming call ringtones in Settings.",
    category: "Calls & Voice",
    emoji: "🔔",
  },
  {
    q: "Why does Bubbly require both an email address and a phone number?",
    a: "Bubbly's contact sync discovers friends strictly by phone number rather than email. Requiring both your phone number and verified email during signup (or after Google Sign-In) guarantees every friend can find and message you cleanly while keeping account login and recovery secure.",
    category: "Privacy & Security",
    emoji: "📱",
  },
  {
    q: "Where can I read Bubbly's Privacy Policy and Security disclosure?",
    a: "You can inspect our full Privacy Policy (/privacy-policy) and Security & Data Safety disclosure (/security), including exact Android permissions, encryption details, and PhonePe Indus Appstore compliance information.",
    category: "Privacy & Security",
    emoji: "🛡️",
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: "You can use the interactive feedback form on our Story page, send an email directly to arnavkhari.77@gmail.com, or open a GitHub Issue on the repository.",
    category: "Support",
    emoji: "🐛",
  },
];

export function FaqPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  const categories = [
    "All",
    "General",
    "Installation",
    "Calls & Voice",
    "Story Studio",
    "Privacy & Security",
    "Open Source",
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter((f) => {
      const matchCat = selectedCat === "All" || f.category === selectedCat;
      const matchQuery =
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [search, selectedCat]);

  return (
    <>
      <PageHero
        eyebrow="Help & Knowledge Base"
        title="Frequently Asked Questions."
        text="Everything you need to know about installing, using, and understanding Bubbly."
        badge={`${APP_VERSION} FAQ`}
      />

      <section className="relative overflow-hidden px-5 pb-28 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-4xl">
          {/* ── Search & Filter Controls ── */}
          <div className="rounded-3xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-lg mb-12">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQ (e.g. Agora, translation, install, permissions)..."
                className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2 text-sm focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/70 pt-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setSelectedCat(cat);
                  }}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                    selectedCat === cat
                      ? "bg-primary text-primary-foreground shadow-xs scale-102"
                      : "bg-surface text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Accordion List ── */}
          <div className="space-y-3.5">
            {filteredFaqs.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-12 text-center">
                <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-display text-lg font-bold">No matching questions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching for something else or reach out to Arnav directly.
                </p>
              </div>
            ) : (
              filteredFaqs.map(({ q, a, emoji, category }) => (
                <details
                  key={q}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 open:border-primary/50 shadow-xs"
                >
                  <summary
                    onClick={() => sounds.playTap()}
                    className="flex cursor-pointer list-none items-center gap-4 px-6 py-5 select-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border text-lg group-open:scale-110 transition-transform">
                      {emoji}
                    </span>
                    <span className="flex-1 font-display font-bold text-foreground text-base">
                      {q}
                    </span>
                    <span className="hidden sm:inline-flex rounded-full bg-surface px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                      {category}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                  </summary>

                  <div className="px-6 pb-6 pt-1 text-sm leading-relaxed text-muted-foreground border-t border-border/50 mt-1 pl-19">
                    {a}
                  </div>
                </details>
              ))
            )}
          </div>

          {/* ── Still Have Questions Card ── */}
          <div className="mt-14 rounded-3xl border border-border bg-card p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Still have a question?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask the creator directly — questions and suggestions are always welcome.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link
                  to="/privacy-policy"
                  onClick={() => sounds.playTap()}
                  className="btn-base btn-ghost-outline text-xs!"
                >
                  <FileText className="h-4 w-4" /> Privacy Policy
                </Link>
                <Link
                  to="/security"
                  onClick={() => sounds.playTap()}
                  className="btn-base btn-ghost-outline text-xs!"
                >
                  <ShieldCheck className="h-4 w-4" /> Security
                </Link>
                <a
                  href={FEEDBACK_EMAIL}
                  onClick={() => sounds.playPop()}
                  className="btn-base btn-primary text-xs!"
                >
                  <Mail className="h-4 w-4" /> Email Arnav
                </a>
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-base btn-ghost-outline text-xs!"
                >
                  <Github className="h-4 w-4" /> GitHub Issues
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
