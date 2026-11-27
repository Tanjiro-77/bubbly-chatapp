import { Server as SocketIOServer, Socket } from "socket.io";
import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";
import User from "../modals/User";
import { getMembership } from "../utils/permissions";
import { createSystemMessage } from "../services/messageService";
import { userRoom } from "./io";

function emitGroupUpdate(io: SocketIOServer, conversation: any) {
    io.to(conversation._id.toString()).emit("groupUpdated", {
        success: true,
        data: conversation,
    });
}

export function registerGroupEvents(io: SocketIOServer, socket: Socket) {
    socket.on("updateGroup", async (data: {
        conversationId: string;
        name?: string;
        description?: string;
        avatar?: string;
        permissions?: { sendMessages?: string; editInfo?: string; addMembers?: string };
        disappearingSeconds?: number;
        wallpaper?: string;
    }) => {
        try {
            const userId = socket.data.userId;
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember) {
                socket.emit("updateGroup", { success: false, msg: "Group not found" });
                return;
            }
            const canEdit = conversation.permissions?.editInfo === "all" || isAdmin;
            if (!canEdit) {
                socket.emit("updateGroup", { success: false, msg: "You cannot edit this group" });
                return;
            }
            if (data.permissions && !isAdmin) {
                socket.emit("updateGroup", { success: false, msg: "Only admins can change permissions" });
                return;
            }

            const changes: string[] = [];
            if (typeof data.name === "string" && data.name.trim() && data.name.trim().slice(0, 100) !== conversation.name) {
                conversation.name = data.name.trim().slice(0, 100);
                changes.push("name");
            }
            if (typeof data.description === "string" && data.description !== conversation.description) {
                conversation.description = data.description.slice(0, 500);
                changes.push("description");
            }
            if (typeof data.avatar === "string" && data.avatar.slice(0, 500) !== conversation.avatar) {
                conversation.avatar = data.avatar.slice(0, 500);
                changes.push("image");
            }
            if (typeof data.wallpaper === "string") conversation.wallpaper = data.wallpaper;
            if (typeof data.disappearingSeconds === "number" && Number.isFinite(data.disappearingSeconds) && isAdmin) {
                conversation.disappearingSeconds = Math.max(0, data.disappearingSeconds);
            }
            if (data.permissions && isAdmin) {
                const validPerm = (v: unknown, fallback: "all" | "admins"): "all" | "admins" =>
                    v === "all" || v === "admins" ? v : fallback;
                conversation.permissions = {
                    sendMessages: validPerm(data.permissions.sendMessages, conversation.permissions.sendMessages),
                    editInfo: validPerm(data.permissions.editInfo, conversation.permissions.editInfo),
                    addMembers: validPerm(data.permissions.addMembers, conversation.permissions.addMembers),
                };
            }
            await conversation.save();

            if (changes.includes("name")) {
                await createSystemMessage(data.conversationId, userId, "group_name_changed", {
                    content: `${socket.data.name} changed the group name to "${conversation.name}"`,
                    meta: { name: conversation.name },
                });
            }
            if (changes.includes("image")) {
                await createSystemMessage(data.conversationId, userId, "group_image_changed", {
                    content: `${socket.data.name} changed the group photo`,
                });
            }

            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            socket.emit("updateGroup", { success: true, data: populated });
        } catch (error: any) {
            socket.emit("updateGroup", { success: false, msg: error.message || "Failed to update group" });
        }
    });

    socket.on("addGroupMembers", async (data: { conversationId: string; userIds: string[] }) => {
        try {
            const userId = socket.data.userId;
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember) {
                socket.emit("addGroupMembers", { success: false, msg: "Group not found" });
                return;
            }
            const canAdd = conversation.permissions?.addMembers === "all" || isAdmin;
            if (!canAdd) {
                socket.emit("addGroupMembers", { success: false, msg: "You cannot add members" });
                return;
            }
            const ids = Array.isArray(data?.userIds) ? data.userIds.filter(Boolean) : [];
            if (ids.length > 50) {
                socket.emit("addGroupMembers", { success: false, msg: "Cannot add more than 50 members at once" });
                return;
            }
            if (conversation.participants.length + ids.length > 500) {
                socket.emit("addGroupMembers", { success: false, msg: "Group participant limit reached (max 500)" });
                return;
            }
            const existingSet = new Set(conversation.participants.map((p) => p.toString()));
            const unreadSet = new Set((conversation.unreadCounts || []).map((u) => u.userId.toString()));
            const candidateIds = Array.from(
                new Set(
                    ids
                        .map((id: any) => String(id))
                        .filter((id) => isValidObjectId(id) && !existingSet.has(id))
                )
            );

            const foundUsers = candidateIds.length > 0
                ? await User.find({ _id: { $in: candidateIds } }).select("_id name").lean()
                : [];
            const addedUsers: { id: string; name: string }[] = [];
            for (const user of foundUsers) {
                const uid = user._id.toString();
                conversation.participants.push(uid as any);
                if (!unreadSet.has(uid)) {
                    conversation.unreadCounts.push({ userId: uid as any, count: 0 });
                    unreadSet.add(uid);
                }
                addedUsers.push({ id: uid, name: user.name || "a member" });
            }

            if (addedUsers.length > 0) {
                await conversation.save();
                const addedSet = new Set(addedUsers.map((a) => a.id));
                for (const s of io.sockets?.sockets?.values?.() || []) {
                    if (addedSet.has(s.data.userId)) s.join(data.conversationId);
                }
                await Promise.all(
                    addedUsers.map(async (added) => {
                        await createSystemMessage(data.conversationId, userId, "member_added", {
                            targetId: added.id,
                            content: `${socket.data.name} added ${added.name}`,
                        });
                        io.to(userRoom(added.id)).emit("addedToGroup", { conversationId: data.conversationId });
                    })
                );
            }
            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            for (const added of addedUsers) {
                io.to(userRoom(added.id)).emit("newConversation", { success: true, data: { ...populated, isNew: true, unreadCount: 0 } });
            }
            socket.emit("addGroupMembers", { success: true, data: populated });
        } catch (error: any) {
            socket.emit("addGroupMembers", { success: false, msg: error.message || "Failed to add members" });
        }
    });

    socket.on("removeGroupMember", async (data: { conversationId: string; targetUserId: string }) => {
        try {
            const userId = socket.data.userId;
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember) {
                socket.emit("removeGroupMember", { success: false, msg: "Group not found" });
                return;
            }
            if (!isAdmin) {
                socket.emit("removeGroupMember", { success: false, msg: "Only admins can remove members" });
                return;
            }
            if (!data?.targetUserId || !isValidObjectId(data.targetUserId)) {
                socket.emit("removeGroupMember", { success: false, msg: "Invalid user" });
                return;
            }
            const isTargetMember = conversation.participants.some((p) => p.toString() === data.targetUserId);
            if (!isTargetMember) {
                socket.emit("removeGroupMember", { success: false, msg: "User is not in this group" });
                return;
            }
            if (conversation.createdBy?.toString() === data.targetUserId && userId !== data.targetUserId) {
                socket.emit("removeGroupMember", { success: false, msg: "Cannot remove the group creator" });
                return;
            }
            const target = await User.findById(data.targetUserId).select("name").lean();
            conversation.participants = conversation.participants.filter((p) => p.toString() !== data.targetUserId);
            conversation.admins = conversation.admins.filter((p) => p.toString() !== data.targetUserId);
            conversation.unreadCounts = conversation.unreadCounts.filter((u) => u.userId.toString() !== data.targetUserId);
            if (conversation.admins.length === 0 && conversation.participants.length > 0) {
                conversation.admins.push(conversation.participants[0]);
            }
            await conversation.save();
            await createSystemMessage(data.conversationId, userId, "member_removed", {
                targetId: data.targetUserId,
                content: `${socket.data.name} removed ${target?.name || "a member"}`,
            });
            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            // Evict removed member's active sockets from the room immediately
            for (const s of io.sockets?.sockets?.values?.() || []) {
                if (s.data.userId === data.targetUserId) s.leave(data.conversationId);
            }
            io.to(userRoom(data.targetUserId)).emit("removedFromGroup", { conversationId: data.conversationId });
            socket.emit("removeGroupMember", { success: true, data: populated });
        } catch (error: any) {
            socket.emit("removeGroupMember", { success: false, msg: error.message || "Failed to remove member" });
        }
    });

    socket.on("leaveGroup", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            const { conversation, isMember } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember) {
                socket.emit("leaveGroup", { success: false, msg: "Group not found" });
                return;
            }
            conversation.participants = conversation.participants.filter((p) => p.toString() !== userId);
            conversation.admins = conversation.admins.filter((p) => p.toString() !== userId);
            conversation.unreadCounts = conversation.unreadCounts.filter((u) => u.userId.toString() !== userId);
            if (conversation.admins.length === 0 && conversation.participants.length > 0) {
                conversation.admins.push(conversation.participants[0]);
            }
            await conversation.save();
            await createSystemMessage(data.conversationId, userId, "member_left", {
                content: `${socket.data.name} left the group`,
            });
            const leavingSockets = Array.from(io.sockets.sockets.values()).filter((s) => s.data.userId === userId);
            leavingSockets.forEach((s) => s.leave(data.conversationId));
            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            socket.emit("leaveGroup", { success: true });
        } catch (error: any) {
            socket.emit("leaveGroup", { success: false, msg: error.message || "Failed to leave group" });
        }
    });

    socket.on("setGroupAdmin", async (data: { conversationId: string; targetUserId: string; promote: boolean }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.targetUserId || !isValidObjectId(data.targetUserId) || typeof data.promote !== "boolean") {
                socket.emit("setGroupAdmin", { success: false, msg: "Invalid request" });
                return;
            }
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember || !isAdmin) {
                socket.emit("setGroupAdmin", { success: false, msg: "Only admins can change roles" });
                return;
            }
            const isParticipant = conversation.participants.some((p) => p.toString() === data.targetUserId);
            if (!isParticipant) {
                socket.emit("setGroupAdmin", { success: false, msg: "User is not in the group" });
                return;
            }
            const already = conversation.admins.some((p) => p.toString() === data.targetUserId);
            const target = await User.findById(data.targetUserId).select("name").lean();
            if (data.promote && !already) {
                conversation.admins.push(data.targetUserId as any);
                await conversation.save();
                await createSystemMessage(data.conversationId, userId, "member_promoted", {
                    targetId: data.targetUserId,
                    content: `${target?.name || "A member"} is now an admin`,
                });
            } else if (!data.promote && already) {
                if (conversation.createdBy?.toString() === data.targetUserId) {
                    socket.emit("setGroupAdmin", { success: false, msg: "Cannot demote the creator" });
                    return;
                }
                conversation.admins = conversation.admins.filter((p) => p.toString() !== data.targetUserId);
                await conversation.save();
                await createSystemMessage(data.conversationId, userId, "member_demoted", {
                    targetId: data.targetUserId,
                    content: `${target?.name || "A member"} is no longer an admin`,
                });
            }
            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            socket.emit("setGroupAdmin", { success: true, data: populated });
        } catch (error: any) {
            socket.emit("setGroupAdmin", { success: false, msg: error.message || "Failed to update admin" });
        }
    });

    socket.on("regenerateInvite", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            const { conversation, isMember, isAdmin } = await getMembership(data?.conversationId, userId);
            if (!conversation || conversation.type !== "group" || !isMember || !isAdmin) {
                socket.emit("regenerateInvite", { success: false, msg: "Only admins can manage invites" });
                return;
            }
            conversation.inviteCode = crypto.randomBytes(6).toString("hex");
            await conversation.save();
            socket.emit("regenerateInvite", { success: true, data: { inviteCode: conversation.inviteCode } });
        } catch (error: any) {
            socket.emit("regenerateInvite", { success: false, msg: error.message || "Failed to regenerate invite" });
        }
    });

    socket.on("joinByInvite", async (data: { inviteCode: string }) => {
        try {
            const userId = socket.data.userId;
            const inviteCode = typeof data?.inviteCode === "string" ? data.inviteCode.trim() : "";
            if (!inviteCode) {
                socket.emit("joinByInvite", { success: false, msg: "Invalid invite link" });
                return;
            }
            const conversation = await Conversation.findOne({ inviteCode, type: "group" });
            if (!conversation) {
                socket.emit("joinByInvite", { success: false, msg: "Invalid invite link" });
                return;
            }
            if (conversation.participants.some((p) => p.toString() === userId)) {
                socket.emit("joinByInvite", { success: true, data: { conversationId: conversation._id, alreadyMember: true } });
                return;
            }
            if (conversation.participants.length >= 500) {
                socket.emit("joinByInvite", { success: false, msg: "Group participant limit reached (max 500)" });
                return;
            }
            conversation.participants.push(userId);
            conversation.unreadCounts.push({ userId, count: 0 });
            await conversation.save();
            const userSockets = Array.from(io.sockets.sockets.values()).filter((s) => s.data.userId === userId);
            userSockets.forEach((s) => s.join(conversation._id.toString()));
            await createSystemMessage(conversation._id.toString(), userId, "member_joined", {
                content: `${socket.data.name} joined via invite`,
            });
            const populated = await Conversation.findById(conversation._id)
                .populate({ path: "participants", select: "name avatar email" })
                .populate({ path: "admins", select: "name avatar" })
                .lean();
            emitGroupUpdate(io, populated);
            io.to(userRoom(userId)).emit("newConversation", {
                success: true,
                data: { ...populated, isNew: true, unreadCount: 0 },
            });
            socket.emit("joinByInvite", { success: true, data: populated });
        } catch (error: any) {
            socket.emit("joinByInvite", { success: false, msg: error.message || "Failed to join group" });
        }
    });

    socket.on("getGroupMedia", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            const { isMember } = await getMembership(data?.conversationId, userId);
            if (!isMember) {
                socket.emit("getGroupMedia", { success: false, msg: "Not a member" });
                return;
            }
            const now = new Date();
            const media = await Message.find({
                conversationId: data.conversationId,
                isDeleted: { $ne: true },
                isViewOnce: { $ne: true },
                $and: [
                    { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
                    {
                        $or: [
                            { type: { $in: ["image", "video", "file"] } },
                            { attachement: { $exists: true, $nin: [null, ""] } },
                        ],
                    },
                ],
            })
                .sort({ createdAt: -1 })
                .limit(100)
                .select("type attachement attachmentMeta content createdAt senderId")
                .lean();
            socket.emit("getGroupMedia", { success: true, data: media });
        } catch (error: any) {
            socket.emit("getGroupMedia", { success: false, msg: "Failed to load media" });
        }
    });
}
