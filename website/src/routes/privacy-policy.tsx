import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  FileText,
  Lock,
  Smartphone,
  Database,
  Trash2,
  Mail,
  UserCheck,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  PageHero,
  APP_VERSION,
  DEVELOPER_NAME,
  GITHUB_URL,
  useReveal,
} from "@/components/site/shared";

const EFFECTIVE_DATE = "November 25, 2026";
const PACKAGE_ID = "com.arnav5569.chat";
const CONTACT_EMAIL = "arnavkhari.77@gmail.com";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — Bubbly (${PACKAGE_ID})` },
      {
        name: "description",
        content:
          "Official Privacy Policy for Bubbly mobile application (com.arnav5569.chat). Details on data collection, permissions, third-party services, data deletion, and PhonePe Indus Appstore compliance.",
      },
      { property: "og:title", content: "Privacy Policy — Bubbly" },
      {
        property: "og:description",
        content:
          "Transparent privacy policy, permissions breakdown, and user data rights for Bubbly.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: PrivacyPolicyPage,
});

const permissionsList = [
  {
    permission: "Camera",
    purpose:
      "Capture photos/videos for chats and Story Studio, and stream video during Agora video calls.",
    required: "Optional (prompted on use)",
  },
  {
    permission: "Microphone",
    purpose: "Record voice messages and transmit audio during real-time voice and video calls.",
    required: "Optional (prompted on use)",
  },
  {
    permission: "Photos & Media Storage",
    purpose:
      "Select images, videos, or documents to send in conversations or set a profile avatar.",
    required: "Optional (prompted on use)",
  },
  {
    permission: "Contacts",
    purpose:
      "Match phone numbers from your address book with registered Bubbly users when you tap Sync Contacts.",
    required: "Optional (opt-in only)",
  },
  {
    permission: "Notifications & Full-Screen Call Alerts",
    purpose:
      "Deliver real-time message alerts and incoming voice/video call notifications when the app is closed or in the background.",
    required: "Optional (recommended)",
  },
  {
    permission: "Phone State & Audio Settings",
    purpose:
      "Manage audio routing (speakerphone/Bluetooth/earpiece) and handle incoming call states cleanly during active calls.",
    required: "Required for calling",
  },
];

const thirdPartyServices = [
  {
    name: "MongoDB Atlas / Bubbly Backend",
    role: "Stores user accounts, conversation metadata, encrypted password hashes, and messages.",
  },
  {
    name: "Agora.io (RTC SDK)",
    role: "Provides low-latency real-time voice and video calling streams using short-lived server-generated tokens.",
  },
  {
    name: "Cloudinary",
    role: "Hosts uploaded chat images, videos, voice notes, documents, and profile/group avatars over HTTPS.",
  },
  {
    name: "Expo Push / Google FCM / Apple APNs",
    role: "Delivers push notifications for new messages and incoming calls via device push tokens.",
  },
  {
    name: "Google Sign-In (OAuth 2.0)",
    role: "Optional authentication provider when you choose 'Continue with Google'.",
  },
  {
    name: "Sentry",
    role: "Captures crash diagnostics and app stability telemetry to fix bugs quickly.",
  },
];

const tocItems = [
  { id: "overview", label: "1. Overview & App Identity" },
  { id: "data-collected", label: "2. Information We Collect" },
  { id: "permissions", label: "3. Device Permissions" },
  { id: "third-party", label: "4. Third-Party Services" },
  { id: "retention", label: "5. Retention & Data Deletion" },
  { id: "children", label: "6. Children's Privacy" },
  { id: "grievance", label: "7. Grievance & Contact" },
];

export function PrivacyPolicyPage() {
  useReveal();

  return (
    <>
      <PageHero
        eyebrow="Legal & Compliance"
        title="Privacy Policy"
        text="Clear, plain-language explanation of what data Bubbly collects, how it is protected, and how you control your information — prepared for PhonePe Indus Appstore & user transparency."
        badge={`Effective ${EFFECTIVE_DATE}`}
      />

      <section className="px-5 pb-24 pt-4">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[260px_1fr]">
          {/* Sticky Sidebar TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
                Quick Navigation
              </p>
              <nav className="mt-4 space-y-1.5">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="mt-5 border-t border-border pt-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  App Verification Details
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-foreground font-semibold">Bubbly ({APP_VERSION})</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{PACKAGE_ID}</p>
                  <p className="text-muted-foreground">Developer: {DEVELOPER_NAME}</p>
                </div>
                <Link
                  to="/security"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  View Security & Data Safety <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Policy Content */}
          <div className="space-y-8">
            {/* Summary Banner */}
            <div
              data-reveal
              className="reveal rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    Our Privacy Commitment
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Last Updated: {EFFECTIVE_DATE} · Applies to Android & iOS builds of{" "}
                    <span className="font-mono">{PACKAGE_ID}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  "Zero third-party ads or trackers",
                  "We never sell your personal data",
                  "Full account & data deletion anytime",
                ].map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-3.5 py-2.5 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1. Overview */}
            <article id="overview" className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  1. Overview & App Identity
                </h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                This Privacy Policy explains how <strong>Bubbly</strong> (Android package ID{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {PACKAGE_ID}
                </code>
                ), developed and maintained by <strong>{DEVELOPER_NAME}</strong> ("we", "our",
                "us"), collects, uses, stores, and protects your information when you use the Bubbly
                mobile application, web application, or related services. By creating an account or
                using Bubbly, you agree to the practices described in this policy.
              </p>
            </article>

            {/* 2. Information We Collect */}
            <article
              id="data-collected"
              className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  2. Information We Collect
                </h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-bold text-foreground">Account & Profile Information</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Your name, email address, hashed password (for email sign-up), optional Google
                    account ID (for Google Sign-In), optional phone number, and profile photo URL.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-bold text-foreground">Messages, Stories & Media</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Text messages, images, videos, voice notes, shared documents, poll votes,
                    optional shared location coordinates, and 24-hour Stories you choose to send.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-bold text-foreground">Voice & Video Call Metadata</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Call logs (caller, recipient, call type, timestamp, status, and duration). Live
                    audio and video streams are transmitted via Agora RTC and are{" "}
                    <strong>never recorded</strong> by Bubbly.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-bold text-foreground">Push Tokens & Diagnostics</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Device push notification tokens (Expo/FCM/APNs) to deliver new message and
                    incoming call alerts, plus crash logs (device model, OS version, error trace) to
                    resolve bugs.
                  </p>
                </div>
              </div>
            </article>

            {/* 3. Permissions */}
            <article
              id="permissions"
              className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  3. Device Permissions & Why We Request Them
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bubbly requests device permissions strictly when needed for the specific feature you
                invoke. You can manage or revoke any permission at any time from{" "}
                <strong>Settings → App Permissions</strong> or your device system settings.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Permission</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {permissionsList.map((row) => (
                      <tr key={row.permission} className="bg-card">
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                          {row.permission}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary">
                            {row.required}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* 4. Third-Party Services */}
            <article
              id="third-party"
              className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  4. How We Use & Share Data (Third-Party Processors)
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We <strong>do not sell, rent, or trade</strong> your personal data to advertisers or
                data brokers. Data is processed only by essential infrastructure providers strictly
                required to operate Bubbly's features:
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {thirdPartyServices.map((svc) => (
                  <div key={svc.name} className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-sm font-bold text-foreground">{svc.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{svc.role}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* 5. Retention & Deletion */}
            <article id="retention" className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  5. Data Retention & Account Deletion Rights
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <strong>Stories & Ephemeral Content:</strong> Stories automatically expire after
                    24 hours. View-once media is removed immediately after being viewed, and
                    disappearing chats purge automatically on your selected timer.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <strong>In-App Deletion:</strong> You can delete individual messages, clear
                    conversations, remove your push token on logout, or permanently delete your
                    account directly inside the app via <strong>Settings → Delete Account</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <strong>Email Deletion Request:</strong> You can also request complete deletion
                    of your account and associated personal data by emailing{" "}
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=Bubbly%20Account%20Deletion%20Request`}
                      className="font-semibold text-primary underline"
                    >
                      {CONTACT_EMAIL}
                    </a>{" "}
                    from your registered email address. Verified requests are completed within 7
                    business days.
                  </span>
                </li>
              </ul>
            </article>

            {/* 6. Children's Privacy */}
            <article id="children" className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  6. Children's Privacy
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bubbly is not directed to children under the age of 13 (or under the applicable age
                of digital consent in your jurisdiction, including under India's Digital Personal
                Data Protection Act, 2023). We do not knowingly collect personal information from
                children without verifiable parental consent. If you believe a minor has provided
                personal data, please contact us immediately so we can remove the account.
              </p>
            </article>

            {/* 7. Grievance & Contact */}
            <article id="grievance" className="scroll-mt-24 spotlight-card rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  7. Grievance Officer & Contact Information
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                In compliance with applicable Indian Information Technology Rules, the Digital
                Personal Data Protection (DPDP) Act 2023, and PhonePe Indus Appstore developer
                guidelines, you may reach our Data Protection & Grievance Officer regarding any
                privacy questions, data access requests, or policy concerns:
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface p-4 text-xs space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                    Grievance Officer
                  </p>
                  <p className="text-sm font-bold text-foreground">{DEVELOPER_NAME}</p>
                  <p className="text-muted-foreground">Application: Bubbly ({PACKAGE_ID})</p>
                  <p className="text-muted-foreground">
                    Response SLA: Acknowledged within 48 hours; resolved within 15 days
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                      Direct Contact
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{CONTACT_EMAIL}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=Bubbly%20Privacy%20Inquiry`}
                      className="btn-base btn-primary px-4! py-2! text-xs!"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email Privacy Team
                    </a>
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-base btn-ghost-outline px-4! py-2! text-xs!"
                    >
                      <Lock className="h-3.5 w-3.5" /> Inspect Source
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
