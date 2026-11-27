/**
 * frontend/utils/featureStorage.ts
 *
 * Persistent local storage, event pub/sub, and rich card codecs
 * for Bubbly v4.1.5 flagship features with offline & backward compatibility.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChecklistProps, MessageProps } from "../types";

// ── Keys ──────────────────────────────────────────────────────────────────────
const KEYS = {
    QUICK_REPLIES: "@bubbly_quick_replies_v1",
    NICKNAMES: "@bubbly_nicknames_v1",
    CHAT_NOTES: "@bubbly_contact_notes_v1",
    CHAT_TAGS: "@bubbly_chat_tags_v1",
    FOCUS_MODE: "@bubbly_focus_mode_v1",
    CUSTOM_STATUS: "@bubbly_custom_status_v1",
    APPEARANCE: "@bubbly_chat_appearance_v1",
    PRIVACY_SHIELD: "@bubbly_privacy_shield_v1",
    ARCHIVED_PREFIX: "@bubbly_archived_chats_",
    CHECKLIST_LOCAL_PREFIX: "@bubbly_checklist_state_",
    SILENT_LOCAL_IDS: "@bubbly_silent_msg_ids_v1",
};

// ── Simple Pub/Sub for instant UI updates ─────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeFeatureUpdates(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function notifyFeatureListeners() {
    listeners.forEach((fn) => {
        try {
            fn();
        } catch {}
    });
}

function notifyListeners() {
    notifyFeatureListeners();
}

// ── 1. Slash Quick Replies (Memory-Cached) ────────────────────────────────────
export interface QuickReplyTemplate {
    id: string;
    trigger: string; // without leading slash, e.g. "omw"
    text: string;
    isDefault?: boolean;
}

export const DEFAULT_QUICK_REPLIES: QuickReplyTemplate[] = [
    { id: "qr_omw", trigger: "omw", text: "On my way! Be there soon 🏃", isDefault: true },
    { id: "qr_busy", trigger: "busy", text: "In a focus block right now, I'll message back shortly 👍", isDefault: true },
    { id: "qr_thx", trigger: "thx", text: "Thank you so much! Really appreciate it 🙏", isDefault: true },
    { id: "qr_call", trigger: "call", text: "Free for a quick Bubbly call?", isDefault: true },
    { id: "qr_meet", trigger: "meet", text: "Let's sync up at 5:00 PM today 📅", isDefault: true },
];

let quickRepliesCache: QuickReplyTemplate[] | null = null;
let nicknamesCache: Record<string, string> | null = null;
let contactNotesCache: Record<string, string> | null = null;
let chatTagsCache: Record<string, ChatFolderTag> | null = null;
let focusModeCache: FocusModeState | null = null;
let customStatusCache: CustomStatusState | null = null;
let appearanceCache: ChatAppearanceConfig | null = null;
let privacyShieldCache: PrivacyShieldConfig | null = null;
const archivedCache = new Map<string, string[]>();

export function clearFeatureMemoryCache(): void {
    quickRepliesCache = null;
    nicknamesCache = null;
    contactNotesCache = null;
    chatTagsCache = null;
    focusModeCache = null;
    customStatusCache = null;
    appearanceCache = null;
    privacyShieldCache = null;
    archivedCache.clear();
}

export async function getQuickReplies(): Promise<QuickReplyTemplate[]> {
    if (quickRepliesCache) return quickRepliesCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.QUICK_REPLIES);
        if (!raw) {
            quickRepliesCache = DEFAULT_QUICK_REPLIES;
            return quickRepliesCache;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            quickRepliesCache = DEFAULT_QUICK_REPLIES;
            return quickRepliesCache;
        }
        quickRepliesCache = parsed;
        return quickRepliesCache;
    } catch {
        return DEFAULT_QUICK_REPLIES;
    }
}

export async function saveQuickReplies(list: QuickReplyTemplate[]): Promise<void> {
    const trimmed = list.slice(0, 30);
    quickRepliesCache = trimmed;
    try {
        await AsyncStorage.setItem(KEYS.QUICK_REPLIES, JSON.stringify(trimmed));
        notifyListeners();
    } catch {}
}

// ── 2. Private Nicknames & Contact Notes ──────────────────────────────────────
export async function getNicknamesMap(): Promise<Record<string, string>> {
    if (nicknamesCache) return nicknamesCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.NICKNAMES);
        const parsed = raw ? JSON.parse(raw) : {};
        const resolved: Record<string, string> = parsed && typeof parsed === "object" ? parsed : {};
        nicknamesCache = resolved;
        return resolved;
    } catch {
        return {};
    }
}

export async function setEntityNickname(entityId: string, nickname: string): Promise<void> {
    if (!entityId) return;
    try {
        const map = { ...(await getNicknamesMap()) };
        const cleaned = nickname.trim().slice(0, 40);
        if (!cleaned) {
            delete map[entityId];
        } else {
            map[entityId] = cleaned;
        }
        nicknamesCache = map;
        await AsyncStorage.setItem(KEYS.NICKNAMES, JSON.stringify(map));
        notifyListeners();
    } catch {}
}

export async function getContactNotesMap(): Promise<Record<string, string>> {
    if (contactNotesCache) return contactNotesCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.CHAT_NOTES);
        const parsed = raw ? JSON.parse(raw) : {};
        const resolved: Record<string, string> = parsed && typeof parsed === "object" ? parsed : {};
        contactNotesCache = resolved;
        return resolved;
    } catch {
        return {};
    }
}

export async function setContactNote(entityId: string, note: string): Promise<void> {
    if (!entityId) return;
    try {
        const map = { ...(await getContactNotesMap()) };
        const cleaned = note.trim().slice(0, 300);
        if (!cleaned) {
            delete map[entityId];
        } else {
            map[entityId] = cleaned;
        }
        contactNotesCache = map;
        await AsyncStorage.setItem(KEYS.CHAT_NOTES, JSON.stringify(map));
        notifyListeners();
    } catch {}
}

// ── 3. Smart Chat Folders / Tags ──────────────────────────────────────────────
export type ChatFolderTag = "work" | "friends" | "family" | "vip";

export const CHAT_FOLDER_META: Record<
    ChatFolderTag,
    { label: string; emoji: string; color: string; bg: string }
> = {
    work: { label: "Work", emoji: "💼", color: "#0284c7", bg: "#e0f2fe" },
    friends: { label: "Friends", emoji: "🤝", color: "#16a34a", bg: "#dcfce7" },
    family: { label: "Family", emoji: "🏡", color: "#9333ea", bg: "#f3e8ff" },
    vip: { label: "VIP", emoji: "⭐", color: "#d97706", bg: "#fef3c7" },
};

export async function getChatTagsMap(): Promise<Record<string, ChatFolderTag>> {
    if (chatTagsCache) return chatTagsCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.CHAT_TAGS);
        const parsed = raw ? JSON.parse(raw) : {};
        const resolved: Record<string, ChatFolderTag> = parsed && typeof parsed === "object" ? parsed : {};
        chatTagsCache = resolved;
        return resolved;
    } catch {
        return {};
    }
}

export async function setChatTag(
    conversationId: string,
    tag: ChatFolderTag | null
): Promise<Record<string, ChatFolderTag>> {
    try {
        const map = { ...(await getChatTagsMap()) };
        if (!tag) {
            delete map[conversationId];
        } else {
            map[conversationId] = tag;
        }
        chatTagsCache = map;
        await AsyncStorage.setItem(KEYS.CHAT_TAGS, JSON.stringify(map));
        notifyListeners();
        return map;
    } catch {
        return {};
    }
}

// ── 4. Focus / Quiet Mode Timer ───────────────────────────────────────────────
export interface FocusModeState {
    enabled: boolean;
    until: number | null; // epoch ms or null if manual
    label: string;
}

const DEFAULT_FOCUS: FocusModeState = { enabled: false, until: null, label: "" };

export async function getFocusMode(): Promise<FocusModeState> {
    if (focusModeCache) {
        if (focusModeCache.enabled && focusModeCache.until && Date.now() >= focusModeCache.until) {
            focusModeCache = DEFAULT_FOCUS;
            AsyncStorage.setItem(KEYS.FOCUS_MODE, JSON.stringify(DEFAULT_FOCUS)).catch(() => {});
        }
        return focusModeCache;
    }
    try {
        const raw = await AsyncStorage.getItem(KEYS.FOCUS_MODE);
        if (!raw) {
            focusModeCache = DEFAULT_FOCUS;
            return DEFAULT_FOCUS;
        }
        const parsed: FocusModeState = JSON.parse(raw);
        if (parsed.enabled && parsed.until && Date.now() >= parsed.until) {
            focusModeCache = DEFAULT_FOCUS;
            await AsyncStorage.setItem(KEYS.FOCUS_MODE, JSON.stringify(DEFAULT_FOCUS));
            return DEFAULT_FOCUS;
        }
        focusModeCache = parsed;
        return parsed;
    } catch {
        return DEFAULT_FOCUS;
    }
}

export async function setFocusMode(minutes: number | null, label?: string): Promise<FocusModeState> {
    const next: FocusModeState =
        minutes === null
            ? DEFAULT_FOCUS
            : {
                  enabled: true,
                  until: minutes > 0 ? Date.now() + minutes * 60 * 1000 : null,
                  label: label || (minutes > 0 ? `${minutes}m Focus` : "Quiet Mode"),
              };
    focusModeCache = next;
    try {
        await AsyncStorage.setItem(KEYS.FOCUS_MODE, JSON.stringify(next));
        notifyListeners();
    } catch {}
    return next;
}

export function formatRemainingFocus(until: number | null): string {
    if (!until) return "On until turned off";
    const diffMs = Math.max(0, until - Date.now());
    const mins = Math.ceil(diffMs / 60000);
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        return rem > 0 ? `${hrs}h ${rem}m left` : `${hrs}h left`;
    }
    return `${mins}m left`;
}

// ── 5. Custom Status Pill ─────────────────────────────────────────────────────
export interface CustomStatusState {
    emoji: string;
    text: string;
    expiresAt: number | null;
}

export const STATUS_PRESETS: { emoji: string; text: string }[] = [
    { emoji: "💼", text: "Deep work" },
    { emoji: "🎧", text: "Listening to music" },
    { emoji: "☕", text: "Coffee break" },
    { emoji: "🚀", text: "Shipping Bubbly" },
    { emoji: "🌙", text: "Winding down" },
    { emoji: "✈️", text: "Traveling" },
];

export async function getMyCustomStatus(): Promise<CustomStatusState> {
    if (customStatusCache) {
        if (customStatusCache.expiresAt && Date.now() > customStatusCache.expiresAt) {
            customStatusCache = { emoji: "", text: "", expiresAt: null };
            AsyncStorage.setItem(KEYS.CUSTOM_STATUS, JSON.stringify(customStatusCache)).catch(() => {});
        }
        return customStatusCache;
    }
    try {
        const raw = await AsyncStorage.getItem(KEYS.CUSTOM_STATUS);
        if (!raw) {
            customStatusCache = { emoji: "", text: "", expiresAt: null };
            return customStatusCache;
        }
        const parsed: CustomStatusState = JSON.parse(raw);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            const cleared = { emoji: "", text: "", expiresAt: null };
            customStatusCache = cleared;
            await AsyncStorage.setItem(KEYS.CUSTOM_STATUS, JSON.stringify(cleared));
            return cleared;
        }
        customStatusCache = parsed;
        return parsed;
    } catch {
        return { emoji: "", text: "", expiresAt: null };
    }
}

export async function saveMyCustomStatus(status: CustomStatusState): Promise<void> {
    customStatusCache = status;
    try {
        await AsyncStorage.setItem(KEYS.CUSTOM_STATUS, JSON.stringify(status));
        notifyListeners();
    } catch {}
}

// ── 6. Chat Appearance & Bubble Studio ────────────────────────────────────────
export type BubbleCornerStyle = "rounded" | "sharp" | "minimal";
export type ChatFontScale = "compact" | "standard" | "large";

export interface ChatAppearanceConfig {
    bubbleStyle: BubbleCornerStyle;
    fontScale: ChatFontScale;
    accentColor: string;
}

export const ACCENT_SWATCHES = [
    { name: "Honey Amber", color: "#f59e0b", myBubble: "#FFF2C6" },
    { name: "Ocean Sky", color: "#0284c7", myBubble: "#E0F2FE" },
    { name: "Cyber Mint", color: "#10b981", myBubble: "#D1FAE5" },
    { name: "Royal Iris", color: "#8b5cf6", myBubble: "#EDE9FE" },
    { name: "Rose Quartz", color: "#f43f5e", myBubble: "#FFE4E6" },
];

export const DEFAULT_APPEARANCE: ChatAppearanceConfig = {
    bubbleStyle: "rounded",
    fontScale: "standard",
    accentColor: "#f59e0b",
};

export async function getChatAppearance(): Promise<ChatAppearanceConfig> {
    if (appearanceCache) return appearanceCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.APPEARANCE);
        if (!raw) {
            appearanceCache = DEFAULT_APPEARANCE;
            return DEFAULT_APPEARANCE;
        }
        const resolved: ChatAppearanceConfig = { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
        appearanceCache = resolved;
        return resolved;
    } catch {
        return DEFAULT_APPEARANCE;
    }
}

export async function saveChatAppearance(config: ChatAppearanceConfig): Promise<void> {
    appearanceCache = config;
    try {
        await AsyncStorage.setItem(KEYS.APPEARANCE, JSON.stringify(config));
        notifyListeners();
    } catch {}
}

// ── 7. Privacy Shield (Lockscreen Preview & Auto-Lock Timeout) ────────────────
export interface PrivacyShieldConfig {
    hideNotificationPreview: boolean;
    autoLockDelayMs: 0 | 60000 | 300000;
}

export const DEFAULT_PRIVACY_SHIELD: PrivacyShieldConfig = {
    hideNotificationPreview: false,
    autoLockDelayMs: 0,
};

export async function getPrivacyShield(): Promise<PrivacyShieldConfig> {
    if (privacyShieldCache) return privacyShieldCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.PRIVACY_SHIELD);
        if (!raw) {
            privacyShieldCache = DEFAULT_PRIVACY_SHIELD;
            return DEFAULT_PRIVACY_SHIELD;
        }
        const resolved: PrivacyShieldConfig = { ...DEFAULT_PRIVACY_SHIELD, ...JSON.parse(raw) };
        privacyShieldCache = resolved;
        return resolved;
    } catch {
        return DEFAULT_PRIVACY_SHIELD;
    }
}

export async function savePrivacyShield(cfg: PrivacyShieldConfig): Promise<void> {
    privacyShieldCache = cfg;
    try {
        await AsyncStorage.setItem(KEYS.PRIVACY_SHIELD, JSON.stringify(cfg));
        notifyListeners();
    } catch {}
}

// ── 8. Archived Chats Fallback Store ──────────────────────────────────────────
export async function getLocalArchivedIds(userId?: string): Promise<string[]> {
    const k = userId || "default";
    const hit = archivedCache.get(k);
    if (hit) return hit;
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.ARCHIVED_PREFIX}${k}`);
        const parsed = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        archivedCache.set(k, list);
        return list;
    } catch {
        return [];
    }
}

export async function setLocalArchivedId(
    userId: string | undefined,
    conversationId: string,
    archive: boolean
): Promise<string[]> {
    const k = userId || "default";
    try {
        const current = await getLocalArchivedIds(userId);
        const next = archive
            ? Array.from(new Set([...current, conversationId]))
            : current.filter((id) => id !== conversationId);
        archivedCache.set(k, next);
        await AsyncStorage.setItem(`${KEYS.ARCHIVED_PREFIX}${k}`, JSON.stringify(next));
        notifyListeners();
        return next;
    } catch {
        return [];
    }
}

// ── 9. Rich Interactive Cards Codec (Games, Countdown, Checklist Fallback) ───
export type BubblyGameKind = "dice" | "coin" | "8ball" | "rps";

export interface BubblyGamePayload {
    kind: BubblyGameKind;
    title: string;
    result: string;
    detail?: string;
    sides?: number;
}

export interface BubblyCountdownPayload {
    title: string;
    targetIso: string;
    emoji?: string;
}

const GAME_PREFIX = "[BUBBLY_GAME]";
const COUNTDOWN_PREFIX = "[BUBBLY_COUNTDOWN]";
const CHECKLIST_PREFIX = "[BUBBLY_CHECKLIST]";

export function encodeGameCard(payload: BubblyGamePayload): string {
    return `🎮 ${payload.title}: ${payload.result}\n${GAME_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeCountdownCard(payload: BubblyCountdownPayload): string {
    return `⏳ ${payload.emoji || "🎉"} ${payload.title}\n${COUNTDOWN_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeChecklistFallback(checklist: ChecklistProps): string {
    return `✅ ${checklist.title}\n${CHECKLIST_PREFIX}${JSON.stringify(checklist)}`;
}

export type ParsedRichCard =
    | { kind: "game"; data: BubblyGamePayload }
    | { kind: "countdown"; data: BubblyCountdownPayload }
    | { kind: "checklist"; data: ChecklistProps }
    | null;

export function parseBubblyCard(content?: string | null): ParsedRichCard {
    if (!content || typeof content !== "string" || !content.includes("[BUBBLY_")) return null;
    try {
        const gameIdx = content.indexOf(GAME_PREFIX);
        if (gameIdx !== -1) {
            const data = JSON.parse(content.slice(gameIdx + GAME_PREFIX.length));
            if (data?.kind && data?.result) return { kind: "game", data };
        }
        const cdIdx = content.indexOf(COUNTDOWN_PREFIX);
        if (cdIdx !== -1) {
            const data = JSON.parse(content.slice(cdIdx + COUNTDOWN_PREFIX.length));
            if (data?.title && data?.targetIso) return { kind: "countdown", data };
        }
        const clIdx = content.indexOf(CHECKLIST_PREFIX);
        if (clIdx !== -1) {
            const data = JSON.parse(content.slice(clIdx + CHECKLIST_PREFIX.length));
            if (data?.title && Array.isArray(data?.items)) return { kind: "checklist", data };
        }
    } catch {}
    return null;
}

export function formatRichPreviewText(content?: string | null): string {
    const parsed = parseBubblyCard(content);
    if (!parsed) return content || "";
    if (parsed.kind === "game") return `🎮 ${parsed.data.title}: ${parsed.data.result}`;
    if (parsed.kind === "countdown") return `⏳ ${parsed.data.emoji || "🎉"} ${parsed.data.title}`;
    if (parsed.kind === "checklist") return `✅ Checklist: ${parsed.data.title}`;
    return content || "";
}

const checklistCache = new Map<string, Record<string, boolean>>();
let silentIdsCache: Set<string> | null = null;

// Local checklist toggle map (supports Notes-to-Self & fallback if server hasn't migrated)
export async function getLocalChecklistOverrides(
    messageId: string
): Promise<Record<string, boolean>> {
    const hit = checklistCache.get(messageId);
    if (hit) return { ...hit };
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.CHECKLIST_LOCAL_PREFIX}${messageId}`);
        const parsed = raw ? JSON.parse(raw) : {};
        checklistCache.set(messageId, parsed);
        return { ...parsed };
    } catch {
        return {};
    }
}

export async function toggleLocalChecklistOverride(
    messageId: string,
    itemId: string,
    nextVal: boolean
): Promise<void> {
    try {
        const current = await getLocalChecklistOverrides(messageId);
        current[itemId] = nextVal;
        checklistCache.set(messageId, current);
        await AsyncStorage.setItem(`${KEYS.CHECKLIST_LOCAL_PREFIX}${messageId}`, JSON.stringify(current));
    } catch {}
}

// ── 10. Silent Message Local Trackers ─────────────────────────────────────────
export async function markLocalSilentMessage(clientId: string): Promise<void> {
    try {
        const current = await getLocalSilentIds();
        const nextSet = new Set([clientId, ...current]);
        const nextArr = Array.from(nextSet).slice(0, 100);
        silentIdsCache = new Set(nextArr);
        await AsyncStorage.setItem(KEYS.SILENT_LOCAL_IDS, JSON.stringify(nextArr));
    } catch {}
}

export async function getLocalSilentIds(): Promise<Set<string>> {
    if (silentIdsCache) return silentIdsCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.SILENT_LOCAL_IDS);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        silentIdsCache = new Set(arr);
        return silentIdsCache;
    } catch {
        silentIdsCache = new Set();
        return silentIdsCache;
    }
}

// ── 11. Chat Insights / Analytics Engine ──────────────────────────────────────
export interface ChatInsightsSummary {
    totalMessages: number;
    sentByMe: number;
    received: number;
    voiceCount: number;
    voiceSeconds: number;
    mediaCount: number;
    pollCount: number;
    checklistCount: number;
    topEmojis: { emoji: string; count: number }[];
    peakHourLabel: string;
    activeDays: number;
}

export function computeChatInsights(
    messages: MessageProps[],
    currentUserId?: string
): ChatInsightsSummary {
    let sentByMe = 0;
    let received = 0;
    let voiceCount = 0;
    let voiceSeconds = 0;
    let mediaCount = 0;
    let pollCount = 0;
    let checklistCount = 0;
    const emojiCounts: Record<string, number> = {};
    const hourBuckets = new Array<number>(24).fill(0);
    const daySet = new Set<string>();

    for (const msg of messages) {
        if (msg.isDeleted || msg.type === "system") continue;
        if (currentUserId && msg.sender?.id === currentUserId) sentByMe++;
        else received++;

        if (msg.voiceUrl || msg.type === "voice") {
            voiceCount++;
            voiceSeconds += msg.voiceDuration || 0;
        }
        if (msg.attachement || msg.type === "image" || msg.type === "video" || msg.type === "file") {
            mediaCount++;
        }
        if (msg.type === "poll") pollCount++;
        if (msg.type === "checklist" || parseBubblyCard(msg.content)?.kind === "checklist") {
            checklistCount++;
        }

        for (const r of msg.reactions || []) {
            emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
        }

        const dt = new Date(msg.createdAt);
        if (!Number.isNaN(dt.getTime())) {
            hourBuckets[dt.getHours()]++;
            daySet.add(dt.toISOString().slice(0, 10));
        }
    }

    const topEmojis = Object.entries(emojiCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([emoji, count]) => ({ emoji, count }));

    let bestHour = 12;
    let bestCount = -1;
    hourBuckets.forEach((c, h) => {
        if (c > bestCount) {
            bestCount = c;
            bestHour = h;
        }
    });
    const suffix = bestHour >= 12 ? "PM" : "AM";
    const h12 = bestHour % 12 === 0 ? 12 : bestHour % 12;
    const peakHourLabel = bestCount > 0 ? `${h12}:00 ${suffix}` : "—";

    return {
        totalMessages: sentByMe + received,
        sentByMe,
        received,
        voiceCount,
        voiceSeconds,
        mediaCount,
        pollCount,
        checklistCount,
        topEmojis,
        peakHourLabel,
        activeDays: daySet.size,
    };
}
