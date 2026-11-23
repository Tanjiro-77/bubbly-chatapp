/**
 * frontend/hooks/useOnboarding.ts
 *
 * Single source of truth for onboarding persistence.
 * Uses AsyncStorage with safe fallback handling.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_KEY = "bubbly_onboarding_completed";

/**
 * Returns true if the user has previously completed or skipped onboarding.
 */
export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === "true";
    } catch {
        return false;
    }
};

/**
 * Permanently marks onboarding as completed in AsyncStorage.
 */
export const markOnboardingCompleted = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (e) {
        console.warn("Failed to persist onboarding completion:", e);
    }
};

/**
 * Resets onboarding status (e.g. for testing or replay)
 */
export const resetOnboarding = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (_) { }
};
