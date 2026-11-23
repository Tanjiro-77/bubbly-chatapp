import { useState } from "react";
import {
  Server,
  Database,
  Smartphone,
  Globe,
  Radio,
  Sparkles,
  Terminal,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { sounds } from "@/lib/sound";

export function ArchitectureSection() {
  const [activeEvent, setActiveEvent] = useState<{
    name: string;
    payload: string;
    latency: string;
    status: string;
  }>({
    name: "newMessage",
    payload: JSON.stringify(
      {
        conversationId: "conv_68b209a",
        senderId: "user_arnav",
        text: "Real-time communication active!",
        type: "text",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    latency: "34ms",
    status: "200 ACK_DELIVERED",
  });

  const simulateEvent = (name: string, payloadObj: object, latency: string, status: string) => {
    sounds.playPop();
    setActiveEvent({
      name,
      payload: JSON.stringify(payloadObj, null, 2),
      latency,
      status,
    });
  };

  return (
    <section className="relative overflow-hidden border-y border-border px-5 py-24 bg-surface/50">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

      {/* Center ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)" }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div data-reveal className="reveal text-center mb-16">
          <span className="chip mx-auto mb-4 inline-flex">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Engineering Deep Dive
          </span>
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
            Full-Stack Architecture.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            Client-server topology engineered for sub-50ms message propagation and resilient
            connection recovery.
          </p>
        </div>

        {/* ── Architecture Nodes Flow ── */}
        <div className="grid gap-4 md:grid-cols-4 mb-12">
          {/* Node 1: Client */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
              Layer 1
            </p>
            <h3 className="font-display text-lg font-bold text-foreground mt-1">Mobile Client</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              React Native with Expo SDK 57, Reanimated animations, and Socket.IO client.
            </p>
          </div>

          {/* Node 2: Gateway */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
              <Server className="h-6 w-6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-purple-400 font-bold">
              Layer 2
            </p>
            <h3 className="font-display text-lg font-bold text-foreground mt-1">
              Express 5 Server
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Node.js backend with JWT authentication middleware, rate limiting, and REST APIs.
            </p>
          </div>

          {/* Node 3: Socket.IO Gateway */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
              <Radio className="h-6 w-6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Layer 3
            </p>
            <h3 className="font-display text-lg font-bold text-foreground mt-1">
              Socket.IO Broker
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Real-time room routing, chatEvents, callEvents, groupEvents, and typing indicators.
            </p>
          </div>

          {/* Node 4: Services & DB */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
              <Database className="h-6 w-6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-blue-400 font-bold">
              Layer 4
            </p>
            <h3 className="font-display text-lg font-bold text-foreground mt-1">MongoDB & Agora</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Mongoose schemas, Agora dynamic RTC token generation, and Cloudinary media CDN.
            </p>
          </div>
        </div>

        {/* ── Interactive Live Socket Event Stream Inspector ── */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xl">
          <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-6 py-4 gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Live Socket Event Inspector
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                CONNECTED
              </span>
            </div>

            {/* Event Simulator Triggers */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  simulateEvent(
                    "newMessage",
                    {
                      conversationId: "conv_68b209a",
                      senderId: "user_arnav",
                      text: "Voice note received with 1.5x speed",
                      type: "audio",
                      duration: 14,
                      timestamp: new Date().toISOString(),
                    },
                    "28ms",
                    "200 DELIVERED",
                  )
                }
                className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                  activeEvent.name === "newMessage"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface text-muted-foreground hover:bg-muted"
                }`}
              >
                emit(newMessage)
              </button>

              <button
                type="button"
                onClick={() =>
                  simulateEvent(
                    "call:invite",
                    {
                      callId: "call_9934af",
                      caller: "Arnav Khari",
                      channel: "agora_room_88",
                      type: "video",
                      agoraToken: "007eJxTYGDKv7z50...[RTC]",
                      timestamp: new Date().toISOString(),
                    },
                    "42ms",
                    "200 RTC_CONNECTED",
                  )
                }
                className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                  activeEvent.name === "call:invite"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface text-muted-foreground hover:bg-muted"
                }`}
              >
                emit(call:invite)
              </button>

              <button
                type="button"
                onClick={() =>
                  simulateEvent(
                    "story:reaction",
                    {
                      storyId: "story_amber_01",
                      viewerId: "user_guest",
                      reaction: "🔥",
                      timestamp: new Date().toISOString(),
                    },
                    "19ms",
                    "200 SAVED_ACK",
                  )
                }
                className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                  activeEvent.name === "story:reaction"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface text-muted-foreground hover:bg-muted"
                }`}
              >
                emit(story:reaction)
              </button>
            </div>
          </div>

          {/* Code Stream Display */}
          <div className="p-6 bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-[11px] text-zinc-400">
              <span>
                Event: <strong className="text-amber-400 font-bold">{activeEvent.name}</strong>
              </span>
              <div className="flex gap-4">
                <span>
                  Latency: <strong className="text-emerald-400">{activeEvent.latency}</strong>
                </span>
                <span>
                  Response: <strong className="text-primary">{activeEvent.status}</strong>
                </span>
              </div>
            </div>
            <pre className="text-zinc-300 leading-relaxed">{activeEvent.payload}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
