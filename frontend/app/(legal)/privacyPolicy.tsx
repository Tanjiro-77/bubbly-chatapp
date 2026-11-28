import React from "react";
import LegalDocumentView, {
    LegalHighlight,
    LegalSection,
    SUPPORT_EMAIL,
} from "../../components/LegalDocumentView";

const PRIVACY_HIGHLIGHTS: LegalHighlight[] = [
    {
        icon: "shield",
        label: "Data Selling",
        value: "Never Sold",
    },
    {
        icon: "lock",
        label: "Encryption",
        value: "End-to-End (E2EE)",
    },
    {
        icon: "eye-slash",
        label: "Permissions",
        value: "Optional Only",
    },
    {
        icon: "trash",
        label: "Account Control",
        value: "Delete Anytime",
    },
];

const PRIVACY_SECTIONS: LegalSection[] = [
    {
        title: "Overview & Scope",
        paragraphs: [
            "This Privacy Policy explains how Bubbly (package com.arnav5569.chat), developed by Arnav, collects, uses, stores, and protects your information when you use the Bubbly mobile application and related services.",
            "By creating an account or signing in to Bubbly, you acknowledge the data practices described below.",
        ],
    },
    {
        title: "Information You Provide",
        paragraphs: [
            "We collect only the account and communication details needed to operate a real-time messaging and calling app:",
        ],
        bullets: [
            "Account & Profile Data: Full name, email address, password (stored as a secure hash on our servers), optional phone number, and profile avatar.",
            "Google Sign-In Data: If you choose Continue with Google, we receive your Google name, email address, profile photo, and Google account identifier to sign you in.",
            "Messages, Stories & Media: Chat messages, voice notes, photos, and documents are end-to-end encrypted on your device before transmission, so our servers only relay and store encrypted ciphertext. Push notifications deliver generic alerts without exposing plaintext message content.",
            "Support & Bug Reports: Screenshots, descriptions, and optional contact details you submit when reporting an issue.",
        ],
    },
    {
        title: "Device Permissions & How We Use Them",
        paragraphs: [
            "All sensitive Android and iOS permissions in Bubbly are optional and requested only when you enable or use the corresponding feature. You can revoke any permission anytime in your device Settings or inside Bubbly Settings:",
        ],
        bullets: [
            "Camera: Capture photos/videos for chats and stories, scan QR codes, and join video calls.",
            "Microphone: Record voice messages and speak during voice or video calls.",
            "Photos & Media Library: Select images, videos, and custom avatars from your gallery, or save shared media.",
            "Contacts: Optionally match phonebook contacts so you can discover friends already on Bubbly.",
            "Notifications: Deliver real-time alerts for incoming messages, calls, and story updates.",
            "Phone State & Audio Settings: Manage audio routing (speakerphone, earpiece, Bluetooth) and handle call states cleanly during active voice or video calls.",
        ],
    },
    {
        title: "Automatically Collected Diagnostics",
        paragraphs: [
            "To keep Bubbly reliable and fix crashes quickly, we collect limited technical diagnostics:",
        ],
        bullets: [
            "Device model, operating system name/version, and Bubbly app version.",
            "Crash stack traces and unhandled error telemetry (via Sentry and our diagnostic API) to diagnose bugs.",
            "Push notification tokens so alerts reach your device.",
        ],
    },
    {
        title: "Third-Party Services We Rely On",
        paragraphs: [
            "Bubbly does not sell or rent your personal data to advertisers or data brokers. We share only the minimum data required with trusted infrastructure providers that power app features:",
        ],
        bullets: [
            "MongoDB & Backend Hosting: Stores user profiles, conversations, messages, and call logs.",
            "Socket.IO: Delivers real-time chat messages, typing indicators, and call signaling.",
            "Cloudinary: Hosts profile avatars, shared chat media, stories, and bug report screenshots.",
            "Agora RTC: Powers real-time voice and video calling sessions.",
            "Google OAuth & Expo Notifications: Handles optional Google Sign-In and push notification delivery.",
            "Sentry: Captures crash diagnostics and app performance error reports.",
        ],
    },
    {
        title: "Data Retention & Account Deletion",
        paragraphs: [
            "We retain your account and message history while your account remains active. You have full control over your data:",
        ],
        bullets: [
            "You can sign out, clear local storage cache, or update your profile details directly inside the app.",
            "You can request permanent deletion of your account and associated personal data via Settings → Delete Account or by emailing " + SUPPORT_EMAIL + ".",
            "Upon verified deletion request, your account profile and personal records are permanently removed from active systems within a reasonable operational window.",
        ],
    },
    {
        title: "Children's Privacy",
        paragraphs: [
            "Bubbly is not intended for children under the age of 13 (or the minimum digital consent age in your jurisdiction). We do not knowingly collect personal information from children under 13. If you believe a child has provided personal data, please contact us so we can delete it promptly.",
        ],
    },
    {
        title: "Policy Updates",
        paragraphs: [
            "We may update this Privacy Policy as Bubbly evolves or as Google Play requirements change. When updates occur, the Effective date at the top of this page will be revised.",
        ],
    },
];

export default function PrivacyPolicyScreen() {
    return (
        <LegalDocumentView
            badgeLabel="GOOGLE PLAY PRIVACY"
            title="Privacy Policy"
            subtitle="Clear explanation of what data Bubbly collects, why we need it, and how you control it."
            lastUpdated="November 25, 2026"
            highlights={PRIVACY_HIGHLIGHTS}
            sections={PRIVACY_SECTIONS}
            relatedLink={{
                title: "View Security & Data Safety",
                subtitle: "Encryption, Secret Chat Vault, and Play Store safety practices",
                route: "/(legal)/security",
            }}
            contactSubject="Bubbly Privacy & Data Deletion Request"
            contactDescription="Contact the developer to ask privacy questions, request a copy of your data, or permanently delete your Bubbly account."
        />
    );
}
