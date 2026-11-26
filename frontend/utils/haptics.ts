/**
 * frontend/utils/haptics.ts
 *
 * Lightweight, cross-platform tactile feedback helper using native Vibration patterns
 * without extra native module dependencies. Safely no-ops on Web.
 */

import { Platform, Vibration } from "react-native";

export type HapticKind = "light" | "medium" | "success" | "warning" | "error";

export function hapticTap(kind: HapticKind = "light"): void {
    if (Platform.OS === "web") return;
    try {
        switch (kind) {
            case "light":
                Vibration.vibrate(14);
                break;
            case "medium":
                Vibration.vibrate(28);
                break;
            case "success":
                Vibration.vibrate([0, 22, 45, 28]);
                break;
            case "warning":
                Vibration.vibrate([0, 30, 50, 30]);
                break;
            case "error":
                Vibration.vibrate([0, 45, 45, 55]);
                break;
        }
    } catch {
        // Ignore on unsupported simulators or restricted devices
    }
}
