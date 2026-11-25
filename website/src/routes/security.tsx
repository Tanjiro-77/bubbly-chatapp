import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  EyeOff,
  Server,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  FileWarning,
  Mail,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  PageHero,
  APP_VERSION,
  DEVELOPER_NAME,
  GITHUB_URL,
  useReveal,
} from "@/components/site/shared";

const PACKAGE_ID = "com.arnav5569.chat";
const SECURITY_EMAIL = "arnavkhari.77@gmail.com";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: `Security & Data Safety — Bubbly (${PACKAGE_ID})` },
      {
        name: "description",
        content:
          "Security architecture, encryption in transit, authentication controls, and App Store Data Safety disclosure for Bubbly (com.arnav5569.chat).",
      },
      { property: "og:title", content: "Security & Data Safety — Bubbly" },
      {
        property: "og:description",
        content:
          "How Bubbly secures your chats, calls, media, and account data — verified for PhonePe Indus Appstore.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: SecurityPage,
});

const securityPillars = [
  {
    icon: Lock,
    title: "Encryption in Transit (TLS / WSS)",
    badge: "Transport Security",
    description:
      "All REST API requests, authentication payloads, and Socket.IO messaging channels are transmitted over HTTPS/TLS and secure WebSockets (WSS), preventing eavesdropping on public Wi-Fi or cellular networks.",
  },
  {
    icon: KeyRound,
    title: "Salted Password Hashing & HS256 JWT",
    badge: "Authentication",
    description:
      "User passwords are never stored in plain text. Every password is salted and hashed using bcryptjs before persistence. Sessions use signed HS256 JSON Web Tokens with server-side verification on every HTTP and Socket.IO request.",
  },
  {
    icon: PhoneCall,
    title: "Scoped RTC Call Tokens",
    badge: "Voice & Video Safety",
    description:
      "Agora voice and video channels use dynamic, short-lived server-generated RTC tokens bound strictly to verified call participants. No unauthenticated user can join or eavesdrop on a call channel.",
  },
  {
    icon: Fingerprint,
    title: "Biometric App Lock & Private Vault",
    badge: "On-Device Protection",
    description:
      "Users can enable biometric/passcode App Lock, lock individual chats, store sensitive notes in a PIN-protected Vault, and send View-Once media or Disappearing Messages.",
  },
  {
    icon: Server,
    title: "Abuse Prevention & Rate Limiting",
    badge: "Infrastructure Defense",
    description:
      "Dedicated Express and Socket.IO rate limiters protect login, registration, messaging, search, and call token endpoints against brute-force attacks, spam floods, and token abuse.",
  },
  {
    icon: EyeOff,
    title: "Granular User Privacy Controls",
    badge: "User Control",
    description:
      "Control who sees your Last Seen, toggle Read Receipts and Typing Indicators, hide Stories from specific contacts, block abusive users, and report violations directly inside the app.",
  },
];

const dataSafetyRows = [
  {
    category: "Personal Info (Name, Email, Phone)",
    purpose: "Account creation, authentication, optional friend discovery",
    encrypted: "Yes (HTTPS/TLS)",
    shared: "No (never sold or shared with ads)",
    deletable: "Yes (In-app or via email)",
  },
  {
    category: "Messages, Voice Notes & Media",
    purpose: "Core real-time chat & Story Studio functionality",
    encrypted: "Yes (TLS / WSS)",
    shared: "Only with intended chat recipients",
    deletable: "Yes (Delete message / Delete account)",
  },
  {
    category: "Audio & Video Call Streams",
    purpose: "Live Agora voice and video calls",
    encrypted: "Yes (Agora RTC encrypted channel)",
    shared: "Not recorded or stored on servers",
    deletable: "Call logs cleared on account deletion",
  },
  {
    category: "Device Push Tokens",
    purpose: "Delivering background message & incoming call notifications",
    encrypted: "Yes (TLS + FCM/APNs)",
    shared: "Expo / FCM / APNs delivery only",
    deletable: "Automatically removed on logout",
  },
  {
    category: "Crash Diagnostics (Sentry)",
    purpose: "App stability & bug fixing",
    encrypted: "Yes (HTTPS/TLS)",
    shared: "Sentry error telemetry only",
    deletable: "Non-advertising diagnostic logs",
  },
];

export function SecurityPage() {
  useReveal();

  return (
    <>
      <PageHero
        eyebrow="Security & Trust"
        title="Security & Data Safety"
        text="Built from the ground up with transport encryption, strict server-side authorization, and zero ad-tracking — transparent for users and PhonePe Indus Appstore review."
        badge={`${PACKAGE_ID} · ${APP_VERSION}`}
      />

      {/* Core Security Architecture */}
      <section className="px-5 pb-20 pt-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Defense in Depth
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                How Bubbly Protects Your Data
              </h2>
            </div>
            <Link to="/privacy-policy" className="btn-base btn-ghost-outline px-4! py-2! text-xs!">
              Read Privacy Policy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  data-reveal
                  className="reveal spotlight-card rounded-3xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Safety Declaration Table (Store Compliance) */}
      <section className="bg-surface px-5 py-20 border-y border-border">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="chip">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> App Store Data Safety
              Summary
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Transparent Data Handling Matrix
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Summary of data categories processed by Bubbly (
              <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">
                {PACKAGE_ID}
              </code>
              ) for PhonePe Indus Appstore Data Safety verification.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-3xl border border-border bg-card shadow-xs">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-semibold">Data Category</th>
                  <th className="px-5 py-4 font-semibold">Purpose</th>
                  <th className="px-5 py-4 font-semibold">Encrypted in Transit</th>
                  <th className="px-5 py-4 font-semibold">Third-Party Sharing</th>
                  <th className="px-5 py-4 font-semibold">User Deletion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dataSafetyRows.map((row) => (
                  <tr key={row.category} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-4 font-semibold text-foreground">{row.category}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.purpose}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {row.encrypted}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{row.shared}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{row.deletable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Vulnerability Disclosure & Build Verification */}
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                Responsible Security Disclosure
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              If you discover a security vulnerability, authentication flaw, or privacy issue in
              Bubbly, please report it responsibly before public disclosure. We review all security
              reports promptly and issue fixes immediately.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`mailto:${SECURITY_EMAIL}?subject=Bubbly%20Security%20Report`}
                className="btn-base btn-primary px-4! py-2.5! text-xs!"
              >
                <Mail className="h-4 w-4" /> Report Vulnerability ({SECURITY_EMAIL})
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-ghost-outline px-4! py-2.5! text-xs!"
              >
                Audit Open-Source Code
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <FileWarning className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                App Store & Account Safety
              </h3>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  Official builds are compiled via Expo Application Services (EAS) by{" "}
                  <strong>{DEVELOPER_NAME}</strong> and signed with the developer's release keystore
                  for <strong>{PACKAGE_ID}</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  Zero hidden background miners, zero SMS scraping, and zero invasive ad SDKs.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Want to delete your account or data? Use{" "}
                  <strong>Settings → Delete Account</strong> inside the app or visit our{" "}
                  <Link to="/privacy-policy" className="font-semibold text-primary underline">
                    Privacy Policy
                  </Link>{" "}
                  for email deletion instructions.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
