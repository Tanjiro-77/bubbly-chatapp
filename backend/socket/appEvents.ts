import { Server as SocketIOServer, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import User from "../modals/User";
import Story from "../modals/Story";
import SavedMessage from "../modals/SavedMessage";
import ScheduledMessage from "../modals/ScheduledMessage";
import Message from "../modals/Message";
import Report from "../modals/Report";
import Conversation from "../modals/Conversation";
import { getMembership, areBlocked, canSendInGroup, filterBlockedDirect } from "../utils/permissions";
import { assertRateLimit } from "../utils/rateLimit";
import { createAndBroadcastMessage } from "../services/messageService";
import { getIO, userRoom } from "./io";

async function hydrateStoryViewers(viewers: any[]) {
    if (!Array.isArray(viewers) || viewers.length === 0) return [];
    const viewerIds = Array.from(
        new Set(viewers.map((v: any) => v?.userId?.toString?.()).filter(Boolean))
    );
    const viewerUsers = viewerIds.length > 0
        ? await User.find({ _id: { $in: viewerIds } }).select("name avatar").lean()
        : [];
    const map = new Map(viewerUsers.map((u) => [u._id.toString(), u]));
    return viewers.map((v: any) => {
        const vid = v.userId?.toString?.() || String(v.userId || "");
        const profile = map.get(vid);
        return {
            ...v,
            userId: vid,
            name: profile?.name || "",
            avatar: profile?.avatar || "",
        };
    });
}

async function emitStoryFeedUpdated(io: SocketIOServer, userId: string) {
    const convos = await Conversation.find({ participants: userId }).select("participants").lean();
    const targets = new Set<string>([userId]);
    for (const c of convos) {
        for (const p of c.participants || []) {
            targets.add(p.toString());
        }
    }
    for (const targetId of targets) {
        io.to(userRoom(targetId)).emit("storyFeedUpdated", { userId });
    }
}

function storyVisibleTo(story: any, viewerId: string, author: any) {
    const storyAuthorId = (story.userId?._id || story.userId)?.toString();
    if (storyAuthorId === viewerId) return true;
    const hidden = [...(story.hiddenFrom || []), ...(author?.privacy?.storyHiddenFrom || [])]
        .map((id: any) => id.toString());
    if (hidden.includes(viewerId)) return false;
    return true;
}

async function canAccessStory(story: any, viewerId: string, authorId: string, author: any): Promise<boolean> {
    if (authorId === viewerId) return true;
    if (await areBlocked(viewerId, authorId)) return false;
    if (author && !storyVisibleTo(story, viewerId, author)) return false;
    if (author?.privacy?.storyPrivacy === "contacts") {
        const isContact = await Conversation.exists({
            type: "direct",
            participants: { $all: [viewerId, authorId], $size: 2 },
        });
        if (!isContact) return false;
    }
    return true;
}

export function registerAppEvents(io: SocketIOServer, socket: Socket) {
    const userId: string = socket.data.userId;

    socket.on("updatePrivacy", async (data) => {
        try {
            if (!data || typeof data !== "object") {
                socket.emit("updatePrivacy", { success: false, msg: "Invalid privacy payload" });
                return;
            }
            const allowedLastSeen = ["everyone", "contacts", "nobody"];
            const allowedStory = ["everyone", "contacts", "except"];
            const update: any = {};
            if (data.lastSeen && allowedLastSeen.includes(data.lastSeen)) update["privacy.lastSeen"] = data.lastSeen;
            if (typeof data.readReceipts === "boolean") update["privacy.readReceipts"] = data.readReceipts;
            if (typeof data.typingIndicators === "boolean") update["privacy.typingIndicators"] = data.typingIndicators;
            if (data.storyPrivacy && allowedStory.includes(data.storyPrivacy)) update["privacy.storyPrivacy"] = data.storyPrivacy;
            const allowedModes = ["light", "dark", "system"];
            const allowedBubbleStyles = ["rounded", "sharp", "minimal"];
            if (Array.isArray(data.storyHiddenFrom)) {
                update["privacy.storyHiddenFrom"] = data.storyHiddenFrom.filter((id: any) => isValidObjectId(id));
            }
            if (data.theme && typeof data.theme === "object") {
                if (data.theme.mode && allowedModes.includes(data.theme.mode)) update["theme.mode"] = data.theme.mode;
                if (typeof data.theme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(data.theme.accent)) {
                    update["theme.accent"] = data.theme.accent;
                }
                if (typeof data.theme.wallpaper === "string") update["theme.wallpaper"] = data.theme.wallpaper.slice(0, 500);
                if (data.theme.bubbleStyle && allowedBubbleStyles.includes(data.theme.bubbleStyle)) update["theme.bubbleStyle"] = data.theme.bubbleStyle;
            }
            const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).select("-password");
            socket.emit("updatePrivacy", { success: true, data: { privacy: user?.privacy, theme: user?.theme } });
        } catch (error: any) {
            socket.emit("updatePrivacy", { success: false, msg: error.message || "Failed to update privacy" });
        }
    });

    socket.on("setConversationWallpaper", async (data: { conversationId: string; wallpaper: string }) => {
        try {
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || !isMember) throw new Error("Not a member");
            if (conversation.type === "group" && conversation.permissions?.editInfo === "admins" && !isAdmin) {
                throw new Error("Only admins can change group wallpaper");
            }
            conversation.wallpaper = typeof data?.wallpaper === "string" ? data.wallpaper.slice(0, 500) : "";
            await conversation.save();
            socket.emit("setConversationWallpaper", { success: true, data: { wallpaper: conversation.wallpaper } });
        } catch (error: any) {
            socket.emit("setConversationWallpaper", { success: false, msg: error.message });
        }
    });

    socket.on("setDisappearingTimer", async (data: { conversationId: string; seconds: number }) => {
        try {
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || !isMember) throw new Error("Not a member");
            if (conversation.type === "group" && !isAdmin) {
                throw new Error("Only group admins can change disappearing timer");
            }
            const rawSec = Number(data?.seconds);
            const cleanSeconds = Number.isFinite(rawSec) ? Math.max(0, rawSec) : 0;
            conversation.disappearingSeconds = cleanSeconds;
            await conversation.save();
            io.to(data.conversationId).emit("setDisappearingTimer", {
                success: true,
                data: { conversationId: data.conversationId, disappearingSeconds: cleanSeconds },
            });
        } catch (error: any) {
            socket.emit("setDisappearingTimer", { success: false, msg: error.message || "Failed to update disappearing timer" });
        }
    });

    socket.on("blockUser", async (data: { targetUserId: string; block: boolean }) => {
        try {
            if (!data?.targetUserId || !isValidObjectId(data.targetUserId)) throw new Error("Invalid user");
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
            const targetTypes = ["user", "message", "group"] as const;
            const targetType = targetTypes.find((t) => t === data?.targetType);
            if (!targetType) {
                throw new Error("Invalid report target type");
            }
            const category = categories.find((item) => item === data?.category);

            if (!category) {
                throw new Error("Invalid category");
            }
            if (data.targetUserId && !isValidObjectId(data.targetUserId)) throw new Error("Invalid user ID");
            if (data.targetMessageId && !isValidObjectId(data.targetMessageId)) throw new Error("Invalid message ID");
            if (data.targetConversationId && !isValidObjectId(data.targetConversationId)) throw new Error("Invalid conversation ID");

            const report = await Report.create({
                reporterId: userId,
                targetType,
                targetUserId: data.targetUserId || undefined,
                targetMessageId: data.targetMessageId || undefined,
                targetConversationId: data.targetConversationId || undefined,
                category,
                description: (typeof data.description === "string" ? data.description : "").slice(0, 1000),
            });
            socket.emit("reportContent", { success: true, data: { id: report._id } });
        } catch (error: any) {
            socket.emit("reportContent", { success: false, msg: error.message || "Failed to submit report" });
        }
    });

    socket.on("moderator:listReports", async () => {
        try {
            const me = await User.findById(userId).select("isModerator").lean();
            if (!me?.isModerator) {
                socket.emit("moderator:listReports", { success: false, msg: "Forbidden" });
                return;
            }
            const reports = await Report.find().sort({ createdAt: -1 }).limit(100)
                .populate("reporterId", "name email")
                .lean();
            socket.emit("moderator:listReports", { success: true, data: reports });
        } catch {
            socket.emit("moderator:listReports", { success: false, msg: "Failed to load reports" });
        }
    });

    socket.on("saveMessage", async (data: { messageId: string; save: boolean }) => {
        try {
            if (!data?.messageId || !isValidObjectId(data.messageId)) {
                throw new Error("Message not found");
            }
            const shouldSave = Boolean(data.save);
            const message = await Message.findById(data.messageId);
            if (!message) throw new Error("Message not found");
            const { isMember } = await getMembership(message.conversationId.toString(), userId);
            if (!isMember) throw new Error("Not allowed");
            if (shouldSave) {
                await SavedMessage.updateOne(
                    { userId, messageId: message._id },
                    { userId, messageId: message._id, conversationId: message.conversationId },
                    { upsert: true }
                );
            } else {
                await SavedMessage.deleteOne({ userId, messageId: message._id });
            }
            socket.emit("saveMessage", { success: true, data: { messageId: data.messageId, saved: shouldSave } });
            io.to(socket.id).emit("messageSaved", { messageId: data.messageId, saved: shouldSave });
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
            const now = new Date();
            let filtered = items.filter((item: any) =>
                item.messageId
                && !item.messageId.isDeleted
                && (!item.messageId.expiresAt || new Date(item.messageId.expiresAt) > now)
            );
            if (data?.query) {
                const q = data.query.toLowerCase();
                filtered = filtered.filter((item: any) =>
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
            const { conversation, isMember } = await getMembership(data?.conversationId, userId);
            if (!conversation || !isMember) throw new Error("Not a member");
            if (await filterBlockedDirect(conversation, userId)) {
                throw new Error("You cannot message this user");
            }
            if (!canSendInGroup(conversation, userId)) {
                throw new Error("Only admins can send messages in this group");
            }
            const trimmedContent = typeof data?.content === "string" ? data.content.trim() : "";
            if (!trimmedContent || trimmedContent.length > 5000) {
                throw new Error("Scheduled message text must be between 1 and 5,000 characters");
            }
            const sendAt = new Date(data.sendAt);
            if (Number.isNaN(sendAt.getTime()) || sendAt.getTime() < Date.now() + 15_000) {
                throw new Error("Pick a time at least 15 seconds in the future");
            }
            if (data.id) {
                if (!isValidObjectId(data.id)) throw new Error("Invalid scheduled message ID");
                const existing = await ScheduledMessage.findOne({ _id: data.id, senderId: userId, status: "pending" });
                if (!existing || existing.conversationId.toString() !== data.conversationId) {
                    throw new Error("Scheduled message not found");
                }
                existing.content = trimmedContent;
                existing.sendAt = sendAt;
                existing.timezone = data.timezone || existing.timezone;
                await existing.save();
                socket.emit("scheduleMessage", { success: true, data: existing });
                return;
            }
            const created = await ScheduledMessage.create({
                conversationId: data.conversationId,
                senderId: userId,
                content: trimmedContent,
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
        try {
            const query: any = { senderId: userId, status: "pending" };
            if (data?.conversationId) {
                if (!isValidObjectId(data.conversationId)) {
                    socket.emit("getScheduledMessages", { success: true, data: [] });
                    return;
                }
                query.conversationId = data.conversationId;
            }
            const items = await ScheduledMessage.find(query).sort({ sendAt: 1 }).lean();
            socket.emit("getScheduledMessages", { success: true, data: items });
        } catch {
            socket.emit("getScheduledMessages", { success: false, msg: "Failed to load scheduled messages" });
        }
    });

    socket.on("cancelScheduledMessage", async (data: { id: string }) => {
        try {
            if (!data?.id || !isValidObjectId(data.id)) {
                socket.emit("cancelScheduledMessage", { success: false, msg: "Invalid scheduled message id" });
                return;
            }
            const item = await ScheduledMessage.findOne({ _id: data.id, senderId: userId, status: "pending" });
            if (!item) {
                socket.emit("cancelScheduledMessage", { success: false, msg: "Not found" });
                return;
            }
            item.status = "cancelled";
            await item.save();
            socket.emit("cancelScheduledMessage", { success: true, data: { id: item._id } });
        } catch {
            socket.emit("cancelScheduledMessage", { success: false, msg: "Failed to cancel scheduled message" });
        }
    });

    socket.on("createStory", async (data: {
        type: "text" | "image" | "video";
        text?: string;
        backgroundColor?: string;
        mediaUrl?: string;
        fontStyle?: string;
        sticker?: string;
        hiddenFrom?: string[];
    }) => {
        try {
            assertRateLimit(`story:${userId}`, 20, 60_000);
            if (!["text", "image", "video"].includes(data.type)) throw new Error("Invalid story type");
            if (data.type === "text" && !data.text?.trim()) throw new Error("Enter status text");
            if ((data.type === "image" || data.type === "video") && (!data.mediaUrl || !/^https?:\/\/.+/i.test(data.mediaUrl.trim()))) {
                throw new Error("Valid media URL is required");
            }
            const safeHiddenFrom = Array.isArray(data.hiddenFrom)
                ? data.hiddenFrom.filter((id) => typeof id === "string" && isValidObjectId(id))
                : [];
            const allowedFonts = ["classic", "serif", "mono", "neon"];
            const safeFontStyle = typeof data.fontStyle === "string" && allowedFonts.includes(data.fontStyle)
                ? data.fontStyle
                : "classic";
            const safeSticker = typeof data.sticker === "string" ? data.sticker.trim().slice(0, 48) : "";
            const story = await Story.create({
                userId,
                type: data.type,
                text: (data.text || "").slice(0, 500),
                backgroundColor: data.backgroundColor || "#1c1917",
                mediaUrl: data.mediaUrl ? data.mediaUrl.trim() : "",
                fontStyle: safeFontStyle,
                sticker: safeSticker,
                hiddenFrom: safeHiddenFrom,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            socket.emit("createStory", { success: true, data: story });
            await emitStoryFeedUpdated(io, userId);
        } catch (error: any) {
            socket.emit("createStory", { success: false, msg: error.message || "Failed to post status" });
        }
    });

    socket.on("getStories", async () => {
        try {
            const [me, myConversations] = await Promise.all([
                User.findById(userId).select("blockedUsers privacy").lean(),
                Conversation.find({ participants: userId }).select("participants type").lean(),
            ]);
            const blocked = new Set((me?.blockedUsers || []).map((id: any) => id.toString()));
            const directPartnerIds = new Set<string>();
            for (const c of myConversations) {
                if (c.type === "direct") {
                    for (const p of c.participants || []) {
                        const pid = p.toString();
                        if (pid !== userId) directPartnerIds.add(pid);
                    }
                }
            }
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
                if (authorId !== userId && author.privacy?.storyPrivacy === "contacts" && !directPartnerIds.has(authorId)) {
                    continue;
                }
                if (!grouped[authorId]) {
                    grouped[authorId] = {
                        user: { id: authorId, name: author.name, avatar: author.avatar },
                        stories: [],
                        hasUnseen: false,
                    };
                }
                const seen = (story.viewers || []).some((v: any) => v.userId.toString() === userId);
                const enrichedViewers = authorId === userId
                    ? await hydrateStoryViewers(story.viewers || [])
                    : [];
                const sanitizedStory = { ...story, viewers: enrichedViewers };
                grouped[authorId].stories.push({ ...sanitizedStory, seen });
                if (!seen && authorId !== userId) grouped[authorId].hasUnseen = true;
            }
            socket.emit("getStories", { success: true, data: Object.values(grouped) });
        } catch (error) {
            socket.emit("getStories", { success: false, msg: "Failed to load status" });
        }
    });

    socket.on("viewStory", async (data: { storyId: string }) => {
        try {
            if (!data?.storyId || !isValidObjectId(data.storyId)) {
                socket.emit("viewStory", { success: false, msg: "Invalid status" });
                return;
            }
            const story = await Story.findById(data.storyId);
            if (!story || (story.expiresAt && story.expiresAt <= new Date())) {
                socket.emit("viewStory", { success: false, msg: "Status expired" });
                return;
            }
            const authorId = story.userId.toString();
            const author: any = await User.findById(authorId).select("privacy blockedUsers").lean();
            if (authorId !== userId) {
                if (!(await canAccessStory(story, userId, authorId, author))) {
                    socket.emit("viewStory", { success: false, msg: "Not allowed" });
                    return;
                }
                await Story.updateOne(
                    { _id: story._id, "viewers.userId": { $ne: userId } },
                    { $push: { viewers: { userId, viewedAt: new Date() } } }
                );
            }
            let viewersPayload: any[] = [];
            if (authorId === userId) {
                viewersPayload = await hydrateStoryViewers(story.viewers || []);
            }
            socket.emit("viewStory", {
                success: true,
                data: {
                    viewers: viewersPayload,
                    reactions: story.reactions,
                },
            });
        } catch {
            socket.emit("viewStory", { success: false, msg: "Failed to view story" });
        }
    });

    socket.on("reactToStory", async (data: { storyId: string; emoji: string }) => {
        try {
            if (!data?.storyId || !isValidObjectId(data.storyId) || typeof data?.emoji !== "string" || !data.emoji.trim()) {
                socket.emit("reactToStory", { success: false, msg: "Invalid story reaction" });
                return;
            }
            const story = await Story.findById(data.storyId);
            if (!story || (story.expiresAt && story.expiresAt <= new Date())) {
                socket.emit("reactToStory", { success: false, msg: "Status expired" });
                return;
            }
            const authorId = story.userId.toString();
            if (authorId !== userId) {
                const author: any = await User.findById(authorId).select("privacy blockedUsers").lean();
                if (!(await canAccessStory(story, userId, authorId, author))) {
                    socket.emit("reactToStory", { success: false, msg: "Not allowed" });
                    return;
                }
            }
            const idx = story.reactions.findIndex((r: any) => r.userId.toString() === userId);
            if (idx >= 0) story.reactions.splice(idx, 1);
            story.reactions.push({ emoji: data.emoji.trim().slice(0, 16), userId, userName: socket.data.name });
            await story.save();
            io.to(userRoom(authorId)).emit("storyReaction", {
                storyId: story._id,
                reactions: story.reactions,
            });
            socket.emit("reactToStory", { success: true, data: { reactions: story.reactions } });
        } catch {
            socket.emit("reactToStory", { success: false, msg: "Failed to react to story" });
        }
    });

    socket.on("replyToStory", async (data: { storyId: string; content?: string; text?: string }) => {
        try {
            if (!data?.storyId || !isValidObjectId(data.storyId)) {
                throw new Error("Invalid status");
            }
            const story = await Story.findById(data.storyId);
            if (!story || (story.expiresAt && story.expiresAt <= new Date())) {
                throw new Error("Status expired");
            }
            const authorId = story.userId.toString();
            if (authorId === userId) {
                throw new Error("You cannot reply to your own story");
            }
            const author: any = await User.findById(authorId).select("privacy blockedUsers").lean();
            if (!(await canAccessStory(story, userId, authorId, author))) {
                throw new Error("You cannot message this user");
            }
            const replyText = typeof data.content === "string"
                ? data.content
                : typeof data.text === "string"
                ? data.text
                : "";
            let conversation = await Conversation.findOne({
                type: "direct",
                participants: { $all: [userId, authorId], $size: 2 },
            });
            const isNewConv = !conversation;
            if (!conversation) {
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [userId, authorId],
                    createdBy: userId,
                    unreadCounts: [{ userId, count: 0 }, { userId: authorId, count: 0 }],
                });
            }

            // Ensure current socket is in the conversation room
            socket.join(conversation._id.toString());

            // If new conversation, join author's active sockets and notify them
            if (isNewConv) {
                const authorSockets = Array.from(io.sockets.sockets.values()).filter(
                    (s) => s.data.userId === authorId
                );
                authorSockets.forEach((s) => s.join(conversation!._id.toString()));

                const populated = await Conversation.findById(conversation._id)
                    .populate({ path: "participants", select: "name avatar email" })
                    .lean();

                io.to(conversation._id.toString()).emit("newConversation", {
                    success: true,
                    data: { ...populated, isNew: true, unreadCount: 0 }
                });
            }
            await createAndBroadcastMessage({
                conversationId: conversation._id.toString(),
                senderId: userId,
                sender: { id: userId, name: socket.data.name, avatar: socket.data.avatar },
                content: replyText,
                type: "text",
                storyId: story._id.toString(),
            });
            socket.emit("replyToStory", { success: true });
        } catch (error: any) {
            socket.emit("replyToStory", { success: false, msg: error.message || "Failed to reply" });
        }
    });

    socket.on("deleteStory", async (data: { storyId: string }) => {
        try {
            if (!data?.storyId || !isValidObjectId(data.storyId)) {
                socket.emit("deleteStory", { success: false, msg: "Not found" });
                return;
            }
            const story = await Story.findOneAndDelete({ _id: data.storyId, userId });
            if (!story) {
                socket.emit("deleteStory", { success: false, msg: "Not found" });
                return;
            }
            socket.emit("deleteStory", { success: true });
            await emitStoryFeedUpdated(io, userId);
        } catch {
            socket.emit("deleteStory", { success: false, msg: "Failed to delete story" });
        }
    });

    socket.on("saveRecentSearch", async (data: { query: string }) => {
        try {
            const q = (data?.query || "").trim().slice(0, 80);
            if (!q) return;
            await User.findByIdAndUpdate(userId, {
                $pull: { recentSearches: q },
            });
            await User.findByIdAndUpdate(userId, {
                $push: { recentSearches: { $each: [q], $position: 0, $slice: 12 } },
            });
        } catch (err) {
            console.error("saveRecentSearch error:", err);
        }
    });

    socket.on("getRecentSearches", async () => {
        try {
            const me = await User.findById(userId).select("recentSearches").lean();
            socket.emit("getRecentSearches", { success: true, data: me?.recentSearches || [] });
        } catch {
            socket.emit("getRecentSearches", { success: false, data: [] });
        }
    });

    socket.on("clearRecentSearches", async () => {
        try {
            await User.findByIdAndUpdate(userId, { recentSearches: [] });
            socket.emit("getRecentSearches", { success: true, data: [] });
        } catch {
            socket.emit("getRecentSearches", { success: false, msg: "Failed to clear recent searches" });
        }
    });
}
