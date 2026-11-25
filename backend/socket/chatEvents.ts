import { Server as SocketIOServer, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";
import User from "../modals/User";
import { createAndBroadcastMessage } from "../services/messageService";
import { formatMessagePayload } from "../utils/messageFormat";
import { sanitizeLastSeen } from "../utils/permissions";
import SavedMessage from "../modals/SavedMessage";
import { userRoom } from "./io";

export function registerChatEvents(io: SocketIOServer, socket: Socket) {

    socket.on("getConversations", async () => {
        try {
            const userId = socket.data.userId;
            if (!userId) {
                socket.emit("getConversations", { success: false, msg: "Unauthorized" });
                return;
            }

            const conversations = await Conversation.find({
                participants: userId,
                deletedFor: { $ne: userId },
            })
                .sort({ updatedAt: -1 })
                .populate({ path: "lastMessage", select: "content senderId attachement createdAt voiceUrl voiceDuration isDeleted type attachmentMeta location systemEvent callMeta" })
                .populate({ path: "participants", select: "name avatar email isOnline lastSeen" })
                .populate({ path: "admins", select: "name avatar" })
                .populate({
                    path: "pinnedMessages",
                    select: "content senderId type createdAt isDeleted",
                    populate: { path: "senderId", select: "name avatar" }
                })
                .lean();

            const now = new Date();
            const conversationsWithUnread = conversations.map((conv: any) => {
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
                return {
                    ...conv,
                    unreadCount: unreadEntry?.count || 0,
                    isMuted,
                    mutedUntil: muteEntry?.until || null,
                    isPinned,
                };
            });

            socket.emit("getConversations", { success: true, data: conversationsWithUnread });
        } catch (error: any) {
            console.log("getConversations error:", error);
            socket.emit("getConversations", { success: false, msg: "Failed to fetch conversations" });
        }
    });

    socket.on("newConversation", async (data) => {
        try {
            const userId = socket.data.userId;
            if (!Array.isArray(data?.participants) || !data.participants.includes(userId)) {
                socket.emit("newConversation", { success: false, msg: "Invalid participants" });
                return;
            }

            if (data.type == "direct") {
                if (data.participants.length !== 2) {
                    socket.emit("newConversation", { success: false, msg: "Direct chats need 2 participants" });
                    return;
                }
                const existingConversation = await Conversation.findOne({
                    type: "direct",
                    participants: { $all: data.participants, $size: 2 },
                })
                    .populate({ path: "participants", select: "name avatar email isOnline lastSeen" })
                    .populate({ path: "admins", select: "name avatar" })
                    .populate({ path: "lastMessage", select: "content senderId attachement createdAt voiceUrl voiceDuration isDeleted type attachmentMeta location systemEvent callMeta" })
                    .lean();

                if (existingConversation) {
                    const unreadEntry = (existingConversation.unreadCounts || []).find(
                        (u: any) => u.userId.toString() === userId.toString()
                    );
                    socket.emit("newConversation", {
                        success: true,
                        data: { ...existingConversation, isNew: false, unreadCount: unreadEntry?.count || 0 }
                    });
                    return;
                }
            }

            if (data.type === "group") {
                if (!data.name?.trim()) {
                    socket.emit("newConversation", { success: false, msg: "Group name is required" });
                    return;
                }
                if (data.participants.length < 2) {
                    socket.emit("newConversation", { success: false, msg: "Add at least two members" });
                    return;
                }
            }

            const conversation = await Conversation.create({
                type: data.type,
                participants: data.participants,
                name: data.name || "",
                description: data.description || "",
                avatar: data.avatar || "",
                createdBy: userId,
                admins: data.type === "group" ? [userId] : [],
                unreadCounts: data.participants.map((pId: string) => ({ userId: pId, count: 0 })),
            });

            const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
                s => data.participants.includes(s.data.userId)
            );
            connectedSockets.forEach(participantSocket => {
                participantSocket.join(conversation._id.toString());
            });

            const populatedConversation = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
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
            if (!userId || !data?.messageId || !data?.conversationId) return;

            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            }).select("_id").lean();

            if (!conversation) return;

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

            const PAGE_LIMIT = Math.min(data.limit || 30, 50);
            let page = data.page || 0;
            let skip = page * PAGE_LIMIT;

            if (data.aroundMessageId) {
                const target = await Message.findById(data.aroundMessageId).select("createdAt conversationId").lean();
                if (target && target.conversationId.toString() === data.conversationId) {
                    const newerCount = await Message.countDocuments({
                        conversationId: data.conversationId,
                        createdAt: { $gt: target.createdAt },
                    });
                    page = Math.floor(newerCount / PAGE_LIMIT);
                    skip = page * PAGE_LIMIT;
                }
            }

            // High-speed parallel execution for count, message batch, and pinned messages
            const [totalCount, messages, conversationDoc] = await Promise.all([
                Message.countDocuments({ conversationId: data.conversationId }),
                Message.find({ conversationId: data.conversationId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(PAGE_LIMIT)
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
                        } | null
                    }>({
                        path: "replyTo",
                        select: "content senderId voiceUrl type",
                        populate: { path: "senderId", select: "name" }
                    })
                    .lean(),
                Conversation.findById(data.conversationId)
                    .select("pinnedMessages")
                    .populate({
                        path: "pinnedMessages",
                        select: "content senderId type createdAt isDeleted",
                        populate: { path: "senderId", select: "name avatar" },
                    })
                    .lean(),
            ]);

            const saved = await SavedMessage.find({
                userId,
                messageId: { $in: messages.map((m) => m._id) },
            }).select("messageId").lean();
            const savedSet = new Set(saved.map((s) => s.messageId.toString()));

            const messagesWithSender = messages.map(message => ({
                ...formatMessagePayload(message, {
                    sender: {
                        id: (message.senderId as any)?._id,
                        name: (message.senderId as any)?.name,
                        avatar: (message.senderId as any)?.avatar,
                    },
                    replyTo: message.replyTo ? {
                        id: (message.replyTo as any)._id,
                        content: (message.replyTo as any).content,
                        senderName: (message.replyTo as any).senderId?.name || "Unknown",
                        voiceUrl: (message.replyTo as any).voiceUrl || null,
                        type: (message.replyTo as any).type,
                    } : null,
                }),
                isSaved: savedSet.has(message._id.toString()),
            }));

            socket.emit("getMessages", {
                success: true,
                data: messagesWithSender,
                page,
                hasMore: skip + PAGE_LIMIT < totalCount,
                totalCount,
                aroundMessageId: data.aroundMessageId || null,
                pinnedMessages: (conversationDoc?.pinnedMessages || []).map((pm: any) => ({
                    id: pm._id.toString(),
                    content: pm.content,
                    type: pm.type,
                    createdAt: pm.createdAt,
                    sender: pm.senderId ? {
                        id: pm.senderId._id?.toString(),
                        name: pm.senderId.name,
                        avatar: pm.senderId.avatar,
                    } : null,
                })),
            });
        } catch (error) {
            console.log("getMessages error:", error);
            socket.emit("getMessages", { success: false, msg: "Failed to fetch messages" });
        }
    });

    socket.on("markAsRead", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.conversationId || !isValidObjectId(data.conversationId)) return;
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
            if (!conversation) return;

            await Conversation.findByIdAndUpdate(
                data.conversationId,
                { $set: { "unreadCounts.$[elem].count": 0 } },
                { arrayFilters: [{ "elem.userId": userId }], new: true }
            );
            socket.emit("unreadCountUpdate", { conversationId: data.conversationId, unreadCount: 0 });

            const senderPrivacy = await User.findById(userId).select("privacy").lean();
            if (senderPrivacy?.privacy?.readReceipts !== false) {
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
        const userId = socket.data.userId;
        const me = await User.findById(userId).select("privacy").lean();
        if (me?.privacy?.typingIndicators === false) return;
        socket.to(data.conversationId).emit("typing", {
            conversationId: data.conversationId,
            senderId: userId,
            senderName: socket.data.name,
        });
    });

    socket.on("stopTyping", (data: { conversationId: string; senderId: string }) => {
        socket.to(data.conversationId).emit("stopTyping", {
            conversationId: data.conversationId,
            senderId: socket.data.userId,
        });
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
            await message.save();

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

    socket.on("editMessage", async (data: { messageId: string; conversationId: string; content: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("editMessage", { success: false, msg: "Message not found" });
                return;
            }

            if (!data.content?.trim()) {
                socket.emit("editMessage", { success: false, msg: "Message content cannot be empty" });
                return;
            }

            if (data.content.length > 5000) {
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
            if (message.voiceUrl || ["voice", "file", "location", "call", "system"].includes(message.type)) {
                socket.emit("editMessage", { success: false, msg: "Cannot edit this message type" });
                return;
            }

            message.content = data.content.trim();
            message.isEdited = true;
            await message.save();

            // Always emit to the genuine conversation room
            io.to(message.conversationId.toString()).emit("editMessage", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: message.conversationId.toString(),
                    content: message.content,
                    isEdited: true,
                },
            });

        } catch (error) {
            console.log("editMessage error:", error);
            socket.emit("editMessage", { success: false, msg: "Failed to edit message" });
        }
    });

    socket.on("getUserStatus", async (data: { userId: string }) => {
        try {
            const viewerId = socket.data.userId;
            if (!data?.userId || !isValidObjectId(data.userId)) {
                socket.emit("getUserStatus", { success: false, msg: "Invalid userId" });
                return;
            }
            const user = await User.findById(data.userId).select("isOnline lastSeen privacy").lean();
            if (!user) {
                socket.emit("getUserStatus", { success: false, msg: "User not found" });
                return;
            }
            const shared = await Conversation.exists({
                type: "direct",
                participants: { $all: [viewerId, data.userId], $size: 2 },
            });
            const status = sanitizeLastSeen(viewerId, user, !!shared);
            socket.emit("getUserStatus", {
                success: true,
                data: {
                    userId: data.userId,
                    isOnline: status.isOnline,
                    lastSeen: status.lastSeen,
                    hidden: status.hidden,
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

            if (!data.question?.trim()) {
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

            const options = data.options
                .filter((option) => option?.trim())
                .map((text, index) => ({
                    id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
                    text: text.trim(),
                    votes: [],
                }));

            if (options.length < 2) {
                throw new Error("At least 2 valid options required");
            }

            const message = await Message.create({
                conversationId: data.conversationId,
                senderId,
                type: "poll",
                content: data.question.trim(),
                poll: {
                    question: data.question.trim(),
                    options,
                    allowMultiple: data.allowMultiple ?? false,
                    isAnonymous: data.isAnonymous ?? false,
                    endsAt: data.endsAt ? new Date(data.endsAt) : null,
                    isClosed: false,
                },
            });

            const populated = await Message.findById(message._id)
                .populate("senderId", "name avatar")
                .lean();

            if (!populated) {
                throw new Error("Failed to create poll");
            }

            const payload = {
                id: populated._id.toString(),
                conversationId: data.conversationId,
                sender: {
                    id: (populated.senderId as any)._id.toString(),
                    name: (populated.senderId as any).name,
                    avatar: (populated.senderId as any).avatar || null,
                },
                type: "poll",
                content: data.question.trim(),
                poll: populated.poll,
                reactions: [],
                createdAt: populated.createdAt,
                isDeleted: false,
                isEdited: false,
            };

            for (const participantId of conversation.participants) {
                if (participantId.toString() === senderId.toString()) continue;

                const unreadEntry = conversation.unreadCounts.find(
                    (u: any) => u.userId.toString() === participantId.toString()
                );

                if (unreadEntry) {
                    unreadEntry.count += 1;
                } else {
                    conversation.unreadCounts.push({
                        userId: participantId,
                        count: 1,
                    } as any);
                }
            }

            conversation.lastMessage = message._id as any;
            await conversation.save();

            io.to(data.conversationId).emit("newMessage", {
                success: true,
                data: payload,
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

            io.to(data.conversationId).emit("pollUpdated", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: message.poll,
                },
            });

            socket.emit("votePoll", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: message.poll,
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

            io.to(data.conversationId).emit("pollUpdated", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: message.poll,
                },
            });

            socket.emit("closePoll", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    poll: message.poll,
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

            let convId: string | undefined = data?.conversationId;
            if (!convId && data?.messageId && isValidObjectId(data.messageId)) {
                const foundMsg: any = await Message.findById(data.messageId).select("conversationId").lean();
                convId = foundMsg?.conversationId?.toString();
            }
            if (!convId || !isValidObjectId(convId) || !data?.messageId || !isValidObjectId(data.messageId)) {
                socket.emit("toggleStarMessage", { success: false, msg: "Conversation or message not found" });
                return;
            }

            const conversation = await Conversation.findOne({
                _id: convId,
                participants: userId,
            });
            if (!conversation) {
                socket.emit("toggleStarMessage", { success: false, msg: "Not a member" });
                return;
            }

            const existing = await SavedMessage.findOne({ userId, messageId: data.messageId });
            let isSaved = false;
            if (existing) {
                await SavedMessage.deleteOne({ _id: existing._id });
                isSaved = false;
            } else {
                await SavedMessage.create({
                    userId,
                    messageId: data.messageId,
                    conversationId: convId,
                });
                isSaved = true;
            }

            socket.emit("toggleStarMessage", {
                success: true,
                data: { messageId: data.messageId, conversationId: convId, isSaved },
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
                .limit(limit)
                .populate({
                    path: "messageId",
                    populate: { path: "senderId", select: "name avatar" }
                })
                .lean();

            const formatted = saved
                .filter((s: any) => s.messageId && !s.messageId.isDeleted)
                .map((s: any) => ({
                    savedId: s._id?.toString() || "",
                    savedAt: s.createdAt,
                    conversationId: (s.conversationId ? s.conversationId.toString() : s.messageId?.conversationId?.toString()) || "",
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
                hasMore: formatted.length === limit,
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
            if (!message || message.conversationId.toString() !== data.conversationId) {
                socket.emit("pinMessage", { success: false, msg: "Message not found" });
                return;
            }

            if (!conversation.pinnedMessages) conversation.pinnedMessages = [];
            const alreadyPinned = conversation.pinnedMessages.some(
                (p) => p.toString() === data.messageId
            );

            if (!alreadyPinned) {
                conversation.pinnedMessages.push(message._id as any);
                await conversation.save();
                message.isPinned = true;
                await message.save();
            }

            const populatedConv = await Conversation.findById(conversation._id)
                .select("pinnedMessages")
                .populate({
                    path: "pinnedMessages",
                    select: "content senderId type createdAt isDeleted",
                    populate: { path: "senderId", select: "name avatar" }
                })
                .lean();

            const pinnedPayload = (populatedConv?.pinnedMessages || []).map((pm: any) => ({
                id: pm._id.toString(),
                content: pm.content,
                type: pm.type,
                createdAt: pm.createdAt,
                sender: pm.senderId ? {
                    id: pm.senderId._id?.toString(),
                    name: pm.senderId.name,
                    avatar: pm.senderId.avatar,
                } : null,
            }));

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

            conversation.pinnedMessages = (conversation.pinnedMessages || []).filter(
                (p) => p.toString() !== data.messageId
            );
            await conversation.save();

            await Message.findByIdAndUpdate(data.messageId, { isPinned: false });

            const populatedConv = await Conversation.findById(conversation._id)
                .select("pinnedMessages")
                .populate({
                    path: "pinnedMessages",
                    select: "content senderId type createdAt isDeleted",
                    populate: { path: "senderId", select: "name avatar" }
                })
                .lean();

            const pinnedPayload = (populatedConv?.pinnedMessages || []).map((pm: any) => ({
                id: pm._id.toString(),
                content: pm.content,
                type: pm.type,
                createdAt: pm.createdAt,
                sender: pm.senderId ? {
                    id: pm.senderId._id?.toString(),
                    name: pm.senderId.name,
                    avatar: pm.senderId.avatar,
                } : null,
            }));

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
            if (!original || original.isDeleted) {
                socket.emit("forwardMessage", { success: false, msg: "Message not found or deleted" });
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

            let sentCount = 0;
            for (const targetId of data.targetConversationIds) {
                try {
                    await createAndBroadcastMessage({
                        conversationId: targetId,
                        senderId,
                        content: original.content,
                        attachement: original.attachement,
                        attachmentMeta: original.attachmentMeta as any,
                        voiceUrl: original.voiceUrl,
                        voiceDuration: original.voiceDuration,
                        type: original.type,
                        isForwarded: true,
                    });
                    sentCount++;
                } catch (err) {
                    console.log(`Failed to forward to conversation ${targetId}:`, err);
                }
            }

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

