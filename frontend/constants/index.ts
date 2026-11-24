export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://chat-backend-production-31c8.up.railway.app";

export const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "dafb37rpe";

export const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "images_1";

export const AGORA_APP_ID =
  process.env.EXPO_PUBLIC_AGORA_APP_ID || "ff4f2dea21944c55b1512724e18448aa";

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

export const SENTRY_DSN =
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  "https://f3e0f31bc94b594d4bb12368775c2d51@o4510986619584512.ingest.us.sentry.io/4512487548518400";
