import { Server as SocketIOServer, Socket } from "socket.io";
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

            const conversations = await Conversation.find({ participants: userId })
                .sort({ updatedAt: -1 })
                .populate({ path: "lastMessage", select: "content senderId attachement createdAt voiceUrl voiceDuration isDeleted type attachmentMeta location systemEvent callMeta" })
                .populate({ path: "participants", select: "name avatar email isOnline lastSeen" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();

            const conversationsWithUnread = conversations.map(conv => {
                const unreadEntry = (conv.unreadCounts || []).find(
                    (u: any) => u.userId.toString() === userId.toString()
                );
                return { ...conv, unreadCount: unreadEntry?.count || 0 };
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
                    .populate({ path: "participants", select: "name avatar email" })
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
            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            });
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

            const totalCount = await Message.countDocuments({ conversationId: data.conversationId });

            const messages = await Message.find({ conversationId: data.conversationId })
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
                .lean();

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
            });
        } catch (error) {
            console.log("getMessages error:", error);
            socket.emit("getMessages", { success: false, msg: "Failed to fetch messages" });
        }
    });

    socket.on("markAsRead", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
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

            const existingIndex = message.reactions.findIndex(
                (r: any) => r.userId.toString() === userId && r.emoji === data.emoji
            );

            if (existingIndex !== -1) {
                message.reactions.splice(existingIndex, 1);
            } else {
                const otherIndex = message.reactions.findIndex(
                    (r: any) => r.userId.toString() === userId
                );
                if (otherIndex !== -1) message.reactions.splice(otherIndex, 1);
                message.reactions.push({ emoji: data.emoji, userId, userName: socket.data.name });
            }

            await message.save();

            io.to(data.conversationId).emit("reactToMessage", {
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
            const message = await Message.findById(data.messageId);
            if (!message) {
                socket.emit("deleteMessage", { success: false, msg: "Message not found" });
                return;
            }
            if (message.senderId.toString() !== userId.toString()) {
                socket.emit("deleteMessage", { success: false, msg: "You can only delete your own messages" });
                return;
            }

            message.isDeleted = true;
            message.content = "";
            message.attachement = undefined;
            message.voiceUrl = undefined;
            message.attachmentMeta = undefined;
            message.location = undefined;
            await message.save();

            io.to(data.conversationId).emit("deleteMessage", {
                success: true,
                data: { messageId: data.messageId, conversationId: data.conversationId },
            });

        } catch (error) {
            console.log("deleteMessage error:", error);
            socket.emit("deleteMessage", { success: false, msg: "Failed to delete message" });
        }
    });

    socket.on("editMessage", async (data: { messageId: string; conversationId: string; content: string }) => {
        try {
            const userId = socket.data.userId;

            if (!data.content?.trim()) {
                socket.emit("editMessage", { success: false, msg: "Message content cannot be empty" });
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

            io.to(data.conversationId).emit("editMessage", {
                success: true,
                data: {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
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
}

