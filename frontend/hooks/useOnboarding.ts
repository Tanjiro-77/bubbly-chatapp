/**
 * frontend/hooks/useOnboarding.ts
 *
 * Single source of truth for onboarding persistence.
 * Uses AsyncStorage — already present in the project.
 *
 * Key naming follows the project's existing conventions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_KEY = "bubbly_onboarding_completed";

/**
 * Returns true if the user has previously completed onboarding
 * AND successfully authenticated at least once.
 */
export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === "true";
    } catch {
        // If storage fails, default to false — show onboarding to be safe
        return false;
    }
};

/**
 * Permanently marks onboarding as completed.
 * Call this ONLY after successful authentication (sign in or register).
 * Never call this just because the user viewed the slides.
 */
export const markOnboardingCompleted = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
        // Non-fatal — user will see onboarding again next launch
        // but their auth state is unaffected
    }
};