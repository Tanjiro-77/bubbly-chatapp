import { useState, useMemo } from "react";
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { sounds } from "@/lib/sound";

function pseudoCipherBase64(input: string, nonce: string): string {
  const seed = `${nonce}:${input}`;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let h = 2166136261;
  const targetLen = Math.max(28, Math.min(84, input.length * 2 + 24));
  for (let i = 0; i < targetLen; i++) {
    const c = seed.charCodeAt(i % seed.length) || 42;
    h ^= c + i * 31;
    h = Math.imul(h, 16777619);
    out += chars[(h >>> 0) % chars.length];
  }
  return out + "==";
}

export function E2EEShowcase() {
  const [message, setMessage] = useState("Hey! Meet me at 6 PM near the coffee shop ☕");
  const [nonceSeed, setNonceSeed] = useState("9f4a8c12e7b1");
  const [showPlaintextToServer, setShowPlaintextToServer] = useState(false);

  const ciphertext = useMemo(() => pseudoCipherBase64(message || " ", nonceSeed), [message, nonceSeed]);

  const rotateNonce = () => {
    sounds.playTap();
    const hex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setNonceSeed(hex);
  };

  return (
    <section className="relative overflow-hidden px-5 py-24">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
      <div className="relative mx-auto max-w-6xl">
        <div data-reveal className="reveal mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="chip mb-3 inline-flex">
              <Lock className="h-3.5 w-3.5 text-emerald-500" /> Zero-Knowledge E2EE
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
              Your messages, <span className="text-gradient">mathematically private.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
              Every message, photo, document, and voice note is encrypted on-device with{" "}
              <span className="font-semibold text-foreground">X25519 + XSalsa20-Poly1305</span> before
              touching the network. Type below to see what your device sends vs. what our server sees.
            </p>
          </div>

          <button
            type="button"
            onClick={rotateNonce}
            className="btn-base btn-ghost-outline px-4! py-2.5! text-xs!"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Rotate Nonce
          </button>
        </div>

        {/* 3-Column Interactive Crypto Pipeline */}
        <div data-reveal className="reveal grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {/* 1. Sender Device */}
          <div className="spotlight-card rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  1. Sender Device
                </span>
                <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  On-Device Key
                </span>
              </div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Type a message to encrypt:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={140}
                placeholder="Type anything..."
                className="w-full rounded-2xl border border-border bg-surface/80 p-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
              <span className="font-mono">Sealed with K_conv</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated
              </span>
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="hidden lg:flex items-center justify-center text-muted-foreground/60">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 2. Zero-Knowledge Relay Server */}
          <div className="spotlight-card rounded-3xl p-6 flex flex-col justify-between border-emerald-500/25">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                  <ShieldCheck className="h-4 w-4" />
                  2. Bubbly Server Relay
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setShowPlaintextToServer((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  {showPlaintextToServer ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPlaintextToServer ? "Inspect Raw" : "Server View"}
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-ink text-ink-foreground p-3.5 font-mono text-[11px] leading-relaxed overflow-hidden">
                <div className="text-emerald-400 mb-1">// Stored in MongoDB &amp; Socket.IO</div>
                <div>{"{"}</div>
                <div className="pl-3">
                  <span className="text-amber-300">"isEncrypted"</span>: <span className="text-sky-300">true</span>,
                </div>
                <div className="pl-3">
                  <span className="text-amber-300">"alg"</span>:{" "}
                  <span className="text-emerald-300">"x25519-xsalsa20poly1305"</span>,
                </div>
                <div className="pl-3">
                  <span className="text-amber-300">"iv"</span>:{" "}
                  <span className="text-zinc-300">"{nonceSeed}..."</span>,
                </div>
                <div className="pl-3 break-all">
                  <span className="text-amber-300">"ciphertext"</span>:{" "}
                  <span className="text-rose-300">
                    "{showPlaintextToServer ? "🚫 Server has NO key to read this" : ciphertext}"
                  </span>
                </div>
                <div>{"}"}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
              <span>Push alert:</span>
              <span className="font-semibold text-foreground">🔒 New encrypted message</span>
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="hidden lg:flex items-center justify-center text-muted-foreground/60">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 3. Recipient Device */}
          <div className="spotlight-card rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <KeyRound className="h-4 w-4" />
                  3. Recipient Device
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-500">
                  Decrypted Locally
                </span>
              </div>

              <div className="bubble-out px-4 py-3 text-sm font-medium leading-relaxed break-words min-h-[84px]">
                {message.trim() || "Type a message on the left to test live E2EE..."}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-surface/80 border border-border/70 px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Safety Number
              </span>
              <span className="font-mono text-[10px] font-semibold text-foreground truncate">
                48291 03948 77120 55912
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
