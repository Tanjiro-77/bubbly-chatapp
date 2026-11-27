import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "./context/AuthContext";
import { useCall } from "./context/CallContext";
import { useTheme } from "./context/ThemeContext";
import { AuthView } from "./components/auth/AuthView";
import { ChatListPane } from "./components/chat/ChatListPane";
import { ChatHeader } from "./components/chat/ChatHeader";
import { PinnedBanner } from "./components/chat/PinnedBanner";
import { MessageStream } from "./components/chat/MessageStream";
import { MessageInput } from "./components/chat/MessageInput";
import { Lightbox } from "./components/common/Lightbox";
import { ToastContainer, ToastMessage } from "./components/common/Toast";
import { bubblyAlert, bubblyConfirm } from "./components/common/BubblyDialog";
import { StoryViewerModal } from "./components/stories/StoryViewerModal";
import { CreateStoryModal } from "./components/stories/CreateStoryModal";
import { IncomingCallModal } from "./components/calls/IncomingCallModal";
import { ActiveCallModal } from "./components/calls/ActiveCallModal";
import { CallLogsModal } from "./components/calls/CallLogsModal";
import { VaultModal } from "./components/vault/VaultModal";
import { NewChatModal } from "./components/modals/NewChatModal";
import { StarredMessagesModal } from "./components/modals/StarredMessagesModal";
import { SharedMediaModal } from "./components/modals/SharedMediaModal";
import { GroupDetailsDrawer } from "./components/modals/GroupDetailsDrawer";
import { ContactProfileDrawer } from "./components/modals/ContactProfileDrawer";
import { SettingsModal } from "./components/modals/SettingsModal";
import { CreatePollModal } from "./components/modals/CreatePollModal";
import { ForwardModal } from "./components/chat/ForwardModal";
import { soundManager } from "./hooks/useSoundEffects";
import {
  ConversationProps,
  MessageProps,
  StoryGroupProps,
  ResponseProps,
} from "./types";
import {
  getConversations,
  fetchConversations,
  newConversation,
  getMessages,
  onGetMessages,
  newMessage as onNewMessage,
  markAsRead,
  onUnreadCountUpdate,
  messageDelivered,
  onMessageDelivered,
  onReadReceipt,
  emitTyping,
  emitStopTyping,
  onTyping,
  onStopTyping,
  reactToMessage,
  onMessageReacted,
  deleteMessage,
  onMessageDeleted,
  editMessage,
  onMessageEdited,
  getUserStatus,
  onGetUserStatus,
  onUserStatus,
  createPoll,
  votePoll,
  closePoll,
  onPollUpdated,
  toggleStarMessage,
  onMessageStarred,
  pinMessage,
  unpinMessage,
  onPinnedMessageUpdated,
  togglePinConversation,
  toggleMuteConversation,
  deleteConversation,
  onConversationDeleted,
  forwardMessage,
  openViewOnce,
  onViewOnceOpened,
  getStories,
  fetchStories,
  createStory,
  onCreateStory,
  viewStory,
  reactToStory,
  replyToStory,
  deleteStory,
  onStoryFeedUpdated,
  onGroupUpdated,
  onAddedToGroup,
  onRemovedFromGroup,
} from "./socket/socketEvents";
import { MessageSquare, Sparkles } from "lucide-react";

const LOCKED_STORAGE_KEY = "bubbly_locked_chats";
const CACHED_CONVERSATIONS_KEY = "bubbly_cache_conversations";
const CACHED_STORIES_KEY = "bubbly_cache_stories";

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const currentUserId = user?.id || user?._id || "";

  const {
    incomingCall,
    activeCall,
    isRinging,
    isMuted,
    isVideoOff,
    callDuration,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  // Primary State - Instant 0ms Cache Loading
  const [conversations, setConversations] = useState<ConversationProps[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_CONVERSATIONS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [activeConversation, setActiveConversation] = useState<ConversationProps | null>(null);
  const activeConversationRef = useRef<ConversationProps | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [stories, setStories] = useState<StoryGroupProps[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_STORIES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  const [draftMap, setDraftMap] = useState<Record<string, string>>({});
  const [lockedChatIds, setLockedChatIds] = useState<string[]>([]);

  // Modals & Drawers
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeStoryUserId, setActiveStoryUserId] = useState<string | null>(null);
  const activeStoryGroup = useMemo(
    () => (activeStoryUserId ? stories.find((s) => s.user?.id === activeStoryUserId) || null : null),
    [stories, activeStoryUserId]
  );
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showCallLogs, setShowCallLogs] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<MessageProps | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageProps | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageProps | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // In-Chat Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase();
    return messages.filter(
      (m) => m.content && m.content.toLowerCase().includes(queryLower)
    );
  }, [messages, searchQuery]);

  const scrollToMatch = (index: number) => {
    if (searchMatches.length === 0) return;
    const targetMsg = searchMatches[index];
    if (targetMsg) {
      const msgId = targetMsg.id || (targetMsg as any)._id;
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleNextSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx =
      (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  useEffect(() => {
    if (searchMatches.length > 0) {
      scrollToMatch(0);
    }
  }, [searchQuery]);

  const handleTogglePinChat = (convId: string) => {
    const target = conversations.find((c) => c._id === convId);
    const nextPin = !target?.isPinned;
    togglePinConversation({ conversationId: convId, pin: nextPin });
    setConversations((prev) =>
      prev.map((c) =>
        c._id === convId ? { ...c, isPinned: nextPin } : c
      )
    );
    if (activeConversation?._id === convId) {
      setActiveConversation((prev) => (prev ? { ...prev, isPinned: nextPin } : null));
    }
    addToast("info", nextPin ? "Conversation pinned" : "Conversation unpinned");
  };

  const handleToggleMuteChat = (convId: string, currentMuted: boolean) => {
    toggleMuteConversation({ conversationId: convId, unmute: currentMuted });
    setConversations((prev) =>
      prev.map((c) =>
        c._id === convId ? { ...c, isMuted: !currentMuted } : c
      )
    );
    if (activeConversation?._id === convId) {
      setActiveConversation((prev) =>
        prev ? { ...prev, isMuted: !currentMuted } : null
      );
    }
    addToast("info", !currentMuted ? "Conversation muted" : "Conversation unmuted");
  };

  const handleDeleteConversation = async (convId: string) => {
    const confirmed = await bubblyConfirm({
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      deleteConversation({ conversationId: convId });
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversation?._id === convId) {
        setActiveConversation(null);
      }
      addToast("info", "Conversation deleted");
    }
  };

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load locked chats from local storage
  useEffect(() => {
    const savedLocked = localStorage.getItem(LOCKED_STORAGE_KEY);
    if (savedLocked) {
      try {
        setLockedChatIds(JSON.parse(savedLocked));
      } catch {}
    }
  }, []);

  const handleToggleLockChat = (conversationId: string) => {
    setLockedChatIds((prev) => {
      const next = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId];
      localStorage.setItem(LOCKED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Socket setup & Event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Load initial data & update cache (getConversations / getStories trigger fetch automatically)
    const handleConversations = (res: ResponseProps) => {
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
        try {
          localStorage.setItem(CACHED_CONVERSATIONS_KEY, JSON.stringify(res.data));
        } catch {}
      }
    };

    const handleStories = (res: ResponseProps) => {
      if (res.success && Array.isArray(res.data)) {
        setStories(res.data);
        try {
          localStorage.setItem(CACHED_STORIES_KEY, JSON.stringify(res.data));
        } catch {}
      }
    };

    getConversations(handleConversations);
    getStories(handleStories);

    const handleMessages = (res: any) => {
      if (!res?.success || !Array.isArray(res.data)) return;
      const activeId = activeConversationRef.current?._id;
      if (res.conversationId && activeId && res.conversationId !== activeId) return;
      // Backend returns messages newest-first (createdAt desc); reverse to chronological order
      setMessages([...res.data].reverse());
    };

    // Listen for new conversations
    const handleNewConversation = (res: ResponseProps) => {
      if (res.success && res.data) {
        setConversations((prev) => [res.data, ...prev.filter((c) => c._id !== res.data._id)]);
      }
    };

    const handleConversationDeleted = (res: ResponseProps) => {
      const deletedId = res?.data?.conversationId;
      if (res?.success && deletedId) {
        setConversations((prev) => prev.filter((c) => c._id !== deletedId));
        if (activeConversationRef.current?._id === deletedId) {
          setActiveConversation(null);
        }
      }
    };

    // Listen for incoming messages
    const handleNewMessage = (res: ResponseProps) => {
      if (res.success && res.data) {
        const msg = res.data;
        const senderId = msg.sender?.id || msg.sender?._id || msg.senderId;
        const isFromMe = senderId === currentUserId;

        if (isFromMe) {
          soundManager.playSend();
        } else {
          soundManager.playReceive();
          messageDelivered({
            messageId: msg.id || msg._id,
            conversationId: msg.conversationId,
          });
        }

        const active = activeConversationRef.current;
        if (active && active._id === msg.conversationId) {
          setMessages((prev) => {
            if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev;
            return [...prev, msg];
          });
          markAsRead(msg.conversationId);
        }

        let foundConversation = false;
        setConversations((prev) => {
          const index = prev.findIndex((c) => c._id === msg.conversationId);
          if (index !== -1) {
            foundConversation = true;
            const updated = {
              ...prev[index],
              lastMessage: msg,
              updatedAt: msg.createdAt,
            };
            const remaining = prev.filter((_, i) => i !== index);
            return [updated, ...remaining];
          }
          return prev;
        });
        if (!foundConversation) {
          fetchConversations();
        }
      }
    };

    const handleMessageEdited = (res: ResponseProps) => {
      const payload = res?.data ?? res;
      const messageId = payload?.messageId || payload?.id || payload?._id;
      const nextContent = payload?.content;
      if (!messageId || typeof nextContent !== "string") return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === messageId ? { ...m, content: nextContent, isEdited: true } : m
        )
      );
    };

    const handleMessageDeleted = (res: ResponseProps) => {
      const payload = res?.data ?? res;
      const messageId = payload?.messageId || payload?.id || payload?._id;
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === messageId
            ? {
                ...m,
                isDeleted: true,
                content: "",
                attachement: null,
                voiceUrl: null,
                attachmentMeta: null,
                poll: null,
                checklist: null,
                reactions: [],
              }
            : m
        )
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage && (c.lastMessage._id === messageId || (c.lastMessage as any).id === messageId)
            ? { ...c, lastMessage: { ...c.lastMessage, isDeleted: true, content: "" } }
            : c
        )
      );
    };

    const handleMessageReacted = (res: ResponseProps) => {
      const payload = res?.data ?? res;
      const messageId = payload?.messageId;
      if (!messageId || !Array.isArray(payload?.reactions)) return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === messageId ? { ...m, reactions: payload.reactions } : m
        )
      );
    };

    const handleMessageStarred = (res: ResponseProps) => {
      if (res?.success && res?.data?.messageId) {
        const { messageId, isSaved, isStarred } = res.data;
        const starredVal = Boolean(isSaved ?? isStarred);
        setMessages((prev) =>
          prev.map((m) =>
            (m.id || m._id) === messageId ? { ...m, isSaved: starredVal } : m
          )
        );
      }
    };

    // Listen for unread count updates
    const handleUnreadCount = (data: { conversationId: string; unreadCount: number }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === data.conversationId ? { ...c, unreadCount: data.unreadCount } : c
        )
      );
    };

    // Listen for typing events
    const handleTyping = (data: { conversationId: string; senderName: string; senderId: string }) => {
      if (data.senderId !== currentUserId) {
        setTypingMap((prev) => ({ ...prev, [data.conversationId]: data.senderName }));
      }
    };

    const handleStopTyping = (data: { conversationId: string; senderId: string }) => {
      if (data.senderId !== currentUserId) {
        setTypingMap((prev) => {
          const next = { ...prev };
          delete next[data.conversationId];
          return next;
        });
      }
    };

    // Listen for user presence (both live broadcasts and getUserStatus responses)
    const handleUserStatus = (res: any) => {
      const payload = res?.data ?? res;
      if (payload?.userId) {
        setOnlineMap((prev) => ({ ...prev, [payload.userId]: Boolean(payload.isOnline) }));
      }
    };

    // Listen for story feed updates
    const handleStoryFeed = (res?: ResponseProps) => {
      if (res?.success && Array.isArray(res.data)) {
        setStories(res.data);
        try {
          localStorage.setItem(CACHED_STORIES_KEY, JSON.stringify(res.data));
        } catch {}
      } else {
        fetchStories();
      }
    };

    const handleCreateStoryRes = (res: ResponseProps) => {
      if (res?.success) {
        addToast("success", "Story shared successfully!");
        fetchStories();
      } else if (res?.msg) {
        addToast("error", res.msg);
      }
    };

    // Listen for poll updates
    const handlePollUpdated = (res: ResponseProps) => {
      if (res.success && res.data) {
        const { messageId, poll } = res.data;
        setMessages((prev) =>
          prev.map((m) => ((m.id || m._id) === messageId ? { ...m, poll } : m))
        );
      }
    };

    // Listen for pinned message updates
    const handlePinnedUpdated = (res: ResponseProps) => {
      if (res.success && res.data) {
        const { conversationId, pinnedMessages } = res.data;
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, pinnedMessages } : c))
        );
        if (activeConversationRef.current?._id === conversationId) {
          setActiveConversation((active) =>
            active && active._id === conversationId ? { ...active, pinnedMessages } : active
          );
        }
      }
    };

    const handleGroupUpdated = (res: ResponseProps) => {
      if (res?.success && res?.data?._id) {
        const updatedConv = res.data;
        setConversations((prev) =>
          prev.map((c) => (c._id === updatedConv._id ? { ...c, ...updatedConv } : c))
        );
        if (activeConversationRef.current?._id === updatedConv._id) {
          setActiveConversation((prev) => (prev ? { ...prev, ...updatedConv } : prev));
        }
      }
    };

    const handleAddedToGroup = () => {
      fetchConversations();
    };

    const handleRemovedFromGroup = (data: { conversationId?: string }) => {
      if (data?.conversationId) {
        setConversations((prev) => prev.filter((c) => c._id !== data.conversationId));
        if (activeConversationRef.current?._id === data.conversationId) {
          setActiveConversation(null);
        }
      } else {
        fetchConversations();
      }
    };

    // Listen for view once opened
    const handleViewOnceOpened = (res: any) => {
      const payload = res?.data ?? res;
      const messageId = payload?.messageId;
      const viewerId = payload?.openedByUserId || payload?.userId;
      if (!messageId || !viewerId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if ((m.id || m._id) === messageId) {
            const opened = m.viewOnceOpenedBy || [];
            return {
              ...m,
              viewOnceOpenedBy: opened.includes(viewerId) ? opened : [...opened, viewerId],
            };
          }
          return m;
        })
      );
    };

    onGetMessages(handleMessages);
    newConversation(handleNewConversation);
    onConversationDeleted(handleConversationDeleted);
    onNewMessage(handleNewMessage);
    onMessageEdited(handleMessageEdited);
    onMessageDeleted(handleMessageDeleted);
    onMessageReacted(handleMessageReacted);
    onMessageStarred(handleMessageStarred);
    onUnreadCountUpdate(handleUnreadCount);
    onTyping(handleTyping);
    onStopTyping(handleStopTyping);
    onUserStatus(handleUserStatus);
    onGetUserStatus(handleUserStatus);
    onStoryFeedUpdated(handleStoryFeed);
    onCreateStory(handleCreateStoryRes);
    onPollUpdated(handlePollUpdated);
    onPinnedMessageUpdated(handlePinnedUpdated);
    onGroupUpdated(handleGroupUpdated);
    onAddedToGroup(handleAddedToGroup);
    onRemovedFromGroup(handleRemovedFromGroup);
    onViewOnceOpened(handleViewOnceOpened);

    return () => {
      getConversations(handleConversations, true);
      getStories(handleStories, true);
      onGetMessages(handleMessages, true);
      newConversation(handleNewConversation, true);
      onConversationDeleted(handleConversationDeleted, true);
      onNewMessage(handleNewMessage, true);
      onMessageEdited(handleMessageEdited, true);
      onMessageDeleted(handleMessageDeleted, true);
      onMessageReacted(handleMessageReacted, true);
      onMessageStarred(handleMessageStarred, true);
      onUnreadCountUpdate(handleUnreadCount, true);
      onTyping(handleTyping, true);
      onStopTyping(handleStopTyping, true);
      onUserStatus(handleUserStatus, true);
      onGetUserStatus(handleUserStatus, true);
      onStoryFeedUpdated(handleStoryFeed, true);
      onCreateStory(handleCreateStoryRes, true);
      onPollUpdated(handlePollUpdated, true);
      onPinnedMessageUpdated(handlePinnedUpdated, true);
      onGroupUpdated(handleGroupUpdated, true);
      onAddedToGroup(handleAddedToGroup, true);
      onRemovedFromGroup(handleRemovedFromGroup, true);
      onViewOnceOpened(handleViewOnceOpened, true);
    };
  }, [isAuthenticated, currentUserId]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setReplyingTo(null);
      setEditingMessage(null);
      return;
    }

    setReplyingTo(null);
    setEditingMessage(null);
    markAsRead(activeConversation._id);

    getMessages({ conversationId: activeConversation._id });

    // Request presence status for conversation participants
    activeConversation.participants?.forEach((p) => {
      if (p._id !== currentUserId) {
        getUserStatus({ targetUserId: p._id });
      }
    });
  }, [activeConversation?._id, currentUserId]);

  useEffect(() => {
    const targetId = pendingScrollMessageIdRef.current;
    if (!targetId) return;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollMessageIdRef.current = null;
    }
  }, [messages, activeConversation?._id]);

  // Sending message handler
  const handleSendMessage = (payload: {
    content: string;
    type?: string;
    attachment?: string;
    attachmentMeta?: any;
    replyTo?: any;
    isViewOnce?: boolean;
    voiceUrl?: string;
    voiceDuration?: number;
  }) => {
    if (!activeConversation) return;

    const replyToId =
      typeof payload.replyTo === "string"
        ? payload.replyTo
        : payload.replyTo?.id || payload.replyTo?._id || undefined;

    onNewMessage({
      conversationId: activeConversation._id,
      content: payload.content,
      type: payload.type || "text",
      attachement: payload.attachment,
      attachmentMeta: payload.attachmentMeta,
      replyTo: replyToId,
      isViewOnce: payload.isViewOnce,
      voiceUrl: payload.voiceUrl,
      voiceDuration: payload.voiceDuration,
    });
  };

  // Reactions
  const handleReact = (messageId: string, emoji: string) => {
    if (!activeConversation) return;
    reactToMessage({
      conversationId: activeConversation._id,
      messageId,
      emoji,
    });

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if ((m.id || m._id) === messageId) {
          const reactions = m.reactions || [];
          const existing = reactions.find(
            (r) => r.emoji === emoji && r.userId === currentUserId
          );
          let nextReactions = [...reactions];
          if (existing) {
            nextReactions = nextReactions.filter(
              (r) => !(r.emoji === emoji && r.userId === currentUserId)
            );
          } else {
            nextReactions.push({
              emoji,
              userId: currentUserId,
              userName: user?.name || "Me",
            });
          }
          return { ...m, reactions: nextReactions };
        }
        return m;
      })
    );
  };

  // Star message
  const handleStar = (messageId: string) => {
    if (!activeConversation) return;
    toggleStarMessage({
      conversationId: activeConversation._id,
      messageId,
    });
    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id) === messageId ? { ...m, isSaved: !m.isSaved } : m
      )
    );
    addToast("info", "Starred message toggled");
  };

  // Pin message
  const handlePin = (messageId: string) => {
    if (!activeConversation) return;
    const msg = messages.find((m) => (m.id || m._id) === messageId);
    if (msg?.isPinned) {
      unpinMessage({
        conversationId: activeConversation._id,
        messageId,
      });
      addToast("info", "Message unpinned");
    } else {
      pinMessage({
        conversationId: activeConversation._id,
        messageId,
      });
      addToast("success", "Message pinned");
    }
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    if (!activeConversation) return;
    const confirmed = await bubblyConfirm({
      title: "Delete Message",
      message: "Delete this message for everyone?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      deleteMessage({
        conversationId: activeConversation._id,
        messageId,
      });
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === messageId
            ? {
                ...m,
                isDeleted: true,
                content: "",
                attachement: null,
                voiceUrl: null,
                attachmentMeta: null,
                poll: null,
                checklist: null,
                reactions: [],
              }
            : m
        )
      );
    }
  };

  // Edit message
  const handleEdit = (messageId: string, newContent: string) => {
    if (!activeConversation) return;
    editMessage({
      conversationId: activeConversation._id,
      messageId,
      content: newContent,
      newContent,
    });
    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id) === messageId ? { ...m, content: newContent, isEdited: true } : m
      )
    );
  };

  // Poll voting & closing
  const handleVotePoll = (messageId: string, optionId: string) => {
    if (!activeConversation) return;
    votePoll({
      conversationId: activeConversation._id,
      messageId,
      optionId,
    });
  };

  const handleClosePoll = (messageId: string) => {
    if (!activeConversation) return;
    closePoll({
      conversationId: activeConversation._id,
      messageId,
    });
  };

  // View once open
  const handleOpenViewOnce = (messageId: string) => {
    if (!activeConversation) return;
    const msg = messages.find((m) => (m.id || m._id) === messageId);
    if (msg?.attachement) {
      setLightboxUrl(msg.attachement);
      openViewOnce({
        conversationId: activeConversation._id,
        messageId,
      });
    }
  };

  // Create Story
  const handleCreateStory = (storyData: any) => {
    createStory(storyData);
  };

  // Call initiations
  const handleStartCall = (kind: "voice" | "video") => {
    if (!activeConversation) return;
    const partner =
      activeConversation.type !== "group"
        ? activeConversation.participants?.find((p) => p._id !== currentUserId)
        : null;

    if (!partner) {
      bubblyAlert("Group Calls Unavailable", "Group calls are currently unavailable. Call a 1-on-1 contact.", {
        variant: "amber",
      });
      return;
    }

    startCall(activeConversation._id, partner._id, {
      id: partner._id,
      name: partner.name,
      avatar: partner.avatar,
    }, kind);
  };

  // If loading session
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-100 dark:bg-zinc-950">
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-4 animate-bounce">
          <Sparkles className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">
          Bubbly
        </h2>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
          Connecting to real-time chat network...
        </span>
      </div>
    );
  }

  // If not logged in
  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#1c1917] text-[#292524] dark:text-[#f5f5f4] select-none font-sans">
      {/* LEFT PANE: Conversations, Stories, Search, Navigation */}
      <div
        className={`${
          activeConversation ? "hidden md:flex" : "flex"
        } w-full md:w-[380px] lg:w-[420px] shrink-0 h-full border-r border-black/10 dark:border-white/10`}
      >
        <ChatListPane
          conversations={conversations}
          activeConversationId={activeConversation?._id || null}
          stories={stories}
          currentUserId={currentUserId}
          userAvatar={user?.avatar}
          userName={user?.name}
          onlineMap={onlineMap}
          typingMap={typingMap}
          draftMap={draftMap}
          lockedChatIds={lockedChatIds}
          onSelectConversation={(conv) => {
            setActiveConversation(conv);
            setIsSearching(false);
            setSearchQuery("");
            setCurrentMatchIndex(0);
          }}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenVault={() => setShowVault(true)}
          onOpenCallLogs={() => setShowCallLogs(true)}
          onOpenStarred={() => setShowStarred(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenProfile={() => setShowSettings(true)}
          onOpenCreateStory={() => setShowCreateStory(true)}
          onViewStoryGroup={(group) => setActiveStoryUserId(group.user?.id || null)}
          onTogglePin={handleTogglePinChat}
          onToggleMute={handleToggleMuteChat}
          onDeleteConversation={handleDeleteConversation}
          onLockChatToVault={handleToggleLockChat}
        />
      </div>

      {/* RIGHT PANE: Active Chat Stream or Empty State */}
      <div
        className={`${
          !activeConversation ? "hidden md:flex" : "flex"
        } flex-1 h-full flex-col relative overflow-hidden bg-[#FAF5EE] dark:bg-[#121214]`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              conversation={activeConversation}
              currentUserId={currentUserId}
              isOnline={
                activeConversation.type !== "group"
                  ? onlineMap[
                      activeConversation.participants?.find((p) => p._id !== currentUserId)?._id || ""
                    ]
                  : false
              }
              typingUser={typingMap[activeConversation._id] || null}
              searchQuery={searchQuery}
              searchMatchesCount={searchMatches.length}
              currentMatchIndex={currentMatchIndex}
              isSearching={isSearching}
              onVoiceCall={() => handleStartCall("voice")}
              onVideoCall={() => handleStartCall("video")}
              onToggleSearch={() => {
                setIsSearching((prev) => !prev);
                if (isSearching) {
                  setSearchQuery("");
                  setCurrentMatchIndex(0);
                }
              }}
              onChangeSearchQuery={(q) => {
                setSearchQuery(q);
                setCurrentMatchIndex(0);
              }}
              onPrevMatch={handlePrevSearchMatch}
              onNextMatch={handleNextSearchMatch}
              onCloseSearch={() => {
                setIsSearching(false);
                setSearchQuery("");
                setCurrentMatchIndex(0);
              }}
              onOpenStarred={() => setShowStarred(true)}
              onOpenDetails={() => setShowDetailsDrawer(true)}
              onBack={() => setActiveConversation(null)}
            />

            {/* Pinned Messages Banner */}
            <PinnedBanner
              pinnedMessages={activeConversation.pinnedMessages}
              onScrollToMessage={(id) => {
                const el = document.getElementById(`msg-${id}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onUnpin={(id) => handlePin(id)}
            />

            {/* Message Stream */}
            <MessageStream
              messages={messages}
              currentUserId={currentUserId}
              isGroup={activeConversation.type === "group"}
              searchQuery={isSearching ? searchQuery : ""}
              onReact={handleReact}
              onReply={(msg) => setReplyingTo(msg)}
              onStar={handleStar}
              onPin={handlePin}
              onForward={(msg) => setForwardingMessage(msg)}
              onEdit={(msg) => setEditingMessage(msg)}
              onDelete={handleDelete}
              onVotePoll={handleVotePoll}
              onClosePoll={handleClosePoll}
              onOpenImage={(url) => setLightboxUrl(url)}
              onOpenViewOnce={handleOpenViewOnce}
            />

            {/* Message Input Bar */}
            <MessageInput
              conversationId={activeConversation._id}
              initialDraft={draftMap[activeConversation._id] || ""}
              onDraftChange={(cid, val) =>
                setDraftMap((prev) => {
                  if (!val) {
                    if (!prev[cid]) return prev;
                    const next = { ...prev };
                    delete next[cid];
                    return next;
                  }
                  return { ...prev, [cid]: val };
                })
              }
              onSendMessage={handleSendMessage}
              onEditMessage={handleEdit}
              onTyping={() =>
                emitTyping({
                  conversationId: activeConversation._id,
                  senderName: user?.name || "User",
                })
              }
              onStopTyping={() =>
                emitStopTyping({ conversationId: activeConversation._id })
              }
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onOpenPollModal={() => setShowCreatePoll(true)}
            />
          </>
        ) : (
          // Authentic Bubbly Empty State on Desktop
          <div className="relative h-full flex flex-col items-center justify-center text-center p-8 select-none bg-[#FAF5EE] dark:bg-[#121214] overflow-hidden">
            {/* Background pattern wallpaper */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30 bg-repeat z-0"
              style={{
                backgroundImage: `url('/bgPattern.png')`,
                backgroundSize: "320px 320px",
              }}
            />

            <div className="relative z-10 flex flex-col items-center max-w-md">
              <div className="w-28 h-28 rounded-[36px] bg-[#fef3c7] dark:bg-amber-500/20 text-[#d97706] flex items-center justify-center shadow-xl shadow-amber-500/10 mb-6 border border-[#f59e0b]/30">
                <img
                  src="/logo-glow.png"
                  alt="Bubbly"
                  className="w-16 h-16 object-contain drop-shadow"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef3c7] dark:bg-amber-500/20 text-[#d97706] text-xs font-black tracking-wider uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                V3.2.0 • Real-Time Linked Network
              </div>

              <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight mb-3">
                Connect Beyond Messages 💛
              </h2>

              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-8 font-medium">
                Seamlessly synchronized with your Bubbly mobile app. Send instant messages, share voice notes, post stories, and place HD calls across all your devices.
              </p>

              <button
                onClick={() => setShowNewChat(true)}
                className="py-3.5 px-8 rounded-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-[#1c1917] font-extrabold text-sm shadow-xl shadow-amber-500/30 transition transform hover:-translate-y-0.5 duration-150 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAYS & MODALS */}

      {/* Lightbox for images */}
      <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* Story Viewer */}
      {activeStoryGroup && (
        <StoryViewerModal
          storyGroup={activeStoryGroup}
          currentUserId={currentUserId}
          onClose={() => setActiveStoryUserId(null)}
          onView={(storyId) => viewStory({ storyId })}
          onReact={(storyId, emoji) => {
            reactToStory({ storyId, emoji });
            fetchStories();
          }}
          onReply={(_userId, text, storyId) => {
            replyToStory({ storyId, content: text });
            addToast("success", "Reply sent!");
          }}
          onDelete={(storyId) => {
            deleteStory({ storyId });
            setActiveStoryUserId(null);
            addToast("info", "Story deleted");
          }}
        />
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <CreateStoryModal
          onClose={() => setShowCreateStory(false)}
          onSubmit={handleCreateStory}
        />
      )}

      {/* Secret Chat Vault */}
      {showVault && (
        <VaultModal
          conversations={conversations}
          lockedChatIds={lockedChatIds}
          currentUserId={currentUserId}
          onClose={() => setShowVault(false)}
          onToggleLockChat={handleToggleLockChat}
          onSelectConversation={(conv) => setActiveConversation(conv)}
        />
      )}

      {/* Call Logs Modal */}
      {showCallLogs && (
        <CallLogsModal
          currentUserId={currentUserId}
          onClose={() => setShowCallLogs(false)}
          onInitiateCall={(targetId, name, avatar, kind) => {
            // Find existing conversation with this user or create
            const conv = conversations.find(
              (c) => c.type !== "group" && c.participants?.some((p) => p._id === targetId)
            );
            if (conv) {
              startCall(conv._id, targetId, { id: targetId, name, avatar }, kind);
            } else {
              bubblyAlert("Start a Chat First", "Start a chat with this contact before placing a call.", {
                variant: "amber",
              });
            }
          }}
        />
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          currentUserId={currentUserId}
          onClose={() => setShowNewChat(false)}
          onCreated={(conv) => {
            if (conv) setActiveConversation(conv);
          }}
        />
      )}

      {/* Starred Messages Modal */}
      {showStarred && (
        <StarredMessagesModal
          onClose={() => setShowStarred(false)}
          onJumpToMessage={(convId, msgId) => {
            const conv = conversations.find((c) => c._id === convId);
            if (conv) {
              pendingScrollMessageIdRef.current = msgId;
              setActiveConversation(conv);
              setTimeout(() => {
                const el = document.getElementById(`msg-${msgId}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  pendingScrollMessageIdRef.current = null;
                }
              }, 350);
            }
          }}
        />
      )}

      {/* Shared Media Modal */}
      {showSharedMedia && activeConversation && (
        <SharedMediaModal
          conversationName={activeConversation.name || "Conversation"}
          messages={messages}
          onClose={() => setShowSharedMedia(false)}
          onOpenImage={(url) => setLightboxUrl(url)}
        />
      )}

      {/* Group or Contact Details Drawer */}
      {showDetailsDrawer && activeConversation && (
        activeConversation.type === "group" ? (
          <GroupDetailsDrawer
            conversation={activeConversation}
            currentUserId={currentUserId}
            onClose={() => setShowDetailsDrawer(false)}
            onToggleMute={() => handleToggleMuteChat(activeConversation._id, !!activeConversation.isMuted)}
            onOpenSharedMedia={() => {
              setShowDetailsDrawer(false);
              setShowSharedMedia(true);
            }}
          />
        ) : (
          <ContactProfileDrawer
            contact={
              activeConversation.participants?.find((p) => p._id !== currentUserId) || {
                email: "",
                name: "User",
              }
            }
            conversationId={activeConversation._id}
            isMuted={activeConversation.isMuted}
            isOnline={
              onlineMap[
                activeConversation.participants?.find((p) => p._id !== currentUserId)?._id || ""
              ]
            }
            onClose={() => setShowDetailsDrawer(false)}
            onToggleMute={() => handleToggleMuteChat(activeConversation._id, !!activeConversation.isMuted)}
            onOpenSharedMedia={() => {
              setShowDetailsDrawer(false);
              setShowSharedMedia(true);
            }}
          />
        )
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenVault={() => setShowVault(true)}
        />
      )}

      {/* Create Poll Modal */}
      {showCreatePoll && activeConversation && (
        <CreatePollModal
          onClose={() => setShowCreatePoll(false)}
          onSubmit={(pollData) => {
            createPoll({
              conversationId: activeConversation._id,
              ...pollData,
            });
            addToast("success", "Poll sent!");
          }}
        />
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          conversations={conversations}
          currentUserId={currentUserId}
          onClose={() => setForwardingMessage(null)}
          onConfirmForward={(targetIds) => {
            forwardMessage({
              messageId: forwardingMessage.id || (forwardingMessage as any)._id,
              targetConversationIds: targetIds,
            });
            addToast("success", "Message forwarded!");
          }}
        />
      )}

      {/* Active Call Modal */}
      {activeCall && (
        <ActiveCallModal
          activeCall={activeCall}
          isRinging={isRinging}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          callDuration={callDuration}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={isRinging && activeCall.isOutgoing ? cancelCall : endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
