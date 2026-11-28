import React from "react";
import LegalDocumentView, {
    LegalHighlight,
    LegalSection,
    SUPPORT_EMAIL,
} from "../../components/LegalDocumentView";

const SECURITY_HIGHLIGHTS: LegalHighlight[] = [
    {
        icon: "lock",
        label: "Messages & Media",
        value: "End-to-End Encrypted",
    },
    {
        icon: "key",
        label: "Key Exchange",
        value: "X25519 + XSalsa20",
    },
    {
        icon: "shield",
        label: "Calls & Vault",
        value: "AES-GCM2 + PIN",
    },
    {
        icon: "check-circle",
        label: "Store Compliance",
        value: "Play & App Store",
    },
];

const SECURITY_SECTIONS: LegalSection[] = [
    {
        title: "End-to-End Encryption (E2EE)",
        paragraphs: [
            "Bubbly protects your private and group conversations with true client-side End-to-End Encryption:",
        ],
        bullets: [
            "On-Device Key Generation: Each user generates an X25519 identity key pair locally on their device. Your private key never leaves your device in plaintext.",
            "Authenticated Message Encryption: Text messages, locations, and rich payloads are encrypted on-device with per-conversation 256-bit keys using XSalsa20-Poly1305 before leaving your phone.",
            "Encrypted Media & Voice Notes: Photos, documents, and voice messages are encrypted locally with unique per-file keys before upload; only the encrypted ciphertext is stored on media servers.",
            "Zero-Knowledge Push Alerts: Push notifications do not include plaintext message previews—only generic encrypted message alerts.",
            "Safety Number Verification: Open any contact's profile to inspect and verify the 60-digit Safety Number computed from both users' public keys.",
        ],
    },
    {
        title: "Encryption & Transport Security",
        paragraphs: [
            "In addition to end-to-end encryption, all network traffic is protected in transit:",
        ],
        bullets: [
            "API requests between the Bubbly mobile app and backend servers are transmitted over encrypted HTTPS / TLS connections.",
            "Real-time messaging, presence updates, and call signaling operate over secure Socket.IO (WSS) transport.",
            "Audio and video calling media streams use per-call AES-128-GCM2 media encryption over Agora's real-time infrastructure with token-based channel authorization.",
        ],
    },
    {
        title: "Account & Authentication Protection",
        paragraphs: [
            "Bubbly uses industry-standard authentication flows to safeguard access to your account:",
        ],
        bullets: [
            "Passwords are salted and hashed (bcryptjs) before storage and never stored in plaintext.",
            "Authenticated sessions use signed HS256 JSON Web Tokens (JWT) with server-side verification and expiration checks.",
            "Optional Google Sign-In relies on OAuth 2.0 authentication without exposing your Google password to Bubbly.",
        ],
    },
    {
        title: "On-Device Privacy & Security Controls",
        paragraphs: [
            "Bubbly includes built-in security tools inside Settings so you can protect sensitive chats on your phone:",
        ],
        bullets: [
            "Secret Chat Vault: Hide selected conversations from your main chat list behind a dedicated 4-digit PIN.",
            "App Lock & Biometrics: Enable passcode or biometric lock protection in Settings → Privacy & Security.",
            "Granular OS Permissions: Inspect live Camera, Microphone, Photos, Contacts, and Notification status at any time and toggle access off whenever you want.",
            "Quick Log Out: Signing out clears your local session token, unregisters your device push token, and disconnects your active socket.",
        ],
    },
    {
        title: "Google Play Data Safety Summary",
        paragraphs: [
            "In alignment with Google Play's Data Safety standards, here is how Bubbly handles your data:",
        ],
        bullets: [
            "Data Encrypted in Transit: Yes — network traffic uses HTTPS / TLS.",
            "Data Deletion Request Available: Yes — users can request full account and data deletion from Settings or via email.",
            "Third-Party Advertising / Data Brokers: None — Bubbly does not sell your personal information or serve third-party ad trackers.",
            "Minimal Diagnostic Telemetry: Crash logs are collected only to resolve software defects and improve reliability.",
        ],
    },
    {
        title: "Your Security Best Practices",
        bullets: [
            "Use a strong, unique password of at least 8 characters for your Bubbly account.",
            "Enable Secret Chat Vault PIN and device screen lock if you share your phone.",
            "Keep Bubbly updated to the latest version from Google Play to receive security and stability fixes.",
        ],
    },
    {
        title: "Reporting Security Vulnerabilities",
        paragraphs: [
            "If you discover a potential security issue, unauthorized access concern, or suspicious behavior in Bubbly, please notify us immediately at " +
                SUPPORT_EMAIL +
                " with steps to reproduce so we can investigate promptly.",
        ],
    },
];

export default function SecurityScreen() {
    return (
        <LegalDocumentView
            badgeLabel="SECURITY & DATA SAFETY"
            title="Security & Trust"
            subtitle="How Bubbly safeguards your account, messages, permissions, and Google Play Data Safety."
            lastUpdated="November 25, 2026"
            highlights={SECURITY_HIGHLIGHTS}
            sections={SECURITY_SECTIONS}
            relatedLink={{
                title: "Read Privacy Policy",
                subtitle: "Full details on data collection, permissions, and your rights",
                route: "/(legal)/privacyPolicy",
            }}
            contactSubject="Bubbly Security Inquiry"
            contactDescription="Found a vulnerability or have a security question? Reach out directly to the Bubbly developer."
        />
    );
}
