import { useState, useEffect, useRef } from "react";
import {
  Phone,
  Video,
  Mic,
  Send,
  CheckCheck,
  Heart,
  Languages,
  Play,
  Pause,
  RotateCw,
  PhoneOff,
  Volume2,
  MicOff,
  Sparkles,
  Camera,
  Layers,
  Smile,
  BarChart3,
  BellRing,
} from "lucide-react";
import { sounds } from "@/lib/sound";

export type SimulatorTab = "chat" | "story" | "call" | "screenshots";

const STORY_PRESETS = [
  { name: "Sunset Amber", bg: "from-amber-500 via-orange-600 to-yellow-600", text: "#fff" },
  { name: "Midnight Neon", bg: "from-purple-900 via-indigo-950 to-blue-900", text: "#e0e7ff" },
  { name: "Cyber Mint", bg: "from-emerald-700 via-teal-900 to-cyan-950", text: "#ecfdf5" },
  { name: "Berry Ruby", bg: "from-rose-800 via-pink-900 to-red-950", text: "#fff1f2" },
  { name: "Deep Charcoal", bg: "from-zinc-900 via-neutral-900 to-black", text: "#f4f4f5" },
  { name: "Ocean Dusk", bg: "from-blue-900 via-indigo-900 to-slate-900", text: "#f0f9ff" },
  { name: "Warm Espresso", bg: "from-amber-950 via-stone-900 to-amber-900", text: "#fef3c7" },
];

export function PhoneSimulator({ initialTab = "chat" }: { initialTab?: SimulatorTab }) {
  const [activeTab, setActiveTab] = useState<SimulatorTab>(initialTab);

  // ── Chat State ──
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      sender: "me" | "them";
      time: string;
      translated?: string;
      isVoice?: boolean;
      duration?: string;
      hasHeart?: boolean;
    }>
  >([
    {
      id: "1",
      text: "Hey! Did you test Bubbly v4.2.1 yet?",
      sender: "them",
      time: "10:42 AM",
      translated: "¡Hola! ¿Ya probaste Bubbly v4.2.1?",
    },
    {
      id: "2",
      text: "Yes! The real-time Socket connection is blazing fast 🚀",
      sender: "me",
      time: "10:43 AM",
      translated: "¡Sí! La conexión en tiempo real con Socket es ultra rápida 🚀",
      hasHeart: true,
    },
    {
      id: "3",
      text: "Voice note",
      sender: "them",
      time: "10:44 AM",
      isVoice: true,
      duration: "0:14",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<"1.0x" | "1.5x" | "2.0x">("1.0x");
  const [pollVotes, setPollVotes] = useState({ yes: 4, no: 1 });
  const [hasVoted, setHasVoted] = useState(false);

  // ── Story State ──
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [storyText, setStoryText] = useState("Just shipped Bubbly v4.2.1! Real voice transcribe ✨");
  const [storyProgress, setStoryProgress] = useState(35);
  const [isPaused, setIsPaused] = useState(false);
  const [storyEmoji, setStoryEmoji] = useState<string | null>(null);

  // ── Call State ──
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  // ── Screenshots State ──
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [pushBanner, setPushBanner] = useState<"none" | "message" | "call">("none");
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyEmojiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPushPreview = (kind: "message" | "call") => {
    sounds.playReceive();
    setPushBanner(kind);
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(() => setPushBanner("none"), 4500);
  };

  // Voice timer simulator
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (voicePlaying) {
      timer = setTimeout(() => {
        setVoicePlaying(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [voicePlaying]);

  // Call timer simulator
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
      if (pushTimeoutRef.current) {
        clearTimeout(pushTimeoutRef.current);
      }
      if (storyEmojiTimeoutRef.current) {
        clearTimeout(storyEmojiTimeoutRef.current);
      }
    };
  }, []);

  // Story progress simulator
  useEffect(() => {
    if (activeTab !== "story" || isPaused) return;
    const interval = setInterval(() => {
      setStoryProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 120);
    return () => clearInterval(interval);
  }, [activeTab, isPaused]);

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    sounds.playPop();

    const newMsg = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "me" as const,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulated reply
    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
    }
    replyTimeoutRef.current = setTimeout(() => {
      sounds.playReceive();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Love this! The UI feels so polished 💛",
          sender: "them",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          translated: "¡Me encanta esto! La interfaz se siente muy pulida 💛",
        },
      ]);
    }, 1400);
  };

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Background ambient orbs */}
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full opacity-35 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)" }}
      />

      {/* Simulator Mode Switcher Bar */}
      <div className="mb-3 flex items-center justify-center gap-1 rounded-full border border-border bg-card/85 p-1 backdrop-blur-md shadow-xs">
        {(
          [
            { id: "chat", label: "💬 Chat" },
            { id: "story", label: "✨ Story" },
            { id: "call", label: "📞 Call" },
            { id: "screenshots", label: "📱 Shots" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              sounds.playTap();
              setActiveTab(t.id);
            }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground shadow-xs scale-102"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Smartphone Chassis ── */}
      <div
        className="phone-bezel relative overflow-hidden rounded-[3rem] border-4 border-zinc-700/80 bg-zinc-950 p-3 shadow-2xl transition-all"
        style={{ aspectRatio: "9 / 18.5" }}
      >
        {/* Notch / Dynamic Island */}
        <div className="absolute left-1/2 top-4 z-30 h-4.5 w-24 -translate-x-1/2 rounded-full bg-black/90 border border-white/10 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-zinc-900 border border-zinc-700 mr-2" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>

        {/* Screen Container */}
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.4rem] bg-card text-foreground">
          {/* Interactive Push Notification Banner Preview */}
          {pushBanner !== "none" && (
            <div className="pop-in absolute inset-x-2.5 top-9 z-40 rounded-2xl border border-primary/40 bg-zinc-950/95 p-2.5 text-white shadow-2xl backdrop-blur-xl">
              <div className="flex items-start gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-400 text-xs font-extrabold text-black">
                  B
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold">
                      {pushBanner === "call" ? "Incoming Video Call" : "Arnav Khari"}
                    </p>
                    <span className="font-mono text-[9px] text-amber-400">now</span>
                  </div>
                  <p className="truncate text-[10px] text-zinc-300">
                    {pushBanner === "call"
                      ? "Arnav is calling you on Bubbly..."
                      : "📷 Sent a photo · Tap to open chat"}
                  </p>
                  {pushBanner === "call" && (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setPushBanner("none");
                        }}
                        className="flex-1 rounded-full bg-rose-500/20 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-500/30"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playPop();
                          setPushBanner("none");
                          setActiveTab("call");
                          setCallActive(true);
                        }}
                        className="flex-1 rounded-full bg-emerald-500 py-1 text-[10px] font-bold text-black hover:bg-emerald-400"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-primary font-bold">5G</span>
              <div className="h-2.5 w-4 rounded-xs border border-current p-0.5">
                <div className="h-full w-full bg-primary rounded-xs" />
              </div>
            </div>
          </div>

          {/* ─────────────────── TAB 1: REAL-TIME CHAT ─────────────────── */}
          {activeTab === "chat" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Chat Top Bar */}
              <div className="flex items-center gap-2.5 border-b border-border/70 bg-card px-3.5 py-2.5">
                <div className="relative">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    A
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold leading-tight">Arnav Khari</p>
                  <p className="text-[10px] text-emerald-500 font-medium">online · 🎧 Listening · v4.2.1</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Simulate background call push"
                    onClick={() => triggerPushPreview(pushBanner === "call" ? "message" : "call")}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <BellRing className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Translate messages"
                    onClick={() => {
                      sounds.playTap();
                      setIsTranslating(!isTranslating);
                    }}
                    className={`rounded-full p-1.5 transition-colors ${
                      isTranslating
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Languages className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Start voice call"
                    onClick={() => {
                      sounds.playTap();
                      setActiveTab("call");
                      setCallActive(true);
                    }}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3 text-[12px]">
                {/* Pinned Announcement Banner */}
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-primary truncate">
                    📌 v4.2.1 shipped with voice transcription & cloud settings sync!
                  </span>
                  <span className="text-[9px] text-muted-foreground shrink-0 ml-1">Today</span>
                </div>

                {/* Messages */}
                {messages.map((m) => {
                  const isMe = m.sender === "me";
                  return (
                    <div
                      key={m.id}
                      className={`group relative flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        onDoubleClick={() => {
                          sounds.playHeart();
                          setMessages((prev) =>
                            prev.map((item) =>
                              item.id === m.id ? { ...item, hasHeart: !item.hasHeart } : item,
                            ),
                          );
                        }}
                        className={`pop-in relative max-w-[84%] px-3 py-2 cursor-pointer transition-transform active:scale-98 ${
                          isMe ? "bubble-out" : "bubble-in"
                        }`}
                      >
                        {m.isVoice ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sounds.playTap();
                                setVoicePlaying(!voicePlaying);
                              }}
                              className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-primary"
                            >
                              {voicePlaying ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3 ml-0.5" />
                              )}
                            </button>
                            {/* Waveform */}
                            <div className="flex items-center gap-0.5">
                              {[3, 6, 9, 12, 8, 14, 11, 7, 10, 4].map((h, i) => (
                                <span
                                  key={i}
                                  className={`w-0.5 rounded-full transition-all ${
                                    voicePlaying
                                      ? "bg-primary animate-pulse"
                                      : "bg-muted-foreground/60"
                                  }`}
                                  style={{ height: `${h}px` }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sounds.playTap();
                                setVoiceSpeed((prev) =>
                                  prev === "1.0x" ? "1.5x" : prev === "1.5x" ? "2.0x" : "1.0x",
                                );
                              }}
                              className="rounded-full bg-black/10 px-1.5 py-0.5 font-mono text-[9px] font-bold"
                            >
                              {voiceSpeed}
                            </button>
                          </div>
                        ) : (
                          <p className="leading-relaxed">
                            {isTranslating && m.translated ? m.translated : m.text}
                          </p>
                        )}

                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-70">
                          <span>{m.time}</span>
                          {isMe && <CheckCheck className="h-3 w-3 text-emerald-300" />}
                        </div>

                        {/* Heart Reaction */}
                        {m.hasHeart && (
                          <span className="pop-in absolute -bottom-2 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-xs">
                            ❤️
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Group Poll Card Preview */}
                <div className="pop-in rounded-2xl border border-border bg-surface p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                    <BarChart3 className="h-3 w-3 text-primary" />
                    <span>Poll: Loving the v4.2.1 Obsidian UI?</span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        if (!hasVoted) {
                          setPollVotes((p) => ({ ...p, yes: p.yes + 1 }));
                          setHasVoted(true);
                        }
                      }}
                      className="w-full relative overflow-hidden rounded-lg border border-primary/30 bg-card p-1.5 text-left flex items-center justify-between"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-500"
                        style={{
                          width: `${(pollVotes.yes / (pollVotes.yes + pollVotes.no)) * 100}%`,
                        }}
                      />
                      <span className="relative font-semibold">Yes, looks insane! 🔥</span>
                      <span className="relative font-mono font-bold text-primary">
                        {Math.round((pollVotes.yes / (pollVotes.yes + pollVotes.no)) * 100)}%
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="border-t border-border bg-card p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs focus:outline-hidden focus:border-primary"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ─────────────────── TAB 2: STORY STUDIO ─────────────────── */}
          {activeTab === "story" &&
            (() => {
              const currentPreset = STORY_PRESETS[selectedPreset] ??
                STORY_PRESETS[0] ?? {
                  name: "Sunset Amber",
                  bg: "from-amber-500 via-orange-600 to-yellow-600",
                  text: "#fff",
                };
              return (
                <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950 text-white">
                  {/* Segmented Story Progress Bar */}
                  <div className="flex gap-1 px-3 pt-2">
                    <div className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${storyProgress}%` }}
                      />
                    </div>
                    <div className="h-1 flex-1 rounded-full bg-white/20" />
                    <div className="h-1 flex-1 rounded-full bg-white/20" />
                  </div>

                  {/* Story Header */}
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-linear-to-tr from-amber-400 to-pink-500 p-0.5">
                        <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold">
                          A
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold leading-tight">arnavkhari</p>
                        <p className="text-[9px] text-white/60">Story Studio · Preset</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaused(!isPaused)}
                      className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold border border-white/20"
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                  </div>

                  {/* Story Canvas */}
                  <div
                    className={`relative mx-2.5 my-1 flex flex-1 flex-col items-center justify-center rounded-2xl bg-linear-to-br ${currentPreset.bg} p-4 text-center transition-all duration-300 shadow-inner`}
                  >
                    <p className="font-display text-base font-extrabold leading-snug drop-shadow-md">
                      "{storyText}"
                    </p>

                    {storyEmoji && (
                      <span className="animate-bounce absolute text-5xl animate-bounce drop-shadow-xl">
                        {storyEmoji}
                      </span>
                    )}
                  </div>

                  {/* Story Preset Picker Carousel */}
                  <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800">
                    <p className="text-[10px] font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Story Preset Theme</span>
                      <span className="text-amber-400">{currentPreset.name}</span>
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {STORY_PRESETS.map((p, idx) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            sounds.playTap();
                            setSelectedPreset(idx);
                          }}
                          className={`h-7 w-7 shrink-0 rounded-full bg-linear-to-br ${p.bg} transition-transform ${
                            selectedPreset === idx
                              ? "scale-115 ring-2 ring-white shadow-md"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Quick Emoji Reactions */}
                    <div className="mt-2 flex items-center justify-around border-t border-zinc-800 pt-1.5 text-base">
                      {["❤️", "🔥", "😂", "👏", "😍", "😮"].map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => {
                            sounds.playPop();
                            setStoryEmoji(emo);
                            if (storyEmojiTimeoutRef.current) {
                              clearTimeout(storyEmojiTimeoutRef.current);
                            }
                            storyEmojiTimeoutRef.current = setTimeout(() => setStoryEmoji(null), 1500);
                          }}
                          className="hover:scale-125 transition-transform"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* ─────────────────── TAB 3: AGORA RTC CALL ─────────────────── */}
          {activeTab === "call" && (
            <div className="flex flex-1 flex-col items-center justify-between overflow-hidden bg-linear-to-b from-zinc-900 via-zinc-950 to-black p-5 text-white text-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-emerald-400 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {callActive ? "Agora HD Voice Active" : "Incoming Voice Call..."}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">Arnav Khari</h3>
                <p className="mt-1 font-mono text-xs text-white/60">
                  {callActive ? formatCallTime(callDuration) : "Ringing..."}
                </p>
              </div>

              {/* Pulsing Avatar */}
              <div className="relative my-4">
                <div className="pulse-ring absolute inset-0 -m-4 rounded-full border border-primary/40" />
                <div className="pulse-ring absolute inset-0 -m-8 rounded-full border border-primary/20 [animation-delay:0.5s]" />
                <div className="relative grid h-24 w-24 place-items-center rounded-full bg-linear-to-tr from-amber-400 to-amber-600 font-display text-3xl font-extrabold text-black shadow-2xl">
                  A
                </div>
              </div>

              {/* In-Call Controls */}
              {callActive ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTap();
                        setIsMuted(!isMuted);
                      }}
                      className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                        isMuted
                          ? "bg-rose-500 text-white"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTap();
                        setIsSpeaker(!isSpeaker);
                      }}
                      className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                        isSpeaker ? "bg-primary text-black font-bold" : "bg-white/15 text-white"
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setCallActive(false);
                      }}
                      className="grid h-12 w-12 place-items-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-900/50 hover:bg-rose-500"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40">Powered by Agora RTC Engine</p>
                </div>
              ) : (
                <div className="flex w-full items-center justify-around px-4">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setActiveTab("chat");
                    }}
                    className="grid h-12 w-12 place-items-center rounded-full bg-rose-600 text-white"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setCallActive(true);
                    }}
                    className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white animate-bounce"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────── TAB 4: REAL SCREENSHOTS ─────────────────── */}
          {activeTab === "screenshots" && (
            <div className="flex flex-1 flex-col overflow-hidden bg-black">
              <div className="relative flex-1 overflow-hidden">
                <img
                  src={`/screenshots/${activeScreenshot + 1}.png`}
                  alt="Bubbly Real Screen"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Screenshot Selector Dots */}
              <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sounds.playTap();
                        setActiveScreenshot(idx);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        activeScreenshot === idx ? "w-6 bg-primary" : "w-2 bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-zinc-400">
                  {activeScreenshot + 1} of 5
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
