import { Document, Types } from "mongoose";

export type LastSeenVisibility = "everyone" | "contacts" | "nobody";
export type StoryPrivacy = "everyone" | "contacts" | "except";
export type GroupSendPermission = "all" | "admins";
export type MessageType =
    | "text"
    | "image"
    | "video"
    | "voice"
    | "file"
    | "location"
    | "system"
    | "call"
    | "announcement"
    | "poll"
    | "checklist";

export interface UserPrivacyProps {
    lastSeen: LastSeenVisibility;
    readReceipts: boolean;
    typingIndicators: boolean;
    storyPrivacy: StoryPrivacy;
    storyHiddenFrom: Types.ObjectId[];
}

export interface UserProps extends Document {
    id: string;
    email?: string;
    password?: string;
    name?: string;
    avatar?: string;
    googleId?: string;
    phoneNumber?: string;
    authProvider?: "local" | "google" | "phone";
    created?: Date;
    isOnline?: boolean;
    lastSeen?: Date | null;
    blockedUsers: Types.ObjectId[];
    privacy: UserPrivacyProps;
    isModerator: boolean;
    recentSearches: string[];
    pushTokens?: string[];
    notificationsEnabled?: boolean;
    callRingtone?: "incoming_call" | "incoming_call_2" | "incoming_call_3" | "incoming_call_4";
    theme: {
        mode: "light" | "dark" | "system";
        accent: string;
        wallpaper: string;
        bubbleStyle: "rounded" | "sharp" | "minimal";
    };
    appPreferences?: Record<string, any>;
    customStatus?: {
        emoji?: string;
        text?: string;
        updatedAt?: Date | null;
    };
    e2eePublicKey?: string;
    e2eeKeyVersion?: number;
    e2eeKeyFingerprint?: string;
    e2eeKeyBackup?: {
        ciphertext: string;
        nonce: string;
        salt: string;
        kdfVersion: number;
    } | null;
}

export interface UnreadCountProps {
    userId: Types.ObjectId;
    count: number;
}

export interface GroupPermissionsProps {
    sendMessages: GroupSendPermission;
    editInfo: GroupSendPermission;
    addMembers: GroupSendPermission;
}

export interface E2EEConversationKeyEntry {
    userId: Types.ObjectId;
    encryptedKey: string;
    nonce: string;
    senderPublicKey: string;
    keyVersion: number;
}

export interface E2EEPayload {
    v: number;
    alg: string;
    iv: string;
    ciphertext: string;
    keyVersion?: number;
}

export interface ConversationProps extends Document {
    _id: Types.ObjectId;
    type: "direct" | "group";
    name?: string;
    description?: string;
    participants: Types.ObjectId[];
    admins: Types.ObjectId[];
    lastMessage?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    avatar?: string;
    unreadCounts: UnreadCountProps[];
    permissions: GroupPermissionsProps;
    inviteCode?: string;
    disappearingSeconds: number;
    wallpaper?: string;
    pinnedMessages?: Types.ObjectId[];
    pinnedBy?: Types.ObjectId[];
    archivedBy?: Types.ObjectId[];
    deletedFor?: Types.ObjectId[];
    mutedBy?: { userId: Types.ObjectId; until: Date | null }[];
    isEncrypted?: boolean;
    e2eeKeyVersion?: number;
    encryptedKeys?: E2EEConversationKeyEntry[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ReactionProps {
    emoji: string;
    userId: string;
    userName: string;
}

export interface AttachmentMeta {
    url: string;
    name: string;
    mimeType: string;
    size: number;
    resourceType: "image" | "video" | "raw" | "audio";
}

export interface LocationMeta {
    latitude: number;
    longitude: number;
    label?: string;
}

export interface SystemEventMeta {
    kind: string;
    actorId?: string;
    targetId?: string;
    meta?: Record<string, unknown>;
}

export interface CallMeta {
    callId: string;
    kind: "voice" | "video";
    status: "missed" | "rejected" | "ended" | "failed";
    duration: number;
}
