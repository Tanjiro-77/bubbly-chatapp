import Message from "../modals/Message";
import User from "../modals/User";
import { getIO } from "../socket/io";
import { assertRateLimit } from "../utils/rateLimit";
import { canSendInGroup, filterBlockedDirect, getMembership } from "../utils/permissions";
import { formatMessagePayload, inferMessageType, validateAttachment } from "../utils/messageFormat";

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

    if (!systemEvent && !input.skipPermissionCheck) {
        if (await filterBlockedDirect(conversation, senderId)) {
            throw new Error("You cannot message this user");
        }
        if (!canSendInGroup(conversation, senderId) && input.type !== "system") {
            throw new Error("Only admins can send messages in this group");
        }
    }

    if (attachmentMeta) validateAttachment(attachmentMeta);
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
    if (type === "text" && !content.trim() && !attachement && !voiceUrl && !systemEvent && !callMeta) {
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

    const message = await Message.create({
        conversationId,
        senderId,
        content: content?.trim?.() || content || "",
        attachement: attachement || attachmentMeta?.url || undefined,
        type,
        attachmentMeta: attachmentMeta?.url ? attachmentMeta : undefined,
        location: location || undefined,
        replyTo: replyTo || null,
        voiceUrl: voiceUrl || null,
        voiceDuration,
        systemEvent: systemEvent || undefined,
        callMeta: callMeta || undefined,
        storyId: storyId || null,
        expiresAt,
    });

    let replyToData = null;
    if (replyTo) {
        const replyMsg = await Message.findById(replyTo)
            .populate<{ senderId: { _id: string; name: string } }>({ path: "senderId", select: "name" })
            .lean();
        if (replyMsg) {
            replyToData = {
                id: replyMsg._id,
                content: replyMsg.content,
                senderName: (replyMsg.senderId as { _id: string; name: string }).name,
                voiceUrl: replyMsg.voiceUrl || null,
                type: (replyMsg as any).type,
            };
        }
    }

    let sender = input.sender;
    if (!sender) {
        const user = await User.findById(senderId).select("name avatar").lean();
        sender = {
            id: senderId,
            name: user?.name || "User",
            avatar: user?.avatar || "",
        };
    }

    if (type !== "system") {
        conversation.participants.forEach((participantId: any) => {
            if (participantId.toString() === senderId.toString()) return;
            const existing = conversation.unreadCounts.find(
                (u: any) => u.userId.toString() === participantId.toString()
            );
            if (existing) existing.count += 1;
            else conversation.unreadCounts.push({ userId: participantId, count: 1 });
        });
    }

    conversation.lastMessage = message._id as any;
    await conversation.save();

    const payload = formatMessagePayload(message, { sender, replyTo: replyToData });

    const io = getIO();
    io.to(conversationId).emit("newMessage", {
        success: true,
        data: payload,
    });

    const participantIds = conversation.participants.map((p: any) => p.toString());
    const allSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => participantIds.includes(s.data.userId?.toString())
    );

    allSockets.forEach((participantSocket) => {
        const participantId = participantSocket.data.userId?.toString();
        const unreadEntry = conversation.unreadCounts.find(
            (u: any) => u.userId.toString() === participantId
        );
        participantSocket.emit("unreadCountUpdate", {
            conversationId,
            unreadCount: unreadEntry?.count || 0,
        });
    });

    return payload;
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
