# Bubbly Mobile — Frontend 💛

**v4.1.5** · React Native · Expo SDK 57 · TypeScript

The cross-platform Android & iOS mobile client for the Bubbly messaging app. Built with Expo Router (file-based routing), Reanimated 3, Socket.IO, and a two-tier caching architecture for near-instant rendering.

---

## Quick Start

```bash
npm install
# create .env (see root README for env vars)
npx expo start
# Press 'a' for Android · 'i' for iOS
```

## TypeScript Check

```bash
npx tsc --noEmit
# Expected: 0 errors
```

## EAS Build

```bash
# Android APK (sideload)
eas build --platform android --profile production-apk

# Android AAB (Play Store)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

---

## v4.1.5 Highlights

| Area | Change |
|---|---|
| **Two-tier cache** | `utils/chatCache.ts` — in-memory + AsyncStorage for conversations, messages, contacts, stories |
| **Optimistic messaging** | Text & GIF bubbles appear instantly; `messageAck` confirms or rolls back |
| **GIF support** | `GifPickerModal.tsx` — browse, search, send animated GIFs |
| **Invite system** | `InviteSheetModal.tsx` — SMS / WhatsApp / Share / copy, 3 tone presets, personal link |
| **Credential completion** | `ContactCompletionModal.tsx` + adaptive `completeProfile.tsx` — per-user phone/email prompt |
| **No session expiry** | JWT tokens persist indefinitely; no forced re-login |
| **UI polish** | Reanimated spring on Button, focus glow on Input, `React.memo` everywhere |
| **Socket reconnect** | 450 ms → 3 000 ms back-off, 3 500 ms connect timeout |

---

## Key Directories

```
app/           Expo Router screens ((auth)/ and (main)/)
components/    Shared UI components
contexts/      Auth context (JWT, routing, session management)
hooks/         Custom React hooks
services/      contactService, notificationService
socket/        Socket.IO client setup
utils/         chatCache, featureStorage, haptics, styling
assets/        Images, audio, fonts
```

---

For full documentation see the [root README](../README.md).
