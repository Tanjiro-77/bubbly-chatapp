import Conversation from "../modals/Conversation";
import User from "../modals/User";
import { Types } from "mongoose";

export async function getMembership(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { conversation: null, isMember: false, isAdmin: false };
    const isMember = conversation.participants.some((p) => p.toString() === userId.toString());
    const isAdmin = conversation.admins?.some((p) => p.toString() === userId.toString())
        || conversation.createdBy?.toString() === userId.toString();
    return { conversation, isMember, isAdmin };
}

export function isGroupAdmin(conversation: any, userId: string) {
    return conversation.admins?.some((p: Types.ObjectId) => p.toString() === userId.toString())
        || conversation.createdBy?.toString() === userId.toString();
}

export async function areBlocked(userA: string, userB: string): Promise<boolean> {
    const [a, b] = await Promise.all([
        User.findById(userA).select("blockedUsers").lean(),
        User.findById(userB).select("blockedUsers").lean(),
    ]);
    if (!a || !b) return false;
    const aBlocked = (a.blockedUsers || []).some((id: Types.ObjectId) => id.toString() === userB);
    const bBlocked = (b.blockedUsers || []).some((id: Types.ObjectId) => id.toString() === userA);
    return aBlocked || bBlocked;
}

export async function filterBlockedDirect(conversation: any, senderId: string): Promise<boolean> {
    if (conversation.type !== "direct") return false;
    const other = conversation.participants.find((p: Types.ObjectId) => p.toString() !== senderId.toString());
    if (!other) return false;
    return areBlocked(senderId, other.toString());
}

export function canSendInGroup(conversation: any, userId: string) {
    if (conversation.type !== "group") return true;
    if (conversation.permissions?.sendMessages === "admins") {
        return isGroupAdmin(conversation, userId);
    }
    return true;
}

export function sanitizeLastSeen(viewerId: string, target: any, isContact: boolean) {
    const visibility = target.privacy?.lastSeen || "everyone";
    if (visibility === "nobody" && viewerId !== target._id.toString()) {
        return { isOnline: false, lastSeen: null, hidden: true };
    }
    if (visibility === "contacts" && !isContact && viewerId !== target._id.toString()) {
        return { isOnline: false, lastSeen: null, hidden: true };
    }
    return {
        isOnline: target.isOnline || false,
        lastSeen: target.lastSeen ? target.lastSeen.toISOString() : null,
        hidden: false,
    };
}
