/**
 * frontend/utils/haptics.ts
 *
 * High-intensity, cross-platform tactile feedback helper using native Vibration patterns
 * without extra native module dependencies. Safely no-ops on Web.
 */

import { Platform, Vibration } from "react-native";

export type HapticKind =
    | "light"
    | "medium"
    | "heavy"
    | "success"
    | "warning"
    | "error"
    | "heartbeat";

export function hapticTap(kind: HapticKind = "medium"): void {
    if (Platform.OS === "web") return;
    try {
        switch (kind) {
            case "light":
                Vibration.vibrate(32);
                break;
            case "medium":
                Vibration.vibrate(55);
                break;
            case "heavy":
                Vibration.vibrate(85);
                break;
            case "success":
                Vibration.vibrate([0, 48, 55, 72]);
                break;
            case "warning":
                Vibration.vibrate([0, 60, 50, 70]);
                break;
            case "error":
                Vibration.vibrate([0, 82, 45, 95, 45, 75]);
                break;
            case "heartbeat":
                Vibration.vibrate([0, 60, 75, 90]);
                break;
        }
    } catch {
        // Ignore on unsupported simulators or restricted devices
    }
}
