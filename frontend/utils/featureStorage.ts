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
    SPLIT_LOCAL_PREFIX: "@bubbly_split_state_",
    CHAT_SCRATCHPAD_PREFIX: "@bubbly_scratchpad_",
    QUIET_HOURS: "@bubbly_quiet_hours_v1",
    FAVORITE_REACTIONS: "@bubbly_favorite_reactions_v1",
    DAILY_ACTIVITY: "@bubbly_daily_activity_v1",
    EVENT_RSVP_PREFIX: "@bubbly_event_rsvp_",
    WYR_PICK_PREFIX: "@bubbly_wyr_pick_",
    HOME_SORT_ORDER: "@bubbly_home_sort_v1",
    VOICE_SPEED_PREF: "@bubbly_voice_speed_v1",
    USER_BIO: "@bubbly_user_bio_v1",
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
let quietHoursCache: QuietHoursConfig | null = null;
let favoriteReactionsCache: string[] | null = null;
let dailyActivityCache: DailyActivityStats | null = null;
let homeSortCache: HomeSortOrder | null = null;
let voiceSpeedCache: number | null = null;
let userBioCache: string | null = null;
const eventRsvpCache = new Map<string, EventRsvpChoice>();
const wyrPickCache = new Map<string, "A" | "B">();
const scratchpadCache = new Map<string, string>();
const splitOverridesCache = new Map<string, Record<string, boolean>>();
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
    quietHoursCache = null;
    favoriteReactionsCache = null;
    dailyActivityCache = null;
    homeSortCache = null;
    voiceSpeedCache = null;
    userBioCache = null;
    eventRsvpCache.clear();
    wyrPickCache.clear();
    scratchpadCache.clear();
    splitOverridesCache.clear();
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

export interface BubblySplitParticipant {
    id: string;
    name: string;
    paid: boolean;
}

export interface BubblySplitPayload {
    id: string;
    title: string;
    currency: "$" | "₹" | "€" | "£";
    totalAmount: number;
    participants: BubblySplitParticipant[];
    createdBy?: string;
}

export interface BubblyDoodleStroke {
    d: string;
    color: string;
    width: number;
}

export interface BubblyDoodlePayload {
    strokes: BubblyDoodleStroke[];
    darkBg?: boolean;
    caption?: string;
}

export type EventRsvpChoice = "going" | "maybe" | "declined";

export interface BubblyEventPayload {
    id: string;
    title: string;
    whenIso: string;
    whenLabel: string;
    location?: string;
    note?: string;
    emoji?: string;
}

export interface BubblyWyrPayload {
    id: string;
    optionA: string;
    optionB: string;
}

const GAME_PREFIX = "[BUBBLY_GAME]";
const COUNTDOWN_PREFIX = "[BUBBLY_COUNTDOWN]";
const CHECKLIST_PREFIX = "[BUBBLY_CHECKLIST]";
const SPLIT_PREFIX = "[BUBBLY_SPLIT]";
const DOODLE_PREFIX = "[BUBBLY_DOODLE]";
const EVENT_PREFIX = "[BUBBLY_EVENT]";
const WYR_PREFIX = "[BUBBLY_WYR]";

export function encodeGameCard(payload: BubblyGamePayload): string {
    return `🎮 ${payload.title}: ${payload.result}\n${GAME_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeCountdownCard(payload: BubblyCountdownPayload): string {
    return `⏳ ${payload.emoji || "🎉"} ${payload.title}\n${COUNTDOWN_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeChecklistFallback(checklist: ChecklistProps): string {
    return `✅ ${checklist.title}\n${CHECKLIST_PREFIX}${JSON.stringify(checklist)}`;
}

export function encodeSplitCard(payload: BubblySplitPayload): string {
    return `💸 ${payload.title} (${payload.currency}${payload.totalAmount.toFixed(2)})\n${SPLIT_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeDoodleCard(payload: BubblyDoodlePayload): string {
    return `🎨 ${payload.caption?.trim() || "Hand-drawn Sketch"}\n${DOODLE_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeEventCard(payload: BubblyEventPayload): string {
    return `📅 ${payload.emoji || "🗓️"} ${payload.title} (${payload.whenLabel})\n${EVENT_PREFIX}${JSON.stringify(payload)}`;
}

export function encodeWyrCard(payload: BubblyWyrPayload): string {
    return `⚖️ Would You Rather: ${payload.optionA} OR ${payload.optionB}\n${WYR_PREFIX}${JSON.stringify(payload)}`;
}

export type ParsedRichCard =
    | { kind: "game"; data: BubblyGamePayload }
    | { kind: "countdown"; data: BubblyCountdownPayload }
    | { kind: "checklist"; data: ChecklistProps }
    | { kind: "split"; data: BubblySplitPayload }
    | { kind: "doodle"; data: BubblyDoodlePayload }
    | { kind: "event"; data: BubblyEventPayload }
    | { kind: "wyr"; data: BubblyWyrPayload }
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
        const spIdx = content.indexOf(SPLIT_PREFIX);
        if (spIdx !== -1) {
            const data = JSON.parse(content.slice(spIdx + SPLIT_PREFIX.length));
            if (data?.title && typeof data?.totalAmount === "number" && Array.isArray(data?.participants)) {
                return { kind: "split", data };
            }
        }
        const ddIdx = content.indexOf(DOODLE_PREFIX);
        if (ddIdx !== -1) {
            const data = JSON.parse(content.slice(ddIdx + DOODLE_PREFIX.length));
            if (Array.isArray(data?.strokes)) return { kind: "doodle", data };
        }
        const evIdx = content.indexOf(EVENT_PREFIX);
        if (evIdx !== -1) {
            const data = JSON.parse(content.slice(evIdx + EVENT_PREFIX.length));
            if (data?.title && data?.whenIso) return { kind: "event", data };
        }
        const wyrIdx = content.indexOf(WYR_PREFIX);
        if (wyrIdx !== -1) {
            const data = JSON.parse(content.slice(wyrIdx + WYR_PREFIX.length));
            if (data?.optionA && data?.optionB) return { kind: "wyr", data };
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
    if (parsed.kind === "split") return `💸 Split: ${parsed.data.title} (${parsed.data.currency}${parsed.data.totalAmount.toFixed(2)})`;
    if (parsed.kind === "doodle") return `🎨 ${parsed.data.caption?.trim() || "Sketch Doodle"}`;
    if (parsed.kind === "event") return `📅 ${parsed.data.title} · ${parsed.data.whenLabel}`;
    if (parsed.kind === "wyr") return `⚖️ ${parsed.data.optionA} vs ${parsed.data.optionB}`;
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

// ── 12. Split Bill Local Settlement Overrides ─────────────────────────────────
export async function getLocalSplitOverrides(
    messageId: string
): Promise<Record<string, boolean>> {
    const hit = splitOverridesCache.get(messageId);
    if (hit) return { ...hit };
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.SPLIT_LOCAL_PREFIX}${messageId}`);
        const parsed = raw ? JSON.parse(raw) : {};
        const resolved: Record<string, boolean> = parsed && typeof parsed === "object" ? parsed : {};
        splitOverridesCache.set(messageId, resolved);
        return { ...resolved };
    } catch {
        return {};
    }
}

export async function toggleLocalSplitPaid(
    messageId: string,
    participantId: string,
    nextVal: boolean
): Promise<void> {
    try {
        const current = await getLocalSplitOverrides(messageId);
        current[participantId] = nextVal;
        splitOverridesCache.set(messageId, current);
        await AsyncStorage.setItem(`${KEYS.SPLIT_LOCAL_PREFIX}${messageId}`, JSON.stringify(current));
    } catch {}
}

// ── 13. Per-Conversation Private Scratchpad ───────────────────────────────────
export async function getChatScratchpad(conversationId: string): Promise<string> {
    if (!conversationId) return "";
    const hit = scratchpadCache.get(conversationId);
    if (hit !== undefined) return hit;
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.CHAT_SCRATCHPAD_PREFIX}${conversationId}`);
        const text = raw || "";
        scratchpadCache.set(conversationId, text);
        return text;
    } catch {
        return "";
    }
}

export async function saveChatScratchpad(conversationId: string, text: string): Promise<void> {
    if (!conversationId) return;
    const cleaned = text.slice(0, 4000);
    scratchpadCache.set(conversationId, cleaned);
    try {
        if (!cleaned.trim()) {
            await AsyncStorage.removeItem(`${KEYS.CHAT_SCRATCHPAD_PREFIX}${conversationId}`);
        } else {
            await AsyncStorage.setItem(`${KEYS.CHAT_SCRATCHPAD_PREFIX}${conversationId}`, cleaned);
        }
        notifyListeners();
    } catch {}
}

// ── 14. Custom Quick-Reaction Emoji Presets ───────────────────────────────────
export const DEFAULT_FAVORITE_REACTIONS = ["❤️", "😂", "🔥", "👍", "😍", "🙏"];
export const REACTION_PALETTE = [
    "❤️", "😂", "🔥", "👍", "😍", "🙏", "🎉", "💯",
    "👏", "🥳", "🤯", "😢", "😮", "🤝", "✨", "🚀",
    "💀", "🫶", "😎", "☕",
];

export async function getFavoriteReactions(): Promise<string[]> {
    if (favoriteReactionsCache) return favoriteReactionsCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.FAVORITE_REACTIONS);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length === 6) {
            favoriteReactionsCache = parsed;
            return parsed;
        }
    } catch {}
    favoriteReactionsCache = [...DEFAULT_FAVORITE_REACTIONS];
    return favoriteReactionsCache;
}

export async function saveFavoriteReactions(emojis: string[]): Promise<string[]> {
    const unique = Array.from(new Set(emojis)).slice(0, 6);
    while (unique.length < 6) {
        const fallback = DEFAULT_FAVORITE_REACTIONS.find((e) => !unique.includes(e)) || "✨";
        unique.push(fallback);
    }
    favoriteReactionsCache = unique;
    try {
        await AsyncStorage.setItem(KEYS.FAVORITE_REACTIONS, JSON.stringify(unique));
        notifyListeners();
    } catch {}
    return unique;
}

// ── 15. Scheduled Quiet Hours (Auto Do-Not-Disturb) ───────────────────────────
export interface QuietHoursConfig {
    enabled: boolean;
    startHour: number; // 0..23
    endHour: number;   // 0..23
}

export const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
    enabled: false,
    startHour: 22,
    endHour: 7,
};

export function isWithinQuietHours(cfg: QuietHoursConfig, date: Date = new Date()): boolean {
    if (!cfg.enabled) return false;
    const h = date.getHours();
    if (cfg.startHour === cfg.endHour) return true;
    if (cfg.startHour < cfg.endHour) {
        return h >= cfg.startHour && h < cfg.endHour;
    }
    return h >= cfg.startHour || h < cfg.endHour;
}

export function formatHour12(hour: number): string {
    const h = ((hour % 24) + 24) % 24;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${suffix}`;
}

export async function getQuietHours(): Promise<QuietHoursConfig> {
    if (quietHoursCache) return quietHoursCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.QUIET_HOURS);
        if (!raw) {
            quietHoursCache = DEFAULT_QUIET_HOURS;
            return DEFAULT_QUIET_HOURS;
        }
        const parsed = { ...DEFAULT_QUIET_HOURS, ...JSON.parse(raw) };
        quietHoursCache = parsed;
        return parsed;
    } catch {
        return DEFAULT_QUIET_HOURS;
    }
}

export async function saveQuietHours(cfg: QuietHoursConfig): Promise<QuietHoursConfig> {
    quietHoursCache = cfg;
    try {
        await AsyncStorage.setItem(KEYS.QUIET_HOURS, JSON.stringify(cfg));
        notifyListeners();
    } catch {}
    return cfg;
}

// ── 16. Daily Activity & Messaging Streak Tracker ─────────────────────────────
export interface DailyActivityStats {
    streakDays: number;
    lastActiveDate: string; // YYYY-MM-DD local
    messagesSentToday: number;
    totalSentAllTime: number;
    activeConvIdsToday: string[];
}

function getLocalTodayString(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getLocalYesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalTodayString(d);
}

const DEFAULT_ACTIVITY: DailyActivityStats = {
    streakDays: 0,
    lastActiveDate: "",
    messagesSentToday: 0,
    totalSentAllTime: 0,
    activeConvIdsToday: [],
};

export async function getDailyActivityStats(): Promise<DailyActivityStats> {
    const today = getLocalTodayString();
    const yesterday = getLocalYesterdayString();
    if (dailyActivityCache) {
        if (dailyActivityCache.lastActiveDate && dailyActivityCache.lastActiveDate !== today) {
            const keepStreak = dailyActivityCache.lastActiveDate === yesterday ? dailyActivityCache.streakDays : 0;
            const rolled: DailyActivityStats = {
                ...dailyActivityCache,
                streakDays: keepStreak,
                messagesSentToday: 0,
                activeConvIdsToday: [],
            };
            dailyActivityCache = rolled;
            return rolled;
        }
        return dailyActivityCache;
    }
    try {
        const raw = await AsyncStorage.getItem(KEYS.DAILY_ACTIVITY);
        if (!raw) {
            dailyActivityCache = DEFAULT_ACTIVITY;
            return DEFAULT_ACTIVITY;
        }
        const parsed: DailyActivityStats = { ...DEFAULT_ACTIVITY, ...JSON.parse(raw) };
        if (parsed.lastActiveDate && parsed.lastActiveDate !== today) {
            parsed.streakDays = parsed.lastActiveDate === yesterday ? parsed.streakDays : 0;
            parsed.messagesSentToday = 0;
            parsed.activeConvIdsToday = [];
        }
        dailyActivityCache = parsed;
        return parsed;
    } catch {
        return DEFAULT_ACTIVITY;
    }
}

export async function recordMessageSentActivity(conversationId?: string): Promise<DailyActivityStats> {
    const today = getLocalTodayString();
    const yesterday = getLocalYesterdayString();
    const current = await getDailyActivityStats();

    let nextStreak = current.streakDays;
    if (current.lastActiveDate !== today) {
        nextStreak = current.lastActiveDate === yesterday ? current.streakDays + 1 : 1;
    } else if (nextStreak === 0) {
        nextStreak = 1;
    }

    const activeSet = new Set(current.lastActiveDate === today ? current.activeConvIdsToday : []);
    if (conversationId) activeSet.add(conversationId);

    const next: DailyActivityStats = {
        streakDays: nextStreak,
        lastActiveDate: today,
        messagesSentToday: (current.lastActiveDate === today ? current.messagesSentToday : 0) + 1,
        totalSentAllTime: (current.totalSentAllTime || 0) + 1,
        activeConvIdsToday: Array.from(activeSet).slice(0, 50),
    };
    dailyActivityCache = next;
    try {
        await AsyncStorage.setItem(KEYS.DAILY_ACTIVITY, JSON.stringify(next));
        notifyListeners();
    } catch {}
    return next;
}

// ── 17. Event Card RSVP & Would-You-Rather Local State ────────────────────────
export async function getLocalEventRsvp(messageId: string): Promise<EventRsvpChoice | null> {
    const hit = eventRsvpCache.get(messageId);
    if (hit) return hit;
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.EVENT_RSVP_PREFIX}${messageId}`);
        if (raw === "going" || raw === "maybe" || raw === "declined") {
            eventRsvpCache.set(messageId, raw);
            return raw;
        }
    } catch {}
    return null;
}

export async function setLocalEventRsvp(messageId: string, choice: EventRsvpChoice): Promise<void> {
    eventRsvpCache.set(messageId, choice);
    try {
        await AsyncStorage.setItem(`${KEYS.EVENT_RSVP_PREFIX}${messageId}`, choice);
    } catch {}
}

export async function getLocalWyrPick(messageId: string): Promise<"A" | "B" | null> {
    const hit = wyrPickCache.get(messageId);
    if (hit) return hit;
    try {
        const raw = await AsyncStorage.getItem(`${KEYS.WYR_PICK_PREFIX}${messageId}`);
        if (raw === "A" || raw === "B") {
            wyrPickCache.set(messageId, raw);
            return raw;
        }
    } catch {}
    return null;
}

export async function setLocalWyrPick(messageId: string, pick: "A" | "B"): Promise<void> {
    wyrPickCache.set(messageId, pick);
    try {
        await AsyncStorage.setItem(`${KEYS.WYR_PICK_PREFIX}${messageId}`, pick);
    } catch {}
}

// ── 18. Home Sort Order & Voice Playback Speed Memory ─────────────────────────
export type HomeSortOrder = "latest" | "unread" | "alpha";

export async function getHomeSortOrder(): Promise<HomeSortOrder> {
    if (homeSortCache) return homeSortCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.HOME_SORT_ORDER);
        if (raw === "latest" || raw === "unread" || raw === "alpha") {
            homeSortCache = raw;
            return raw;
        }
    } catch {}
    homeSortCache = "latest";
    return "latest";
}

export async function saveHomeSortOrder(order: HomeSortOrder): Promise<void> {
    homeSortCache = order;
    try {
        await AsyncStorage.setItem(KEYS.HOME_SORT_ORDER, order);
        notifyListeners();
    } catch {}
}

export async function getVoiceSpeedPref(): Promise<number> {
    if (voiceSpeedCache) return voiceSpeedCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.VOICE_SPEED_PREF);
        const num = raw ? parseFloat(raw) : 1;
        if (num === 1 || num === 1.5 || num === 2) {
            voiceSpeedCache = num;
            return num;
        }
    } catch {}
    voiceSpeedCache = 1;
    return 1;
}

export async function saveVoiceSpeedPref(speed: number): Promise<void> {
    voiceSpeedCache = speed;
    try {
        await AsyncStorage.setItem(KEYS.VOICE_SPEED_PREF, String(speed));
    } catch {}
}

// ── 19. Profile Bio & Preferences Snapshot Export / Reset ─────────────────────
export async function getMyBio(): Promise<string> {
    if (userBioCache !== null) return userBioCache;
    try {
        const raw = await AsyncStorage.getItem(KEYS.USER_BIO);
        userBioCache = raw || "";
        return userBioCache;
    } catch {
        return "";
    }
}

export async function saveMyBio(bio: string): Promise<string> {
    const cleaned = bio.trim().slice(0, 180);
    userBioCache = cleaned;
    try {
        await AsyncStorage.setItem(KEYS.USER_BIO, cleaned);
        notifyListeners();
    } catch {}
    return cleaned;
}

export async function exportLocalPreferencesSnapshot(): Promise<string> {
    const [
        quickReplies,
        nicknames,
        notes,
        tags,
        appearance,
        privacyShield,
        quietHours,
        favoriteReactions,
        bio,
        activity,
    ] = await Promise.all([
        getQuickReplies(),
        getNicknamesMap(),
        getContactNotesMap(),
        getChatTagsMap(),
        getChatAppearance(),
        getPrivacyShield(),
        getQuietHours(),
        getFavoriteReactions(),
        getMyBio(),
        getDailyActivityStats(),
    ]);

    return JSON.stringify(
        {
            exportedAt: new Date().toISOString(),
            app: "Bubbly v4.1.5",
            bio,
            appearance,
            privacyShield,
            quietHours,
            favoriteReactions,
            quickReplies,
            nicknames,
            contactNotes: notes,
            chatTags: tags,
            dailyActivity: activity,
        },
        null,
        2
    );
}

export async function resetLocalCustomizations(): Promise<void> {
    await Promise.all([
        saveChatAppearance(DEFAULT_APPEARANCE),
        savePrivacyShield(DEFAULT_PRIVACY_SHIELD),
        saveQuietHours(DEFAULT_QUIET_HOURS),
        saveFavoriteReactions(DEFAULT_FAVORITE_REACTIONS),
        saveQuickReplies(DEFAULT_QUICK_REPLIES),
        saveHomeSortOrder("latest"),
        saveVoiceSpeedPref(1),
    ]);
    notifyListeners();
}
