import { Check, X, Sparkles, Zap } from "lucide-react";
import { APP_VERSION } from "./shared";

export function ComparisonMatrix() {
  const features = [
    { name: "Zero Trackers, Analytics or Ad Networks", bubbly: true, others: false },
    { name: "100% Open-Source Codebase on GitHub", bubbly: true, others: false },
    { name: "Background Push & Closed-App Call Alerts", bubbly: true, others: true },
    { name: "Biometric App Lock, PIN Vault & View-Once Media", bubbly: true, others: false },
    { name: "Story Studio with 7 Custom Gradient Presets", bubbly: true, others: false },
    { name: "On-the-Fly Translation (6 Languages)", bubbly: true, others: false },
    { name: "Shared Checklists, Countdowns & Chat Mini-Games", bubbly: true, others: false },
    { name: "Slash Quick Replies, Format Bar & Silent Send", bubbly: true, others: false },
    { name: "Message Reminder Alarms & Focus Mode Timer", bubbly: true, others: false },
    { name: "Smart Chat Folders, Archive & Private Nicknames", bubbly: true, others: false },
    { name: "AI Voice Note Transcription & 1.0x/1.5x/2.0x Playback", bubbly: true, others: true },
    { name: "Durable Cloud + Device Settings Synchronization", bubbly: true, others: false },
    { name: "Low-Latency Agora HD Video & Audio Calls", bubbly: true, others: true },
    { name: "Group Polls & Shared Media/Docs Gallery", bubbly: true, others: true },
    { name: "PhonePe Indus Appstore & Direct APK Ready", bubbly: true, others: false },
  ];

  return (
    <section className="relative overflow-hidden px-5 py-24">
      <div className="relative mx-auto max-w-5xl">
        <div data-reveal className="reveal text-center mb-14">
          <span className="chip mx-auto mb-4 inline-flex">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Clear Advantage
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">Why Choose Bubbly?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            See how a transparent, self-built messaging platform compares to corporate chat apps.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="spotlight-card rounded-3xl">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-border bg-muted/40 p-5 text-sm font-bold">
            <div className="text-foreground">Platform Capabilities</div>
            <div className="flex items-center justify-center gap-1.5 text-center font-extrabold text-primary">
              <Sparkles className="h-4 w-4" /> Bubbly {APP_VERSION}
            </div>
            <div className="text-center text-muted-foreground">Standard Chat Apps</div>
          </div>

          <div className="divide-y divide-border/60">
            {features.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-[1.6fr_1fr_1fr] items-center px-5 py-4 text-sm transition-colors hover:bg-muted/25"
              >
                <div className="pr-3 font-medium text-foreground">{f.name}</div>
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

          <div className="border-t border-border bg-surface p-4 text-center font-mono text-xs text-muted-foreground">
            Bubbly {APP_VERSION} · Built independently with zero corporate tracking
          </div>
        </div>
      </div>
    </section>
  );
}
