# Bubbly Web 💛

### Connect Beyond Messages — Web Edition

**v4.1.5** · React 19 · TypeScript · Vite · Tailwind CSS · Socket.IO

A full-stack, real-time messaging web application mirroring all features of the Bubbly mobile app.

---

## ✨ Features & Mobile Parity

| Category | Features |
|---|---|
| **Authentication & Profile** | Welcome screen, email/password login, registration with avatar upload (Cloudinary), persistent JWT session (no forced re-login), live profile editing, logout. |
| **Real-time Messaging** | 2-way real-time comms linked to mobile app, direct (1-to-1) and group chats, unread counter badges, sent/delivered/read receipts, typing indicators. |
| **Rich Message Types** | Text with formatted URLs, photos with full-screen lightbox zoom, videos with playback, voice notes with waveform player and speed toggles (1×/1.5×/2×), document attachments, location sharing, interactive polls, call history logs, system events. |
| **GIF Support** | Browse, search, and send animated GIFs; optimistic preview in the bubble. |
| **Interactive Messaging** | Reply-to-message preview, emoji reactions with live counts, message editing, deletion (for everyone), forwarding, star/bookmark, pinned messages, view-once media, inline translation. |
| **Voice & Video Calls** | WebRTC voice and video calls linked with mobile, incoming call modal with audio ringtone, active call screen with timer, mute/camera toggle, call logs. |
| **Stories & Story Studio** | Horizontal story bar with amber glow rings, story viewer with 5-second auto-progression, tap navigation, pause on hold, quick emoji reactions, text story studio, media story studio. |
| **Secret Chat Vault** | 4-digit PIN lock, hidden secret conversations list, numeric keypad, lock/unlock controls. |
| **Group Management** | Create groups, multi-participant selection, group avatar upload, promote/demote admins, remove member, leave group, mute notifications. |
| **Shared Content Gallery** | Media / Docs / Links tabs. |
| **UI / UX** | Honey amber aesthetic, glassmorphism backdrop blur, dark/light theme toggle, Web Audio API chimes. |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 🌐 Connected Ecosystem

| Part | Description |
|---|---|
| **Backend** | `backend/` — Node.js, Express 5, MongoDB, Socket.IO, Agora Token Service |
| **Mobile App** | `frontend/` — React Native, Expo SDK 57, Expo Router, Agora RTC |
| **Web App** | `web/` — React 19, Vite, Tailwind CSS, WebRTC / Agora |
| **Website** | `website/` — TanStack Start feature-showcase landing page |

---

For full documentation see the [root README](../README.md).
