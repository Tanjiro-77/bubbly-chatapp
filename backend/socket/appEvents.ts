import { Server as SocketIOServer, Socket } from "socket.io";
import User from "../modals/User";
import Story from "../modals/Story";
import SavedMessage from "../modals/SavedMessage";
import ScheduledMessage from "../modals/ScheduledMessage";
import Message from "../modals/Message";
import Report from "../modals/Report";
import Conversation from "../modals/Conversation";
import { getMembership } from "../utils/permissions";
import { assertRateLimit } from "../utils/rateLimit";
import { createAndBroadcastMessage } from "../services/messageService";
import { getIO, userRoom } from "./io";

function storyVisibleTo(story: any, viewerId: string, author: any) {
    if (story.userId.toString() === viewerId) return true;
    const hidden = [...(story.hiddenFrom || []), ...(author.privacy?.storyHiddenFrom || [])]
        .map((id: any) => id.toString());
    if (hidden.includes(viewerId)) return false;
    return true;
}

export function registerAppEvents(io: SocketIOServer, socket: Socket) {
    const userId: string = socket.data.userId;

    socket.on("updatePrivacy", async (data) => {
        try {
            const allowedLastSeen = ["everyone", "contacts", "nobody"];
            const allowedStory = ["everyone", "contacts", "except"];
            const update: any = {};
            if (data.lastSeen && allowedLastSeen.includes(data.lastSeen)) update["privacy.lastSeen"] = data.lastSeen;
            if (typeof data.readReceipts === "boolean") update["privacy.readReceipts"] = data.readReceipts;
            if (typeof data.typingIndicators === "boolean") update["privacy.typingIndicators"] = data.typingIndicators;
            if (data.storyPrivacy && allowedStory.includes(data.storyPrivacy)) update["privacy.storyPrivacy"] = data.storyPrivacy;
            if (Array.isArray(data.storyHiddenFrom)) update["privacy.storyHiddenFrom"] = data.storyHiddenFrom;
            if (data.theme) {
                if (data.theme.mode) update["theme.mode"] = data.theme.mode;
                if (data.theme.accent) update["theme.accent"] = data.theme.accent;
                if (typeof data.theme.wallpaper === "string") update["theme.wallpaper"] = data.theme.wallpaper;
                if (data.theme.bubbleStyle) update["theme.bubbleStyle"] = data.theme.bubbleStyle;
            }
            const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select("-password");
            socket.emit("updatePrivacy", { success: true, data: { privacy: user?.privacy, theme: user?.theme } });
        } catch (error: any) {
            socket.emit("updatePrivacy", { success: false, msg: error.message || "Failed to update privacy" });
        }
    });

    socket.on("setConversationWallpaper", async (data: { conversationId: string; wallpaper: string }) => {
        try {
            const { conversation, isMember } = await getMembership(data.conversationId, userId);
            if (!conversation || !isMember) throw new Error("Not a member");
            conversation.wallpaper = data.wallpaper || "";
            await conversation.save();
            socket.emit("setConversationWallpaper", { success: true, data: { wallpaper: conversation.wallpaper } });
        } catch (error: any) {
            socket.emit("setConversationWallpaper", { success: false, msg: error.message });
        }
    });

    socket.on("blockUser", async (data: { targetUserId: string; block: boolean }) => {
        try {
            if (data.targetUserId === userId) throw new Error("You cannot block yourself");
            if (data.block) {
                await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: data.targetUserId } });
            } else {
                await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: data.targetUserId } });
            }
            socket.emit("blockUser", { success: true, data: { targetUserId: data.targetUserId, blocked: data.block } });
        } catch (error: any) {
            socket.emit("blockUser", { success: false, msg: error.message || "Failed to update block" });
        }
    });

    socket.on("getBlockedUsers", async () => {
        try {
            const me = await User.findById(userId).populate({ path: "blockedUsers", select: "name avatar email" }).lean();
            socket.emit("getBlockedUsers", { success: true, data: me?.blockedUsers || [] });
        } catch {
            socket.emit("getBlockedUsers", { success: false, msg: "Failed to load blocked users" });
        }
    });

    socket.on("reportContent", async (data: {
        targetType: "user" | "message" | "group";
        targetUserId?: string;
        targetMessageId?: string;
        targetConversationId?: string;
        category: string;
        description?: string;
    }) => {
        try {
            assertRateLimit(`report:${userId}`, 8, 60_000);
            const categories = [
                "spam",
                "harassment",
                "hate",
                "nudity",
                "violence",
                "scam",
                "other",
            ] as const;
            const category = categories.find((item) => item === data.category);

            if (!category) {
                throw new Error("Invalid category");
            }
            const report = await Report.create({
                reporterId: userId,
                targetType: data.targetType,
                targetUserId: data.targetUserId,
                targetMessageId: data.targetMessageId,
                targetConversationId: data.targetConversationId,
                category: data.category as typeof categories[number],
                description: (data.description || "").slice(0, 1000),
            });
            socket.emit("reportContent", { success: true, data: { id: report._id } });
        } catch (error: any) {
            socket.emit("reportContent", { success: false, msg: error.message || "Failed to submit report" });
        }
    });

    socket.on("moderator:listReports", async () => {
        const me = await User.findById(userId).select("isModerator").lean();
        if (!me?.isModerator) {
            socket.emit("moderator:listReports", { success: false, msg: "Forbidden" });
            return;
        }
        const reports = await Report.find().sort({ createdAt: -1 }).limit(100)
            .populate("reporterId", "name email")
            .lean();
        socket.emit("moderator:listReports", { success: true, data: reports });
    });

    socket.on("saveMessage", async (data: { messageId: string; save: boolean }) => {
        try {
            const message = await Message.findById(data.messageId);
            if (!message) throw new Error("Message not found");
            const { isMember } = await getMembership(message.conversationId.toString(), userId);
            if (!isMember) throw new Error("Not allowed");
            if (data.save) {
                await SavedMessage.updateOne(
                    { userId, messageId: message._id },
                    { userId, messageId: message._id, conversationId: message.conversationId },
                    { upsert: true }
                );
            } else {
                await SavedMessage.deleteOne({ userId, messageId: message._id });
            }
            socket.emit("saveMessage", { success: true, data: { messageId: data.messageId, saved: data.save } });
            io.to(socket.id).emit("messageSaved", { messageId: data.messageId, saved: data.save });
        } catch (error: any) {
            socket.emit("saveMessage", { success: false, msg: error.message || "Failed to save message" });
        }
    });

    socket.on("getSavedMessages", async (data?: { query?: string }) => {
        try {
            const items = await SavedMessage.find({ userId })
                .sort({ createdAt: -1 })
                .populate({
                    path: "messageId",
                    populate: { path: "senderId", select: "name avatar" },
                })
                .populate({ path: "conversationId", select: "name type avatar participants" })
                .lean();
            let filtered = items;
            if (data?.query) {
                const q = data.query.toLowerCase();
                filtered = items.filter((item: any) =>
                    (item.messageId?.content || "").toLowerCase().includes(q)
                    || (item.messageId?.attachmentMeta?.name || "").toLowerCase().includes(q)
                );
            }
            socket.emit("getSavedMessages", { success: true, data: filtered });
        } catch {
            socket.emit("getSavedMessages", { success: false, msg: "Failed to load saved messages" });
        }
    });

    socket.on("scheduleMessage", async (data: {
        conversationId: string;
        content: string;
        sendAt: string;
        timezone?: string;
        id?: string;
    }) => {
        try {
            const { isMember } = await getMembership(data.conversationId, userId);
            if (!isMember) throw new Error("Not a member");
            const sendAt = new Date(data.sendAt);
            if (Number.isNaN(sendAt.getTime()) || sendAt.getTime() < Date.now() + 15_000) {
                throw new Error("Pick a time at least 15 seconds in the future");
            }
            if (data.id) {
                const existing = await ScheduledMessage.findOne({ _id: data.id, senderId: userId, status: "pending" });
                if (!existing) throw new Error("Scheduled message not found");
                existing.content = (data.content || "").trim();
                existing.sendAt = sendAt;
                existing.timezone = data.timezone || existing.timezone;
                await existing.save();
                socket.emit("scheduleMessage", { success: true, data: existing });
                return;
            }
            const created = await ScheduledMessage.create({
                conversationId: data.conversationId,
                senderId: userId,
                content: (data.content || "").trim(),
                type: "text",
                sendAt,
                timezone: data.timezone || "UTC",
                status: "pending",
            });
            socket.emit("scheduleMessage", { success: true, data: created });
        } catch (error: any) {
            socket.emit("scheduleMessage", { success: false, msg: error.message || "Failed to schedule" });
        }
    });

    socket.on("getScheduledMessages", async (data: { conversationId?: string }) => {
        const query: any = { senderId: userId, status: "pending" };
        if (data?.conversationId) query.conversationId = data.conversationId;
        const items = await ScheduledMessage.find(query).sort({ sendAt: 1 }).lean();
        socket.emit("getScheduledMessages", { success: true, data: items });
    });

    socket.on("cancelScheduledMessage", async (data: { id: string }) => {
        const item = await ScheduledMessage.findOne({ _id: data.id, senderId: userId, status: "pending" });
        if (!item) {
            socket.emit("cancelScheduledMessage", { success: false, msg: "Not found" });
            return;
        }
        item.status = "cancelled";
        await item.save();
        socket.emit("cancelScheduledMessage", { success: true, data: { id: item._id } });
    });

    socket.on("createStory", async (data: {
        type: "text" | "image" | "video";
        text?: string;
        backgroundColor?: string;
        mediaUrl?: string;
        hiddenFrom?: string[];
    }) => {
        try {
            assertRateLimit(`story:${userId}`, 20, 60_000);
            if (!["text", "image", "video"].includes(data.type)) throw new Error("Invalid story type");
            if (data.type === "text" && !data.text?.trim()) throw new Error("Enter status text");
            if ((data.type === "image" || data.type === "video") && !data.mediaUrl) throw new Error("Media is required");
            const story = await Story.create({
                userId,
                type: data.type,
                text: (data.text || "").slice(0, 500),
                backgroundColor: data.backgroundColor || "#1c1917",
                mediaUrl: data.mediaUrl || "",
                hiddenFrom: data.hiddenFrom || [],
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            socket.emit("createStory", { success: true, data: story });
            io.emit("storyFeedUpdated", { userId });
        } catch (error: any) {
            socket.emit("createStory", { success: false, msg: error.message || "Failed to post status" });
        }
    });

    socket.on("getStories", async () => {
        try {
            const me = await User.findById(userId).select("blockedUsers privacy").lean();
            const blocked = new Set((me?.blockedUsers || []).map((id: any) => id.toString()));
            const stories = await Story.find({ expiresAt: { $gt: new Date() } })
                .sort({ createdAt: -1 })
                .populate({ path: "userId", select: "name avatar privacy blockedUsers" })
                .lean();

            const grouped: Record<string, any> = {};
            for (const story of stories) {
                const author: any = story.userId;
                if (!author?._id) continue;
                const authorId = author._id.toString();
                if (blocked.has(authorId)) continue;
                const authorBlocked = (author.blockedUsers || []).some((id: any) => id.toString() === userId);
                if (authorBlocked) continue;
                if (!storyVisibleTo(story, userId, author)) continue;
                if (!grouped[authorId]) {
                    grouped[authorId] = {
                        user: { id: authorId, name: author.name, avatar: author.avatar },
                        stories: [],
                        hasUnseen: false,
                    };
                }
                const seen = (story.viewers || []).some((v: any) => v.userId.toString() === userId);
                grouped[authorId].stories.push({ ...story, seen });
                if (!seen && authorId !== userId) grouped[authorId].hasUnseen = true;
            }
            socket.emit("getStories", { success: true, data: Object.values(grouped) });
        } catch (error) {
            socket.emit("getStories", { success: false, msg: "Failed to load status" });
        }
    });

    socket.on("viewStory", async (data: { storyId: string }) => {
        const story = await Story.findById(data.storyId);
        if (!story) {
            socket.emit("viewStory", { success: false, msg: "Status expired" });
            return;
        }
        if (story.userId.toString() !== userId && !(story.viewers || []).some((v: any) => v.userId.toString() === userId)) {
            story.viewers.push({ userId, viewedAt: new Date() });
            await story.save();
        }
        socket.emit("viewStory", { success: true, data: { viewers: story.viewers, reactions: story.reactions } });
    });

    socket.on("reactToStory", async (data: { storyId: string; emoji: string }) => {
        const story = await Story.findById(data.storyId);
        if (!story) {
            socket.emit("reactToStory", { success: false, msg: "Status expired" });
            return;
        }
        const idx = story.reactions.findIndex((r: any) => r.userId.toString() === userId);
        if (idx >= 0) story.reactions.splice(idx, 1);
        story.reactions.push({ emoji: data.emoji, userId, userName: socket.data.name });
        await story.save();
        io.to(userRoom(story.userId.toString())).emit("storyReaction", {
            storyId: story._id,
            reactions: story.reactions,
        });
        socket.emit("reactToStory", { success: true, data: { reactions: story.reactions } });
    });

    socket.on("replyToStory", async (data: { storyId: string; content: string }) => {
        try {
            const story = await Story.findById(data.storyId);
            if (!story) throw new Error("Status expired");
            const authorId = story.userId.toString();
            let conversation = await Conversation.findOne({
                type: "direct",
                participants: { $all: [userId, authorId], $size: 2 },
            });
            if (!conversation) {
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [userId, authorId],
                    createdBy: userId,
                    unreadCounts: [{ userId, count: 0 }, { userId: authorId, count: 0 }],
                });
            }
            await createAndBroadcastMessage({
                conversationId: conversation._id.toString(),
                senderId: userId,
                sender: { id: userId, name: socket.data.name, avatar: socket.data.avatar },
                content: data.content,
                type: "text",
                storyId: story._id.toString(),
            });
            socket.emit("replyToStory", { success: true });
        } catch (error: any) {
            socket.emit("replyToStory", { success: false, msg: error.message || "Failed to reply" });
        }
    });

    socket.on("deleteStory", async (data: { storyId: string }) => {
        const story = await Story.findOneAndDelete({ _id: data.storyId, userId });
        if (!story) {
            socket.emit("deleteStory", { success: false, msg: "Not found" });
            return;
        }
        socket.emit("deleteStory", { success: true });
        io.emit("storyFeedUpdated", { userId });
    });

    socket.on("saveRecentSearch", async (data: { query: string }) => {
        const q = (data.query || "").trim().slice(0, 80);
        if (!q) return;
        await User.findByIdAndUpdate(userId, {
            $pull: { recentSearches: q },
        });
        await User.findByIdAndUpdate(userId, {
            $push: { recentSearches: { $each: [q], $position: 0, $slice: 12 } },
        });
    });

    socket.on("getRecentSearches", async () => {
        const me = await User.findById(userId).select("recentSearches").lean();
        socket.emit("getRecentSearches", { success: true, data: me?.recentSearches || [] });
    });

    socket.on("clearRecentSearches", async () => {
        await User.findByIdAndUpdate(userId, { recentSearches: [] });
        socket.emit("getRecentSearches", { success: true, data: [] });
    });
}
