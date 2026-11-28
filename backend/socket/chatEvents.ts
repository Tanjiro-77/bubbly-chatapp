import { Server as SocketIOServer, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";
import User from "../modals/User";
import { bumpConversationForMessage, createAndBroadcastMessage, emitUnreadCountUpdates } from "../services/messageService";
import { formatMessagePayload, maskAnonymousPoll } from "../utils/messageFormat";
import { sendMessagePushNotifications } from "../services/pushNotificationService";
import { areBlocked, canSendInGroup, filterBlockedDirect, sanitizeLastSeen } from "../utils/permissions";
import SavedMessage from "../modals/SavedMessage";
import { userRoom } from "./io";

function sanitizeLastMessage(lastMessage: any) {
    if (!lastMessage) return lastMessage;
    if (lastMessage.isDeleted) {
        return {
            ...lastMessage,
            content: "",
            attachement: null,
            voiceUrl: null,
            attachmentMeta: null,
            location: null,
            poll: null,
            checklist: null,
            callMeta: null,
            e2ee: null,
        };
    }
    if (!lastMessage.isViewOnce) return lastMessage;
    return {
        ...lastMessage,
        attachement: null,
        voiceUrl: null,
        attachmentMeta: lastMessage.attachmentMeta
            ? { ...lastMessage.attachmentMeta, url: undefined }
            : null,
    };
}

function sanitizeConversationParticipants(
    participants: any[],
    viewerId: string,
    isDirect: boolean,
    viewerBlockedSet?: Set<string>
) {
    return (participants || []).map((p: any) => {
        if (!p || typeof p !== "object" || !p._id) return p;
        const pid = p._id.toString();
        const isSelf = pid === viewerId.toString();
        const targetBlockedViewer = Array.isArray(p.blockedUsers)
            && p.blockedUsers.some((id: any) => id.toString() === viewerId.toString());
        const isBlockedPair = !isSelf && (Boolean(viewerBlockedSet?.has(pid)) || targetBlockedViewer);
        const { privacy: _privacy, blockedUsers: _blocked, ...rest } = p;
        if (isBlockedPair) {
            return {
                ...rest,
                isOnline: false,
                lastSeen: null,
                customStatus: null,
            };
        }
        const status = sanitizeLastSeen(viewerId.toString(), p, isDirect);
        return {
            ...rest,
            isOnline: status.isOnline,
            lastSeen: status.lastSeen,
            customStatus: status.hidden ? null : (p.customStatus ?? null),
        };
    });
}

function formatPinnedMessages(pinnedMessages: any[] = []) {
    return (pinnedMessages || [])
        .filter((pm: any) => pm && !pm.isDeleted)
        .map((pm: any) => ({
            id: pm._id.toString(),
            content: pm.content,
            type: pm.type,
            isEncrypted: Boolean(pm.isEncrypted),
            e2ee: pm.e2ee || null,
            createdAt: pm.createdAt,
            sender: pm.senderId ? {
                id: pm.senderId._id?.toString(),
                name: pm.senderId.name,
                avatar: pm.senderId.avatar,
            } : null,
        }));
}

function decorateConversationForViewer(
    conv: any,
    userId: string,
    now: Date,
    viewerBlockedSet?: Set<string>
) {
    const unreadEntry = (conv.unreadCounts || []).find(
        (u: any) => u.userId.toString() === userId.toString()
    );
    const muteEntry = (conv.mutedBy || []).find(
        (m: any) => m.userId.toString() === userId.toString()
    );
    const isMuted = muteEntry ? (!muteEntry.until || new Date(muteEntry.until) > now) : false;
    const isPinned = (conv.pinnedBy || []).some(
        (id: any) => id.toString() === userId.toString()
    );
    const isArchived = (conv.archivedBy || []).some(
        (id: any) => id.toString() === userId.toString()
    );
    const lm = sanitizeLastMessage(conv.lastMessage);
    if (lm?.poll?.isAnonymous) {
        lm.poll = maskAnonymousPoll(lm.poll, userId);
    }
    const sanitizedParticipants = sanitizeConversationParticipants(
        conv.participants,
        userId,
        conv.type === "direct",
        viewerBlockedSet
    );
    const validPinnedMessages = (conv.pinnedMessages || []).filter(
        (pm: any) => pm && !pm.isDeleted
    );
    return {
        ...conv,
        participants: sanitizedParticipants,
        pinnedMessages: validPinnedMessages,
        lastMessage: lm,
        unreadCount: unreadEntry?.count || 0,
        isMuted,
        mutedUntil: muteEntry?.until || null,
        isPinned,
        isArchived,
    };
}

async function isConversationMember(socket: Socket, conversationId: string, userId: string): Promise<boolean> {
    const rooms = (socket as any).rooms as Set<string> | undefined;
    if (rooms?.has?.(conversationId)) return true;
    const exists = await Conversation.exists({ _id: conversationId, participants: userId });
    if (exists) {
        (socket as any).join?.(conversationId);
        return true;
    }
    return false;
}

export function registerChatEvents(io: SocketIOServer, socket: Socket) {

    socket.on("getConversations", async () => {
        try {
            const userId = socket.data.userId;
            if (!userId) {
                socket.emit("getConversations", { success: false, msg: "Unauthorized" });
                return;
            }

            const [me, conversations] = await Promise.all([
                User.findById(userId).select("blockedUsers").lean(),
                Conversation.find({
                    participants: userId,
                    deletedFor: { $ne: userId },
                })
                    .sort({ updatedAt: -1 })
                    .populate({ path: "lastMessage", select: "content senderId attachement createdAt voiceUrl voiceDuration isDeleted type attachmentMeta location systemEvent callMeta poll checklist isViewOnce viewOnceOpenedBy isSilent isEncrypted e2ee" })
                    .populate({ path: "participants", select: "name avatar email isOnline lastSeen customStatus privacy blockedUsers e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint" })
                    .populate({ path: "admins", select: "name avatar" })
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted isEncrypted e2ee",
                        populate: { path: "senderId", select: "name avatar" }
                    })
                    .lean(),
            ]);

            const viewerBlockedSet = new Set<string>(
                (me?.blockedUsers || []).map((id: any) => id.toString())
            );

            const now = new Date();
            const conversationsWithUnread = conversations.map((conv: any) =>
                decorateConversationForViewer(conv, userId, now, viewerBlockedSet)
            );

            socket.emit("getConversations", { success: true, data: conversationsWithUnread });
        } catch (error: any) {
            console.log("getConversations error:", error);
            socket.emit("getConversations", { success: false, msg: "Failed to fetch conversations" });
        }
    });

    socket.on("newConversation", async (data) => {
        try {
            const userId = socket.data.userId;
            if (!data || (data.type !== "direct" && data.type !== "group")) {
                socket.emit("newConversation", { success: false, msg: "Invalid conversation type" });
                return;
            }
            if (!Array.isArray(data.participants)) {
                socket.emit("newConversation", { success: false, msg: "Invalid participants" });
                return;
            }
            const uniqueParticipants: string[] = Array.from(
                new Set<string>(data.participants.map((p: any) => String(p)))
            );
            if (!uniqueParticipants.includes(userId) || uniqueParticipants.some((p) => !isValidObjectId(p))) {
                socket.emit("newConversation", { success: false, msg: "Invalid participants" });
                return;
            }

            if (data.type == "direct") {
                if (uniqueParticipants.length !== 2) {
                    socket.emit("newConversation", { success: false, msg: "Direct chats need 2 distinct participants" });
                    return;
                }
                const otherId = uniqueParticipants.find((p) => p !== userId)!;
                if (await areBlocked(userId, otherId)) {
                    socket.emit("newConversation", { success: false, msg: "Cannot start conversation with this user" });
                    return;
                }
                const existingConversation = await Conversation.findOneAndUpdate(
                    {
                        type: "direct",
                        participants: { $all: uniqueParticipants, $size: 2 },
                    },
                    { $pull: { deletedFor: userId } },
                    { new: true }
                )
                    .populate({ path: "participants", select: "name avatar email isOnline lastSeen customStatus privacy blockedUsers e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint" })
                    .populate({ path: "admins", select: "name avatar" })
                    .populate({ path: "lastMessage", select: "content senderId attachement createdAt voiceUrl voiceDuration isDeleted type attachmentMeta location systemEvent callMeta poll checklist isViewOnce viewOnceOpenedBy isSilent isEncrypted e2ee" })
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted isEncrypted e2ee",
                        populate: { path: "senderId", select: "name avatar" }
                    })
                    .lean();

                if (existingConversation) {
                    const meViewer = await User.findById(userId).select("blockedUsers").lean();
                    const viewerBlockedSet = new Set<string>(
                        (meViewer?.blockedUsers || []).map((id: any) => id.toString())
                    );
                    socket.join(existingConversation._id.toString());
                    const decorated = decorateConversationForViewer(
                        existingConversation,
                        userId,
                        new Date(),
                        viewerBlockedSet
                    );
                    socket.emit("newConversation", {
                        success: true,
                        data: {
                            ...decorated,
                            isNew: false,
                        }
                    });
                    return;
                }
            }

            if (data.type === "group") {
                if (!data.name?.trim()) {
                    socket.emit("newConversation", { success: false, msg: "Group name is required" });
                    return;
                }
                if (uniqueParticipants.length < 2) {
                    socket.emit("newConversation", { success: false, msg: "Add at least two members" });
                    return;
                }
            }

            const existingUsersCount = await User.countDocuments({ _id: { $in: uniqueParticipants } });
            if (existingUsersCount !== uniqueParticipants.length) {
                socket.emit("newConversation", { success: false, msg: "One or more participants do not exist" });
                return;
            }

            const conversation = await Conversation.create({
                type: data.type,
                participants: uniqueParticipants,
                name: (data.name || "").trim().slice(0, 100),
                description: data.description || "",
                avatar: data.avatar || "",
                createdBy: userId,
                admins: data.type === "group" ? [userId] : [],
                unreadCounts: uniqueParticipants.map((pId: string) => ({ userId: pId, count: 0 })),
            });

            const participantSet = new Set(uniqueParticipants);
            const roomId = conversation._id.toString();
            for (const participantSocket of io.sockets.sockets.values()) {
                if (participantSet.has(participantSocket.data.userId)) {
                    participantSocket.join(roomId);
                }
            }

            const populatedConversation = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();

            if (!populatedConversation) throw new Error("Failed to populate conversation");

            io.to(conversation._id.toString()).emit("newConversation", {
                success: true,
                data: { ...populatedConversation, isNew: true, unreadCount: 0 }
            });

        } catch (error: any) {
            console.log("newConversation error:", error);
            socket.emit("newConversation", { success: false, msg: "Failed to create conversation" });
        }
    });

    socket.on("newMessage", async (data) => {
        try {
            const senderId = socket.data.userId;
            if (!senderId) throw new Error("Unauthorized");
            if (!data || typeof data !== "object") {
                throw new Error("Invalid message payload");
            }
            if (data.sender?.id && data.sender.id !== senderId) {
                throw new Error("Sender mismatch");
            }

            const payload = await createAndBroadcastMessage({
                conversationId: data.conversationId,
                senderId,
                sender: {
                    id: senderId,
                    name: socket.data.name,
                    avatar: socket.data.avatar,
                },
                content: data.content,
                attachement: data.attachement,
                attachmentMeta: data.attachmentMeta,
                replyTo: data.replyTo || null,
                voiceUrl: data.voiceUrl || null,
                voiceDuration: data.voiceDuration || 0,
                location: data.location || null,
                type: data.type,
                storyId: data.storyId || null,
                isSilent: !!data.isSilent,
                checklist: data.checklist || null,
                isViewOnce: !!(data.isViewOnce ?? data.attachmentMeta?.isViewOnce),
                isEncrypted: !!data.isEncrypted,
                e2ee: data.e2ee || null,
            });

            socket.emit("messageAck", { success: true, data: payload, clientId: data.clientId });
        } catch (error: any) {
            console.log("newMessage error:", error);
            socket.emit("newMessage", { success: false, msg: error.message || "Failed to send message" });
            socket.emit("messageAck", { success: false, msg: error.message || "Failed to send message", clientId: data?.clientId });
        }
    });

    // ── Message delivery receipts ──
    // The recipient confirms that the message reached their active chat socket.
    socket.on("messageDelivered", async (data: {
        messageId: string;
        conversationId: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.messageId || !data?.conversationId || !isValidObjectId(data.messageId) || !isValidObjectId(data.conversationId)) return;

            const isMember = await isConversationMember(socket, data.conversationId, userId);
            if (!isMember) return;

            const message = await Message.findById(data.messageId)
                .select("_id conversationId senderId")
                .lean();

            if (!message) return;
            if (message.conversationId.toString() !== data.conversationId.toString()) return;

            // Never accept a delivery receipt from the original sender.
            if (message.senderId.toString() === userId.toString()) return;

            // Notify only the sender of the message.
            io.to(userRoom(message.senderId.toString())).emit("messageDelivered", {
                conversationId: data.conversationId,
                messageId: data.messageId,
                deliveredBy: userId,
            });
        } catch (error) {
            console.log("messageDelivered error:", error);
        }
    });

    socket.on("getMessages", async (data: {
        conversationId: string;
        page?: number;
        limit?: number;
        aroundMessageId?: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) {
                socket.emit("getMessages", { success: false, msg: "Invalid conversation" });
                return;
            }
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            }).select("_id").lean();
            if (!conversation) {
                socket.emit("getMessages", { success: false, msg: "Not a member of this conversation" });
                return;
            }

            const PAGE_LIMIT = Math.floor(Math.max(1, Math.min(Number(data.limit) || 30, 50)));
            let page = Math.floor(Math.max(0, Number(data.page) || 0));
            let skip = page * PAGE_LIMIT;
            const notExpiredFilter = {
                $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
            };

            let aroundMessageFound = false;
            if (data.aroundMessageId && isValidObjectId(data.aroundMessageId)) {
                const target = await Message.findById(data.aroundMessageId).select("createdAt conversationId").lean();
                if (target && target.conversationId.toString() === data.conversationId) {
                    aroundMessageFound = true;
                    const newerCount = await Message.countDocuments({
                        conversationId: data.conversationId,
                        ...notExpiredFilter,
                        createdAt: { $gt: target.createdAt },
                    });
                    page = Math.floor(newerCount / PAGE_LIMIT);
                    skip = page * PAGE_LIMIT;
                }
            }

            // Fetch PAGE_LIMIT + 1 to determine hasMore without a separate countDocuments collection scan
            const [rawMessages, conversationDoc] = await Promise.all([
                Message.find({ conversationId: data.conversationId, ...notExpiredFilter })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(PAGE_LIMIT + 1)
                    .populate<{ senderId: { _id: string; name: string; avatar: string } }>({
                        path: "senderId",
                        select: "name avatar"
                    })
                    .populate<{
                        replyTo: {
                            _id: string;
                            content: string;
                            senderId: { name: string };
                            voiceUrl?: string;
                            type?: string;
                            isEncrypted?: boolean;
                            e2ee?: any;
                        } | null
                    }>({
                        path: "replyTo",
                        select: "content senderId voiceUrl type isDeleted isEncrypted e2ee",
                        populate: { path: "senderId", select: "name" }
                    })
                    .lean(),
                Conversation.findById(data.conversationId)
                    .select("pinnedMessages encryptedKeys e2eeKeyVersion")
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted isEncrypted e2ee",
                        populate: { path: "senderId", select: "name avatar" },
                    })
                    .lean(),
            ]);

            const hasMore = rawMessages.length > PAGE_LIMIT;
            const messages = hasMore ? rawMessages.slice(0, PAGE_LIMIT) : rawMessages;

            const saved = messages.length > 0
                ? await SavedMessage.find({
                    userId,
                    messageId: { $in: messages.map((m) => m._id) },
                }).select("messageId").lean()
                : [];
            const savedSet = new Set(saved.map((s) => s.messageId.toString()));

            const messagesWithSender = messages.map(message => {
                const formatted = formatMessagePayload(message, {
                    sender: {
                        id: (message.senderId as any)?._id,
                        name: (message.senderId as any)?.name,
                        avatar: (message.senderId as any)?.avatar,
                    },
                    replyTo: message.replyTo ? {
                        id: (message.replyTo as any)._id,
                        content: (message.replyTo as any).isDeleted ? "This message was deleted" : (message.replyTo as any).content,
                        senderName: (message.replyTo as any).senderId?.name || "Unknown",
                        voiceUrl: (message.replyTo as any).isDeleted ? null : ((message.replyTo as any).voiceUrl || null),
                        type: (message.replyTo as any).isDeleted ? "text" : (message.replyTo as any).type,
                        isDeleted: (message.replyTo as any).isDeleted || false,
                        isEncrypted: (message.replyTo as any).isEncrypted || false,
                        e2ee: (message.replyTo as any).isDeleted ? null : ((message.replyTo as any).e2ee || null),
                    } : null,
                });
                const openedViewOnce = formatted.isViewOnce && formatted.viewOnceOpenedBy.includes(userId);
                if (openedViewOnce) {
                    formatted.attachement = null;
                    formatted.voiceUrl = null;
                    if (formatted.attachmentMeta) {
                        formatted.attachmentMeta = { ...formatted.attachmentMeta, url: undefined };
                    }
                }
                if (formatted.poll?.isAnonymous) {
                    formatted.poll = maskAnonymousPoll(formatted.poll, userId);
                }
                return {
                    ...formatted,
                    isSaved: savedSet.has(message._id.toString()),
                };
            });

            socket.emit("getMessages", {
                success: true,
                conversationId: data.conversationId,
                data: messagesWithSender,
                page,
                hasMore,
                aroundMessageId: aroundMessageFound ? data.aroundMessageId : null,
                pinnedMessages: formatPinnedMessages(conversationDoc?.pinnedMessages || []),
                encryptedKeys: conversationDoc?.encryptedKeys || [],
                e2eeKeyVersion: conversationDoc?.e2eeKeyVersion || 1,
            });
        } catch (error) {
            console.log("getMessages error:", error);
            socket.emit("getMessages", { success: false, msg: "Failed to fetch messages" });
        }
    });

    socket.on("markAsRead", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.conversationId || !isValidObjectId(data.conversationId)) return;

            const updated = await Conversation.findOneAndUpdate(
                { _id: data.conversationId, participants: userId },
                { $set: { "unreadCounts.$[elem].count": 0 } },
                { arrayFilters: [{ "elem.userId": userId }], new: true }
            ).select("_id").lean();
            if (!updated) return;

            io.to(userRoom(userId)).emit("unreadCountUpdate", { conversationId: data.conversationId, unreadCount: 0 });

            let privacy = socket.data.privacy;
            if (privacy === undefined) {
                const me = await User.findById(userId).select("privacy").lean();
                privacy = me?.privacy || {};
                socket.data.privacy = privacy;
            }
            if (privacy?.readReceipts !== false) {
                socket.to(data.conversationId).emit("readReceipt", {
                    conversationId: data.conversationId,
                    userId,
                });
            }
        } catch (error) {
            console.log("markAsRead error:", error);
        }
    });

    socket.on("typing", async (data: { conversationId: string; senderId: string; senderName: string }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const isMember = await isConversationMember(socket, data.conversationId, userId);
            if (!isMember) return;

            let privacy = socket.data.privacy;
            if (privacy === undefined) {
                const me = await User.findById(userId).select("privacy").lean();
                privacy = me?.privacy || {};
                socket.data.privacy = privacy;
            }
            if (privacy?.typingIndicators === false) return;

            socket.to(data.conversationId).emit("typing", {
                conversationId: data.conversationId,
                senderId: userId,
                senderName: socket.data.name,
            });
        } catch (err) {
            console.log("typing error:", err);
        }
    });

    socket.on("stopTyping", async (data: { conversationId: string; senderId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const isMember = await isConversationMember(socket, data.conversationId, userId);
            if (!isMember) return;
            socket.to(data.conversationId).emit("stopTyping", {
                conversationId: data.conversationId,
                senderId: userId,
            });
        } catch (err) {
            console.log("stopTyping error:", err);
        }
    });

    socket.on("reactToMessage", async (data: {
        messageId: string;
        conversationId: string;
        emoji: string;
        userId: string;
        userName: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId) || !data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("reactToMessage", { success: false, msg: "Invalid message or conversation" });
                return;
            }

            if (typeof data.emoji !== "string" || !data.emoji.trim() || data.emoji.length > 16) {
                socket.emit("reactToMessage", { success: false, msg: "Invalid emoji reaction" });
                return;
            }

            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("reactToMessage", { success: false, msg: "Not a member" });
                return;
            }

            const message = await Message.findById(data.messageId);
            if (!message) {
                socket.emit("reactToMessage", { success: false, msg: "Message not found" });
                return;
            }

            // Verify message actually belongs to this conversation (IDOR prevention)
            if (message.conversationId.toString() !== conversation._id.toString()) {
                socket.emit("reactToMessage", { success: false, msg: "Message not found in conversation" });
                return;
            }

            const cleanEmoji = data.emoji.trim();

            const existingIndex = message.reactions.findIndex(
                (r: any) => r.userId.toString() === userId && r.emoji === cleanEmoji
            );

            if (existingIndex !== -1) {
                message.reactions.splice(existingIndex, 1);
            } else {
                const otherIndex = message.reactions.findIndex(
                    (r: any) => r.userId.toString() === userId
                );
                if (otherIndex !== -1) message.reactions.splice(otherIndex, 1);
                message.reactions.push({ emoji: cleanEmoji, userId, userName: socket.data.name });
            }

            await message.save();

            io.to(conversation._id.toString()).emit("reactToMessage", {
                success: true,
                data: {
                    messageId: data.messageId,
                    reactions: message.reactions.map((r: any) => ({
                        emoji: r.emoji,
                        userId: r.userId.toString(),
                        userName: r.userName,
                    })),
                },
            });

        } catch (error) {
            console.log("reactToMessage error:", error);
            socket.emit("reactToMessage", { success: false, msg: "Failed to react to message" });
        }
    });

    socket.on("deleteMessage", async (data: { messageId: string; conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("deleteMessage", { success: false, msg: "Message not found" });
                return;
            }
            const message = await Message.findById(data.messageId);
            if (!message) {
                socket.emit("deleteMessage", { success: false, msg: "Message not found" });
                return;
            }
            if (message.senderId.toString() !== userId.toString()) {
                socket.emit("deleteMessage", { success: false, msg: "You can only delete your own messages" });
                return;
            }

            // Verify conversation match if provided
            if (data.conversationId && message.conversationId.toString() !== data.conversationId.toString()) {
                socket.emit("deleteMessage", { success: false, msg: "Conversation mismatch" });
                return;
            }

            message.isDeleted = true;
            message.content = "";
            message.attachement = undefined;
            message.voiceUrl = undefined;
            message.attachmentMeta = undefined;
            message.location = undefined;
            message.poll = undefined;
            (message as any).checklist = undefined;
            message.callMeta = undefined;
            message.e2ee = undefined;
            message.reactions = [] as any;
            message.isPinned = false;
            await message.save();

            // Remove deleted message from conversation.pinnedMessages if present
            const updatedConv = await Conversation.findOneAndUpdate(
                { _id: message.conversationId, pinnedMessages: message._id },
                { $pull: { pinnedMessages: message._id } },
                { new: true }
            )
                .select("pinnedMessages")
                .populate({
                    path: "pinnedMessages",
                    select: "content senderId type createdAt isDeleted",
                    populate: { path: "senderId", select: "name avatar" },
                })
                .lean();

            if (updatedConv) {
                const pinnedPayload = formatPinnedMessages(updatedConv.pinnedMessages || []);
                io.to(message.conversationId.toString()).emit("pinnedMessageUpdated", {
                    success: true,
                    data: {
                        conversationId: message.conversationId.toString(),
                        pinnedMessages: pinnedPayload,
                        action: "unpinned",
                        messageId: data.messageId,
                    },
                });
            }

            // Always emit to the genuine conversation room
            io.to(message.conversationId.toString()).emit("deleteMessage", {
                success: true,
                data: { messageId: data.messageId, conversationId: message.conversationId.toString() },
            });

        } catch (error) {
            console.log("deleteMessage error:", error);
            socket.emit("deleteMessage", { success: false, msg: "Failed to delete message" });
        }
    });

    socket.on("editMessage", async (data: { messageId: string; conversationId: string; content?: string; newContent?: string; isEncrypted?: boolean; e2ee?: any }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("editMessage", { success: false, msg: "Message not found" });
                return;
            }

            const isEncryptedEdit = Boolean(data.isEncrypted && data.e2ee?.ciphertext && data.e2ee?.iv);
            const rawContent = typeof data.content === "string" ? data.content : data.newContent;
            if (!isEncryptedEdit && (typeof rawContent !== "string" || !rawContent.trim())) {
                socket.emit("editMessage", { success: false, msg: "Message content cannot be empty" });
                return;
            }

            if (typeof rawContent === "string" && rawContent.length > 5000) {
                socket.emit("editMessage", { success: false, msg: "Message content exceeds limit of 5,000 characters" });
                return;
            }

            const message = await Message.findById(data.messageId);
            if (!message) {
                socket.emit("editMessage", { success: false, msg: "Message not found" });
                return;
            }
            if (message.senderId.toString() !== userId.toString()) {
                socket.emit("editMessage", { success: false, msg: "You can only edit your own messages" });
                return;
            }
            if (data.conversationId && message.conversationId.toString() !== data.conversationId.toString()) {
                socket.emit("editMessage", { success: false, msg: "Conversation mismatch" });
                return;
            }
            if (message.isDeleted) {
                socket.emit("editMessage", { success: false, msg: "Cannot edit a deleted message" });
                return;
            }
            if (message.voiceUrl || ["voice", "file", "location", "call", "system", "poll", "checklist"].includes(message.type)) {
                socket.emit("editMessage", { success: false, msg: "Cannot edit this message type" });
                return;
            }

            if (isEncryptedEdit) {
                message.content = "";
                message.isEncrypted = true;
                message.e2ee = {
                    v: Number(data.e2ee.v || 1),
                    alg: String(data.e2ee.alg || "x25519-xsalsa20poly1305"),
                    iv: String(data.e2ee.iv),
                    ciphertext: String(data.e2ee.ciphertext),
                    keyVersion: typeof data.e2ee.keyVersion === "number" ? data.e2ee.keyVersion : 1,
                };
            } else {
                message.content = (rawContent || "").trim();
            }
            message.isEdited = true;
            await message.save();

            // Always emit to the genuine conversation room
            io.to(message.conversationId.toString()).emit("editMessage", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: message.conversationId.toString(),
                    content: message.content,
                    isEncrypted: Boolean(message.isEncrypted),
                    e2ee: message.e2ee || null,
                    isEdited: true,
                },
            });

        } catch (error) {
            console.log("editMessage error:", error);
            socket.emit("editMessage", { success: false, msg: "Failed to edit message" });
        }
    });

    socket.on("getUserStatus", async (data: { userId?: string; targetUserId?: string }) => {
        try {
            const viewerId = socket.data.userId;
            const targetId = data?.userId || data?.targetUserId;
            if (!targetId || !isValidObjectId(targetId)) {
                socket.emit("getUserStatus", { success: false, msg: "Invalid userId" });
                return;
            }
            const user = await User.findById(targetId).select("isOnline lastSeen privacy blockedUsers customStatus").lean();
            if (!user) {
                socket.emit("getUserStatus", { success: false, msg: "User not found" });
                return;
            }
            if (await areBlocked(viewerId, targetId)) {
                socket.emit("getUserStatus", {
                    success: true,
                    data: { userId: targetId, isOnline: false, lastSeen: null, hidden: true, customStatus: null },
                });
                return;
            }
            const shared = await Conversation.exists({
                type: "direct",
                participants: { $all: [viewerId, targetId], $size: 2 },
            });
            const status = sanitizeLastSeen(viewerId, user, !!shared);
            socket.emit("getUserStatus", {
                success: true,
                data: {
                    userId: targetId,
                    isOnline: status.isOnline,
                    lastSeen: status.lastSeen,
                    hidden: status.hidden,
                    customStatus: status.hidden ? null : ((user as any).customStatus || null),
                },
            });
        } catch (error) {
            console.log("getUserStatus error:", error);
            socket.emit("getUserStatus", { success: false, msg: "Failed to get user status" });
        }
    });
    // ─────────────────────────────────────────────
    // CREATE POLL
    // ─────────────────────────────────────────────
    socket.on("createPoll", async (data: {
        conversationId: string;
        question: string;
        options: string[];
        allowMultiple?: boolean;
        isAnonymous?: boolean;
        endsAt?: string;
    }) => {
        try {
            const senderId = socket.data.userId;
            if (!senderId) throw new Error("Unauthorized");

            if (!data?.conversationId || !isValidObjectId(data.conversationId)) {
                throw new Error("Invalid conversation");
            }
            if (typeof data.question !== "string" || !data.question.trim()) {
                throw new Error("Question is required");
            }

            if (!Array.isArray(data.options) || data.options.length < 2) {
                throw new Error("At least 2 options required");
            }

            if (data.options.length > 10) {
                throw new Error("Maximum 10 options allowed");
            }

            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: senderId,
            });

            if (!conversation) {
                throw new Error("Not a member of this conversation");
            }
            if (await filterBlockedDirect(conversation, senderId)) {
                throw new Error("You cannot message this user");
            }
            if (!canSendInGroup(conversation, senderId)) {
                throw new Error("Only admins can send messages in this group");
            }

            const options = data.options
                .filter((option) => typeof option === "string" && option.trim())
                .map((text, index) => ({
                    id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
                    text: text.trim(),
                    votes: [],
                }));

            if (options.length < 2) {
                throw new Error("At least 2 valid options required");
            }

            let parsedEndsAt: Date | null = null;
            if (data.endsAt) {
                const d = new Date(data.endsAt);
                if (Number.isNaN(d.getTime())) throw new Error("Invalid poll end time");
                parsedEndsAt = d;
            }
            const expiresAt = conversation.disappearingSeconds > 0
                ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
                : null;

            const message = await Message.create({
                conversationId: data.conversationId,
                senderId,
                type: "poll",
                content: data.question.trim(),
                expiresAt,
                poll: {
                    question: data.question.trim(),
                    options,
                    allowMultiple: data.allowMultiple ?? false,
                    isAnonymous: data.isAnonymous ?? false,
                    endsAt: parsedEndsAt,
                    isClosed: false,
                },
            });

            const populated = await Message.findById(message._id)
                .populate("senderId", "name avatar")
                .lean();

            if (!populated) {
                throw new Error("Failed to create poll");
            }

            const payload = formatMessagePayload(populated, {
                sender: {
                    id: (populated.senderId as any)._id.toString(),
                    name: (populated.senderId as any).name,
                    avatar: (populated.senderId as any).avatar || null,
                },
            });

            const updatedConv = await bumpConversationForMessage(conversation, senderId, message._id);

            io.to(data.conversationId).emit("newMessage", {
                success: true,
                conversationType: conversation.type,
                conversationName: conversation.name || null,
                data: payload,
            });

            emitUnreadCountUpdates(io, data.conversationId, updatedConv);

            sendMessagePushNotifications({
                conversation: updatedConv as any,
                sender: payload.sender ?? {
                    id: senderId.toString(),
                    name: socket.data.name || "Someone",
                    avatar: socket.data.avatar ?? null,
                },
                message: payload as any,
            }).catch((err) => {
                console.error("Poll push notification error:", err instanceof Error ? err.message : err);
            });

            socket.emit("createPoll", {
                success: true,
                data: payload,
            });
        } catch (error: any) {
            console.log("createPoll error:", error);

            socket.emit("createPoll", {
                success: false,
                msg: error.message || "Failed to create poll",
            });
        }
    });


    // ─────────────────────────────────────────────
    // VOTE ON POLL
    // ─────────────────────────────────────────────
    socket.on("votePoll", async (data: {
        messageId: string;
        conversationId: string;
        optionId: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!userId) throw new Error("Unauthorized");

            if (!data?.messageId || !isValidObjectId(data.messageId) || !data?.conversationId || !isValidObjectId(data.conversationId)) {
                throw new Error("Poll not found");
            }
            const message = await Message.findById(data.messageId);

            if (!message || message.type !== "poll") {
                throw new Error("Poll not found");
            }

            if (message.conversationId.toString() !== data.conversationId.toString()) {
                throw new Error("Invalid conversation");
            }

            if (!message.poll) {
                throw new Error("Poll data missing");
            }

            if (message.poll.isClosed) {
                throw new Error("Poll is closed");
            }

            if (message.poll.endsAt && new Date() > message.poll.endsAt) {
                message.poll.isClosed = true;
                await message.save();
                const closedPoll = (message.poll as any)?.toObject ? (message.poll as any).toObject() : message.poll;
                io.to(data.conversationId).emit("pollUpdated", {
                    success: true,
                    data: { messageId: data.messageId, conversationId: data.conversationId, poll: closedPoll },
                });
                throw new Error("Poll has ended");
            }

            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });

            if (!conversation) {
                throw new Error("Not a member");
            }

            const option = message.poll.options.find(
                (opt: any) => opt.id === data.optionId
            );

            if (!option) {
                throw new Error("Option not found");
            }

            const alreadyVoted = option.votes.some(
                (vote: any) => vote.userId.toString() === userId.toString()
            );

            if (message.poll.allowMultiple) {
                if (alreadyVoted) {
                    for (let i = option.votes.length - 1; i >= 0; i--) {
                        if (
                            option.votes[i]?.userId?.toString() ===
                            userId.toString()
                        ) {
                            option.votes.splice(i, 1);
                        }
                    }
                } else {
                    option.votes.push({
                        userId,
                        userName: socket.data.name || "User",
                    });
                }
            } else {
                if (alreadyVoted) {
                    for (let i = option.votes.length - 1; i >= 0; i--) {
                        if (
                            option.votes[i]?.userId?.toString() ===
                            userId.toString()
                        ) {
                            option.votes.splice(i, 1);
                        }
                    }
                } else {
                    message.poll.options.forEach((opt: any) => {
                        for (let i = opt.votes.length - 1; i >= 0; i--) {
                            if (
                                opt.votes[i]?.userId?.toString() ===
                                userId.toString()
                            ) {
                                opt.votes.splice(i, 1);
                            }
                        }
                    });

                    option.votes.push({
                        userId,
                        userName: socket.data.name || "User",
                    });
                }
            }

            await message.save();

            const rawPoll = (message.poll as any)?.toObject ? (message.poll as any).toObject() : message.poll;
            const convForPoll = await Conversation.findById(data.conversationId).select("participants").lean();
            const pollParticipants = (convForPoll?.participants || []).map((p: any) => p.toString());

            if (rawPoll?.isAnonymous && pollParticipants.length > 0) {
                pollParticipants.forEach((pid: string) => {
                    io.to(userRoom(pid)).emit("pollUpdated", {
                        success: true,
                        data: {
                            messageId: data.messageId,
                            conversationId: data.conversationId,
                            poll: maskAnonymousPoll(rawPoll, pid),
                        },
                    });
                });
            } else {
                io.to(data.conversationId).emit("pollUpdated", {
                    success: true,
                    data: {
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        poll: rawPoll,
                    },
                });
            }

            socket.emit("votePoll", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: maskAnonymousPoll(rawPoll, userId),
                },
            });
        } catch (error: any) {
            console.log("votePoll error:", error);

            socket.emit("votePoll", {
                success: false,
                msg: error.message || "Failed to vote",
            });
        }
    });


    // ─────────────────────────────────────────────
    // CLOSE POLL
    // ─────────────────────────────────────────────
    socket.on("closePoll", async (data: {
        messageId: string;
        conversationId: string;
    }) => {
        try {
            const userId = socket.data.userId;

            if (!userId) {
                throw new Error("Unauthorized");
            }

            if (!data?.messageId || !isValidObjectId(data.messageId) || !data?.conversationId || !isValidObjectId(data.conversationId)) {
                throw new Error("Poll not found");
            }
            const message = await Message.findById(data.messageId);

            if (!message || message.type !== "poll") {
                throw new Error("Poll not found");
            }

            if (message.conversationId.toString() !== data.conversationId.toString()) {
                throw new Error("Invalid conversation");
            }

            if (message.senderId.toString() !== userId.toString()) {
                throw new Error("Only creator can close poll");
            }

            if (!message.poll) {
                throw new Error("Poll data missing");
            }

            message.poll.isClosed = true;

            await message.save();

            const rawClosedPoll = (message.poll as any)?.toObject ? (message.poll as any).toObject() : message.poll;
            const convForClosed = await Conversation.findById(data.conversationId).select("participants").lean();
            const closedParticipants = (convForClosed?.participants || []).map((p: any) => p.toString());

            if (rawClosedPoll?.isAnonymous && closedParticipants.length > 0) {
                closedParticipants.forEach((pid: string) => {
                    io.to(userRoom(pid)).emit("pollUpdated", {
                        success: true,
                        data: {
                            messageId: data.messageId,
                            conversationId: data.conversationId,
                            poll: maskAnonymousPoll(rawClosedPoll, pid),
                        },
                    });
                });
            } else {
                io.to(data.conversationId).emit("pollUpdated", {
                    success: true,
                    data: {
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        poll: rawClosedPoll,
                    },
                });
            }

            socket.emit("closePoll", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: maskAnonymousPoll(rawClosedPoll, userId),
                },
            });
        } catch (error: any) {
            console.log("closePoll error:", error);

            socket.emit("closePoll", {
                success: false,
                msg: error.message || "Failed to close poll",
            });
        }
    });

    // ─────────────────────────────────────────────
    // TOGGLE STAR MESSAGE (Feature 2)
    // ─────────────────────────────────────────────
    socket.on("toggleStarMessage", async (data: { messageId: string; conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!userId) {
                socket.emit("toggleStarMessage", { success: false, msg: "Unauthorized" });
                return;
            }

            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("toggleStarMessage", { success: false, msg: "Conversation or message not found" });
                return;
            }
            const foundMsg: any = await Message.findById(data.messageId).select("conversationId isDeleted isViewOnce").lean();
            if (!foundMsg) {
                socket.emit("toggleStarMessage", { success: false, msg: "Message not found" });
                return;
            }
            if (foundMsg.isDeleted || foundMsg.isViewOnce) {
                socket.emit("toggleStarMessage", { success: false, msg: "This message cannot be starred" });
                return;
            }
            const actualConvId = foundMsg.conversationId.toString();
            if (data.conversationId && data.conversationId.toString() !== actualConvId) {
                socket.emit("toggleStarMessage", { success: false, msg: "Message not found in conversation" });
                return;
            }

            const conversation = await Conversation.findOne({
                _id: actualConvId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("toggleStarMessage", { success: false, msg: "Not a member" });
                return;
            }

            const deleted = await SavedMessage.findOneAndDelete({ userId, messageId: data.messageId }).lean();
            let isSaved = false;
            if (!deleted) {
                await SavedMessage.findOneAndUpdate(
                    { userId, messageId: data.messageId },
                    {
                        $setOnInsert: {
                            userId,
                            messageId: data.messageId,
                            conversationId: actualConvId,
                        },
                    },
                    { upsert: true, new: true }
                );
                isSaved = true;
            }

            socket.emit("toggleStarMessage", {
                success: true,
                data: { messageId: data.messageId, conversationId: actualConvId, isSaved },
            });
        } catch (error: any) {
            console.log("toggleStarMessage error:", error);
            socket.emit("toggleStarMessage", { success: false, msg: "Failed to toggle star" });
        }
    });

    // ─────────────────────────────────────────────
    // GET STARRED MESSAGES (Feature 2)
    // ─────────────────────────────────────────────
    socket.on("getStarredMessages", async (data: { page?: number; limit?: number }) => {
        try {
            const userId = socket.data.userId;
            if (!userId) {
                socket.emit("getStarredMessages", { success: false, msg: "Unauthorized" });
                return;
            }

            const page = Math.max(1, Number(data?.page) || 1);
            const limit = Math.min(50, Math.max(1, Number(data?.limit) || 20));
            const skip = (page - 1) * limit;

            const saved = await SavedMessage.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit + 1)
                .populate({
                    path: "messageId",
                    populate: { path: "senderId", select: "name avatar" }
                })
                .populate({
                    path: "conversationId",
                    select: "name type avatar participants",
                    populate: { path: "participants", select: "name avatar" }
                })
                .lean();

            const hasMore = saved.length > limit;
            const slice = hasMore ? saved.slice(0, limit) : saved;

            const starNow = new Date();
            const formatted = slice
                .filter((s: any) => s.messageId && !s.messageId.isDeleted && (!s.messageId.expiresAt || new Date(s.messageId.expiresAt) > starNow))
                .map((s: any) => ({
                    savedId: s._id?.toString() || "",
                    savedAt: s.createdAt,
                    conversationId: (s.conversationId?._id ? s.conversationId._id.toString() : s.conversationId?.toString() || s.messageId?.conversationId?.toString()) || "",
                    conversation: s.conversationId?._id ? {
                        id: s.conversationId._id.toString(),
                        name: s.conversationId.name || "",
                        type: s.conversationId.type || "direct",
                        avatar: s.conversationId.avatar || "",
                        participants: s.conversationId.participants || [],
                    } : null,
                    message: formatMessagePayload(s.messageId, {
                        sender: s.messageId.senderId ? {
                            id: s.messageId.senderId._id?.toString(),
                            name: s.messageId.senderId.name,
                            avatar: s.messageId.senderId.avatar,
                        } : undefined,
                    }),
                }));

            socket.emit("getStarredMessages", {
                success: true,
                data: formatted,
                page,
                hasMore,
            });
        } catch (error: any) {
            console.log("getStarredMessages error:", error);
            socket.emit("getStarredMessages", { success: false, msg: "Failed to fetch starred messages" });
        }
    });

    // ─────────────────────────────────────────────
    // PIN MESSAGE (Feature 3)
    // ─────────────────────────────────────────────
    socket.on("pinMessage", async (data: { conversationId: string; messageId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId) || !data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("pinMessage", { success: false, msg: "Invalid conversation or message" });
                return;
            }
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("pinMessage", { success: false, msg: "Conversation not found" });
                return;
            }

            if (conversation.type === "group") {
                const isAdmin = conversation.admins?.some((a) => a.toString() === userId) ||
                    conversation.createdBy?.toString() === userId;
                if (!isAdmin) {
                    socket.emit("pinMessage", { success: false, msg: "Only admins can pin messages" });
                    return;
                }
            }

            const message = await Message.findById(data.messageId);
            if (!message || message.isDeleted || message.conversationId.toString() !== data.conversationId) {
                socket.emit("pinMessage", { success: false, msg: "Message not found" });
                return;
            }

            const [populatedConv] = await Promise.all([
                Conversation.findOneAndUpdate(
                    { _id: data.conversationId, participants: userId },
                    { $addToSet: { pinnedMessages: message._id } },
                    { new: true }
                )
                    .select("pinnedMessages")
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted",
                        populate: { path: "senderId", select: "name avatar" }
                    })
                    .lean(),
                message.isPinned
                    ? Promise.resolve()
                    : Message.updateOne({ _id: message._id }, { isPinned: true }),
            ]);

            const pinnedPayload = formatPinnedMessages(populatedConv?.pinnedMessages || []);

            io.to(data.conversationId).emit("pinnedMessageUpdated", {
                success: true,
                data: {
                    conversationId: data.conversationId,
                    pinnedMessages: pinnedPayload,
                    action: "pinned",
                    messageId: data.messageId,
                },
            });

            socket.emit("pinMessage", { success: true, data: pinnedPayload });
        } catch (error: any) {
            console.log("pinMessage error:", error);
            socket.emit("pinMessage", { success: false, msg: "Failed to pin message" });
        }
    });

    // ─────────────────────────────────────────────
    // UNPIN MESSAGE (Feature 3)
    // ─────────────────────────────────────────────
    socket.on("unpinMessage", async (data: { conversationId: string; messageId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId) || !data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("unpinMessage", { success: false, msg: "Invalid conversation or message" });
                return;
            }
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("unpinMessage", { success: false, msg: "Conversation not found" });
                return;
            }

            if (conversation.type === "group") {
                const isAdmin = conversation.admins?.some((a) => a.toString() === userId) ||
                    conversation.createdBy?.toString() === userId;
                if (!isAdmin) {
                    socket.emit("unpinMessage", { success: false, msg: "Only admins can unpin messages" });
                    return;
                }
            }

            const [populatedConv] = await Promise.all([
                Conversation.findOneAndUpdate(
                    { _id: data.conversationId, participants: userId },
                    { $pull: { pinnedMessages: data.messageId } },
                    { new: true }
                )
                    .select("pinnedMessages")
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted",
                        populate: { path: "senderId", select: "name avatar" }
                    })
                    .lean(),
                Message.findOneAndUpdate(
                    { _id: data.messageId, conversationId: data.conversationId },
                    { isPinned: false }
                ),
            ]);

            const pinnedPayload = formatPinnedMessages(populatedConv?.pinnedMessages || []);

            io.to(data.conversationId).emit("pinnedMessageUpdated", {
                success: true,
                data: {
                    conversationId: data.conversationId,
                    pinnedMessages: pinnedPayload,
                    action: "unpinned",
                    messageId: data.messageId,
                },
            });

            socket.emit("unpinMessage", { success: true, data: pinnedPayload });
        } catch (error: any) {
            console.log("unpinMessage error:", error);
            socket.emit("unpinMessage", { success: false, msg: "Failed to unpin message" });
        }
    });

    // ─────────────────────────────────────────────
    // FORWARD MESSAGE (Feature 5)
    // ─────────────────────────────────────────────
    socket.on("forwardMessage", async (data: { messageId: string; targetConversationIds: string[] }) => {
        try {
            const senderId = socket.data.userId;
            if (!senderId) {
                socket.emit("forwardMessage", { success: false, msg: "Unauthorized" });
                return;
            }

            if (!Array.isArray(data.targetConversationIds) || data.targetConversationIds.length === 0) {
                socket.emit("forwardMessage", { success: false, msg: "No recipient conversations provided" });
                return;
            }

            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("forwardMessage", { success: false, msg: "Invalid message" });
                return;
            }

            const original = await Message.findById(data.messageId).lean();
            if (!original || original.isDeleted || original.isViewOnce || original.type === "system" || original.type === "call" || original.type === "poll"
                || (original.expiresAt && new Date(original.expiresAt as any) <= new Date())) {
                socket.emit("forwardMessage", { success: false, msg: "Message not found or cannot be forwarded" });
                return;
            }

            // IDOR fix: Ensure requester is a member of the source message's conversation
            const sourceConv = await Conversation.exists({
                _id: original.conversationId,
                participants: senderId,
            });
            if (!sourceConv) {
                socket.emit("forwardMessage", { success: false, msg: "Not authorized to forward this message" });
                return;
            }

            const results = await Promise.allSettled(
                data.targetConversationIds.map((targetId) =>
                    createAndBroadcastMessage({
                        conversationId: targetId,
                        senderId,
                        content: original.content,
                        attachement: original.attachement,
                        attachmentMeta: original.attachmentMeta as any,
                        voiceUrl: original.voiceUrl,
                        voiceDuration: original.voiceDuration,
                        location: original.location as any,
                        type: original.type,
                        checklist: (original as any).checklist || undefined,
                        isForwarded: true,
                    })
                )
            );
            const sentCount = results.filter((r) => r.status === "fulfilled").length;

            socket.emit("forwardMessage", { success: true, data: { sentCount } });
        } catch (error: any) {
            console.log("forwardMessage error:", error);
            socket.emit("forwardMessage", { success: false, msg: "Failed to forward message" });
        }
    });

    // ─────────────────────────────────────────────
    // OPEN VIEW ONCE (Feature 7)
    // ─────────────────────────────────────────────
    socket.on("openViewOnce", async (data: { messageId: string; conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("openViewOnce", { success: false, msg: "Invalid message" });
                return;
            }
            const message = await Message.findById(data.messageId);
            if (!message || !message.isViewOnce) {
                socket.emit("openViewOnce", { success: false, msg: "Not a view-once message" });
                return;
            }

            const actualConvId = message.conversationId.toString();
            const isParticipant = await Conversation.exists({ _id: actualConvId, participants: userId });
            if (!isParticipant) {
                socket.emit("openViewOnce", { success: false, msg: "Not authorized" });
                return;
            }

            const alreadyViewed = (message.viewOnceOpenedBy || []).some(
                (u) => u.toString() === userId
            );

            if (!alreadyViewed) {
                if (!message.viewOnceOpenedBy) message.viewOnceOpenedBy = [];
                message.viewOnceOpenedBy.push(userId as any);
                await message.save();
            }

            io.to(actualConvId).emit("viewOnceOpened", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: actualConvId,
                    userId,
                },
            });

            socket.emit("openViewOnce", { success: true });
        } catch (error: any) {
            console.log("openViewOnce error:", error);
            socket.emit("openViewOnce", { success: false, msg: "Failed to open view-once media" });
        }
    });

    // ─────────────────────────────────────────────
    // TOGGLE MUTE CONVERSATION (Feature 9)
    // ─────────────────────────────────────────────
    socket.on("toggleMuteConversation", async (data: { conversationId: string; durationHours?: number; unmute?: boolean }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) {
                socket.emit("toggleMuteConversation", { success: false, msg: "Invalid conversation" });
                return;
            }
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("toggleMuteConversation", { success: false, msg: "Conversation not found" });
                return;
            }

            if (!conversation.mutedBy) conversation.mutedBy = [];
            conversation.mutedBy = conversation.mutedBy.filter(
                (m) => m.userId.toString() !== userId
            );

            let isMuted = false;
            let until: Date | null = null;

            if (!data.unmute) {
                isMuted = true;
                if (data.durationHours && data.durationHours > 0) {
                    until = new Date(Date.now() + data.durationHours * 3600 * 1000);
                } else {
                    until = null;
                }
                conversation.mutedBy.push({ userId: userId as any, until });
            }

            await conversation.save();

            socket.emit("toggleMuteConversation", {
                success: true,
                data: {
                    conversationId: data.conversationId,
                    isMuted,
                    mutedUntil: until ? until.toISOString() : null,
                },
            });
        } catch (error: any) {
            console.log("toggleMuteConversation error:", error);
            socket.emit("toggleMuteConversation", { success: false, msg: "Failed to update mute settings" });
        }
    });

    // ── Pin / Unpin Conversation for current user ──
    socket.on("togglePinConversation", async (data: { conversationId: string; pin: boolean }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const op = data.pin
                ? { $addToSet: { pinnedBy: userId } }
                : { $pull: { pinnedBy: userId } };
            const conv = await Conversation.findOneAndUpdate(
                { _id: data.conversationId, participants: userId },
                op,
                { new: true }
            );
            if (!conv) return;
            socket.emit("togglePinConversation", {
                success: true,
                data: { conversationId: data.conversationId, isPinned: !!data.pin },
            });
        } catch (error) {
            console.log("togglePinConversation error:", error);
        }
    });

    // ── Mark Conversation Unread for current user ──
    socket.on("markAsUnread", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const conv = await Conversation.findOne({ _id: data.conversationId, participants: userId });
            if (!conv) return;
            const entry = conv.unreadCounts.find((u: any) => u.userId.toString() === userId.toString());
            if (entry) {
                entry.count = Math.max(1, entry.count);
            } else {
                conv.unreadCounts.push({ userId: userId as any, count: 1 });
            }
            await conv.save();
            socket.emit("unreadCountUpdate", { conversationId: data.conversationId, unreadCount: entry?.count || 1 });
        } catch (error) {
            console.log("markAsUnread error:", error);
        }
    });

    // ── Archive / Unarchive Conversation for current user ──
    socket.on("toggleArchiveConversation", async (data: { conversationId: string; archive: boolean }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const op = data.archive
                ? { $addToSet: { archivedBy: userId } }
                : { $pull: { archivedBy: userId } };
            const conv = await Conversation.findOneAndUpdate(
                { _id: data.conversationId, participants: userId },
                op,
                { new: true }
            );
            if (!conv) return;
            socket.emit("toggleArchiveConversation", {
                success: true,
                data: { conversationId: data.conversationId, isArchived: !!data.archive },
            });
        } catch (error) {
            console.log("toggleArchiveConversation error:", error);
        }
    });

    // ── Toggle Checklist Item ──
    socket.on("toggleChecklistItem", async (data: {
        messageId: string;
        conversationId: string;
        itemId: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.messageId || !isValidObjectId(data.messageId) || !data?.conversationId || !isValidObjectId(data.conversationId) || !data?.itemId) {
                return;
            }
            const conv = await Conversation.findOne({ _id: data.conversationId, participants: userId }).select("_id").lean();
            if (!conv) return;

            const existingMsg = await Message.findOne({
                _id: data.messageId,
                conversationId: data.conversationId,
                type: "checklist",
                isDeleted: { $ne: true },
                "checklist.items.id": data.itemId,
            }).select("checklist.items").lean();
            const existingItem = (existingMsg as any)?.checklist?.items?.find((it: any) => it.id === data.itemId);
            if (!existingItem) return;

            const nextCompleted = !existingItem.completed;
            const updatedMsg = await Message.findOneAndUpdate(
                {
                    _id: data.messageId,
                    conversationId: data.conversationId,
                    type: "checklist",
                    isDeleted: { $ne: true },
                    "checklist.items.id": data.itemId,
                },
                {
                    $set: {
                        "checklist.items.$.completed": nextCompleted,
                        "checklist.items.$.completedBy": nextCompleted ? (socket.data.name || userId) : "",
                    },
                },
                { new: true }
            ).select("checklist").lean();

            if (!updatedMsg || !(updatedMsg as any).checklist) return;

            io.to(data.conversationId).emit("checklistUpdated", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    checklist: (updatedMsg as any).checklist,
                },
            });
        } catch (error) {
            console.log("toggleChecklistItem error:", error);
        }
    });

    // ── Hide / Delete Conversation from current user's chat list ──
    socket.on("deleteConversation", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) return;
            await Conversation.findOneAndUpdate(
                { _id: data.conversationId, participants: userId },
                { $addToSet: { deletedFor: userId } }
            );
            socket.emit("deleteConversation", { success: true, data: { conversationId: data.conversationId } });
        } catch (error) {
            console.log("deleteConversation error:", error);
        }
    });
}

