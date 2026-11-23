import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { featureGroups, PageHero, CtaBand, useReveal } from "@/components/site/shared";
import {
  Search,
  Sparkles,
  Check,
  Languages,
  Mic,
  Play,
  Pause,
  Palette,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { sounds } from "@/lib/sound";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features Catalog — Bubbly v3.0 Messaging App" },
      {
        name: "description",
        content:
          "Explore all 35+ features built into Bubbly: Agora HD calling, real-time Socket.IO chat, Story Studio with 7 presets, Spanish translation, and group polls.",
      },
      { property: "og:title", content: "Features Catalog — Bubbly v3.0" },
      {
        property: "og:description",
        content:
          "Discover real-time messaging, Agora HD voice/video calls, Story Studio presets, and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

export function FeaturesPage() {
  useReveal();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Interactive widgets state
  const [translated, setTranslated] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<"1.0x" | "1.5x" | "2.0x">("1.0x");
  const [isPlaying, setIsPlaying] = useState(false);
  const [storyPreset, setStoryPreset] = useState("Sunset Amber");

  const categories = ["All", ...featureGroups.map((g) => g.name)];

  const filteredGroups = useMemo(() => {
    return featureGroups
      .map((g) => {
        if (selectedCategory !== "All" && g.name !== selectedCategory) {
          return null;
        }

        const filteredItems = g.items.filter((item) => {
          const matchQuery =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.text.toLowerCase().includes(searchQuery.toLowerCase());
          return matchQuery;
        });

        if (filteredItems.length === 0) return null;

        return {
          ...g,
          items: filteredItems,
        };
      })
      .filter(Boolean) as typeof featureGroups;
  }, [searchQuery, selectedCategory]);

  return (
    <>
      <PageHero
        eyebrow="Capabilities & Architecture"
        title="Complete Feature Matrix."
        text="Everything built and shipped inside Bubbly v3.0 — real-time messaging, RTC calls, creative stories and group collaboration."
        badge="35+ Shipped Features"
      />

      <section className="relative overflow-hidden px-5 pb-28 pt-6">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          {/* ── Search & Filter Toolbar ── */}
          <div className="rounded-3xl border border-border bg-card/85 p-6 backdrop-blur-xl shadow-lg mb-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search features (e.g. calls, translation, stories, sockets)..."
                  className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2 text-sm focus:outline-hidden focus:border-primary transition-all"
                />
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground font-semibold">
                  Showing {filteredGroups.reduce((acc, g) => acc + g.items.length, 0)} features
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/70 pt-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setSelectedCategory(cat);
                  }}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs scale-102"
                      : "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Interactive Feature Playground Banners ── */}
          <div className="grid gap-6 md:grid-cols-3 mb-16">
            {/* Widget 1: Live Translation Preview */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" /> Live Translation
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setTranslated(!translated);
                  }}
                  className="rounded-full bg-primary/20 px-2.5 py-1 font-mono text-[10px] font-bold text-foreground hover:bg-primary/30 transition-colors"
                >
                  {translated ? "Spanish" : "English"}
                </button>
              </div>
              <div className="rounded-2xl bg-surface p-3 border border-border/60 text-xs">
                <p className="font-semibold text-foreground">
                  {translated
                    ? "¡Hola! ¿Probaste la última versión de Bubbly v3.0 con videollamadas?"
                    : "Hello! Have you tested the latest Bubbly v3.0 release with video calls?"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Tap switch above to test</p>
              </div>
            </div>

            {/* Widget 2: Voice Note Speed Preview */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Voice Speeds
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setVoiceSpeed((p) => (p === "1.0x" ? "1.5x" : p === "1.5x" ? "2.0x" : "1.0x"));
                  }}
                  className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-400"
                >
                  {voiceSpeed}
                </button>
              </div>
              <div className="rounded-2xl bg-surface p-3 border border-border/60 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setIsPlaying(!isPlaying);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-black shrink-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <div className="flex-1 flex items-center gap-0.5">
                  {[4, 8, 14, 10, 18, 12, 6, 16, 9, 13, 5].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        isPlaying ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">0:14</span>
              </div>
            </div>

            {/* Widget 3: Story Presets Preview */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Story Presets
                </span>
                <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                  {storyPreset}
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  { name: "Sunset Amber", bg: "from-amber-500 to-orange-600" },
                  { name: "Midnight Neon", bg: "from-purple-900 to-indigo-950" },
                  { name: "Cyber Mint", bg: "from-emerald-700 to-teal-900" },
                  { name: "Berry Ruby", bg: "from-rose-800 to-pink-900" },
                ].map((st) => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setStoryPreset(st.name);
                    }}
                    className={`h-9 flex-1 rounded-xl bg-linear-to-br ${st.bg} transition-all ${
                      storyPreset === st.name ? "ring-2 ring-white scale-105" : "opacity-70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Feature Groups & Grid ── */}
          <div className="space-y-20">
            {filteredGroups.map((g, gi) => (
              <div key={g.name} className="grid gap-10 lg:grid-cols-[280px_1fr]">
                {/* Sticky Left Category Title */}
                <div data-reveal className="reveal lg:sticky lg:top-24 lg:self-start">
                  <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                        Group 0{gi + 1}
                      </span>
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                        {g.badge}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl font-extrabold text-foreground">
                      {g.name}
                    </h2>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {g.items.length} verified production features
                    </p>
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {g.items.map(({ icon: Icon, title, text }, i) => (
                    <div
                      key={title}
                      data-reveal
                      className="reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
                    >
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary transition-transform group-hover:scale-110">
                        <Icon className="h-6 w-6" />
                      </div>

                      <h3 className="font-display text-lg font-bold text-foreground leading-snug">
                        {title}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
