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
    | "poll";

export interface UserPrivacyProps {
    lastSeen: LastSeenVisibility;
    readReceipts: boolean;
    typingIndicators: boolean;
    storyPrivacy: StoryPrivacy;
    storyHiddenFrom: Types.ObjectId[];
}

export interface UserProps extends Document {
    id: string;
    email: string;
    password: string;
    name?: string;
    avatar?: string;
    created?: Date;
    isOnline?: boolean;
    lastSeen?: Date | null;
    blockedUsers: Types.ObjectId[];
    privacy: UserPrivacyProps;
    isModerator: boolean;
    recentSearches: string[];
    theme: {
        mode: "light" | "dark" | "system";
        accent: string;
        wallpaper: string;
        bubbleStyle: "rounded" | "sharp";
    };
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
