import { scale, verticalScale } from "../utils/styling";

export const colors = {
    // ── V3 Honey Amber Identity ──
    primary: "#f59e0b",
    primaryLight: "#fef3c7",
    primaryDark: "#d97706",
    accent: "#facc15",
    accentLight: "#fef9c3",

    text: "#292524",
    textMuted: "#78716c",

    white: "#fff",
    black: "#000",
    rose: "#ef4444",
    green: "#22c55e",
    emerald: "#10b981",
    sky: "#0284c7",
    indigo: "#6366f1",
    purple: "#a855f7",

    // ── V3 Chat Bubbles ──
    otherBubble: "#FFFFFF",
    myBubble: "#FFF2C6",

    // ── V3 Neutrals ──
    neutral50: "#fafaf9",
    neutral100: "#f5f5f4",
    neutral200: "#e7e5e4",
    neutral300: "#d6d3d1",
    neutral350: "#CCCCCC",
    neutral400: "#a8a29e",
    neutral500: "#78716c",
    neutral600: "#57534e",
    neutral700: "#44403c",
    neutral800: "#292524",
    neutral900: "#1c1917",

    // ── Glassmorphism & Surface Tokens ──
    cardBorder: "rgba(0, 0, 0, 0.06)",
    cardBorderSubtle: "rgba(0, 0, 0, 0.04)",
    cardBg: "#FFFFFF",
    glassBg: "rgba(255, 255, 255, 0.92)",
    glassDarkBg: "rgba(28, 25, 23, 0.85)",
    glassBorder: "rgba(255, 255, 255, 0.25)",
};

export const gradients = {
    primary: ["#f59e0b", "#d97706"] as const,
    amberGlow: ["#fde68a", "#f59e0b"] as const,
    darkHero: ["#1c1917", "#0c0a09"] as const,
    glassCard: ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"] as const,
    unreadBadge: ["#f59e0b", "#ea580c"] as const,
};

export const spacingX = {
    _2: scale(2),
    _3: scale(3),
    _4: scale(4),
    _5: scale(5),
    _6: scale(6),
    _7: scale(7),
    _8: scale(8),
    _9: scale(9),
    _10: scale(10),
    _11: scale(11),
    _12: scale(12),
    _15: scale(15),
    _20: scale(20),
    _25: scale(25),
    _30: scale(30),
    _35: scale(35),
    _40: scale(40),
};

export const spacingY = {
    _2: verticalScale(2),
    _3: verticalScale(3),
    _4: verticalScale(4),
    _5: verticalScale(5),
    _6: verticalScale(6),
    _7: verticalScale(7),
    _8: verticalScale(8),
    _9: verticalScale(9),
    _10: verticalScale(10),
    _11: verticalScale(11),
    _12: verticalScale(12),
    _15: verticalScale(15),
    _17: verticalScale(17),
    _18: verticalScale(18),
    _20: verticalScale(20),
    _25: verticalScale(25),
    _30: verticalScale(30),
    _35: verticalScale(35),
    _40: verticalScale(40),
    _50: verticalScale(50),
    _60: verticalScale(60),
};

export const radius = {
    _3: verticalScale(3),
    _4: verticalScale(4),
    _5: verticalScale(5),
    _6: verticalScale(6),
    _8: verticalScale(8),
    _10: verticalScale(10),
    _12: verticalScale(12),
    _15: verticalScale(15),
    _17: verticalScale(17),
    _18: verticalScale(18),
    _20: verticalScale(20),
    _24: verticalScale(24),
    _30: verticalScale(30),
    _35: verticalScale(35),
    _40: verticalScale(40),
    _50: verticalScale(50),
    _60: verticalScale(60),
    _70: verticalScale(70),
    _80: verticalScale(80),
    _90: verticalScale(90),
    full: 200,
};
