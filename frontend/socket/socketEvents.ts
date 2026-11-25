import { getSocket } from "./socket"

export const testSocket = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("testSocket", payload); }
    else if (typeof payload == 'function') { socket.on("testSocket", payload); }
    else { socket.emit("testSocket", payload); }
}

export const updateProfile = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("updateProfile", payload); }
    else if (typeof payload == 'function') { socket.on("updateProfile", payload); }
    else { socket.emit("updateProfile", payload); }
}

export const getContacts = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("getContacts", payload); }
    else if (typeof payload == 'function') { socket.on("getContacts", payload); }
    else { socket.emit("getContacts", payload); }
}

export const newConversation = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("newConversation", payload); }
    else if (typeof payload == 'function') { socket.on("newConversation", payload); }
    else { socket.emit("newConversation", payload); }
}

export const getConversations = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("getConversations", payload); }
    else if (typeof payload == 'function') { socket.on("getConversations", payload); }
    else { socket.emit("getConversations", payload); }
};

export const newMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("newMessage", payload); }
    else if (typeof payload == 'function') { socket.on("newMessage", payload); }
    else { socket.emit("newMessage", payload); }
};

export const messageDelivered = (payload: {
    messageId: string;
    conversationId: string;
}) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("messageDelivered", payload);
};

export const onMessageDelivered = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("messageDelivered", payload); }
    else { socket.on("messageDelivered", payload); }
};

export const onReadReceipt = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("readReceipt", payload); }
    else { socket.on("readReceipt", payload); }
};

export const getMessages = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("getMessages", payload); }
    else if (typeof payload == 'function') { socket.on("getMessages", payload); }
    else { socket.emit("getMessages", payload); }
};

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

export const onTyping = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("typing", payload); }
    else { socket.on("typing", payload); }
};

export const onStopTyping = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("stopTyping", payload); }
    else { socket.on("stopTyping", payload); }
};

// ── Reactions ──
export const reactToMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("reactToMessage", payload); }
    else if (typeof payload === 'function') { socket.on("reactToMessage", payload); }
    else { socket.emit("reactToMessage", payload); }
};

// ── Unread ──
export const markAsRead = (conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("markAsRead", { conversationId });
};

export const onUnreadCountUpdate = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("unreadCountUpdate", payload); }
    else { socket.on("unreadCountUpdate", payload); }
};

// ── Delete ──
export const deleteMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("deleteMessage", payload); }
    else if (typeof payload === 'function') { socket.on("deleteMessage", payload); }
    else { socket.emit("deleteMessage", payload); }
};

// ── Edit ──
export const editMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) { console.log("Socket is not connected"); return; }
    if (off) { socket.off("editMessage", payload); }
    else if (typeof payload === 'function') { socket.on("editMessage", payload); }
    else { socket.emit("editMessage", payload); }
};

// ── User Status (Online/Offline) ──
export const onUserStatus = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("userStatus", payload); }
    else { socket.on("userStatus", payload); }
};

// ── Get user online status ──
export const getUserStatus = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getUserStatus", payload); }
    else if (typeof payload === 'function') { socket.on("getUserStatus", payload); }
    else { socket.emit("getUserStatus", payload); }
};

// ── CALL EVENTS ──

export const callInvite = (payload: {
    conversationId: string;
    calleeId: string;
    kind: "voice" | "video";
}) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:invite", payload);
};

export const callAccept = (callId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:accept", { callId });
};

export const callReject = (callId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:reject", { callId });
};

export const callCancel = (callId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:cancel", { callId });
};

export const callEnd = (callId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:end", { callId });
};

export const callConnected = (callId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("call:connected", { callId });
};

export const onCallIncoming = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:incoming", payload); }
    else { socket.on("call:incoming", payload); }
};

export const onCallRinging = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:ringing", payload); }
    else { socket.on("call:ringing", payload); }
};

export const onCallAccepted = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:accepted", payload); }
    else { socket.on("call:accepted", payload); }
};

export const onCallEnded = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:ended", payload); }
    else { socket.on("call:ended", payload); }
};

export const onCallFailed = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:failed", payload); }
    else { socket.on("call:failed", payload); }
};

export const onCallConnected = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("call:connected", payload); }
    else { socket.on("call:connected", payload); }
};

// ── STORY EVENTS ──

export const createStory = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("createStory", payload); }
    else if (typeof payload === 'function') { socket.on("createStory", payload); }
    else { socket.emit("createStory", payload); }
};

export const getStories = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getStories", payload); }
    else if (typeof payload === 'function') { socket.on("getStories", payload); }
    else { socket.emit("getStories", payload); }
};

export const viewStory = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("viewStory", payload); }
    else if (typeof payload === 'function') { socket.on("viewStory", payload); }
    else { socket.emit("viewStory", payload); }
};

export const reactToStory = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("reactToStory", payload); }
    else if (typeof payload === 'function') { socket.on("reactToStory", payload); }
    else { socket.emit("reactToStory", payload); }
};

export const deleteStory = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("deleteStory", payload); }
    else if (typeof payload === 'function') { socket.on("deleteStory", payload); }
    else { socket.emit("deleteStory", payload); }
};

export const onStoryFeedUpdated = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("storyFeedUpdated", payload); }
    else { socket.on("storyFeedUpdated", payload); }
};

export const onStoryReaction = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("storyReaction", payload); }
    else { socket.on("storyReaction", payload); }
};

export const replyToStory = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("replyToStory", payload); }
    else if (typeof payload === 'function') { socket.on("replyToStory", payload); }
    else { socket.emit("replyToStory", payload); }
};

// ── POLL EVENTS ──

export const createPoll = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("createPoll", payload); }
    else if (typeof payload === 'function') { socket.on("createPoll", payload); }
    else { socket.emit("createPoll", payload); }
};

export const votePoll = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("votePoll", payload); }
    else if (typeof payload === 'function') { socket.on("votePoll", payload); }
    else { socket.emit("votePoll", payload); }
};

export const closePoll = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("closePoll", payload); }
    else if (typeof payload === 'function') { socket.on("closePoll", payload); }
    else { socket.emit("closePoll", payload); }
};

export const onPollUpdated = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("pollUpdated", payload); }
    else { socket.on("pollUpdated", payload); }
};

// ── STARRED / SAVED MESSAGES (Feature 2) ──
export const toggleStarMessage = (payload: { messageId: string; conversationId: string }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("toggleStarMessage", payload as any); }
    else if (typeof payload === 'function') { socket.on("toggleStarMessage", payload); }
    else { socket.emit("toggleStarMessage", payload); }
};

export const onMessageStarred = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("toggleStarMessage", payload); }
    else { socket.on("toggleStarMessage", payload); }
};

export const getStarredMessages = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getStarredMessages", payload); }
    else if (typeof payload === 'function') { socket.on("getStarredMessages", payload); }
    else { socket.emit("getStarredMessages", payload); }
};

// ── PINNED MESSAGES (Feature 3) ──
export const pinMessage = (payload: { conversationId: string; messageId: string }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("pinMessage", payload as any); }
    else if (typeof payload === 'function') { socket.on("pinMessage", payload); }
    else { socket.emit("pinMessage", payload); }
};

export const unpinMessage = (payload: { conversationId: string; messageId: string }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("unpinMessage", payload as any); }
    else if (typeof payload === 'function') { socket.on("unpinMessage", payload); }
    else { socket.emit("unpinMessage", payload); }
};

export const onPinnedMessageUpdated = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("pinnedMessageUpdated", payload); }
    else { socket.on("pinnedMessageUpdated", payload); }
};

// ── MESSAGE FORWARDING (Feature 5) ──
export const forwardMessage = (payload: { messageId: string; targetConversationIds: string[] }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("forwardMessage", payload as any); }
    else if (typeof payload === 'function') { socket.on("forwardMessage", payload); }
    else { socket.emit("forwardMessage", payload); }
};

// ── VIEW-ONCE MEDIA (Feature 7) ──
export const openViewOnce = (payload: { messageId: string; conversationId: string }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("openViewOnce", payload as any); }
    else if (typeof payload === 'function') { socket.on("openViewOnce", payload); }
    else { socket.emit("openViewOnce", payload); }
};

export const onViewOnceOpened = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("viewOnceOpened", payload); }
    else { socket.on("viewOnceOpened", payload); }
};

// ── CONVERSATION MUTE (Feature 9) ──
export const toggleMuteConversation = (payload: { conversationId: string; durationHours?: number; unmute?: boolean }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("toggleMuteConversation", payload as any); }
    else if (typeof payload === 'function') { socket.on("toggleMuteConversation", payload); }
    else { socket.emit("toggleMuteConversation", payload); }
};

export const onConversationMuted = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("toggleMuteConversation", payload); }
    else { socket.on("toggleMuteConversation", payload); }
};

export const togglePinConversation = (payload: { conversationId: string; pin: boolean } | ((res: any) => void), off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("togglePinConversation", payload as any); }
    else if (typeof payload === 'function') { socket.on("togglePinConversation", payload); }
    else { socket.emit("togglePinConversation", payload); }
};

export const markAsUnread = (conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("markAsUnread", { conversationId });
};

export const deleteConversation = (payload: { conversationId: string } | ((res: any) => void), off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("deleteConversation", payload as any); }
    else if (typeof payload === 'function') { socket.on("deleteConversation", payload); }
    else { socket.emit("deleteConversation", payload); }
};

export const setDisappearingTimer = (payload: { conversationId: string; seconds: number } | ((res: any) => void), off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("setDisappearingTimer", payload as any); }
    else if (typeof payload === 'function') { socket.on("setDisappearingTimer", payload); }
    else { socket.emit("setDisappearingTimer", payload); }
};

export const onMessageAck = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("messageAck", payload); }
    else { socket.on("messageAck", payload); }
};

export const scheduleMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("scheduleMessage", payload); }
    else if (typeof payload === 'function') { socket.on("scheduleMessage", payload); }
    else { socket.emit("scheduleMessage", payload); }
};

export const getScheduledMessages = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getScheduledMessages", payload); }
    else if (typeof payload === 'function') { socket.on("getScheduledMessages", payload); }
    else { socket.emit("getScheduledMessages", payload); }
};

export const cancelScheduledMessage = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("cancelScheduledMessage", payload); }
    else if (typeof payload === 'function') { socket.on("cancelScheduledMessage", payload); }
    else { socket.emit("cancelScheduledMessage", payload); }
};

export const getGroupMedia = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getGroupMedia", payload); }
    else if (typeof payload === 'function') { socket.on("getGroupMedia", payload); }
    else { socket.emit("getGroupMedia", payload); }
};

export const blockUser = (payload: { targetUserId: string; block: boolean } | ((res: any) => void), off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("blockUser", payload as any); }
    else if (typeof payload === 'function') { socket.on("blockUser", payload); }
    else { socket.emit("blockUser", payload); }
};

export const getBlockedUsers = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("getBlockedUsers", payload); }
    else if (typeof payload === 'function') { socket.on("getBlockedUsers", payload); }
    else { socket.emit("getBlockedUsers", payload); }
};

// ── GROUP ADMIN MANAGEMENT (Feature 10) ──
export const setGroupAdmin = (payload: { conversationId: string; targetUserId: string; promote: boolean }, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("setGroupAdmin", payload as any); }
    else if (typeof payload === 'function') { socket.on("setGroupAdmin", payload); }
    else { socket.emit("setGroupAdmin", payload); }
};

export const onGroupUpdated = (payload: any, off: boolean = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (off) { socket.off("groupUpdated", payload); }
    else { socket.on("groupUpdated", payload); }
};

// ── CONNECTION STATUS (Feature 18) ──
export const isSocketConnected = (): boolean => {
    const socket = getSocket();
    return !!socket && socket.connected;
};

export const onSocketConnectionChange = (handler: (connected: boolean) => void) => {
    const socket = getSocket();
    if (!socket) return () => {};
    const handleConnect = () => handler(true);
    const handleDisconnect = () => handler(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
    };
};