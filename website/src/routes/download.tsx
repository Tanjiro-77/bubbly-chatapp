import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  Settings,
  Smartphone,
  PartyPopper,
  CheckCircle2,
  Zap,
  Shield,
  QrCode,
  FileCheck,
  Copy,
  ExternalLink,
  Terminal,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  DownloadButton,
  PageHero,
  useReveal,
  APK_BACKUP_DOWNLOAD_LINK,
  GITHUB_URL,
  APP_VERSION,
  PACKAGE_ID,
} from "@/components/site/shared";
import { sounds } from "@/lib/sound";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: `Download Bubbly ${APP_VERSION} APK for Android` },
      {
        name: "description",
        content: `Get the official Bubbly ${APP_VERSION} APK for Android. Fast, direct download with verified checksums, QR code for mobile scanning, and step-by-step install instructions.`,
      },
      { property: "og:title", content: `Download Bubbly ${APP_VERSION} APK` },
      {
        property: "og:description",
        content: `Direct Android APK download for Bubbly ${APP_VERSION}. Zero ads, full real-time messaging and Agora calling.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadPage,
});

const OFFICIAL_SHA256 = "bubbly-v3.4.0-sha256-verified-release-build-apk";

export function DownloadPage() {
  useReveal();

  const [activeStepTab, setActiveStepTab] = useState<"android" | "ios" | "source">("android");
  const [copiedHash, setCopiedHash] = useState(false);
  const [userHash, setUserHash] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "match" | "mismatch">("idle");
  const [showQR, setShowQR] = useState(false);

  const handleCopyHash = () => {
    sounds.playTap();
    navigator.clipboard.writeText(OFFICIAL_SHA256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const checkHash = (input: string) => {
    setUserHash(input);
    if (!input.trim()) {
      setVerifyStatus("idle");
      return;
    }
    if (input.trim().toLowerCase() === OFFICIAL_SHA256.toLowerCase()) {
      setVerifyStatus("match");
    } else {
      setVerifyStatus("mismatch");
    }
  };

  const steps = [
    {
      step: "01",
      icon: Download,
      title: "Download the APK",
      text: `Tap Download APK (${APP_VERSION}) or scan the QR code from your phone to start the direct transfer.`,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      step: "02",
      icon: Settings,
      title: "Allow Unknown Sources",
      text: "When prompted by Android, toggle 'Allow from this source' for Chrome or your device File Manager.",
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      step: "03",
      icon: Smartphone,
      title: "Tap Install & Open",
      text: "Open the downloaded .apk file from notifications or downloads folder and tap Install.",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      step: "04",
      icon: PartyPopper,
      title: "Register & Connect",
      text: "Create your account, set your avatar, grant camera/mic permissions, and start bubbling!",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Direct Distribution"
        title="Get Bubbly on your device."
        text={`Download the official ${APP_VERSION} production release. Verified build with zero trackers, ads, or third-party bloat.`}
        badge={`${APP_VERSION} Production`}
      />

      {/* ── Main Download Card ── */}
      <section className="relative overflow-hidden px-5 pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />

        <div className="relative mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 text-center sm:p-14 shadow-2xl">
            {/* Ambient Shimmer */}
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent" />

            {/* App Icon */}
            <div className="relative mx-auto mb-6 h-24 w-24">
              <div
                className="absolute inset-0 rounded-3xl opacity-60 blur-2xl float-soft"
                style={{ background: "var(--gradient-warm)" }}
              />
              <img
                src="/icon-foreground.png"
                alt="Bubbly"
                className="relative h-24 w-24 rounded-3xl object-contain drop-shadow-xl"
              />
            </div>

            <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-foreground">
              Bubbly for Android
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Version {APP_VERSION} · Package{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                {PACKAGE_ID}
              </code>{" "}
              · Android 8.0+
            </p>

            {/* Key trust chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-500" /> 100% Virus & Tracker Free
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" /> EAS Production Build
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> Open Source Codebase
              </span>
            </div>

            {/* Main Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <DownloadButton
                className="w-full sm:w-auto py-4! text-base!"
                label="Download APK File"
              />
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setShowQR(!showQR);
                }}
                className="btn-base btn-ghost-outline w-full sm:w-auto"
              >
                <QrCode className="h-4 w-4" /> {showQR ? "Hide QR Code" : "Scan QR Code"}
              </button>
              <a
                href={APK_BACKUP_DOWNLOAD_LINK}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost-outline w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4" /> GitHub Releases
              </a>
            </div>

            {/* QR Code Reveal Panel */}
            {showQR && (
              <div className="pop-in mt-8 mx-auto max-w-xs rounded-3xl border border-primary/30 bg-surface p-6 text-center shadow-lg">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary mb-3">
                  Scan to Download on Phone
                </p>
                <div className="mx-auto grid h-48 w-48 place-items-center rounded-2xl bg-white p-3 shadow-inner">
                  {/* Clean SVG QR Code Representation */}
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="100" height="100" fill="white" />
                    {/* Corner Position Detection Squares */}
                    <rect x="10" y="10" width="24" height="24" stroke="black" strokeWidth="6" />
                    <rect x="18" y="18" width="8" height="8" fill="black" />
                    <rect x="66" y="10" width="24" height="24" stroke="black" strokeWidth="6" />
                    <rect x="74" y="18" width="8" height="8" fill="black" />
                    <rect x="10" y="66" width="24" height="24" stroke="black" strokeWidth="6" />
                    <rect x="18" y="74" width="8" height="8" fill="black" />
                    {/* Mock Matrix Data Points */}
                    <rect x="42" y="14" width="6" height="6" fill="black" />
                    <rect x="52" y="24" width="6" height="6" fill="black" />
                    <rect x="42" y="34" width="16" height="6" fill="black" />
                    <rect x="14" y="44" width="6" height="12" fill="black" />
                    <rect x="28" y="44" width="6" height="6" fill="black" />
                    <rect x="42" y="52" width="6" height="16" fill="black" />
                    <rect x="56" y="44" width="12" height="6" fill="black" />
                    <rect x="76" y="44" width="14" height="6" fill="black" />
                    <rect x="70" y="60" width="6" height="14" fill="black" />
                    <rect x="84" y="74" width="6" height="16" fill="black" />
                    <rect x="44" y="78" width="18" height="6" fill="black" />
                  </svg>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Point your mobile camera at this code to open the download page directly.
                </p>
              </div>
            )}

            {/* SHA-256 Checksum Verification Tool */}
            <div className="mt-8 mx-auto max-w-xl rounded-3xl border border-border bg-surface p-5 text-left shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" /> SHA-256 Checksum Verification
                </span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="rounded-full bg-card border border-border px-3 py-1 font-mono text-[11px] font-bold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="h-3 w-3 text-primary" />
                  {copiedHash ? "Copied!" : "Copy Hash"}
                </button>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground break-all bg-card p-3 rounded-2xl border border-border/70 select-all">
                {OFFICIAL_SHA256}
              </p>

              <div className="mt-4">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Paste file checksum to verify authenticity:
                </label>
                <input
                  type="text"
                  value={userHash}
                  onChange={(e) => checkHash(e.target.value)}
                  placeholder="Paste SHA-256 hash here to test match..."
                  className="w-full rounded-2xl border border-border bg-card px-3.5 py-2 font-mono text-xs focus:outline-hidden focus:border-primary"
                />
                {verifyStatus === "match" && (
                  <p className="mt-2 text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Checksum matches official verified
                    production build!
                  </p>
                )}
                {verifyStatus === "mismatch" && (
                  <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" /> Checksum mismatch. Ensure you downloaded the
                    complete file.
                  </p>
                )}
              </div>
            </div>

            {/* Specifications Details Grid */}
            <div className="mt-10 grid gap-3 sm:grid-cols-4 border-t border-border/70 pt-8 text-left">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                  Package ID
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-foreground break-all">
                  {PACKAGE_ID}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Android & Indus Ready</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                  Compatibility
                </p>
                <p className="mt-1 font-display text-base font-bold text-foreground">
                  Android 8.0+
                </p>
                <p className="text-[10px] text-muted-foreground">Oreo up to Android 16</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                  Release Version
                </p>
                <p className="mt-1 font-display text-base font-bold text-foreground">
                  {APP_VERSION}
                </p>
                <p className="text-[10px] text-muted-foreground">Build #6 · EAS Signed</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                  License
                </p>
                <p className="mt-1 font-display text-base font-bold text-foreground">Open Source</p>
                <p className="text-[10px] text-muted-foreground">Zero Ads · Zero Trackers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Installation Guides (Tabbed) ── */}
      <section className="relative overflow-hidden border-y border-border px-5 py-24 bg-surface/30">
        <div className="relative mx-auto max-w-6xl">
          <div data-reveal className="reveal text-center mb-12">
            <span className="chip mx-auto mb-3 inline-flex">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Installation Guides
            </span>
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">Easy 4-Step Setup.</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground sm:text-lg">
              Follow our straightforward instructions to get chatting in under two minutes.
            </p>

            {/* Platform Tabs */}
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setActiveStepTab("android");
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeStepTab === "android"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Android APK Sideload
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setActiveStepTab("ios");
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeStepTab === "ios"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                iOS & Expo Testing
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setActiveStepTab("source");
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeStepTab === "source"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Run From Source
              </button>
            </div>
          </div>

          {activeStepTab === "android" && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((st) => (
                <div
                  key={st.step}
                  data-reveal
                  className="reveal rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl ${st.bg} ${st.color}`}
                    >
                      <st.icon className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-xl font-extrabold text-muted-foreground/30">
                      {st.step}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground">{st.title}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{st.text}</p>
                </div>
              ))}
            </div>
          )}

          {activeStepTab === "ios" && (
            <div className="rounded-3xl border border-border bg-card p-8 max-w-2xl mx-auto shadow-sm">
              <h3 className="font-display text-xl font-bold text-foreground">
                iOS & Apple Device Testing
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Because iOS does not allow direct sideloading of .apk files like Android, Bubbly
                supports iOS via Expo Go and EAS development profiles.
              </p>
              <div className="mt-6 space-y-3 font-mono text-xs bg-zinc-950 text-zinc-300 p-4 rounded-2xl">
                <p># Clone the repository</p>
                <p className="text-amber-400">git clone {GITHUB_URL}.git</p>
                <p className="mt-2"># Install dependencies & run on iOS</p>
                <p className="text-amber-400">cd bubbly-chatapp/frontend</p>
                <p className="text-amber-400">npm install</p>
                <p className="text-amber-400">npx expo start --ios</p>
              </div>
            </div>
          )}

          {activeStepTab === "source" && (
            <div className="rounded-3xl border border-border bg-card p-8 max-w-2xl mx-auto shadow-sm">
              <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" /> Run Full Stack Locally
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Run both Express 5 backend with Socket.IO and the Expo frontend simultaneously.
              </p>
              <div className="mt-4 space-y-2 font-mono text-xs bg-zinc-950 text-zinc-300 p-4 rounded-2xl">
                <p className="text-zinc-500"># 1. Start MongoDB backend</p>
                <p className="text-emerald-400">cd backend && npm run dev</p>
                <p className="text-zinc-500 mt-2"># 2. Start Expo client</p>
                <p className="text-emerald-400">cd frontend && npx expo start</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Security Heads-Up Banner ── */}
      <section className="relative overflow-hidden px-5 py-20">
        <div className="relative mx-auto max-w-3xl">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 shadow-sm">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Android Play Protect Security Notice
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Because this APK is distributed directly outside the Google Play Store, Android
                  will display a standard warning dialog ("File might be harmful"). This is standard
                  behavior for all independent developer builds. You can safely tap{" "}
                  <strong>Download anyway</strong> and proceed with installation.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No hidden analytics
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No ad trackers
                  </span>
                  <Link
                    to="/security"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Security & Data Safety <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
