import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../modals/User";
import { isValidCallRingtone } from "../services/pushNotificationService";

const ALLOWED_HAPTICS = new Set(["off", "standard", "strong", "ultra"]);
const ALLOWED_BUBBLE_STYLES = new Set(["rounded", "sharp", "minimal"]);
const ALLOWED_FONT_SCALES = new Set(["compact", "standard", "large"]);
const ALLOWED_LAST_SEEN = new Set(["everyone", "contacts", "nobody"]);
const ALLOWED_STORY_PRIVACY = new Set(["everyone", "contacts", "except"]);

function sanitizePreferencesPayload(userDoc: any) {
    const stored = (userDoc?.appPreferences && typeof userDoc.appPreferences === "object")
        ? userDoc.appPreferences
        : {};
    const serverTheme = userDoc?.theme || {};
    const serverPrivacy = userDoc?.privacy || {};

    return {
        notificationsEnabled:
            typeof userDoc?.notificationsEnabled === "boolean"
                ? userDoc.notificationsEnabled
                : typeof stored.notificationsEnabled === "boolean"
                ? stored.notificationsEnabled
                : true,
        soundEnabled: typeof stored.soundEnabled === "boolean" ? stored.soundEnabled : true,
        appLockEnabled: typeof stored.appLockEnabled === "boolean" ? stored.appLockEnabled : false,
        callRingtone: isValidCallRingtone(userDoc?.callRingtone)
            ? userDoc.callRingtone
            : isValidCallRingtone(stored.callRingtone)
            ? stored.callRingtone
            : "incoming_call",
        hapticStrength: ALLOWED_HAPTICS.has(stored.hapticStrength) ? stored.hapticStrength : "strong",
        appearance: {
            bubbleStyle: ALLOWED_BUBBLE_STYLES.has(stored.appearance?.bubbleStyle)
                ? stored.appearance.bubbleStyle
                : ALLOWED_BUBBLE_STYLES.has(serverTheme.bubbleStyle)
                ? serverTheme.bubbleStyle
                : "rounded",
            fontScale: ALLOWED_FONT_SCALES.has(stored.appearance?.fontScale)
                ? stored.appearance.fontScale
                : "standard",
            accentColor:
                typeof stored.appearance?.accentColor === "string" && /^#[0-9a-f]{3,8}$/i.test(stored.appearance.accentColor)
                    ? stored.appearance.accentColor
                    : typeof serverTheme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(serverTheme.accent) && serverTheme.accent !== "#facc15"
                    ? serverTheme.accent
                    : "#f59e0b",
        },
        privacyShield: {
            hideNotificationPreview: Boolean(stored.privacyShield?.hideNotificationPreview),
            autoLockDelayMs: [0, 60000, 300000].includes(stored.privacyShield?.autoLockDelayMs)
                ? stored.privacyShield.autoLockDelayMs
                : 0,
        },
        quietHours: {
            enabled: Boolean(stored.quietHours?.enabled),
            startHour:
                typeof stored.quietHours?.startHour === "number" && stored.quietHours.startHour >= 0 && stored.quietHours.startHour <= 23
                    ? stored.quietHours.startHour
                    : 22,
            endHour:
                typeof stored.quietHours?.endHour === "number" && stored.quietHours.endHour >= 0 && stored.quietHours.endHour <= 23
                    ? stored.quietHours.endHour
                    : 7,
        },
        favoriteReactions: Array.isArray(stored.favoriteReactions) && stored.favoriteReactions.length === 6
            ? stored.favoriteReactions
            : ["❤️", "😂", "🔥", "👍", "😍", "🙏"],
        privacy: {
            lastSeen: ALLOWED_LAST_SEEN.has(serverPrivacy.lastSeen)
                ? serverPrivacy.lastSeen
                : ALLOWED_LAST_SEEN.has(stored.privacy?.lastSeen)
                ? stored.privacy.lastSeen
                : "everyone",
            readReceipts:
                typeof serverPrivacy.readReceipts === "boolean"
                    ? serverPrivacy.readReceipts
                    : typeof stored.privacy?.readReceipts === "boolean"
                    ? stored.privacy.readReceipts
                    : true,
            typingIndicators:
                typeof serverPrivacy.typingIndicators === "boolean"
                    ? serverPrivacy.typingIndicators
                    : typeof stored.privacy?.typingIndicators === "boolean"
                    ? stored.privacy.typingIndicators
                    : true,
            storyPrivacy: ALLOWED_STORY_PRIVACY.has(serverPrivacy.storyPrivacy)
                ? serverPrivacy.storyPrivacy
                : "everyone",
        },
        storagePrefs: stored.storagePrefs && typeof stored.storagePrefs === "object" ? stored.storagePrefs : undefined,
        updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : 0,
    };
}

/**
 * Fetch consolidated user preferences so restarts & new logins restore saved settings.
 * GET /api/preferences
 */
export async function getUserPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        const userDoc = await User.findById(userId)
            .select("notificationsEnabled callRingtone theme privacy appPreferences")
            .lean();

        if (!userDoc) {
            res.status(404).json({ success: false, msg: "User not found" });
            return;
        }

        res.json({
            success: true,
            data: sanitizePreferencesPayload(userDoc),
        });
    } catch (error) {
        console.error("getUserPreferences error:", error);
        res.status(500).json({ success: false, msg: "Failed to load preferences" });
    }
}

/**
 * Persist consolidated user settings across MongoDB user fields & appPreferences.
 * PUT /api/preferences
 */
export async function updateUserPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        const existing = await User.findById(userId)
            .select("notificationsEnabled callRingtone theme privacy appPreferences")
            .lean();
        if (!existing) {
            res.status(404).json({ success: false, msg: "User not found" });
            return;
        }

        const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, any>;
        const currentPrefs = (existing.appPreferences && typeof existing.appPreferences === "object")
            ? { ...existing.appPreferences }
            : {};
        const setDoc: Record<string, any> = {};

        if (typeof body.notificationsEnabled === "boolean") {
            setDoc.notificationsEnabled = body.notificationsEnabled;
            currentPrefs.notificationsEnabled = body.notificationsEnabled;
        }
        if (typeof body.soundEnabled === "boolean") {
            currentPrefs.soundEnabled = body.soundEnabled;
        }
        if (typeof body.appLockEnabled === "boolean") {
            currentPrefs.appLockEnabled = body.appLockEnabled;
        }
        if (isValidCallRingtone(body.callRingtone)) {
            setDoc.callRingtone = body.callRingtone;
            currentPrefs.callRingtone = body.callRingtone;
        }
        if (ALLOWED_HAPTICS.has(body.hapticStrength)) {
            currentPrefs.hapticStrength = body.hapticStrength;
        }

        if (body.appearance && typeof body.appearance === "object") {
            const nextAppearance = { ...(currentPrefs.appearance || {}) };
            if (ALLOWED_BUBBLE_STYLES.has(body.appearance.bubbleStyle)) {
                nextAppearance.bubbleStyle = body.appearance.bubbleStyle;
                setDoc["theme.bubbleStyle"] = body.appearance.bubbleStyle;
            }
            if (ALLOWED_FONT_SCALES.has(body.appearance.fontScale)) {
                nextAppearance.fontScale = body.appearance.fontScale;
            }
            if (typeof body.appearance.accentColor === "string" && /^#[0-9a-f]{3,8}$/i.test(body.appearance.accentColor)) {
                nextAppearance.accentColor = body.appearance.accentColor;
                setDoc["theme.accent"] = body.appearance.accentColor;
            }
            currentPrefs.appearance = nextAppearance;
        }

        if (body.privacyShield && typeof body.privacyShield === "object") {
            currentPrefs.privacyShield = {
                ...(currentPrefs.privacyShield || {}),
                ...(typeof body.privacyShield.hideNotificationPreview === "boolean"
                    ? { hideNotificationPreview: body.privacyShield.hideNotificationPreview }
                    : {}),
                ...([0, 60000, 300000].includes(body.privacyShield.autoLockDelayMs)
                    ? { autoLockDelayMs: body.privacyShield.autoLockDelayMs }
                    : {}),
            };
        }

        if (body.quietHours && typeof body.quietHours === "object") {
            const qh = { ...(currentPrefs.quietHours || {}) };
            if (typeof body.quietHours.enabled === "boolean") qh.enabled = body.quietHours.enabled;
            if (typeof body.quietHours.startHour === "number" && body.quietHours.startHour >= 0 && body.quietHours.startHour <= 23) {
                qh.startHour = body.quietHours.startHour;
            }
            if (typeof body.quietHours.endHour === "number" && body.quietHours.endHour >= 0 && body.quietHours.endHour <= 23) {
                qh.endHour = body.quietHours.endHour;
            }
            currentPrefs.quietHours = qh;
        }

        if (Array.isArray(body.favoriteReactions) && body.favoriteReactions.length === 6) {
            currentPrefs.favoriteReactions = body.favoriteReactions
                .map((x: unknown) => String(x || "").slice(0, 12))
                .filter(Boolean)
                .slice(0, 6);
        }

        if (body.privacy && typeof body.privacy === "object") {
            const nextPrivacy = { ...(currentPrefs.privacy || {}) };
            if (ALLOWED_LAST_SEEN.has(body.privacy.lastSeen)) {
                nextPrivacy.lastSeen = body.privacy.lastSeen;
                setDoc["privacy.lastSeen"] = body.privacy.lastSeen;
            }
            if (typeof body.privacy.readReceipts === "boolean") {
                nextPrivacy.readReceipts = body.privacy.readReceipts;
                setDoc["privacy.readReceipts"] = body.privacy.readReceipts;
            }
            if (typeof body.privacy.typingIndicators === "boolean") {
                nextPrivacy.typingIndicators = body.privacy.typingIndicators;
                setDoc["privacy.typingIndicators"] = body.privacy.typingIndicators;
            }
            if (ALLOWED_STORY_PRIVACY.has(body.privacy.storyPrivacy)) {
                nextPrivacy.storyPrivacy = body.privacy.storyPrivacy;
                setDoc["privacy.storyPrivacy"] = body.privacy.storyPrivacy;
            }
            currentPrefs.privacy = nextPrivacy;
        }

        if (body.storagePrefs && typeof body.storagePrefs === "object") {
            const sp: Record<string, boolean> = {};
            for (const key of [
                "mobilePhotos", "mobileAudio", "mobileDocs",
                "wifiPhotos", "wifiAudio", "wifiDocs", "lowDataCalls",
            ]) {
                if (typeof body.storagePrefs[key] === "boolean") {
                    sp[key] = body.storagePrefs[key];
                }
            }
            currentPrefs.storagePrefs = { ...(currentPrefs.storagePrefs || {}), ...sp };
        }

        const clientUpdatedAt = typeof body.updatedAt === "number" && Number.isFinite(body.updatedAt)
            ? body.updatedAt
            : Date.now();
        currentPrefs.updatedAt = Math.max(clientUpdatedAt, typeof currentPrefs.updatedAt === "number" ? currentPrefs.updatedAt : 0);

        setDoc.appPreferences = currentPrefs;

        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: setDoc },
            { new: true, runValidators: true }
        )
            .select("notificationsEnabled callRingtone theme privacy appPreferences")
            .lean();

        res.json({
            success: true,
            data: sanitizePreferencesPayload(updated),
        });
    } catch (error) {
        console.error("updateUserPreferences error:", error);
        res.status(500).json({ success: false, msg: "Failed to save preferences" });
    }
}
