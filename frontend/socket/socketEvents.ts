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