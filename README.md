# Bubbly v3.0.0 – Major Performance, Permissions & Cross-Platform Update

A major release of Bubbly introducing a redesigned first-launch permission onboarding experience, enhanced messaging features, improved voice recording and calling, performance optimizations, and expanded Android/iOS build configuration.

## ✨ What's New

### 1. First-Launch Permission Onboarding
- Interactive, multi-step onboarding experience.
- Native permission requests for Camera, Microphone, Photos & Media, and Notifications.
- One-tap **Enable All Permissions** option.
- **Skip for Now** option so optional permissions never block app access.
- Fixed onboarding completion persistence across app restarts and logins.

### 2. Permission Management in Settings
- Dedicated App Permissions section.
- Live OS permission status indicators.
- Direct navigation to device settings for permanently denied permissions.
- Automatic permission status refresh when returning to Bubbly.

### 3. Messaging & Chat Enhancements
- One-tap Spanish message translation with original/translated text switching.
- Floating scroll-to-bottom button with unread message count.
- Real-time network and socket disconnection banner.
- Swipe-to-reply gestures with haptic feedback.
- Shared group Media, Documents, and Links gallery.

### 4. Voice Recording & Calling Improvements
- One-tap voice recording discard action.
- Improved temporary audio file cleanup.
- Automatic audio player resource cleanup.
- Fixed incoming call vibration timer memory leak.

### 5. UI/UX & Performance Optimizations
- Optimized message rendering with React.memo.
- Memoized conversation list items.
- Real-time online status indicators.
- Improved FlatList virtualization and rendering configuration.
- Reduced unnecessary component re-renders and improved memory management.

### 6. Android & iOS Compatibility Improvements
- Improved keyboard handling across platforms.
- Android hardware Back button support for open modals and overlays.
- Configured native permission descriptions.
- Added `bubbly://` deep-link support.
- Updated Android and iOS application build configuration.

### 7. EAS Build Configuration
- Android production AAB profile.
- Dedicated Android APK profile for direct installation.
- iOS production and simulator build profiles.
- Improved Expo Application Services release configuration.

## ⚡ Overall Improvements
- Smoother chat experience.
- Better permission handling.
- Improved audio resource management.
- More efficient list rendering.
- Better connection feedback.
- Improved cross-platform readiness.

## 📦 Installation
1. Download the latest Android APK from the Assets section.
2. Open the APK on your Android device.
3. Allow installation from the relevant source if prompted.
4. Install and enjoy Bubbly!

**Note:** This release includes an Android APK for direct installation. iOS build configuration is provided separately; iOS device distribution is not included in this release.

---

**Bubbly v3.0.0 — Connect. Chat. Share.** 💛