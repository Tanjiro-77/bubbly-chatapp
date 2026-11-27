/**
 * frontend/services/preferencesService.ts
 *
 * Canonical durable local + cloud preferences manager for Bubbly.
 * Writes both existing per-feature AsyncStorage keys and a consolidated JSON bundle
 * (plus MongoDB synchronization) so user settings never reset on app restart.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";
import { HapticStrength, initHapticStrength, setHapticStrength } from "../utils/haptics";
import {
    DEFAULT_RINGTONE_ID,
    IncomingRingtoneId,
    initIncomingRingtone,
    isValidRingtoneId,
    setIncomingRingtoneId,
} from "./soundService";
import {
    ChatAppearanceConfig,
    DEFAULT_APPEARANCE,
    DEFAULT_FAVORITE_REACTIONS,
    DEFAULT_PRIVACY_SHIELD,
    DEFAULT_QUIET_HOURS,
    getChatAppearance,
    getFavoriteReactions,
    getPrivacyShield,
    getQuietHours,
    notifyFeatureListeners,
    PrivacyShieldConfig,
    QuietHoursConfig,
    saveChatAppearance,
    saveFavoriteReactions,
    savePrivacyShield,
    saveQuietHours,
} from "../utils/featureStorage";

export const NOTIF_PREF_KEY = "bubbly_notifications_enabled";
export const SOUND_PREF_KEY = "bubbly_sound_enabled";
export const APP_LOCK_PREF_KEY = "bubbly_app_lock_enabled";
export const PRIVACY_PREFS_KEY = "@bubbly_privacy_prefs_v1";
export const STORAGE_PREFS_KEY = "@bubbly_storage_prefs";
const GLOBAL_BUNDLE_KEY = "@bubbly_settings_bundle_global_v1";
const userBundleKey = (userId: string) => `@bubbly_settings_bundle_user_${userId}`;

export type LastSeenOption = "everyone" | "contacts" | "nobody";
export type StoryPrivacyOption = "everyone" | "contacts" | "except";

export interface PrivacyPrefsConfig {
    lastSeen: LastSeenOption;
    readReceipts: boolean;
    typingIndicators: boolean;
    storyPrivacy: StoryPrivacyOption;
}

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefsConfig = {
    lastSeen: "everyone",
    readReceipts: true,
    typingIndicators: true,
    storyPrivacy: "everyone",
};

export interface UserPreferencesBundle {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    appLockEnabled: boolean;
    callRingtone: IncomingRingtoneId;
    hapticStrength: HapticStrength;
    appearance: ChatAppearanceConfig;
    privacyShield: PrivacyShieldConfig;
    quietHours: QuietHoursConfig;
    favoriteReactions: string[];
    privacy: PrivacyPrefsConfig;
    storagePrefs?: Record<string, boolean>;
    updatedAt: number;
}

const DEFAULT_BUNDLE: UserPreferencesBundle = {
    notificationsEnabled: true,
    soundEnabled: true,
    appLockEnabled: false,
    callRingtone: DEFAULT_RINGTONE_ID,
    hapticStrength: "strong",
    appearance: { ...DEFAULT_APPEARANCE },
    privacyShield: { ...DEFAULT_PRIVACY_SHIELD },
    quietHours: { ...DEFAULT_QUIET_HOURS },
    favoriteReactions: [...DEFAULT_FAVORITE_REACTIONS],
    privacy: { ...DEFAULT_PRIVACY_PREFS },
    updatedAt: 0,
};

let memoryBundle: UserPreferencesBundle | null = null;
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function mergeBundle(base: UserPreferencesBundle, patch: Partial<UserPreferencesBundle>): UserPreferencesBundle {
    return {
        notificationsEnabled:
            typeof patch.notificationsEnabled === "boolean" ? patch.notificationsEnabled : base.notificationsEnabled,
        soundEnabled: typeof patch.soundEnabled === "boolean" ? patch.soundEnabled : base.soundEnabled,
        appLockEnabled: typeof patch.appLockEnabled === "boolean" ? patch.appLockEnabled : base.appLockEnabled,
        callRingtone: isValidRingtoneId(patch.callRingtone) ? patch.callRingtone : base.callRingtone,
        hapticStrength:
            patch.hapticStrength === "off" ||
            patch.hapticStrength === "standard" ||
            patch.hapticStrength === "strong" ||
            patch.hapticStrength === "ultra"
                ? patch.hapticStrength
                : base.hapticStrength,
        appearance: patch.appearance
            ? { ...base.appearance, ...patch.appearance }
            : base.appearance,
        privacyShield: patch.privacyShield
            ? { ...base.privacyShield, ...patch.privacyShield }
            : base.privacyShield,
        quietHours: patch.quietHours
            ? { ...base.quietHours, ...patch.quietHours }
            : base.quietHours,
        favoriteReactions:
            Array.isArray(patch.favoriteReactions) && patch.favoriteReactions.length === 6
                ? patch.favoriteReactions
                : base.favoriteReactions,
        privacy: patch.privacy ? { ...base.privacy, ...patch.privacy } : base.privacy,
        storagePrefs: patch.storagePrefs
            ? { ...(base.storagePrefs || {}), ...patch.storagePrefs }
            : base.storagePrefs,
        updatedAt: typeof patch.updatedAt === "number" ? patch.updatedAt : base.updatedAt,
    };
}

export async function loadEffectivePreferences(userId?: string | null): Promise<UserPreferencesBundle> {
    const settled = await Promise.allSettled([
        AsyncStorage.getItem(GLOBAL_BUNDLE_KEY),
        userId ? AsyncStorage.getItem(userBundleKey(userId)) : Promise.resolve(null),
        AsyncStorage.getItem(NOTIF_PREF_KEY),
        AsyncStorage.getItem(SOUND_PREF_KEY),
        AsyncStorage.getItem(APP_LOCK_PREF_KEY),
        initHapticStrength(true),
        initIncomingRingtone(),
        getChatAppearance(),
        getPrivacyShield(),
        getQuietHours(),
        getFavoriteReactions(),
        AsyncStorage.getItem(PRIVACY_PREFS_KEY),
        AsyncStorage.getItem(STORAGE_PREFS_KEY),
    ]);

    const val = <T,>(idx: number, fallback: T): T => {
        const res = settled[idx];
        return res && res.status === "fulfilled" ? (res.value as T) : fallback;
    };

    const globalRaw = val<string | null>(0, null);
    const userRaw = val<string | null>(1, null);
    const globalParsed = safeParseJson<Partial<UserPreferencesBundle>>(globalRaw, {});
    const userParsed = safeParseJson<Partial<UserPreferencesBundle>>(userRaw, {});

    // Pick whichever durable bundle was written most recently
    let resolved = mergeBundle(DEFAULT_BUNDLE, globalParsed);
    if ((userParsed.updatedAt || 0) >= (globalParsed.updatedAt || 0)) {
        resolved = mergeBundle(resolved, userParsed);
    } else {
        resolved = mergeBundle(mergeBundle(DEFAULT_BUNDLE, userParsed), globalParsed);
    }

    const notifRaw = val<string | null>(2, null);
    const soundRaw = val<string | null>(3, null);
    const lockRaw = val<string | null>(4, null);
    const hap = val<HapticStrength>(5, resolved.hapticStrength);
    const tone = val<IncomingRingtoneId>(6, resolved.callRingtone);
    const appCfg = val<ChatAppearanceConfig>(7, resolved.appearance);
    const shieldCfg = val<PrivacyShieldConfig>(8, resolved.privacyShield);
    const qhCfg = val<QuietHoursConfig>(9, resolved.quietHours);
    const favReacts = val<string[]>(10, resolved.favoriteReactions);
    const privRaw = val<string | null>(11, null);
    const storRaw = val<string | null>(12, null);

    if (notifRaw === "true" || notifRaw === "false") {
        resolved.notificationsEnabled = notifRaw === "true";
    }
    if (soundRaw === "true" || soundRaw === "false") {
        resolved.soundEnabled = soundRaw === "true";
    }
    if (lockRaw === "true" || lockRaw === "false") {
        resolved.appLockEnabled = lockRaw === "true";
    }
    resolved.hapticStrength = hap;
    resolved.callRingtone = tone;
    resolved.appearance = appCfg;
    resolved.privacyShield = shieldCfg;
    resolved.quietHours = qhCfg;
    if (Array.isArray(favReacts) && favReacts.length === 6) {
        resolved.favoriteReactions = favReacts;
    }
    if (privRaw) {
        resolved.privacy = { ...resolved.privacy, ...safeParseJson<Partial<PrivacyPrefsConfig>>(privRaw, {}) };
    }
    if (storRaw) {
        resolved.storagePrefs = safeParseJson<Record<string, boolean> | undefined>(storRaw, undefined);
    }

    memoryBundle = resolved;
    return resolved;
}

async function applyBundleToLocalKeys(bundle: UserPreferencesBundle, userId?: string | null): Promise<void> {
    memoryBundle = bundle;
    const bundleJson = JSON.stringify(bundle);
    const tasks: Promise<any>[] = [
        AsyncStorage.setItem(NOTIF_PREF_KEY, String(bundle.notificationsEnabled)),
        AsyncStorage.setItem(SOUND_PREF_KEY, String(bundle.soundEnabled)),
        AsyncStorage.setItem(APP_LOCK_PREF_KEY, String(bundle.appLockEnabled)),
        AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(bundle.privacy)),
        AsyncStorage.setItem(GLOBAL_BUNDLE_KEY, bundleJson),
        setHapticStrength(bundle.hapticStrength),
        saveChatAppearance(bundle.appearance),
        savePrivacyShield(bundle.privacyShield),
        saveQuietHours(bundle.quietHours),
        saveFavoriteReactions(bundle.favoriteReactions),
        AsyncStorage.setItem("@bubbly_incoming_ringtone_v1", bundle.callRingtone),
    ];
    if (bundle.storagePrefs) {
        tasks.push(AsyncStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(bundle.storagePrefs)));
    }
    if (userId) {
        tasks.push(AsyncStorage.setItem(userBundleKey(userId), bundleJson));
    }
    await Promise.allSettled(tasks);
    await initIncomingRingtone();
    notifyFeatureListeners();
}

async function pushPreferencesToServer(bundle: UserPreferencesBundle, authToken?: string | null): Promise<void> {
    const jwt = authToken || (await AsyncStorage.getItem("token").catch(() => null));
    if (!jwt) return;

    for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(`${API_URL}/api/preferences`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify(bundle),
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (res.ok || (res.status >= 400 && res.status < 500)) {
                return;
            }
        } catch {
            clearTimeout(timer);
        }
        if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 800));
        }
    }
}

export async function persistPreferencesPatch(
    patch: Partial<UserPreferencesBundle>,
    options?: { userId?: string | null; authToken?: string | null; syncToCloud?: boolean }
): Promise<UserPreferencesBundle> {
    const userId = options?.userId;
    const base = memoryBundle || (await loadEffectivePreferences(userId));
    const next = mergeBundle(base, {
        ...patch,
        updatedAt: Date.now(),
    });

    const writeTasks: Promise<any>[] = [];
    if (patch.notificationsEnabled !== undefined) {
        writeTasks.push(AsyncStorage.setItem(NOTIF_PREF_KEY, String(next.notificationsEnabled)));
    }
    if (patch.soundEnabled !== undefined) {
        writeTasks.push(AsyncStorage.setItem(SOUND_PREF_KEY, String(next.soundEnabled)));
    }
    if (patch.appLockEnabled !== undefined) {
        writeTasks.push(AsyncStorage.setItem(APP_LOCK_PREF_KEY, String(next.appLockEnabled)));
    }
    if (patch.hapticStrength !== undefined) {
        writeTasks.push(setHapticStrength(next.hapticStrength));
    }
    if (patch.callRingtone !== undefined) {
        writeTasks.push(setIncomingRingtoneId(next.callRingtone, options?.authToken));
    }
    if (patch.appearance !== undefined) {
        writeTasks.push(saveChatAppearance(next.appearance));
    }
    if (patch.privacyShield !== undefined) {
        writeTasks.push(savePrivacyShield(next.privacyShield));
    }
    if (patch.quietHours !== undefined) {
        writeTasks.push(saveQuietHours(next.quietHours));
    }
    if (patch.favoriteReactions !== undefined) {
        writeTasks.push(saveFavoriteReactions(next.favoriteReactions));
    }
    if (patch.privacy !== undefined) {
        writeTasks.push(AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(next.privacy)));
    }
    if (patch.storagePrefs !== undefined) {
        writeTasks.push(AsyncStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(next.storagePrefs)));
    }

    memoryBundle = next;
    const serialized = JSON.stringify(next);
    writeTasks.push(AsyncStorage.setItem(GLOBAL_BUNDLE_KEY, serialized));
    if (userId) {
        writeTasks.push(AsyncStorage.setItem(userBundleKey(userId), serialized));
    }

    await Promise.allSettled(writeTasks);
    notifyFeatureListeners();

    if (options?.syncToCloud !== false) {
        if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
        cloudSyncTimer = setTimeout(() => {
            pushPreferencesToServer(next, options?.authToken).catch(() => {});
        }, 220);
    }

    return next;
}

/**
 * Hydrates local modules immediately on app start and reconciles with cloud settings when signed in.
 */
export async function bootstrapAndSyncPreferences(
    authToken?: string | null,
    userId?: string | null
): Promise<UserPreferencesBundle> {
    const localBundle = await loadEffectivePreferences(userId);
    const jwt = authToken || (await AsyncStorage.getItem("token").catch(() => null));
    if (!jwt) return localBundle;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`${API_URL}/api/preferences`, {
            method: "GET",
            headers: { Authorization: `Bearer ${jwt}` },
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return localBundle;
        const json = await res.json().catch(() => null);
        const cloud = json?.data as Partial<UserPreferencesBundle> | undefined;
        if (!cloud || typeof cloud !== "object") return localBundle;

        const cloudUpdated = typeof cloud.updatedAt === "number" ? cloud.updatedAt : 0;
        const localUpdated = typeof localBundle.updatedAt === "number" ? localBundle.updatedAt : 0;

        if (localUpdated === 0 && cloudUpdated > 0) {
            const restored = mergeBundle(DEFAULT_BUNDLE, cloud);
            await applyBundleToLocalKeys(restored, userId);
            return restored;
        }
        if (cloudUpdated > localUpdated) {
            const synced = mergeBundle(localBundle, cloud);
            await applyBundleToLocalKeys(synced, userId);
            return synced;
        }
        if (localUpdated > cloudUpdated) {
            pushPreferencesToServer(localBundle, jwt).catch(() => {});
        }
    } catch {
        clearTimeout(timer);
    }
    return localBundle;
}
