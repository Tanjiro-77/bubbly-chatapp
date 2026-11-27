/**
 * frontend/utils/haptics.ts
 *
 * High-intensity, cross-platform tactile feedback helper using native Vibration patterns
 * with persistent strength calibration ("standard" | "strong" | "ultra" | "off").
 * Safely no-ops on Web and unsupported simulators.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Vibration } from "react-native";

export type HapticKind =
    | "light"
    | "medium"
    | "heavy"
    | "rigid"
    | "boom"
    | "success"
    | "warning"
    | "error"
    | "heartbeat"
    | "celebration";

export type HapticStrength = "standard" | "strong" | "ultra" | "off";

const HAPTIC_STRENGTH_KEY = "@bubbly_haptic_strength_v1";

let currentStrength: HapticStrength = "strong";
let initialized = false;

const STRENGTH_MULTIPLIER: Record<Exclude<HapticStrength, "off">, number> = {
    standard: 0.72,
    strong: 1.0,
    ultra: 1.45,
};

const BASE_PATTERNS: Record<HapticKind, number | number[]> = {
    light: 62,
    medium: 105,
    heavy: [0, 110, 28, 145],
    rigid: [0, 140, 24, 170],
    boom: [0, 185, 34, 225],
    success: [0, 88, 40, 150],
    warning: [0, 105, 42, 130, 42, 105],
    error: [0, 140, 38, 175, 38, 150],
    heartbeat: [0, 98, 62, 165, 140, 98, 62, 150],
    celebration: [0, 88, 34, 120, 34, 185],
};

function scalePattern(pattern: number | number[], mult: number): number | number[] {
    if (typeof pattern === "number") {
        return Math.min(450, Math.max(28, Math.round(pattern * mult)));
    }
    return pattern.map((ms, idx) => {
        if (idx === 0) return ms;
        if (idx % 2 === 1) {
            return Math.min(450, Math.max(32, Math.round(ms * mult)));
        }
        return Math.max(22, ms);
    });
}

export async function initHapticStrength(): Promise<HapticStrength> {
    if (initialized) return currentStrength;
    try {
        const stored = await AsyncStorage.getItem(HAPTIC_STRENGTH_KEY);
        if (
            stored === "standard" ||
            stored === "strong" ||
            stored === "ultra" ||
            stored === "off"
        ) {
            currentStrength = stored;
        }
    } catch {
        // Keep default "strong"
    } finally {
        initialized = true;
    }
    return currentStrength;
}

export function getHapticStrength(): HapticStrength {
    return currentStrength;
}

export async function setHapticStrength(strength: HapticStrength): Promise<void> {
    currentStrength = strength;
    initialized = true;
    try {
        await AsyncStorage.setItem(HAPTIC_STRENGTH_KEY, strength);
    } catch {
        // Ignore storage errors cleanly
    }
}

export function cancelHaptics(): void {
    if (Platform.OS === "web") return;
    try {
        Vibration.cancel();
    } catch {
        // Ignore on unsupported devices
    }
}

export function hapticTap(kind: HapticKind = "medium"): void {
    if (Platform.OS === "web") return;
    if (currentStrength === "off") return;
    try {
        const mult = STRENGTH_MULTIPLIER[currentStrength];
        const base = BASE_PATTERNS[kind] ?? BASE_PATTERNS.medium;
        const scaled = scalePattern(base, mult);
        Vibration.vibrate(scaled);
    } catch {
        // Ignore on unsupported simulators or restricted devices
    }
}
