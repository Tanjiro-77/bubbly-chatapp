/**
 * frontend/utils/chatCache.ts
 *
 * Lightweight two-tier (in-memory + AsyncStorage) cache and fast native Date
 * formatters to keep Bubbly Home, Stories, Contacts, and Chat screens instant (0ms paint).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConversationProps, MessageProps, StoryGroupProps } from "../types";

const PREFIX = "@bubbly_cache_";

// Keep hot data in memory across screen transitions inside the same session
const memConversations = new Map<string, ConversationProps[]>();
const memStories = new Map<string, StoryGroupProps[]>();
const memMessages = new Map<string, MessageProps[]>();
const memContacts = new Map<string, any[]>();

const MAX_CACHED_CONVERSATIONS = 80;
const MAX_CACHED_MESSAGES_PER_CHAT = 40;
const MAX_CACHED_CONTACTS = 150;
let activeStorySessionGroups: StoryGroupProps[] | null = null;

export function setActiveStorySession(groups: StoryGroupProps[]): void {
    activeStorySessionGroups = Array.isArray(groups) ? groups : null;
}

export function getActiveStorySession(): StoryGroupProps[] | null {
    return activeStorySessionGroups;
}

function convKey(userId: string) {
    return `${PREFIX}convs_${userId}`;
}

function storiesKey(userId: string) {
    return `${PREFIX}stories_${userId}`;
}

function msgsKey(conversationId: string) {
    return `${PREFIX}msgs_${conversationId}`;
}

function contactsKey(userId: string) {
    return `${PREFIX}contacts_${userId}`;
}

// ── Conversations Cache ───────────────────────────────────────────────────────
export function getMemoryConversations(userId?: string): ConversationProps[] | null {
    if (!userId) return null;
    return memConversations.get(userId) ?? null;
}

export async function getCachedConversations(userId?: string): Promise<ConversationProps[]> {
    if (!userId) return [];
    const hot = memConversations.get(userId);
    if (hot) return hot;
    try {
        const raw = await AsyncStorage.getItem(convKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            memConversations.set(userId, parsed);
            return parsed;
        }
    } catch {}
    return [];
}

export async function setCachedConversations(userId: string | undefined, list: ConversationProps[]): Promise<void> {
    if (!userId || !Array.isArray(list)) return;
    const trimmed = list.slice(0, MAX_CACHED_CONVERSATIONS);
    memConversations.set(userId, trimmed);
    try {
        await AsyncStorage.setItem(convKey(userId), JSON.stringify(trimmed));
    } catch {}
}

// ── Stories Cache ─────────────────────────────────────────────────────────────
export function getMemoryStories(userId?: string): StoryGroupProps[] | null {
    if (!userId) return null;
    return memStories.get(userId) ?? null;
}

export async function getCachedStories(userId?: string): Promise<StoryGroupProps[]> {
    if (!userId) return [];
    const hot = memStories.get(userId);
    if (hot) return hot;
    try {
        const raw = await AsyncStorage.getItem(storiesKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            memStories.set(userId, parsed);
            return parsed;
        }
    } catch {}
    return [];
}

export async function setCachedStories(userId: string | undefined, groups: StoryGroupProps[]): Promise<void> {
    if (!userId || !Array.isArray(groups)) return;
    memStories.set(userId, groups);
    try {
        await AsyncStorage.setItem(storiesKey(userId), JSON.stringify(groups));
    } catch {}
}

// ── Per-Conversation Messages Cache ───────────────────────────────────────────
export function getMemoryMessages(conversationId?: string): MessageProps[] | null {
    if (!conversationId) return null;
    return memMessages.get(conversationId) ?? null;
}

export async function getCachedMessages(conversationId?: string): Promise<MessageProps[]> {
    if (!conversationId) return [];
    const hot = memMessages.get(conversationId);
    if (hot) return hot;
    try {
        const raw = await AsyncStorage.getItem(msgsKey(conversationId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            memMessages.set(conversationId, parsed);
            return parsed;
        }
    } catch {}
    return [];
}

export async function setCachedMessages(conversationId: string | undefined, list: MessageProps[]): Promise<void> {
    if (!conversationId || !Array.isArray(list)) return;
    // Persist only confirmed/real messages (skip transient temp_ placeholders)
    const clean = list
        .filter((m) => m && m.id && !String(m.id).startsWith("temp_"))
        .slice(0, MAX_CACHED_MESSAGES_PER_CHAT);
    memMessages.set(conversationId, clean);
    try {
        await AsyncStorage.setItem(msgsKey(conversationId), JSON.stringify(clean));
    } catch {}
}

// ── Contacts Cache ────────────────────────────────────────────────────────────
export function getMemoryContacts(userId?: string): any[] | null {
    if (!userId) return null;
    return memContacts.get(userId) ?? null;
}

export async function getCachedContacts(userId?: string): Promise<any[]> {
    if (!userId) return [];
    const hot = memContacts.get(userId);
    if (hot) return hot;
    try {
        const raw = await AsyncStorage.getItem(contactsKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            memContacts.set(userId, parsed);
            return parsed;
        }
    } catch {}
    return [];
}

export async function setCachedContacts(userId: string | undefined, list: any[]): Promise<void> {
    if (!userId || !Array.isArray(list)) return;
    const trimmed = list.slice(0, MAX_CACHED_CONTACTS);
    memContacts.set(userId, trimmed);
    try {
        await AsyncStorage.setItem(contactsKey(userId), JSON.stringify(trimmed));
    } catch {}
}

export function clearMemoryChatCache(): void {
    memConversations.clear();
    memStories.clear();
    memMessages.clear();
    memContacts.clear();
}

// ── Fast Native Date Formatters (avoid Moment allocations in hot list renders) ─
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatTime12h(isoOrDate?: string | number | Date | null): string {
    if (!isoOrDate) return "";
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return "";
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m < 10 ? "0" + m : m} ${ampm}`;
}

export function getLocalDateKey(isoOrDate?: string | number | Date | null): string {
    if (!isoOrDate) return "";
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
}

export function formatConversationRowDate(isoOrDate?: string | number | Date | null): string | null {
    if (!isoOrDate) return null;
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    ) {
        return formatTime12h(d);
    }
    if (d.getFullYear() === now.getFullYear()) {
        return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
    }
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatSeparatorDateLabel(isoOrDate: string): string {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    ) {
        return "Today";
    }
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
    ) {
        return "Yesterday";
    }
    if (d.getFullYear() === now.getFullYear()) {
        return `${FULL_DAYS[d.getDay()]}, ${FULL_MONTHS[d.getMonth()]} ${d.getDate()}`;
    }
    return `${FULL_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
