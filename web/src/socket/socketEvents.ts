import { getSocket } from "./socket";

// Helper to handle socket emit with optional callback or event listener
const socketOp = (eventName: string, payloadOrCb: any, cbOrOff?: any) => {
  const socket = getSocket();
  if (!socket) return;

  if (typeof payloadOrCb === "function") {
    // It's a listener: socketOp("eventName", callback, off)
    const isOff = typeof cbOrOff === "boolean" ? cbOrOff : false;
    if (isOff) {
      socket.off(eventName, payloadOrCb);
    } else {
      socket.on(eventName, payloadOrCb);
    }
  } else {
    // It's an emitter: socketOp("eventName", payload, callback)
    if (typeof cbOrOff === "function") {
      socket.emit(eventName, payloadOrCb, cbOrOff);
    } else {
      socket.emit(eventName, payloadOrCb);
    }
  }
};

// Conversations & Messages
export const getConversations = (cbOrPayload?: any, off = false) => socketOp("getConversations", cbOrPayload, off);
export const newConversation = (cbOrPayload?: any, off = false) => socketOp("newConversation", cbOrPayload, off);
export const getMessages = (payload: any, cb?: any) => socketOp("getMessages", payload, cb);
export const newMessage = (cbOrPayload: any, off = false) => socketOp("newMessage", cbOrPayload, off);
export const markAsRead = (conversationId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("markAsRead", { conversationId });
};
export const onUnreadCountUpdate = (cb: any, off = false) => socketOp("unreadCountUpdate", cb, off);
export const messageDelivered = (payload: { messageId: string; conversationId: string }) => {
  const socket = getSocket();
  if (socket) socket.emit("messageDelivered", payload);
};
export const onMessageDelivered = (cb: any, off = false) => socketOp("messageDelivered", cb, off);
export const onReadReceipt = (cb: any, off = false) => socketOp("readReceipt", cb, off);

// Typing
export const emitTyping = (payload: { conversationId: string; senderName?: string }) => {
  const socket = getSocket();
  if (socket) socket.emit("typing", payload);
};
export const emitStopTyping = (payload: { conversationId: string }) => {
  const socket = getSocket();
  if (socket) socket.emit("stopTyping", payload);
};
export const onTyping = (cb: any, off = false) => socketOp("typing", cb, off);
export const onStopTyping = (cb: any, off = false) => socketOp("stopTyping", cb, off);

// Message Actions
export const reactToMessage = (payload: any, off = false) => socketOp("reactToMessage", payload, off);
export const editMessage = (payload: any, off = false) => socketOp("editMessage", payload, off);
export const deleteMessage = (payload: any, off = false) => socketOp("deleteMessage", payload, off);
export const toggleStarMessage = (payload: { messageId: string; conversationId: string }, off = false) =>
  socketOp("toggleStarMessage", payload, off);
export const getStarredMessages = (cbOrPayload: any, off = false) => socketOp("getStarredMessages", cbOrPayload, off);
export const onMessageStarred = (cb: any, off = false) => socketOp("messageStarred", cb, off);
export const pinMessage = (payload: { conversationId: string; messageId: string }, off = false) =>
  socketOp("pinMessage", payload, off);
export const unpinMessage = (payload: { conversationId: string; messageId: string }, off = false) =>
  socketOp("unpinMessage", payload, off);
export const onPinnedMessageUpdated = (cb: any, off = false) => socketOp("pinnedMessageUpdated", cb, off);
export const forwardMessage = (payload: { messageId: string; targetConversationIds: string[] }, off = false) =>
  socketOp("forwardMessage", payload, off);
export const openViewOnce = (payload: { messageId: string; conversationId: string }, off = false) =>
  socketOp("openViewOnce", payload, off);
export const onViewOnceOpened = (cb: any, off = false) => socketOp("viewOnceOpened", cb, off);

// Polls
export const createPoll = (payload: any, off = false) => socketOp("createPoll", payload, off);
export const votePoll = (payload: any, off = false) => socketOp("votePoll", payload, off);
export const closePoll = (payload: any, off = false) => socketOp("closePoll", payload, off);
export const onPollUpdated = (cb: any, off = false) => socketOp("pollUpdated", cb, off);

// User & Contacts
export const getContacts = (cbOrPayload?: any, off = false) => socketOp("getContacts", cbOrPayload, off);
export const updateProfile = (payload: any, off = false) => socketOp("updateProfile", payload, off);
export const getUserStatus = (payload: any, off = false) => socketOp("getUserStatus", payload, off);
export const onUserStatus = (cb: any, off = false) => socketOp("userStatus", cb, off);
export const blockUser = (payload: { targetUserId: string }, off = false) => socketOp("blockUser", payload, off);
export const getBlockedUsers = (cb: any, off = false) => socketOp("getBlockedUsers", cb, off);
export const updatePrivacy = (payload: any, off = false) => socketOp("updatePrivacy", payload, off);

// Groups
export const updateGroup = (payload: any, off = false) => socketOp("updateGroup", payload, off);
export const addGroupMembers = (payload: any, off = false) => socketOp("addGroupMembers", payload, off);
export const removeGroupMember = (payload: any, off = false) => socketOp("removeGroupMember", payload, off);
export const leaveGroup = (payload: any, off = false) => socketOp("leaveGroup", payload, off);
export const setGroupAdmin = (payload: any, off = false) => socketOp("setGroupAdmin", payload, off);
export const onGroupUpdated = (cb: any, off = false) => socketOp("groupUpdated", cb, off);
export const toggleMuteConversation = (payload: { conversationId: string; durationHours?: number; unmute?: boolean }, off = false) =>
  socketOp("toggleMuteConversation", payload, off);

// Stories
export const createStory = (payload: any, cb?: any) => socketOp("createStory", payload, cb);
export const getStories = (cbOrPayload?: any, off = false) => socketOp("getStories", cbOrPayload, off);
export const viewStory = (payload: any, off = false) => socketOp("viewStory", payload, off);
export const reactToStory = (payload: any, off = false) => socketOp("reactToStory", payload, off);
export const replyToStory = (payload: any, off = false) => socketOp("replyToStory", payload, off);
export const deleteStory = (payload: any, off = false) => socketOp("deleteStory", payload, off);
export const onStoryFeedUpdated = (cb: any, off = false) => socketOp("storyFeedUpdated", cb, off);

// Calls
export const callInvite = (payload: { conversationId: string; calleeId: string; kind: "voice" | "video" }) => {
  const socket = getSocket();
  if (socket) socket.emit("call:invite", payload);
};
export const callAccept = (callId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("call:accept", { callId });
};
export const callReject = (callId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("call:reject", { callId });
};
export const callCancel = (callId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("call:cancel", { callId });
};
export const callConnected = (callId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("call:connected", { callId });
};
export const callEnd = (callId: string) => {
  const socket = getSocket();
  if (socket) socket.emit("call:end", { callId });
};
export const callSignal = (payload: { callId: string; targetUserId: string; payload: any }) => {
  const socket = getSocket();
  if (socket) socket.emit("call:signal", payload);
};
export const onCallIncoming = (cb: any, off = false) => socketOp("call:incoming", cb, off);
export const onCallRinging = (cb: any, off = false) => socketOp("call:ringing", cb, off);
export const onCallAccepted = (cb: any, off = false) => socketOp("call:accepted", cb, off);
export const onCallEnded = (cb: any, off = false) => socketOp("call:ended", cb, off);
export const onCallFailed = (cb: any, off = false) => socketOp("call:failed", cb, off);
export const onCallConnected = (cb: any, off = false) => socketOp("call:connected", cb, off);
export const onCallSignal = (cb: any, off = false) => socketOp("call:signal", cb, off);
