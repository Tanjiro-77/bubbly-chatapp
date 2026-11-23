import { useState } from "react";
import { appScreenshots } from "./shared";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  Radio,
  Layers,
  Smartphone,
} from "lucide-react";
import { sounds } from "@/lib/sound";

export function ScreenshotsTour() {
  const [current, setCurrent] = useState(0);

  const prev = () => {
    sounds.playTap();
    setCurrent((c) => (c === 0 ? appScreenshots.length - 1 : c - 1));
  };

  const next = () => {
    sounds.playTap();
    setCurrent((c) => (c === appScreenshots.length - 1 ? 0 : c + 1));
  };

  const currentItem = appScreenshots[current] ?? appScreenshots[0]!;

  return (
    <section className="relative overflow-hidden px-5 py-24">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)" }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div data-reveal className="reveal text-center mb-14">
          <span className="chip mx-auto mb-4 inline-flex">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            Live App Gallery
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
            See Bubbly in action.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            Real captured screenshots from our latest v3.0 Android build.
          </p>
        </div>

        {/* Main Showcase Grid */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: Device Mockup Spotlight */}
          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
            {/* Glow blob */}
            <div
              className="absolute -inset-8 -z-10 rounded-full opacity-40 blur-3xl float-soft"
              style={{ background: "var(--gradient-warm)" }}
            />

            {/* Device frame */}
            <div className="phone-bezel relative overflow-hidden rounded-[2.8rem] border-4 border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
              <div className="relative overflow-hidden rounded-[2.3rem] bg-black">
                <img
                  src={currentItem.src}
                  alt={currentItem.title}
                  className="w-full object-cover transition-all duration-300 hover:scale-102"
                  style={{ maxHeight: "560px" }}
                />

                {/* Shimmer gradient line */}
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
              </div>
            </div>

            {/* Prev / Next floating arrows */}
            <div className="mt-4 flex items-center justify-between px-4">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous screenshot"
                className="btn-base btn-ghost-outline h-9 w-9 p-0! rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {appScreenshots.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setCurrent(i);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      current === i ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                aria-label="Next screenshot"
                className="btn-base btn-ghost-outline h-9 w-9 p-0! rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right: Detailed Feature Breakdown */}
          <div data-reveal className="reveal space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3 w-3" />
              <span>
                {currentItem.tag} Screen · Step {current + 1} of 5
              </span>
            </div>

            <h3 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {currentItem.title}
            </h3>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {currentItem.desc}
            </p>

            {/* Feature Checklist */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Screen Highlights & Engineering
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    Native Android & iOS gesture support with 60 FPS fluid rendering.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    Honey Amber theme system with automatic Dark and Light mode transitions.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    Zero third-party trackers or ads — private and responsive.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Screen Selectors */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {appScreenshots.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setCurrent(i);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    current === i
                      ? "border-primary bg-primary/15 shadow-sm scale-102"
                      : "border-border bg-card/60 hover:bg-muted/60"
                  }`}
                >
                  <p className="font-mono text-[10px] font-bold text-primary">0{i + 1}</p>
                  <p className="truncate text-xs font-bold text-foreground mt-0.5">{item.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
