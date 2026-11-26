import {
    addSocketListener,
    connectSocket,
    getSocket,
    removeSocketListener,
    subscribeSocketStatus,
} from "./socket";

const emitOrBind = (event: string, payload: any, off: boolean = false) => {
    if (off) {
        if (typeof payload === "function") removeSocketListener(event, payload);
        return;
    }
    if (typeof payload === "function") {
        addSocketListener(event, payload);
        return;
    }
    const socket = getSocket();
    if (!socket) {
        console.log(`Socket not connected for ${event}, attempting reconnect...`);
        connectSocket()
            .then((s) => {
                if (s?.connected) s.emit(event, payload);
            })
            .catch(() => {});
        return;
    }
    socket.emit(event, payload);
};

const bindEvent = (event: string, payload: any, off: boolean = false) => {
    if (typeof payload !== "function") return;
    if (off) removeSocketListener(event, payload);
    else addSocketListener(event, payload);
};

const emitCritical = (event: string, payload: any) => {
    const socket = getSocket();
    if (socket?.connected) {
        socket.emit(event, payload);
        return;
    }
    connectSocket()
        .then((s) => {
            s?.emit(event, payload);
        })
        .catch(() => {});
};

export const testSocket = (payload: any, off: boolean = false) =>
    emitOrBind("testSocket", payload, off);

export const updateProfile = (payload: any, off: boolean = false) =>
    emitOrBind("updateProfile", payload, off);

export const getContacts = (payload: any, off: boolean = false) =>
    emitOrBind("getContacts", payload, off);

export const newConversation = (payload: any, off: boolean = false) =>
    emitOrBind("newConversation", payload, off);

export const getConversations = (payload: any, off: boolean = false) =>
    emitOrBind("getConversations", payload, off);

export const newMessage = (payload: any, off: boolean = false) =>
    emitOrBind("newMessage", payload, off);

export const messageDelivered = (payload: {
    messageId: string;
    conversationId: string;
}) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("messageDelivered", payload);
};

export const onMessageDelivered = (payload: any, off: boolean = false) =>
    bindEvent("messageDelivered", payload, off);

export const onReadReceipt = (payload: any, off: boolean = false) =>
    bindEvent("readReceipt", payload, off);

export const getMessages = (payload: any, off: boolean = false) =>
    emitOrBind("getMessages", payload, off);

// ── Typing ──
export const emitTyping = (payload: {
    conversationId: string;
    senderId: string;
    senderName: string;
}) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("typing", payload);
};

export const emitStopTyping = (payload: {
    conversationId: string;
    senderId: string;
}) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("stopTyping", payload);
};

export const onTyping = (payload: any, off: boolean = false) =>
    bindEvent("typing", payload, off);

export const onStopTyping = (payload: any, off: boolean = false) =>
    bindEvent("stopTyping", payload, off);

// ── Reactions ──
export const reactToMessage = (payload: any, off: boolean = false) =>
    emitOrBind("reactToMessage", payload, off);

// ── Unread ──
export const markAsRead = (conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("markAsRead", { conversationId });
};

export const onUnreadCountUpdate = (payload: any, off: boolean = false) =>
    bindEvent("unreadCountUpdate", payload, off);

// ── Delete ──
export const deleteMessage = (payload: any, off: boolean = false) =>
    emitOrBind("deleteMessage", payload, off);

// ── Edit ──
export const editMessage = (payload: any, off: boolean = false) =>
    emitOrBind("editMessage", payload, off);

// ── User Status (Online/Offline) ──
export const onUserStatus = (payload: any, off: boolean = false) =>
    bindEvent("userStatus", payload, off);

// ── Get user online status ──
export const getUserStatus = (payload: any, off: boolean = false) =>
    emitOrBind("getUserStatus", payload, off);

// ── CALL EVENTS ──

export const callInvite = (payload: {
    conversationId: string;
    calleeId: string;
    kind: "voice" | "video";
}) => {
    emitCritical("call:invite", payload);
};

export const callAccept = (callId: string) => {
    emitCritical("call:accept", { callId });
};

export const callReject = (callId: string) => {
    emitCritical("call:reject", { callId });
};

export const callCancel = (callId: string) => {
    emitCritical("call:cancel", { callId });
};

export const callEnd = (callId: string) => {
    emitCritical("call:end", { callId });
};

export const callConnected = (callId: string) => {
    emitCritical("call:connected", { callId });
};

export const onCallIncoming = (payload: any, off: boolean = false) =>
    bindEvent("call:incoming", payload, off);

export const onCallRinging = (payload: any, off: boolean = false) =>
    bindEvent("call:ringing", payload, off);

export const onCallAccepted = (payload: any, off: boolean = false) =>
    bindEvent("call:accepted", payload, off);

export const onCallEnded = (payload: any, off: boolean = false) =>
    bindEvent("call:ended", payload, off);

export const onCallFailed = (payload: any, off: boolean = false) =>
    bindEvent("call:failed", payload, off);

export const onCallConnected = (payload: any, off: boolean = false) =>
    bindEvent("call:connected", payload, off);

// ── STORY EVENTS ──

export const createStory = (payload: any, off: boolean = false) =>
    emitOrBind("createStory", payload, off);

export const getStories = (payload: any, off: boolean = false) =>
    emitOrBind("getStories", payload, off);

export const viewStory = (payload: any, off: boolean = false) =>
    emitOrBind("viewStory", payload, off);

export const reactToStory = (payload: any, off: boolean = false) =>
    emitOrBind("reactToStory", payload, off);

export const deleteStory = (payload: any, off: boolean = false) =>
    emitOrBind("deleteStory", payload, off);

export const onStoryFeedUpdated = (payload: any, off: boolean = false) =>
    bindEvent("storyFeedUpdated", payload, off);

export const onStoryReaction = (payload: any, off: boolean = false) =>
    bindEvent("storyReaction", payload, off);

export const replyToStory = (payload: any, off: boolean = false) =>
    emitOrBind("replyToStory", payload, off);

// ── POLL EVENTS ──

export const createPoll = (payload: any, off: boolean = false) =>
    emitOrBind("createPoll", payload, off);

export const votePoll = (payload: any, off: boolean = false) =>
    emitOrBind("votePoll", payload, off);

export const closePoll = (payload: any, off: boolean = false) =>
    emitOrBind("closePoll", payload, off);

export const onPollUpdated = (payload: any, off: boolean = false) =>
    bindEvent("pollUpdated", payload, off);

// ── STARRED / SAVED MESSAGES (Feature 2) ──
export const toggleStarMessage = (payload: { messageId: string; conversationId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("toggleStarMessage", payload, off);

export const onMessageStarred = (payload: any, off: boolean = false) =>
    bindEvent("toggleStarMessage", payload, off);

export const getStarredMessages = (payload: any, off: boolean = false) =>
    emitOrBind("getStarredMessages", payload, off);

// ── PINNED MESSAGES (Feature 3) ──
export const pinMessage = (payload: { conversationId: string; messageId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("pinMessage", payload, off);

export const unpinMessage = (payload: { conversationId: string; messageId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("unpinMessage", payload, off);

export const onPinnedMessageUpdated = (payload: any, off: boolean = false) =>
    bindEvent("pinnedMessageUpdated", payload, off);

// ── MESSAGE FORWARDING (Feature 5) ──
export const forwardMessage = (payload: { messageId: string; targetConversationIds: string[] } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("forwardMessage", payload, off);

// ── VIEW-ONCE MEDIA (Feature 7) ──
export const openViewOnce = (payload: { messageId: string; conversationId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("openViewOnce", payload, off);

export const onViewOnceOpened = (payload: any, off: boolean = false) =>
    bindEvent("viewOnceOpened", payload, off);

// ── CONVERSATION MUTE (Feature 9) ──
export const toggleMuteConversation = (payload: { conversationId: string; durationHours?: number; unmute?: boolean } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("toggleMuteConversation", payload, off);

export const onConversationMuted = (payload: any, off: boolean = false) =>
    bindEvent("toggleMuteConversation", payload, off);

export const togglePinConversation = (payload: { conversationId: string; pin: boolean } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("togglePinConversation", payload, off);

export const markAsUnread = (conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("markAsUnread", { conversationId });
};

export const deleteConversation = (payload: { conversationId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("deleteConversation", payload, off);

export const setDisappearingTimer = (payload: { conversationId: string; seconds: number } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("setDisappearingTimer", payload, off);

export const onMessageAck = (payload: any, off: boolean = false) =>
    bindEvent("messageAck", payload, off);

export const scheduleMessage = (payload: any, off: boolean = false) =>
    emitOrBind("scheduleMessage", payload, off);

export const getScheduledMessages = (payload: any, off: boolean = false) =>
    emitOrBind("getScheduledMessages", payload, off);

export const cancelScheduledMessage = (payload: any, off: boolean = false) =>
    emitOrBind("cancelScheduledMessage", payload, off);

export const getGroupMedia = (payload: any, off: boolean = false) =>
    emitOrBind("getGroupMedia", payload, off);

export const blockUser = (payload: { targetUserId: string; block: boolean } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("blockUser", payload, off);

export const getBlockedUsers = (payload: any, off: boolean = false) =>
    emitOrBind("getBlockedUsers", payload, off);

// ── GROUP MANAGEMENT & ADMIN (Feature 10) ──
export const setGroupAdmin = (payload: { conversationId: string; targetUserId: string; promote: boolean } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("setGroupAdmin", payload, off);

export const updateGroup = (payload: any, off: boolean = false) =>
    emitOrBind("updateGroup", payload, off);

export const addGroupMembers = (payload: { conversationId: string; userIds: string[] } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("addGroupMembers", payload, off);

export const removeGroupMember = (payload: { conversationId: string; targetUserId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("removeGroupMember", payload, off);

export const leaveGroup = (payload: { conversationId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("leaveGroup", payload, off);

export const regenerateInvite = (payload: { conversationId: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("regenerateInvite", payload, off);

export const joinByInvite = (payload: { inviteCode: string } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("joinByInvite", payload, off);

export const onGroupUpdated = (payload: any, off: boolean = false) =>
    bindEvent("groupUpdated", payload, off);

export const onAddedToGroup = (payload: any, off: boolean = false) =>
    bindEvent("addedToGroup", payload, off);

export const onRemovedFromGroup = (payload: any, off: boolean = false) =>
    bindEvent("removedFromGroup", payload, off);

export const onScheduledMessageSent = (payload: any, off: boolean = false) =>
    bindEvent("scheduledMessageSent", payload, off);

export const toggleArchiveConversation = (payload: { conversationId: string; archive: boolean } | ((res: any) => void), off: boolean = false) =>
    emitOrBind("toggleArchiveConversation", payload, off);

export const toggleChecklistItem = (payload: { messageId: string; conversationId: string; itemId: string }) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("toggleChecklistItem", payload);
};

export const onChecklistUpdated = (payload: any, off: boolean = false) =>
    bindEvent("checklistUpdated", payload, off);

// ── CONNECTION STATUS (Feature 18) ──
export const isSocketConnected = (): boolean => {
    const socket = getSocket();
    return !!socket && socket.connected;
};

export const onSocketConnectionChange = (handler: (connected: boolean) => void) => {
    const unsubRegistry = subscribeSocketStatus(handler);
    const socket = getSocket();
    if (!socket) return unsubRegistry;
    const handleConnect = () => handler(true);
    const handleDisconnect = () => handler(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
        unsubRegistry();
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
    };
};
