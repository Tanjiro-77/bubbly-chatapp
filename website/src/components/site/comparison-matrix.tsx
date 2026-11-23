import { Check, X, Sparkles, Shield, Zap } from "lucide-react";

export function ComparisonMatrix() {
  const features = [
    { name: "Direct Android APK (No Store Gatekeeping)", bubbly: true, others: false },
    { name: "Zero Trackers, Analytics or Ads", bubbly: true, others: false },
    { name: "Open Source Codebase on GitHub", bubbly: true, others: false },
    { name: "Story Studio with 7 Custom Presets", bubbly: true, others: false },
    { name: "On-the-Fly Message Translation (Spanish)", bubbly: true, others: false },
    { name: "Voice Note Playback at 1.0x, 1.5x, 2.0x", bubbly: true, others: true },
    { name: "Low-Latency Agora HD Video & Audio Calls", bubbly: true, others: true },
    { name: "Group Polls with Real-Time Vote Bar", bubbly: true, others: true },
    { name: "Categorized Shared Gallery (Media, Docs, Links)", bubbly: true, others: true },
    { name: "Custom Deep Linking (bubbly://)", bubbly: true, others: false },
  ];

  return (
    <section className="relative overflow-hidden px-5 py-24">
      <div className="relative mx-auto max-w-5xl">
        <div data-reveal className="reveal text-center mb-16">
          <span className="chip mx-auto mb-4 inline-flex">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Clear Advantage
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">Why Choose Bubbly?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            See how a transparent, self-built messaging application compares to corporate platforms.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-border bg-muted/40 p-5 text-sm font-bold">
            <div className="text-foreground">Platform Capabilities</div>
            <div className="text-center text-primary flex items-center justify-center gap-1.5 font-extrabold">
              <Sparkles className="h-4 w-4" /> Bubbly v3.0
            </div>
            <div className="text-center text-muted-foreground">Standard Chat Apps</div>
          </div>

          <div className="divide-y divide-border/60">
            {features.map((f, i) => (
              <div
                key={f.name}
                className="grid grid-cols-[1.5fr_1fr_1fr] items-center p-4.5 text-sm hover:bg-muted/20 transition-colors"
              >
                <div className="font-medium text-foreground pr-2">{f.name}</div>
                <div className="flex justify-center">
                  {f.bubbly ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  {f.others ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-500/60">
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground font-mono">
            Bubbly v3.0 · Built independently with zero corporate tracking
          </div>
        </div>
      </div>
    </section>
  );
}
