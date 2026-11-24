# Bubbly Web 💛

### Connect Beyond Messages — Web Edition

A full-stack, real-time messaging web application mirroring all features of the Bubbly mobile app. Built with React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, and Socket.IO.

---

## ✨ Features & Parity with Mobile App

| Category | Features |
|---|---|
| **Authentication & Profile** | Welcome screen, Email/Password login, User registration with avatar upload (Cloudinary), persistent JWT session, live profile editing, logout. |
| **Real-time Messaging** | 2-way real-time communication linked to mobile app, Direct (1-to-1) and Group chats, unread counter badges, sent/delivered/read receipts, typing indicators. |
| **Rich Message Types** | Text with formatted URLs, Photos with full-screen lightbox zoom, Videos with playback, Voice notes with waveform player and speed toggles (1x/1.5x/2x), Document attachments with file size formatting, Location sharing, Interactive Polls with live voting, Call history logs, System events. |
| **Interactive Messaging** | Reply-to-message preview banner, Emoji reactions with live counts, Message editing, Message deletion (for everyone), Message forwarding, Star/Bookmark messages, Pinned messages banner, View Once media (auto-expiring), Inline translation via Google/Backend `/api/translate`. |
| **Voice & Video Calling** | WebRTC voice and video calls linked with mobile, live incoming call modal with audio ringtone chime, active call screen with timer, mute microphone, camera toggle, call logs. |
| **Stories & Story Studio** | Horizontal Story Bar with glowing honey amber rings, Story Viewer with 5-second auto-progression, tap navigation, pause on hold, quick emoji reactions, story reply direct message, text story studio with color backgrounds, media story studio with upload and captions. |
| **Secret Chat Vault** | 4-digit PIN security lock matching mobile `vault.tsx`, hidden secret conversations list, numeric keypad, lock/unlock chat controls. |
| **Group Management** | Create groups, multi-participant selection, group avatar upload, promote/demote group admins, remove member, leave group, mute notifications. |
| **Shared Content Gallery** | Dedicated gallery drawer with Media (photos/videos), Docs (files with sizes), and Links tabs. |
| **UI / UX Experience** | Honey amber signature aesthetic, glassmorphism backdrop blur, dark/light theme toggle, Web Audio API synthesized chimes for sends, receives, and ringtones. |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
# or
bun install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## 🌐 Connected Ecosystem

- **Backend**: `backend/` (Node.js, Express, MongoDB, Socket.IO, Agora Token Service)
- **Mobile App**: `frontend/` (React Native, Expo Router, Agora RTC)
- **Web App**: `web/` (React 19, Vite, Tailwind CSS, WebRTC / Agora)
- **Website**: `website/` (TanStack Start release showcase landing page)
