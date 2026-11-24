// Web Configuration matching Mobile
export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://chat-backend-production-31c8.up.railway.app";

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dafb37rpe";

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "images_1";

export const AGORA_APP_ID =
  import.meta.env.VITE_AGORA_APP_ID || "ff4f2dea21944c55b1512724e18448aa";

export const THEME_COLORS = {
  primary: "#f59e0b",
  primaryLight: "#fef3c7",
  primaryDark: "#d97706",
  accent: "#facc15",
  accentLight: "#fef9c3",
  text: "#292524",
  textMuted: "#78716c",
  myBubble: "#FFF2C6",
  otherBubble: "#FFFFFF",
};
