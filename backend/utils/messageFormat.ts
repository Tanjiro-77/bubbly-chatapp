import { MessageType } from "../types";

export function inferMessageType(data: {
    type?: string;
    voiceUrl?: string;
    attachement?: string;
    attachmentMeta?: {
        url?: string;
        mimeType?: string;
        resourceType?: string;
    };
    location?: { latitude?: number };
    systemEvent?: { kind?: string };
    callMeta?: { callId?: string };
}): MessageType {
    if (data.type) return data.type as MessageType;
    if (data.systemEvent?.kind) return "system";
    if (data.callMeta?.callId) return "call";
    if (data.voiceUrl) return "voice";
    if (data.location?.latitude != null) return "location";
    const mime = data.attachmentMeta?.mimeType || "";
    const resource = data.attachmentMeta?.resourceType || "";
    if (resource === "video" || mime.startsWith("video/")) return "video";
    if (resource === "image" || mime.startsWith("image/") || data.attachement) {
        if (data.attachement && !mime) return "image";
        if (mime.startsWith("image/")) return "image";
    }
    if (data.attachmentMeta?.url || data.attachement) return "file";
    return "text";
}

export function formatMessagePayload(message: any, extras?: {
    sender?: { id: string; name: string; avatar?: string | null };
    replyTo?: any;
}) {
    const sender = extras?.sender || (message.senderId?._id ? {
        id: message.senderId._id,
        name: message.senderId.name,
        avatar: message.senderId.avatar,
    } : undefined);

    return {
        id: message._id || message.id,
        content: message.content || "",
        sender,
        attachement: (message.type === "image" || message.type === "text")
            ? (message.attachement || null)
            : null,
        createdAt: message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : message.createdAt,
        conversationId: message.conversationId,
        replyTo: extras?.replyTo ?? message.replyTo ?? null,
        reactions: (message.reactions || []).map((r: any) => ({
            emoji: r.emoji,
            userId: r.userId?.toString?.() || r.userId,
            userName: r.userName,
        })),
        voiceUrl: message.voiceUrl || null,
        voiceDuration: message.voiceDuration || 0,
        isDeleted: message.isDeleted || false,
        isEdited: message.isEdited || false,
        type: message.type || "text",

        // ✅ REQUIRED FOR POLLS
        poll: message.type === "poll" ? message.poll || null : null,

        attachmentMeta: message.attachmentMeta || null,
        location: message.location || null,
        systemEvent: message.systemEvent || null,
        callMeta: message.callMeta || null,
        expiresAt: message.expiresAt || null,
        storyId: message.storyId || null,
    };
}

const ALLOWED_MIME = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
    "video/mp4", "video/quicktime", "video/webm",
    "audio/m4a", "audio/mp4", "audio/mpeg", "audio/aac", "audio/wav", "audio/webm", "audio/x-m4a",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
]);

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function validateAttachment(meta?: {
    mimeType?: string;
    size?: number;
    name?: string;
}) {
    if (!meta) return;
    if (meta.size && meta.size > MAX_FILE_BYTES) {
        throw new Error("File is too large (max 25MB)");
    }
    if (meta.mimeType && !ALLOWED_MIME.has(meta.mimeType) && !meta.mimeType.startsWith("image/") && !meta.mimeType.startsWith("audio/")) {
        throw new Error("This file type is not allowed");
    }
    if (meta.name && /[<>:"/\\|?*\x00-\x1F]/.test(meta.name)) {
        throw new Error("Invalid file name");
    }
}
