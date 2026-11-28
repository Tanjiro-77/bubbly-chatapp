import Message from "../modals/Message";
import Conversation from "../modals/Conversation";
import User from "../modals/User";
import { isValidObjectId } from "mongoose";
import { getIO } from "../socket/io";
import { assertRateLimit } from "../utils/rateLimit";
import { canSendInGroup, filterBlockedDirect, getMembership } from "../utils/permissions";
import { formatMessagePayload, inferMessageType, validateAttachment } from "../utils/messageFormat";
import { sendMessagePushNotifications } from "./pushNotificationService";

export type SendMessageInput = {
    conversationId: string;
    senderId: string;
    sender?: { id: string; name: string; avatar?: string | null };
    content?: string;
    attachement?: string | null;
    attachmentMeta?: {
        url?: string;
        name?: string;
        mimeType?: string;
        size?: number;
        resourceType?: "image" | "video" | "raw" | "audio";
        isHd?: boolean;
        isViewOnce?: boolean;
    };
    replyTo?: string | null;
    voiceUrl?: string | null;
    voiceDuration?: number;
    location?: { latitude: number; longitude: number; label?: string } | null;
    type?: string;
    systemEvent?: { kind: string; actorId?: string; targetId?: string; meta?: Record<string, unknown> };
    callMeta?: {
        callId: string;
        kind: "voice" | "video";
        status: "missed" | "rejected" | "ended" | "failed";
        duration: number;
    };
    storyId?: string | null;
    isForwarded?: boolean;
    isViewOnce?: boolean;
    isSilent?: boolean;
    isEncrypted?: boolean;
    e2ee?: {
        v: number;
        alg: string;
        iv: string;
        ciphertext: string;
        keyVersion?: number;
    } | null;
    checklist?: {
        title?: string;
        items?: { id: string; text: string; completed?: boolean; completedBy?: string }[];
    } | null;
    skipRateLimit?: boolean;
    skipPermissionCheck?: boolean;
};

export async function createAndBroadcastMessage(input: SendMessageInput) {
    const {
        conversationId,
        senderId,
        content = "",
        attachement,
        attachmentMeta,
        replyTo,
        voiceUrl,
        voiceDuration = 0,
        location,
        systemEvent,
        callMeta,
        storyId,
    } = input;

    if (!input.skipRateLimit && !systemEvent) {
        assertRateLimit(`msg:${senderId}`, 40, 10_000);
    }

    const { conversation, isMember } = await getMembership(conversationId, senderId);
    if (!conversation) throw new Error("Conversation not found");
    if (!isMember && !input.skipPermissionCheck) throw new Error("Not a member of this conversation");

    if (typeof content !== "string") {
        throw new Error("Invalid message content");
    }
    if (replyTo && !isValidObjectId(replyTo)) {
        throw new Error("Invalid reply target");
    }
    // Validate and hydrate replyTo in one lookup (prevents cross-conversation IDOR & duplicate query)
    let validatedReplyTo: string | null = null;
    let replyToData: any = null;
    if (replyTo) {
        const replyMsg = await Message.findById(replyTo)
            .select("conversationId content senderId voiceUrl type isDeleted isEncrypted e2ee")
            .populate<{ senderId: { _id: string; name: string } }>({ path: "senderId", select: "name" })
            .lean();
        if (replyMsg && replyMsg.conversationId.toString() === conversationId.toString()) {
            validatedReplyTo = replyTo;
            replyToData = {
                id: replyMsg._id,
                content: (replyMsg as any).isDeleted ? "This message was deleted" : replyMsg.content,
                senderName: (replyMsg.senderId as { _id: string; name: string } | null)?.name || "Unknown",
                voiceUrl: (replyMsg as any).isDeleted ? null : (replyMsg.voiceUrl || null),
                type: (replyMsg as any).isDeleted ? "text" : (replyMsg as any).type,
                isDeleted: (replyMsg as any).isDeleted || false,
                isEncrypted: (replyMsg as any).isEncrypted || false,
                e2ee: (replyMsg as any).isDeleted ? null : ((replyMsg as any).e2ee || null),
            };
        }
    }
    if (storyId && !isValidObjectId(storyId)) {
        throw new Error("Invalid story reference");
    }

    if (!systemEvent && !input.skipPermissionCheck) {
        if (input.type === "system" || input.type === "call" || input.type === "poll") {
            throw new Error("Invalid message type");
        }
        if (await filterBlockedDirect(conversation, senderId)) {
            throw new Error("You cannot message this user");
        }
        if (!canSendInGroup(conversation, senderId)) {
            throw new Error("Only admins can send messages in this group");
        }
    }

    if (attachmentMeta) validateAttachment(attachmentMeta);
    if (voiceUrl && typeof voiceUrl === "string" && !/^https?:\/\//i.test(voiceUrl.trim())) {
        throw new Error("Invalid voice URL");
    }
    if (attachement && !attachmentMeta && typeof attachement === "string" && !/^https?:\/\//i.test(attachement.trim())) {
        throw new Error("Invalid attachment URL");
    }
    if (typeof voiceDuration === "number" && (!Number.isFinite(voiceDuration) || voiceDuration < 0)) {
        throw new Error("Invalid voice duration");
    }
    if (location) {
        if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
            throw new Error("Invalid location");
        }
        if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
            throw new Error("Invalid coordinates");
        }
    }

    const type = inferMessageType({
        ...input,
        attachement: input.attachement ?? undefined,
        voiceUrl: input.voiceUrl ?? undefined,
        location: input.location ?? undefined,
    });

    const isEncrypted = Boolean(input.isEncrypted && input.e2ee?.ciphertext && input.e2ee?.iv);
    if (input.isEncrypted && !isEncrypted) {
        throw new Error("Encrypted message requires valid e2ee ciphertext and iv");
    }

    if (typeof content === "string" && content.length > 5000) {
        throw new Error("Message content cannot exceed 5,000 characters");
    }

    if (type === "text" && !isEncrypted && !content.trim() && !attachement && !voiceUrl && !systemEvent && !callMeta) {
        throw new Error("Message cannot be empty");
    }
    if (type === "announcement") {
        const isAdmin = conversation.admins?.some((p: any) => p.toString() === senderId.toString())
            || conversation.createdBy?.toString() === senderId.toString();
        if (!isAdmin) throw new Error("Only admins can send announcements");
    }

    const expiresAt = conversation.disappearingSeconds > 0 && type !== "system"
        ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
        : null;

    const sanitizedChecklist = type === "checklist" && input.checklist
        ? {
            title: String(input.checklist.title || "Checklist").trim().slice(0, 120),
            items: (Array.isArray(input.checklist.items) ? input.checklist.items : [])
                .filter((it) => typeof it?.text === "string" && it.text.trim())
                .slice(0, 20)
                .map((it, idx) => ({
                    id: String(it.id || `${Date.now()}_${idx}`),
                    text: it.text.trim().slice(0, 200),
                    completed: Boolean(it.completed),
                    completedBy: typeof it.completedBy === "string" ? it.completedBy : "",
                })),
        }
        : undefined;

    if (type === "checklist" && (!sanitizedChecklist || sanitizedChecklist.items.length === 0)) {
        throw new Error("Checklist requires at least 1 item");
    }

    const message = await Message.create({
        conversationId,
        senderId,
        content: content?.trim?.() || (sanitizedChecklist ? sanitizedChecklist.title : "") || "",
        attachement: attachement || attachmentMeta?.url || undefined,
        type,
        attachmentMeta: attachmentMeta?.url ? attachmentMeta : undefined,
        location: location || undefined,
        replyTo: validatedReplyTo,
        voiceUrl: voiceUrl || null,
        voiceDuration,
        systemEvent: systemEvent || undefined,
        callMeta: callMeta || undefined,
        storyId: storyId || null,
        isForwarded: input.isForwarded || false,
        isSilent: input.isSilent || false,
        isViewOnce: input.isViewOnce || false,
        isEncrypted,
        e2ee: isEncrypted ? {
            v: Number(input.e2ee?.v || 1),
            alg: String(input.e2ee?.alg || "x25519-xsalsa20poly1305"),
            iv: String(input.e2ee?.iv),
            ciphertext: String(input.e2ee?.ciphertext),
            keyVersion: typeof input.e2ee?.keyVersion === "number" ? input.e2ee.keyVersion : 1,
        } : undefined,
        checklist: sanitizedChecklist,
        expiresAt,
    });

    let sender = input.sender;
    if (!sender) {
        const user = await User.findById(senderId).select("name avatar").lean();
        sender = {
            id: senderId,
            name: user?.name || "User",
            avatar: user?.avatar || "",
        };
    }

    let updatedConv = conversation;
    if (type !== "system") {
        updatedConv = await bumpConversationForMessage(conversation, senderId, message._id);
    } else {
        await Conversation.updateOne(
            { _id: conversationId },
            { $set: { lastMessage: message._id, deletedFor: [], updatedAt: new Date() } }
        );
    }

    const payload = formatMessagePayload(message, { sender, replyTo: replyToData });

    const io = getIO();
    io.to(conversationId).emit("newMessage", {
        success: true,
        conversationType: conversation.type,
        conversationName: conversation.name || null,
        data: payload,
    });

    emitUnreadCountUpdates(io, conversationId, updatedConv);

    sendMessagePushNotifications({
        conversation: updatedConv as any,
        sender,
        message: payload as any,
    }).catch((err) => {
        console.error("Message push notification error:", err instanceof Error ? err.message : err);
    });

    return payload;
}

/**
 * Atomically increment unreadCounts for other participants, update lastMessage/updatedAt,
 * and backfill any missing unreadCounts entries.
 */
export async function bumpConversationForMessage(
    conversation: any,
    senderId: string,
    messageId: any
) {
    const conversationId = conversation._id.toString();
    const otherParticipantIds = (conversation.participants || [])
        .map((p: any) => p.toString())
        .filter((pid: string) => pid !== senderId.toString());

    const now = new Date();
    let updatedConv = conversation;

    if (otherParticipantIds.length > 0) {
        await Conversation.updateOne(
            { _id: conversationId },
            {
                $inc: { "unreadCounts.$[elem].count": 1 },
                $set: { lastMessage: messageId, deletedFor: [], updatedAt: now },
            },
            { arrayFilters: [{ "elem.userId": { $in: otherParticipantIds } }] }
        );
        const refreshed = await Conversation.findById(conversationId);
        if (refreshed) {
            const missingIds = otherParticipantIds.filter(
                (pid: string) => !refreshed.unreadCounts.some((u: any) => u.userId.toString() === pid)
            );
            if (missingIds.length > 0) {
                missingIds.forEach((pid: string) => refreshed.unreadCounts.push({ userId: pid as any, count: 1 }));
                await refreshed.save();
            }
            updatedConv = refreshed;
        }
    } else {
        await Conversation.updateOne(
            { _id: conversationId },
            { $set: { lastMessage: messageId, deletedFor: [], updatedAt: now } }
        );
    }

    return updatedConv;
}

/**
 * Emit fresh unreadCountUpdate events to all connected participants of a conversation.
 */
export function emitUnreadCountUpdates(io: ReturnType<typeof getIO>, conversationId: string, conversation: any) {
    const participantIds = (conversation.participants || []).map((p: any) => p.toString());
    const allSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => participantIds.includes(s.data.userId?.toString())
    );

    allSockets.forEach((participantSocket) => {
        const participantId = participantSocket.data.userId?.toString();
        const unreadEntry = (conversation.unreadCounts || []).find(
            (u: any) => u.userId.toString() === participantId
        );
        participantSocket.emit("unreadCountUpdate", {
            conversationId,
            unreadCount: unreadEntry?.count || 0,
        });
    });
}

export async function createSystemMessage(
    conversationId: string,
    actorId: string,
    kind: string,
    extra?: { targetId?: string; content?: string; meta?: Record<string, unknown> }
) {
    return createAndBroadcastMessage({
        conversationId,
        senderId: actorId,
        content: extra?.content || "",
        type: "system",
        systemEvent: {
            kind,
            actorId,
            targetId: extra?.targetId,
            meta: extra?.meta,
        },
        skipRateLimit: true,
        skipPermissionCheck: true,
    });
}
