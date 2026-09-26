import { createFileRoute } from "@tanstack/react-router";
import { featureGroups, PageHero, CtaBand, useReveal } from "@/components/site/shared";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Bubbly Chat App" },
      {
        name: "description",
        content:
          "Messaging, calls, media sharing, polls, location and more — every feature inside the Bubbly Android chat app.",
      },
      { property: "og:title", content: "Features — Bubbly Chat App" },
      {
        property: "og:description",
        content: "Every feature inside the Bubbly Android chat app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

const groupAccents = [
  {
    number: "text-blue-400/30",
    chip: "text-blue-400 bg-blue-400/10 border-blue-400/25",
    bar: "from-blue-400/60 to-blue-400/10",
    icon: "bg-blue-400/10 border-blue-400/20 text-blue-400",
  },
  {
    number: "text-purple-400/30",
    chip: "text-purple-400 bg-purple-400/10 border-purple-400/25",
    bar: "from-purple-400/60 to-purple-400/10",
    icon: "bg-purple-400/10 border-purple-400/20 text-purple-400",
  },
  {
    number: "text-green-400/30",
    chip: "text-green-400 bg-green-400/10 border-green-400/25",
    bar: "from-green-400/60 to-green-400/10",
    icon: "bg-green-400/10 border-green-400/20 text-green-400",
  },
  {
    number: "text-yellow-400/30",
    chip: "text-yellow-400 bg-yellow-400/10 border-yellow-400/25",
    bar: "from-yellow-400/60 to-yellow-400/10",
    icon: "bg-yellow-400/10 border-yellow-400/20 text-yellow-400",
  },
  {
    number: "text-pink-400/30",
    chip: "text-pink-400 bg-pink-400/10 border-pink-400/25",
    bar: "from-pink-400/60 to-pink-400/10",
    icon: "bg-pink-400/10 border-pink-400/20 text-pink-400",
  },
  {
    number: "text-orange-400/30",
    chip: "text-orange-400 bg-orange-400/10 border-orange-400/25",
    bar: "from-orange-400/60 to-orange-400/10",
    icon: "bg-orange-400/10 border-orange-400/20 text-orange-400",
  },
] as const;

// Fallback accent so TypeScript knows it's never undefined
const fallbackAccent = groupAccents[0];

function FeaturesPage() {
  useReveal();

  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Small app. Big bubble of features."
        text="Everything below is in the app today — nothing more, nothing less."
      />

      <section className="relative overflow-hidden px-5 pb-24 pt-2">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-6xl">
          {/* Total feature count chip */}
          <div className="mb-14 flex items-center justify-between">
            <span className="chip inline-flex">
              <span>✦</span>
              {featureGroups.reduce((acc, g) => acc + g.items.length, 0)} features across{" "}
              {featureGroups.length} categories
            </span>
            <span className="hidden font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground/40 sm:block">
              All live in the app
            </span>
          </div>

          <div className="space-y-24">
            {featureGroups.map((g, gi) => {
              // ✅ Fix 1: guaranteed non-undefined via nullish coalescing fallback
              const accent = groupAccents[gi % groupAccents.length] ?? fallbackAccent;

              return (
                <div key={g.name} className="grid gap-10 lg:grid-cols-[260px_1fr]">
                  {/* ── Sticky sidebar ── */}
                  <div data-reveal className="reveal lg:sticky lg:top-28 lg:self-start">
                    <div
                      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
                      style={{ boxShadow: "var(--shadow-soft)" }}
                    >
                      {/* Left accent bar — ✅ Fix 3: bg-linear-to-b */}
                      <div
                        className={`absolute inset-y-0 left-0 w-0.5 rounded-l-2xl bg-linear-to-b ${accent.bar}`}
                      />

                      <p
                        className={`font-display text-7xl font-extrabold leading-none select-none ${accent.number}`}
                      >
                        0{gi + 1}
                      </p>

                      <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground">
                        {g.name}
                      </h2>

                      <span
                        className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-widest uppercase ${accent.chip}`}
                      >
                        {g.items.length} feature{g.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* ── Feature cards grid ── */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {g.items.map(({ icon: Icon, title, text }, i) => (
                      <div
                        key={title}
                        data-reveal
                        style={{
                          // ✅ Fix 2: merged both style props into one object
                          transitionDelay: `${i * 70}ms`,
                          boxShadow: "var(--shadow-soft)",
                        }}
                        className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5"
                      >
                        {/* Top accent bar — ✅ Fix 4: bg-linear-to-r */}
                        <div
                          className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${accent.bar} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                        />

                        {/* Hover corner glow */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{
                            background:
                              "radial-gradient(circle at top left, color-mix(in oklab, var(--primary) 5%, transparent), transparent 60%)",
                          }}
                        />

                        {/* Icon */}
                        <span
                          className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg transition-transform duration-200 group-hover:scale-110 ${accent.icon}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>

                        <h3 className="relative mt-4 font-bold text-foreground">{title}</h3>
                        <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section end tag */}
          <div className="mt-20 flex items-center gap-4">
            {/* ✅ Fix 5: bg-linear-to-r / bg-linear-to-l */}
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
              End of features · Bubbly
            </span>
            <div className="h-px flex-1 bg-linear-to-l from-border to-transparent" />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}