import { ScrollView, StyleSheet, TouchableOpacity, View, TextInput, FlatList, Platform, Modal, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubblyAlert } from "../../components/BubblyAlert";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { useAuth } from "../../contexts/authContext";
import Button from "../../components/Button";
import StoryBar from '../../components/StoryBar';
import {
    getConversations, newConversation, newMessage,
    getStories,
    onUnreadCountUpdate,
    onUserStatus,
    onTyping,
    onStopTyping,
    toggleMuteConversation,
    togglePinConversation,
    toggleArchiveConversation,
    markAsUnread,
    deleteConversation,
    markAsRead,
    onGroupUpdated,
    onAddedToGroup,
    onRemovedFromGroup,
    isSocketConnected,
    onSocketConnectionChange,
} from "../../socket/socketEvents";
import { DailyDigestModal, QuickJumpModal, RemindersListModal } from "../../components/ConversationFeatureModals";
import { cancelMessageReminder, getActiveReminders, SavedMessageReminder } from "../../services/reminderService";
import {
    CHAT_FOLDER_META,
    ChatFolderTag,
    CustomStatusState,
    DailyActivityStats,
    DEFAULT_QUIET_HOURS,
    FocusModeState,
    formatRemainingFocus,
    getChatTagsMap,
    getDailyActivityStats,
    getFocusMode,
    getHomeSortOrder,
    getLocalArchivedIds,
    getMyCustomStatus,
    getNicknamesMap,
    getQuietHours,
    HomeSortOrder,
    isWithinQuietHours,
    QuietHoursConfig,
    saveHomeSortOrder,
    setChatTag,
    setFocusMode,
    setLocalArchivedId,
    subscribeFeatureUpdates,
} from "../../utils/featureStorage";
import { verticalScale, scale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";
import {
    getCachedConversations,
    getMemoryConversations,
    setCachedConversations,
} from "../../utils/chatCache";
import * as Icons from 'phosphor-react-native';
import { useRouter, useFocusEffect } from "expo-router";
import ConversationItem from "../../components/ConversationItem";
import Loading from "../../components/Loading";
import { ConversationProps, ResponseProps } from "../../types";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Avatar from '../../components/Avatar';

type FilterCategory = "all" | "unread" | "pinned" | "archived" | ChatFolderTag;

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    return "Good evening 🌙";
};

const Home = () => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState<boolean>(
        () => !(getMemoryConversations(currentUser?.id)?.length)
    );
    const [refreshing, setRefreshing] = useState(false);
    const [socketOnline, setSocketOnline] = useState(isSocketConnected());
    const [selectedTab, setSelectedTab] = useState(0); // 0 = direct, 1 = group
    const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
    const [conversations, setConversations] = useState<ConversationProps[]>(
        () => getMemoryConversations(currentUser?.id) ?? []
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
    const [typingMap, setTypingMap] = useState<Record<string, string>>({});
    const [draftMap, setDraftMap] = useState<Record<string, string>>({});
    const [lockedChatIds, setLockedChatIds] = useState<string[]>([]);
    const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const didInitialMountFetchRef = useRef(false);
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;
    const currentUserIdRef = useRef(currentUser?.id);
    currentUserIdRef.current = currentUser?.id;
    const hasLoadedConvsRef = useRef((getMemoryConversations(currentUser?.id)?.length ?? 0) > 0);
    const initialLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [actionConv, setActionConv] = useState<ConversationProps | null>(null);
    const [actionModalVisible, setActionModalVisible] = useState(false);

    // ── v4.0.1 Flagship States (Folders, Nicknames, Archive, Focus, Reminders, Quick Jump) ──
    const [chatTagsMap, setChatTagsMap] = useState<Record<string, ChatFolderTag>>({});
    const [nicknamesMap, setNicknamesMap] = useState<Record<string, string>>({});
    const [localArchivedIds, setLocalArchivedIds] = useState<string[]>([]);
    const [focusMode, setFocusModeState] = useState<FocusModeState>({ enabled: false, until: null, label: "" });
    const [myStatus, setMyStatus] = useState<CustomStatusState>({ emoji: "", text: "", expiresAt: null });
    const [reminders, setReminders] = useState<SavedMessageReminder[]>([]);
    const [dailyActivity, setDailyActivity] = useState<DailyActivityStats>({
        streakDays: 0,
        lastActiveDate: "",
        messagesSentToday: 0,
        totalSentAllTime: 0,
        activeConvIdsToday: [],
    });
    const [quietHours, setQuietHours] = useState<QuietHoursConfig>(DEFAULT_QUIET_HOURS);
    const [showQuickJump, setShowQuickJump] = useState(false);
    const [showRemindersModal, setShowRemindersModal] = useState(false);
    const [showDigestModal, setShowDigestModal] = useState(false);
    const [sortOrder, setSortOrder] = useState<HomeSortOrder>("latest");
    const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
    const isHomeSelectMode = selectedConvIds.length > 0;

    const lockedStorageKey = currentUser?.id ? `@bubbly_locked_chats_${currentUser.id}` : '@bubbly_locked_chats';

    const loadDraftsAndLocked = useCallback(async () => {
        try {
            const [storedLocked, allKeys, tags, nicks, arch, focus, status, rems, activity, qh, savedSort] = await Promise.all([
                AsyncStorage.getItem(lockedStorageKey),
                AsyncStorage.getAllKeys(),
                getChatTagsMap(),
                getNicknamesMap(),
                getLocalArchivedIds(currentUser?.id),
                getFocusMode(),
                getMyCustomStatus(),
                getActiveReminders(),
                getDailyActivityStats(),
                getQuietHours(),
                getHomeSortOrder(),
            ]);

            if (storedLocked) {
                try {
                    setLockedChatIds(JSON.parse(storedLocked));
                } catch (_) {}
            } else {
                setLockedChatIds([]);
            }

            setChatTagsMap(tags);
            setNicknamesMap(nicks);
            setLocalArchivedIds(arch);
            setFocusModeState(focus);
            setMyStatus(status);
            setReminders(rems);
            setDailyActivity(activity);
            setQuietHours(qh);
            setSortOrder(savedSort);

            const draftKeys = allKeys.filter(k => k.startsWith('@bubbly_draft_'));
            if (draftKeys.length > 0) {
                const pairs = await AsyncStorage.multiGet(draftKeys);
                const drafts: Record<string, string> = {};
                pairs.forEach(([key, val]) => {
                    if (val && val.trim()) {
                        const cId = key.replace('@bubbly_draft_', '');
                        drafts[cId] = val;
                    }
                });
                setDraftMap(drafts);
            } else {
                setDraftMap({});
            }
        } catch (_) {}
    }, [lockedStorageKey, currentUser?.id]);

    useEffect(() => {
        return subscribeFeatureUpdates(() => {
            loadDraftsAndLocked();
        });
    }, [loadDraftsAndLocked]);

    useEffect(() => {
        if (!focusMode.enabled || !focusMode.until) return;
        const interval = setInterval(() => {
            getFocusMode().then(setFocusModeState);
        }, 30000);
        return () => clearInterval(interval);
    }, [focusMode.enabled, focusMode.until]);

    useFocusEffect(
        useCallback(() => {
            if (!didInitialMountFetchRef.current) {
                didInitialMountFetchRef.current = true;
                return;
            }
            loadDraftsAndLocked();
            if (isSocketConnected()) {
                getConversations(null);
            }
        }, [loadDraftsAndLocked])
    );

    useEffect(() => {
        loadDraftsAndLocked();
        getConversations(processConversations);
        newConversation(newConversationHandler);
        newMessage(newMessageHandler);
        onUnreadCountUpdate(unreadCountHandler);
        onUserStatus(userStatusHandler);
        onTyping(typingHandler);
        onStopTyping(stopTypingHandler);
        deleteConversation(deleteConversationHandler);
        onGroupUpdated(groupUpdatedHandler);
        const addedToGroupHandler = () => getConversations(null);
        const removedFromGroupHandler = (data: { conversationId?: string }) => {
            if (data?.conversationId) {
                setConversations(prev => prev.filter(c => c._id !== data.conversationId));
            }
        };
        onAddedToGroup(addedToGroupHandler);
        onRemovedFromGroup(removedFromGroupHandler);
        const unsubConnection = onSocketConnectionChange((connected) => {
            setSocketOnline(connected);
            if (connected) getConversations(null);
        });
        setSocketOnline(isSocketConnected());

        if (currentUser?.id) {
            getCachedConversations(currentUser.id).then((cached) => {
                if (cached.length > 0) {
                    hasLoadedConvsRef.current = true;
                    setConversations((prev) => (prev.length === 0 ? cached : prev));
                    setLoading(false);
                    if (initialLoadTimerRef.current) {
                        clearTimeout(initialLoadTimerRef.current);
                        initialLoadTimerRef.current = null;
                    }
                }
            }).catch(() => {});
        }
        initialLoadTimerRef.current = setTimeout(() => {
            setLoading(false);
            initialLoadTimerRef.current = null;
        }, 4000);
        getConversations(null);

        return () => {
            getConversations(processConversations, true);
            newConversation(newConversationHandler, true);
            newMessage(newMessageHandler, true);
            onUnreadCountUpdate(unreadCountHandler, true);
            onUserStatus(userStatusHandler, true);
            onTyping(typingHandler, true);
            onStopTyping(stopTypingHandler, true);
            deleteConversation(deleteConversationHandler, true);
            onGroupUpdated(groupUpdatedHandler, true);
            onAddedToGroup(addedToGroupHandler, true);
            onRemovedFromGroup(removedFromGroupHandler, true);
            unsubConnection();
            if (initialLoadTimerRef.current) clearTimeout(initialLoadTimerRef.current);
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            Object.values(typingTimers.current).forEach(t => clearTimeout(t));
        };
    }, [loadDraftsAndLocked]);

    useEffect(() => {
        if (!hasLoadedConvsRef.current || !currentUser?.id) return;
        const timer = setTimeout(() => {
            setCachedConversations(currentUser.id, conversations);
        }, 120);
        return () => clearTimeout(timer);
    }, [conversations, currentUser?.id]);

    const typingHandler = (data: { conversationId: string; senderName?: string; senderId?: string }) => {
        if (data?.conversationId && data.senderId !== currentUser?.id) {
            setTypingMap(prev => ({ ...prev, [data.conversationId]: data.senderName || 'Typing...' }));
            if (typingTimers.current[data.conversationId]) clearTimeout(typingTimers.current[data.conversationId]);
            typingTimers.current[data.conversationId] = setTimeout(() => {
                setTypingMap(prev => {
                    const next = { ...prev };
                    delete next[data.conversationId];
                    return next;
                });
            }, 3500);
        }
    };

    const stopTypingHandler = (data: { conversationId: string }) => {
        if (data?.conversationId) {
            if (typingTimers.current[data.conversationId]) clearTimeout(typingTimers.current[data.conversationId]);
            setTypingMap(prev => {
                const next = { ...prev };
                delete next[data.conversationId];
                return next;
            });
        }
    };

    const userStatusHandler = (data: { userId: string; isOnline: boolean; lastSeen?: any }) => {
        if (data?.userId) {
            setOnlineUsers(prev => ({ ...prev, [data.userId]: data.isOnline }));
        }
    };

    const newMessageHandler = (res: ResponseProps) => {
        if (res.success && res.data) {
            const conversationId = res.data.conversationId;
            const exists = conversationsRef.current.some((item) => item._id == conversationId);
            if (!exists) {
                getConversations(null);
                return;
            }
            setConversations((prev) =>
                prev.map((item) => (item._id == conversationId ? { ...item, lastMessage: res.data } : item))
            );
        }
    };

    const processConversations = (res: ResponseProps) => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (initialLoadTimerRef.current) {
            clearTimeout(initialLoadTimerRef.current);
            initialLoadTimerRef.current = null;
        }
        setRefreshing(false);
        setLoading(false);
        if (res.success && Array.isArray(res.data)) {
            hasLoadedConvsRef.current = true;
            setConversations(res.data);
            setCachedConversations(currentUserIdRef.current, res.data);
        }
    };

    const handleRefresh = useCallback(() => {
        hapticTap("light");
        setRefreshing(true);
        getConversations(null);
        getStories(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            setRefreshing(false);
            refreshTimerRef.current = null;
        }, 3500);
    }, []);

    const newConversationHandler = (res: ResponseProps) => {
        if (res.success && res.data?._id) {
            setConversations((prev) => {
                const exists = prev.some((c) => c._id === res.data._id);
                return exists
                    ? prev.map((c) => (c._id === res.data._id ? { ...c, ...res.data } : c))
                    : [res.data, ...prev];
            });
        }
    };

    const deleteConversationHandler = (res: any) => {
        if (res?.success && res.data?.conversationId) {
            setConversations(prev => prev.filter(c => c._id !== res.data.conversationId));
        }
    };

    const groupUpdatedHandler = (res: any) => {
        if (res?.success && res.data?._id) {
            setConversations(prev =>
                prev.map(c => (c._id === res.data._id ? { ...c, ...res.data } : c))
            );
        }
    };

    const unreadCountHandler = (data: {
        conversationId: string;
        unreadCount: number;
    }) => {
        setConversations(prev =>
            prev.map(item =>
                item._id === data.conversationId
                    ? { ...item, unreadCount: data.unreadCount }
                    : item
            )
        );
    };

    const lockedSet = useMemo(() => new Set(lockedChatIds), [lockedChatIds]);
    const localArchivedSet = useMemo(() => new Set(localArchivedIds), [localArchivedIds]);

    const isConvArchived = useCallback((c: ConversationProps) => {
        return !!(c as any).isArchived || localArchivedSet.has(c._id);
    }, [localArchivedSet]);

    const { directConversations, groupConversations, archivedConversations } = useMemo(() => {
        const direct: ConversationProps[] = [];
        const group: ConversationProps[] = [];
        const archived: ConversationProps[] = [];
        const tsMap = new Map<string, number>();

        for (const item of conversations) {
            if (lockedSet.has(item._id)) continue;
            const rawDate = item?.lastMessage?.createdAt || item.createdAt;
            tsMap.set(item._id, rawDate ? Date.parse(String(rawDate)) || 0 : 0);
            if (isConvArchived(item)) {
                archived.push(item);
            } else if (item.type === "direct") {
                direct.push(item);
            } else if (item.type === "group") {
                group.push(item);
            }
        }

        const byLatest = (a: ConversationProps, b: ConversationProps) =>
            (tsMap.get(b._id) || 0) - (tsMap.get(a._id) || 0);

        direct.sort(byLatest);
        group.sort(byLatest);
        archived.sort(byLatest);
        return {
            directConversations: direct,
            groupConversations: group,
            archivedConversations: archived,
        };
    }, [conversations, lockedSet, isConvArchived]);

    const activeList = selectedTab === 0 ? directConversations : groupConversations;

    // ── V3 + v4.0.1 Filter Chips (All, Unread, Pinned, Folders, Archived) ──
    const categorizedList = useMemo(() => {
        if (filterCategory === "archived") {
            return archivedConversations;
        }
        if (filterCategory === "unread") {
            return activeList.filter(c => (c.unreadCount || 0) > 0);
        }
        if (filterCategory === "pinned") {
            return activeList.filter(c => !!(c as any).isPinned);
        }
        if (filterCategory === "work" || filterCategory === "friends" || filterCategory === "family" || filterCategory === "vip") {
            return activeList.filter(c => chatTagsMap[c._id] === filterCategory);
        }
        return activeList;
    }, [activeList, archivedConversations, filterCategory, chatTagsMap]);

    // ── Search Filtering & Sort Order ──
    const filteredList = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const base = !q
            ? [...categorizedList]
            : categorizedList.filter((item: ConversationProps) => {
                  const nameMatch = item.name?.toLowerCase().includes(q);
                  const convNickMatch = (nicknamesMap[item._id] || "").toLowerCase().includes(q);
                  const messageMatch = item.lastMessage?.content?.toLowerCase().includes(q);
                  const participantMatch = item.participants?.some(
                      (p: any) => p.name?.toLowerCase().includes(q) || (nicknamesMap[p._id] || "").toLowerCase().includes(q)
                  );
                  return nameMatch || convNickMatch || messageMatch || participantMatch;
              });

        if (sortOrder === "unread") {
            base.sort((a, b) => {
                const au = (a.unreadCount || 0) > 0 ? 1 : 0;
                const bu = (b.unreadCount || 0) > 0 ? 1 : 0;
                if (au !== bu) return bu - au;
                return 0;
            });
        } else if (sortOrder === "alpha") {
            const getTitle = (c: ConversationProps) => {
                const other = c.type === "direct" ? c.participants?.find((p: any) => p._id !== currentUser?.id) : null;
                return (
                    nicknamesMap[c._id] ||
                    (other?._id ? nicknamesMap[other._id] : "") ||
                    (c.type === "direct" ? other?.name : c.name) ||
                    ""
                ).toLowerCase();
            };
            base.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
        }
        return base;
    }, [searchQuery, categorizedList, nicknamesMap, sortOrder, currentUser?.id]);

    const totalUnreadDirect = useMemo(
        () => directConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        [directConversations]
    );
    const totalUnreadGroup = useMemo(
        () => groupConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        [groupConversations]
    );
    const totalUnreadCurrent = selectedTab === 0 ? totalUnreadDirect : totalUnreadGroup;
    const totalPinnedCurrent = useMemo(
        () => activeList.filter(c => !!(c as any).isPinned).length,
        [activeList]
    );

    // ── VIP Pinned Contacts ──
    const pinnedVIPs = useMemo(() => {
        return conversations.filter(c =>
            !lockedSet.has(c._id) &&
            !isConvArchived(c) &&
            !!(c as any).isPinned
        );
    }, [conversations, lockedSet, isConvArchived]);

    const handleSearchClose = () => {
        setSearchQuery("");
        setIsSearchActive(false);
    };

    const handleTabChange = (tab: number) => {
        hapticTap("medium");
        setSelectedTab(tab);
        setSearchQuery("");
        setFilterCategory("all");
    };

    // ── Long-Press Action Sheet Handlers ──
    const handleLongPress = useCallback((item: ConversationProps) => {
        hapticTap("rigid");
        setActionConv(item);
        setActionModalVisible(true);
    }, []);

    const handleCloseActionModal = () => {
        hapticTap("light");
        setActionModalVisible(false);
        setActionConv(null);
    };

    const handleTogglePin = () => {
        if (!actionConv) return;
        hapticTap("rigid");
        const convId = actionConv._id;
        const willPin = !(actionConv as any).isPinned;
        togglePinConversation({ conversationId: convId, pin: willPin });
        setConversations(prev => prev.map(c => c._id === convId ? ({ ...c, isPinned: willPin } as any) : c));
        handleCloseActionModal();
    };

    const handleToggleMute = () => {
        if (!actionConv) return;
        hapticTap("medium");
        const convId = actionConv._id;
        const newMuted = !actionConv.isMuted;
        toggleMuteConversation({ conversationId: convId, unmute: !newMuted });
        setConversations(prev => prev.map(c => c._id === convId ? { ...c, isMuted: newMuted } : c));
        handleCloseActionModal();
    };

    const handleToggleRead = () => {
        if (!actionConv) return;
        hapticTap("medium");
        const convId = actionConv._id;
        if ((actionConv.unreadCount || 0) > 0) {
            markAsRead(convId);
            setConversations(prev => prev.map(c => c._id === convId ? { ...c, unreadCount: 0 } : c));
        } else {
            markAsUnread(convId);
            setConversations(prev => prev.map(c => c._id === convId ? { ...c, unreadCount: 1 } : c));
        }
        handleCloseActionModal();
    };

    const handleLockToVault = async () => {
        if (!actionConv) return;
        hapticTap("rigid");
        const convId = actionConv._id;
        const convName = actionConv.name || "Conversation";
        handleCloseActionModal();
        try {
            const nextLocked = Array.from(new Set([...lockedChatIds, convId]));
            await AsyncStorage.setItem(lockedStorageKey, JSON.stringify(nextLocked));
            setLockedChatIds(nextLocked);
            setTimeout(() => {
                BubblyAlert.alert("Locked to Vault 🔒", `"${convName}" has been moved to your Secret Chat Vault.`);
            }, 90);
        } catch (_) {}
    };

    const handleToggleArchive = async () => {
        if (!actionConv) return;
        hapticTap("medium");
        const convId = actionConv._id;
        const willArchive = !isConvArchived(actionConv);
        handleCloseActionModal();
        toggleArchiveConversation({ conversationId: convId, archive: willArchive });
        const nextArch = await setLocalArchivedId(currentUser?.id, convId, willArchive);
        setLocalArchivedIds(nextArch);
        setConversations(prev => prev.map(c => c._id === convId ? { ...c, isArchived: willArchive } : c));
    };

    const handleAssignTag = () => {
        if (!actionConv) return;
        hapticTap("medium");
        const convId = actionConv._id;
        handleCloseActionModal();
        setTimeout(() => {
            BubblyAlert.alert(
                "🏷️ Chat Folder Tag",
                "Assign a smart folder label to organize this chat:",
                [
                    { text: "💼 Work", onPress: async () => setChatTagsMap(await setChatTag(convId, "work")) },
                    { text: "🤝 Friends", onPress: async () => setChatTagsMap(await setChatTag(convId, "friends")) },
                    { text: "🏡 Family", onPress: async () => setChatTagsMap(await setChatTag(convId, "family")) },
                    { text: "⭐ VIP", onPress: async () => setChatTagsMap(await setChatTag(convId, "vip")) },
                    { text: "Remove Tag", style: "destructive", onPress: async () => setChatTagsMap(await setChatTag(convId, null)) },
                    { text: "Cancel", style: "cancel" },
                ]
            );
        }, 90);
    };

    const handleToggleFocusMenu = () => {
        if (focusMode.enabled) {
            BubblyAlert.alert(
                "🌙 Focus Mode Active",
                `${focusMode.label} (${formatRemainingFocus(focusMode.until)}). Do you want to turn it off?`,
                [
                    { text: "Keep On", style: "cancel" },
                    {
                        text: "Turn Off",
                        style: "destructive",
                        onPress: async () => setFocusModeState(await setFocusMode(null)),
                    },
                ]
            );
            return;
        }
        BubblyAlert.alert(
            "🌙 Enable Focus / Quiet Mode",
            "Suppresses foreground sounds and toast popups while you focus:",
            [
                { text: "30 Minutes", onPress: async () => setFocusModeState(await setFocusMode(30, "30m Focus")) },
                { text: "1 Hour", onPress: async () => setFocusModeState(await setFocusMode(60, "1h Focus")) },
                { text: "2 Hours", onPress: async () => setFocusModeState(await setFocusMode(120, "2h Focus")) },
                { text: "Until Turned Off", onPress: async () => setFocusModeState(await setFocusMode(0, "Quiet Mode")) },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const handleDeleteConversation = () => {
        if (!actionConv) return;
        const convId = actionConv._id;
        const convName = actionConv.name || "this chat";
        handleCloseActionModal();
        setTimeout(() => {
            BubblyAlert.alert(
                "Delete Conversation",
                `Are you sure you want to delete ${convName}? This will remove it from your chat list.`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            deleteConversation({ conversationId: convId });
                            setConversations(prev => prev.filter(c => c._id !== convId));
                        }
                    }
                ]
            );
        }, 90);
    };

    const handleToggleConvSelect = useCallback((convId: string) => {
        setSelectedConvIds((prev) =>
            prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
        );
    }, []);

    const selectedConvSet = useMemo(() => new Set(selectedConvIds), [selectedConvIds]);

    const renderConversationItem = useCallback(({ item, index }: { item: ConversationProps; index: number }) => {
        const other = item.type === 'direct'
            ? item.participants?.find((p: any) => p._id !== currentUser?.id)
            : null;
        const isOnline = other ? !!onlineUsers[other._id] : false;
        const typingUser = typingMap[item._id] || null;
        const draftText = draftMap[item._id] || null;
        const nickname = nicknamesMap[item._id] || (other?._id ? nicknamesMap[other._id] : undefined);
        const folderTag = chatTagsMap[item._id];

        return (
            <ConversationItem
                item={item}
                router={router}
                showDivider={filteredList.length !== index + 1}
                searchQuery={searchQuery}
                isOnline={isOnline}
                typingUser={typingUser}
                draftText={draftText}
                onLongPress={handleLongPress}
                nickname={nickname}
                folderTag={folderTag}
                isSelectionMode={isHomeSelectMode}
                isSelected={selectedConvSet.has(item._id)}
                onToggleSelect={handleToggleConvSelect}
            />
        );
    }, [currentUser?.id, onlineUsers, router, filteredList.length, searchQuery, typingMap, draftMap, handleLongPress, nicknamesMap, chatTagsMap, isHomeSelectMode, selectedConvSet, handleToggleConvSelect]);

    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.4}>
            <View style={styles.container}>

                {/* ── V3 Flagship Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(220)}
                    style={styles.header}
                >
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerLeft}>
                            <View style={styles.brandRow}>
                                <View style={styles.brandBadge}>
                                    <Typo size={9.5} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                        V4.1.5
                                    </Typo>
                                </View>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 4,
                                        backgroundColor: socketOnline ? "rgba(34, 197, 94, 0.16)" : "rgba(245, 158, 11, 0.18)",
                                        paddingHorizontal: scale(6),
                                        paddingVertical: verticalScale(2),
                                        borderRadius: radius.full,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 5.5,
                                            height: 5.5,
                                            borderRadius: 3,
                                            backgroundColor: socketOnline ? "#22c55e" : "#fbbf24",
                                        }}
                                    />
                                    <Typo size={9.5} fontWeight="700" color={socketOnline ? "#86efac" : "#fde68a"}>
                                        {socketOnline ? "Live" : "Syncing"}
                                    </Typo>
                                </View>
                                <Typo size={12} color={'rgba(255,255,255,0.65)'} fontWeight="500" style={{ flexShrink: 1 }} textProps={{ numberOfLines: 1 }}>
                                    {getGreeting()}
                                </Typo>
                            </View>
                            <Typo
                                size={22}
                                color={colors.white}
                                fontWeight="800"
                                textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
                            >
                                {currentUser?.name || "Bubbly Chat"}
                            </Typo>
                            {(myStatus.text || myStatus.emoji) ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        hapticTap("light");
                                        router.push("/(main)/profileModel");
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Typo size={11.5} color={colors.primaryLight} fontWeight="600" textProps={{ numberOfLines: 1 }}>
                                        {myStatus.emoji} {myStatus.text}
                                    </Typo>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flexShrink: 0 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("medium");
                                    setShowQuickJump(true);
                                }}
                                activeOpacity={0.8}
                                style={{
                                    width: verticalScale(38),
                                    height: verticalScale(38),
                                    borderRadius: radius.full,
                                    backgroundColor: "rgba(255,255,255,0.12)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.18)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Icons.Lightning size={18} color={colors.primary} weight="fill" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("heavy");
                                    handleToggleFocusMenu();
                                }}
                                activeOpacity={0.8}
                                style={{
                                    width: verticalScale(38),
                                    height: verticalScale(38),
                                    borderRadius: radius.full,
                                    backgroundColor: focusMode.enabled ? colors.primary : "rgba(255,255,255,0.12)",
                                    borderWidth: 1,
                                    borderColor: focusMode.enabled ? colors.primary : "rgba(255,255,255,0.18)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Icons.Moon size={18} color={focusMode.enabled ? colors.black : colors.white} weight={focusMode.enabled ? "fill" : "bold"} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("medium");
                                    router.push("/(main)/profileModel");
                                }}
                                activeOpacity={0.8}
                                style={styles.avatarBtn}
                            >
                                <Avatar uri={currentUser?.avatar || null} size={44} />
                                <View style={styles.avatarBadge} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Focus / Quiet Hours / Streak / Reminders Live Banner */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(6) }}>
                        <TouchableOpacity
                            onPress={() => {
                                hapticTap("medium");
                                setShowDigestModal(true);
                            }}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 5,
                                backgroundColor: 'rgba(255,255,255,0.12)',
                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                                borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4,
                            }}
                        >
                            <Typo size={11} fontWeight="700" color={colors.primaryLight} textProps={{ numberOfLines: 1 }}>
                                🔥 {dailyActivity.streakDays}d Streak · {dailyActivity.messagesSentToday} sent today
                            </Typo>
                        </TouchableOpacity>
                        {focusMode.enabled && (
                            <TouchableOpacity
                                onPress={handleToggleFocusMenu}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 5,
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)',
                                    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4,
                                }}
                            >
                                <Typo size={11} fontWeight="700" color={colors.primaryLight} textProps={{ numberOfLines: 1 }}>
                                    🌙 {focusMode.label} · {formatRemainingFocus(focusMode.until)}
                                </Typo>
                            </TouchableOpacity>
                        )}
                        {isWithinQuietHours(quietHours) && (
                            <TouchableOpacity
                                onPress={() => router.push("/(main)/settings")}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 5,
                                    backgroundColor: 'rgba(99, 102, 241, 0.24)',
                                    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.5)',
                                    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4,
                                }}
                            >
                                <Typo size={11} fontWeight="700" color="#e0e7ff" textProps={{ numberOfLines: 1 }}>
                                    🔕 Quiet Hours Active
                                </Typo>
                            </TouchableOpacity>
                        )}
                        {reminders.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setShowRemindersModal(true)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 5,
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4,
                                }}
                            >
                                <Typo size={11} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                    ⏰ {reminders.length} Reminder{reminders.length > 1 ? "s" : ""}
                                </Typo>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Quick Actions Pill Bar */}
                    <View style={styles.headerQuickRow}>
                        <TouchableOpacity
                            onPress={() => {
                                hapticTap("medium");
                                router.push("/(main)/qrCode");
                            }}
                            style={styles.headerQuickPill}
                            activeOpacity={0.75}
                        >
                            <Icons.QrCode size={verticalScale(15)} color={colors.primary} weight="bold" />
                            <Typo size={11.5} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.78 }}>QR</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                hapticTap("medium");
                                router.push("/(main)/callLogs");
                            }}
                            style={styles.headerQuickPill}
                            activeOpacity={0.75}
                        >
                            <Icons.PhoneCall size={verticalScale(15)} color={colors.primary} weight="bold" />
                            <Typo size={11.5} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.78 }}>Calls</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                hapticTap("medium");
                                router.push("/(main)/vault");
                            }}
                            style={styles.headerQuickPill}
                            activeOpacity={0.75}
                        >
                            <Icons.LockKey size={verticalScale(15)} color={colors.primary} weight="bold" />
                            <Typo size={11.5} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.78 }}>Vault</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                hapticTap("medium");
                                router.push("/(main)/settings");
                            }}
                            style={styles.headerQuickPill}
                            activeOpacity={0.75}
                        >
                            <Icons.GearSix size={verticalScale(15)} color={colors.primary} weight="bold" />
                            <Typo size={11.5} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.78 }}>Settings</Typo>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Main Sheet ── */}
                <Animated.View
                    entering={FadeInUp.duration(260).delay(30)}
                    style={styles.content}
                >
                    {/* ── Story Bar ── */}
                    <StoryBar />

                    {/* ── VIP Pinned Carousel ── */}
                    {pinnedVIPs.length > 0 && (
                        <View style={styles.vipSection}>
                            <View style={styles.vipHeaderRow}>
                                <View style={styles.vipTitleRow}>
                                    <Icons.PushPin size={verticalScale(13)} color={colors.primaryDark} weight="fill" />
                                    <Typo size={12} fontWeight="800" color={colors.neutral800}>
                                        PINNED VIP CHATS
                                    </Typo>
                                </View>
                                <Typo size={11} fontWeight="600" color={colors.neutral400}>
                                    {pinnedVIPs.length} Pinned
                                </Typo>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.vipScrollContent}
                            >
                                {pinnedVIPs.map((vip) => {
                                    const other = vip.type === 'direct'
                                        ? vip.participants?.find((p: any) => p._id !== currentUser?.id)
                                        : null;
                                    const vipAvatar = vip.type === 'direct' ? (other?.avatar || vip.avatar) : vip.avatar;
                                    const baseVipName = (vip.type === 'direct' ? other?.name : vip.name) || "VIP";
                                    const vipName = nicknamesMap[vip._id] || (other?._id ? nicknamesMap[other._id] : "") || baseVipName;
                                    const isOnline = other ? !!onlineUsers[other._id] : false;
                                    const unread = vip.unreadCount || 0;

                                    return (
                                        <TouchableOpacity
                                            key={vip._id}
                                            style={styles.vipCard}
                                            activeOpacity={0.75}
                                            onPress={() => {
                                                hapticTap("medium");
                                                router.push({
                                                    pathname: "/(main)/conversation",
                                                    params: {
                                                        id: vip._id,
                                                        name: vip.name,
                                                        avatar: vip.avatar,
                                                        type: vip.type,
                                                        participants: JSON.stringify(vip.participants),
                                                        admins: JSON.stringify(vip.admins || []),
                                                        createdBy: vip.createdBy ? String(vip.createdBy) : "",
                                                        disappearingSeconds: String(vip.disappearingSeconds || 0),
                                                    }
                                                });
                                            }}
                                            onLongPress={() => handleLongPress(vip)}
                                        >
                                            <View style={styles.vipAvatarWrap}>
                                                <View style={styles.vipRing}>
                                                    <Avatar uri={vipAvatar} size={48} isGroup={vip.type === 'group'} />
                                                </View>
                                                {vip.type === 'direct' && isOnline && (
                                                    <View style={styles.vipOnlineDot} />
                                                )}
                                                <View style={styles.vipPinBadge}>
                                                    <Icons.PushPin size={scale(9)} color={colors.black} weight="fill" />
                                                </View>
                                                {unread > 0 && (
                                                    <View style={styles.vipUnreadBadge}>
                                                        <Typo size={9} fontWeight="800" color={colors.white}>
                                                            {unread > 9 ? "9+" : unread}
                                                        </Typo>
                                                    </View>
                                                )}
                                            </View>
                                            <Typo
                                                size={11.5}
                                                fontWeight="600"
                                                color={colors.neutral800}
                                                textProps={{ numberOfLines: 1 }}
                                                style={styles.vipName}
                                            >
                                                {vipName.split(" ")[0]}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* ── V3 Segmented Tabs (Messages vs Groups) ── */}
                    <View style={styles.tabsRow}>
                        {/* Messages Tab */}
                        <TouchableOpacity
                            onPress={() => handleTabChange(0)}
                            style={[styles.tab, selectedTab === 0 && styles.tabActive]}
                            activeOpacity={0.75}
                        >
                            <Icons.ChatCircle
                                size={verticalScale(16)}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 0 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13}
                                fontWeight={selectedTab === 0 ? "700" : "500"}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                                style={{ flexShrink: 1 }}
                                textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.8 }}
                            >
                                Direct Chats
                            </Typo>
                            {totalUnreadDirect > 0 && (
                                <View style={styles.tabBadge}>
                                    <Typo size={9} fontWeight="800" color={colors.white}>
                                        {totalUnreadDirect > 99 ? "99+" : totalUnreadDirect}
                                    </Typo>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Groups Tab */}
                        <TouchableOpacity
                            onPress={() => handleTabChange(1)}
                            style={[styles.tab, selectedTab === 1 && styles.tabActive]}
                            activeOpacity={0.75}
                        >
                            <Icons.Users
                                size={verticalScale(16)}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 1 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13}
                                fontWeight={selectedTab === 1 ? "700" : "500"}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                                style={{ flexShrink: 1 }}
                                textProps={{ numberOfLines: 1 }}
                            >
                                Groups
                            </Typo>
                            {totalUnreadGroup > 0 && (
                                <View style={styles.tabBadge}>
                                    <Typo size={9} fontWeight="800" color={colors.white}>
                                        {totalUnreadGroup > 99 ? "99+" : totalUnreadGroup}
                                    </Typo>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── V3 Interactive Filter Chips (All, Unread, Pinned) ── */}
                    <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterChipsRow}
                    >
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "all" && styles.filterChipActive,
                            ]}
                            onPress={() => { hapticTap("medium"); setFilterCategory("all"); }}
                            activeOpacity={0.7}
                        >
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "all" ? "700" : "500"}
                                color={filterCategory === "all" ? colors.neutral900 : colors.neutral500}
                            >
                                All ({activeList.length})
                            </Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "unread" && styles.filterChipActive,
                            ]}
                            onPress={() => { hapticTap("medium"); setFilterCategory("unread"); }}
                            activeOpacity={0.7}
                        >
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "unread" ? "700" : "500"}
                                color={filterCategory === "unread" ? colors.neutral900 : colors.neutral500}
                            >
                                Unread {totalUnreadCurrent > 0 ? `(${totalUnreadCurrent})` : ""}
                            </Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "pinned" && styles.filterChipActive,
                            ]}
                            onPress={() => { hapticTap("medium"); setFilterCategory("pinned"); }}
                            activeOpacity={0.7}
                        >
                            <Icons.PushPin
                                size={verticalScale(11)}
                                color={filterCategory === "pinned" ? colors.primaryDark : colors.neutral400}
                                weight="fill"
                            />
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "pinned" ? "700" : "500"}
                                color={filterCategory === "pinned" ? colors.neutral900 : colors.neutral500}
                            >
                                Pinned {totalPinnedCurrent > 0 ? `(${totalPinnedCurrent})` : ""}
                            </Typo>
                        </TouchableOpacity>

                        {(["work", "friends", "family", "vip"] as ChatFolderTag[]).map((tagKey) => {
                            const meta = CHAT_FOLDER_META[tagKey];
                            const isAct = filterCategory === tagKey;
                            return (
                                <TouchableOpacity
                                    key={tagKey}
                                    style={[
                                        styles.filterChip,
                                        isAct && styles.filterChipActive,
                                    ]}
                                    onPress={() => { hapticTap("medium"); setFilterCategory(tagKey); }}
                                    activeOpacity={0.7}
                                >
                                    <Typo
                                        size={12}
                                        fontWeight={isAct ? "700" : "500"}
                                        color={isAct ? colors.neutral900 : colors.neutral500}
                                    >
                                        {meta.emoji} {meta.label}
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}

                        {archivedConversations.length > 0 && (
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    filterCategory === "archived" && styles.filterChipActive,
                                ]}
                                onPress={() => { hapticTap("medium"); setFilterCategory("archived"); }}
                                activeOpacity={0.7}
                            >
                                <Icons.Archive
                                    size={verticalScale(12)}
                                    color={filterCategory === "archived" ? colors.primaryDark : colors.neutral500}
                                    weight="fill"
                                />
                                <Typo
                                    size={12}
                                    fontWeight={filterCategory === "archived" ? "700" : "500"}
                                    color={filterCategory === "archived" ? colors.neutral900 : colors.neutral500}
                                >
                                    Archived ({archivedConversations.length})
                                </Typo>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                    </View>

                    {/* ── Search Bar ── */}
                    <View style={styles.searchRow}>
                        <View style={[
                            styles.searchBar,
                            isSearchActive && styles.searchBarActive
                        ]}>
                            <Icons.MagnifyingGlass
                                size={verticalScale(16)}
                                color={isSearchActive ? colors.neutral700 : colors.neutral400}
                                weight={isSearchActive ? "bold" : "regular"}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={
                                    selectedTab === 0
                                        ? "Search messages or friends..."
                                        : "Search groups or topics..."
                                }
                                placeholderTextColor={colors.neutral400}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onFocus={() => setIsSearchActive(true)}
                                onBlur={() => setIsSearchActive(false)}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={handleSearchClose}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <View style={styles.clearBtn}>
                                        <Icons.X
                                            size={verticalScale(10)}
                                            color={colors.white}
                                            weight="bold"
                                        />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Results Count + Sort Order Pill ── */}
                    <View style={[styles.countRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <View style={{ flex: 1 }}>
                            {searchQuery.trim() ? (
                                <Typo size={12} color={colors.neutral400} fontWeight="500">
                                    {filteredList.length === 0
                                        ? "No results"
                                        : `${filteredList.length} result${filteredList.length === 1 ? "" : "s"} for "${searchQuery}"`}
                                </Typo>
                            ) : (
                                filteredList.length > 0 && (
                                    <Typo size={12} color={colors.neutral400} fontWeight="500">
                                        {filteredList.length}{" "}
                                        {filterCategory === "archived"
                                            ? (filteredList.length === 1 ? "archived chat" : "archived chats")
                                            : selectedTab === 0
                                                ? filteredList.length === 1 ? "conversation" : "conversations"
                                                : filteredList.length === 1 ? "group" : "groups"}
                                    </Typo>
                                )
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={async () => {
                                hapticTap("light");
                                const next: HomeSortOrder = sortOrder === "latest" ? "unread" : sortOrder === "unread" ? "alpha" : "latest";
                                setSortOrder(next);
                                await saveHomeSortOrder(next);
                            }}
                            activeOpacity={0.75}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                backgroundColor: sortOrder === "latest" ? colors.neutral100 : colors.primaryLight,
                                paddingHorizontal: scale(10),
                                paddingVertical: verticalScale(4),
                                borderRadius: radius.full,
                                borderWidth: 1,
                                borderColor: sortOrder === "latest" ? colors.neutral200 : colors.primary,
                            }}
                        >
                            <Icons.ArrowsDownUp size={12} color={sortOrder === "latest" ? colors.neutral600 : colors.primaryDark} weight="bold" />
                            <Typo size={11} fontWeight="700" color={sortOrder === "latest" ? colors.neutral600 : colors.primaryDark}>
                                {sortOrder === "latest" ? "Latest" : sortOrder === "unread" ? "Unread 1st" : "A–Z"}
                            </Typo>
                        </TouchableOpacity>
                    </View>

                    {/* ── Batch Multi-Select Toolbar ── */}
                    {isHomeSelectMode && (
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "#1c1917",
                            marginHorizontal: spacingX._15,
                            marginBottom: spacingY._8,
                            paddingHorizontal: spacingX._12,
                            paddingVertical: verticalScale(8),
                            borderRadius: radius._15,
                            gap: 6,
                        }}>
                            <Typo size={12.5} fontWeight="800" color={colors.white}>
                                {selectedConvIds.length} Selected
                            </Typo>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        hapticTap("medium");
                                        selectedConvIds.forEach((id) => {
                                            togglePinConversation({ conversationId: id, pin: true });
                                        });
                                        setConversations((prev) => prev.map((c) => selectedConvSet.has(c._id) ? ({ ...c, isPinned: true } as any) : c));
                                        setSelectedConvIds([]);
                                    }}
                                    style={{ backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full }}
                                >
                                    <Typo size={11} fontWeight="700" color={colors.primaryLight}>Pin</Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        hapticTap("medium");
                                        selectedConvIds.forEach((id) => markAsRead(id));
                                        setConversations((prev) => prev.map((c) => selectedConvSet.has(c._id) ? { ...c, unreadCount: 0 } : c));
                                        setSelectedConvIds([]);
                                    }}
                                    style={{ backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full }}
                                >
                                    <Typo size={11} fontWeight="700" color={colors.white}>Read</Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={async () => {
                                        hapticTap("medium");
                                        let nextArch = localArchivedIds;
                                        for (const id of selectedConvIds) {
                                            toggleArchiveConversation({ conversationId: id, archive: true });
                                            nextArch = await setLocalArchivedId(currentUser?.id, id, true);
                                        }
                                        setLocalArchivedIds(nextArch);
                                        setConversations((prev) => prev.map((c) => selectedConvSet.has(c._id) ? { ...c, isArchived: true } : c));
                                        setSelectedConvIds([]);
                                    }}
                                    style={{ backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full }}
                                >
                                    <Typo size={11} fontWeight="700" color={colors.white}>Archive</Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { hapticTap("light"); setSelectedConvIds([]); }}
                                    style={{ backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full }}
                                >
                                    <Typo size={11} fontWeight="800" color={colors.black}>Done</Typo>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Virtualized Conversations List ── */}
                    <FlatList
                        data={filteredList}
                        keyExtractor={(item) => item._id}
                        renderItem={renderConversationItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={12}
                        maxToRenderPerBatch={10}
                        updateCellsBatchingPeriod={24}
                        windowSize={9}
                        removeClippedSubviews={Platform.OS === 'android'}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.primaryDark}
                                colors={[colors.primaryDark, colors.primary]}
                            />
                        }
                        ListHeaderComponent={
                            selectedTab === 0 && !searchQuery.trim() && filterCategory === "all" ? (
                                <TouchableOpacity
                                    style={styles.notesSelfCard}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        hapticTap("medium");
                                        router.push({
                                            pathname: "/(main)/conversation",
                                            params: {
                                                id: `notes_${currentUser?.id}`,
                                                name: "Notes to Self 📝",
                                                type: "direct",
                                                participants: JSON.stringify([currentUser]),
                                            }
                                        });
                                    }}
                                >
                                    <View style={styles.notesSelfLeft}>
                                        <View style={styles.notesSelfIcon}>
                                            <Icons.Notebook size={verticalScale(20)} color={colors.primaryDark} weight="fill" />
                                        </View>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Typo size={14.5} fontWeight="700" color={colors.neutral900}>Notes to Self</Typo>
                                                <View style={styles.notesSelfBadge}>
                                                    <Typo size={9.5} fontWeight="700" color={colors.primaryDark}>YOU</Typo>
                                                </View>
                                            </View>
                                            <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                                Personal notebook for ideas, links & reminders
                                            </Typo>
                                        </View>
                                    </View>
                                    <Icons.CaretRight size={16} color={colors.neutral350} />
                                </TouchableOpacity>
                            ) : null
                        }
                        ListEmptyComponent={
                            loading ? (
                                <View style={styles.centerState}>
                                    <Loading />
                                    <Typo size={13} color={colors.neutral400} style={{ marginTop: spacingY._10 }}>
                                        Loading conversations...
                                    </Typo>
                                </View>
                            ) : searchQuery.trim() ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconWrap}>
                                        <Icons.MagnifyingGlass
                                            size={verticalScale(30)}
                                            color={colors.neutral300}
                                            weight="regular"
                                        />
                                    </View>
                                    <Typo size={15} fontWeight="600" color={colors.neutral600}>
                                        No results found
                                    </Typo>
                                    <Typo
                                        size={13}
                                        color={colors.neutral400}
                                        style={{ textAlign: 'center' }}
                                    >
                                        No {selectedTab === 0 ? "conversations" : "groups"} match "{searchQuery}"
                                    </Typo>
                                </View>
                            ) : (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconWrap}>
                                        {selectedTab === 0 ? (
                                            <Icons.ChatCircleDots
                                                size={verticalScale(34)}
                                                color={colors.primaryDark}
                                                weight="regular"
                                            />
                                        ) : (
                                            <Icons.Users
                                                size={verticalScale(34)}
                                                color={colors.primaryDark}
                                                weight="regular"
                                            />
                                        )}
                                    </View>
                                    <Typo size={16} fontWeight="700" color={colors.neutral800}>
                                        {filterCategory !== "all"
                                            ? `No ${filterCategory} ${selectedTab === 0 ? "chats" : "groups"}`
                                            : selectedTab === 0
                                                ? "Your inbox is clear"
                                                : "No groups yet"}
                                    </Typo>
                                    <Typo
                                        size={13}
                                        color={colors.neutral400}
                                        style={{ textAlign: 'center', maxWidth: scale(260) }}
                                    >
                                        {filterCategory !== "all"
                                            ? `You don't have any ${filterCategory} ${selectedTab === 0 ? "conversations" : "groups"} right now.`
                                            : selectedTab === 0
                                                ? "Connect with your friends by tapping the start chat button below"
                                                : "Create a group conversation to share stories and plans together"}
                                    </Typo>
                                    {filterCategory !== "all" && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                hapticTap("light");
                                                setFilterCategory("all");
                                            }}
                                            activeOpacity={0.8}
                                            style={{
                                                marginTop: spacingY._8,
                                                backgroundColor: colors.primaryLight,
                                                paddingHorizontal: scale(16),
                                                paddingVertical: verticalScale(8),
                                                borderRadius: radius.full,
                                                borderWidth: 1,
                                                borderColor: colors.primary,
                                            }}
                                        >
                                            <Typo size={12.5} fontWeight="800" color={colors.primaryDark}>
                                                Show All {selectedTab === 0 ? "Chats" : "Groups"}
                                            </Typo>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )
                        }
                    />
                </Animated.View>
            </View>

            {/* ── Floating Action Button (FAB) ── */}
            <Animated.View
                entering={FadeInUp.duration(240).delay(60)}
                style={[styles.fabWrap, { bottom: Math.max(insets.bottom, spacingY._15) + spacingY._12 }]}
            >
                <Button
                    style={styles.fab}
                    haptic={false}
                    onPress={() => {
                        hapticTap("heavy");
                        router.push({
                            pathname: "/(main)/newConversationModal",
                            params: { isGroup: selectedTab }
                        });
                    }}
                >
                    <Icons.Plus
                        color={colors.black}
                        weight="bold"
                        size={verticalScale(22)}
                    />
                </Button>
            </Animated.View>

            {/* ── Conversation Quick Action Sheet Modal ── */}
            <Modal
                visible={actionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseActionModal}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={handleCloseActionModal}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <Animated.View
                                entering={FadeInUp.duration(260).springify()}
                                style={[
                                    styles.actionSheet,
                                    { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._10 },
                                ]}
                            >
                                <View style={styles.sheetHandle} />

                                {actionConv && (
                                    <>
                                        {/* Sheet Header info */}
                                        <View style={styles.sheetHeader}>
                                            <Avatar
                                                uri={
                                                    actionConv.type === 'direct'
                                                        ? (actionConv.participants.find(p => p._id !== currentUser?.id)?.avatar || actionConv.avatar)
                                                        : actionConv.avatar
                                                }
                                                size={46}
                                                isGroup={actionConv.type === 'group'}
                                            />
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Typo size={16} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                                    {actionConv.type === 'direct'
                                                        ? (actionConv.participants.find(p => p._id !== currentUser?.id)?.name || actionConv.name)
                                                        : actionConv.name}
                                                </Typo>
                                                <Typo size={12} color={colors.neutral400} style={{ marginTop: 2 }}>
                                                    {actionConv.type === 'direct' ? "Direct Conversation" : "Group Chat"}
                                                </Typo>
                                            </View>
                                            <TouchableOpacity
                                                onPress={handleCloseActionModal}
                                                style={styles.sheetCloseBtn}
                                                activeOpacity={0.7}
                                            >
                                                <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Action Rows */}
                                        <View style={styles.sheetOptions}>
                                            {/* Pin / Unpin */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleTogglePin}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.primaryLight }]}>
                                                        <Icons.PushPin size={18} color={colors.primaryDark} weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        {(actionConv as any).isPinned
                                                            ? "Unpin Conversation"
                                                            : "Pin to Top (VIP)"}
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Mute / Unmute */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleToggleMute}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: actionConv.isMuted ? "#dcfce7" : "#fef3c7" }]}>
                                                        {actionConv.isMuted ? (
                                                            <Icons.Bell size={18} color="#16a34a" weight="fill" />
                                                        ) : (
                                                            <Icons.BellSlash size={18} color="#d97706" weight="fill" />
                                                        )}
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        {actionConv.isMuted ? "Unmute Notifications" : "Mute Notifications"}
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Mark as Read / Unread */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleToggleRead}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: "#e0f2fe" }]}>
                                                        <Icons.EnvelopeOpen size={18} color="#0284c7" weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        {(actionConv.unreadCount || 0) > 0 ? "Mark as Read" : "Mark as Unread"}
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Folder Tag */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleAssignTag}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: "#f3e8ff" }]}>
                                                        <Icons.Tag size={18} color="#9333ea" weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        Assign Folder Tag ({chatTagsMap[actionConv._id] ? CHAT_FOLDER_META[chatTagsMap[actionConv._id]].label : "None"})
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Archive / Unarchive */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleToggleArchive}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: "#f5f5f4" }]}>
                                                        <Icons.Archive size={18} color={colors.neutral700} weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        {isConvArchived(actionConv) ? "Unarchive Conversation" : "Archive Conversation"}
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Lock to Secret Vault */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={handleLockToVault}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: "#dcfce7" }]}>
                                                        <Icons.LockKey size={18} color="#16a34a" weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        Lock to Secret Vault
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Select Multiple Chats */}
                                            <TouchableOpacity
                                                style={styles.sheetOptionRow}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    const id = actionConv._id;
                                                    handleCloseActionModal();
                                                    setSelectedConvIds([id]);
                                                }}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.primaryLight }]}>
                                                        <Icons.CheckCircle size={18} color={colors.primaryDark} weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                                        Select Multiple Chats
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.neutral350} />
                                            </TouchableOpacity>

                                            {/* Delete Conversation */}
                                            <TouchableOpacity
                                                style={[styles.sheetOptionRow, { borderBottomWidth: 0 }]}
                                                activeOpacity={0.7}
                                                onPress={handleDeleteConversation}
                                            >
                                                <View style={styles.sheetOptionLeft}>
                                                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.rose + "1A" }]}>
                                                        <Icons.Trash size={18} color={colors.rose} weight="fill" />
                                                    </View>
                                                    <Typo size={14.5} fontWeight="600" color={colors.rose}>
                                                        Delete Chat
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={16} color={colors.rose} />
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <QuickJumpModal
                visible={showQuickJump}
                conversations={conversations.filter(c => !lockedChatIds.includes(c._id))}
                currentUserId={currentUser?.id}
                nicknames={nicknamesMap}
                onlineUsers={onlineUsers}
                focusActive={focusMode.enabled}
                onToggleFocus={handleToggleFocusMenu}
                onSelectConversation={(c) => {
                    router.push({
                        pathname: "/(main)/conversation",
                        params: {
                            id: c._id,
                            name: c.name,
                            avatar: c.avatar,
                            type: c.type,
                            participants: JSON.stringify(c.participants),
                            admins: JSON.stringify(c.admins || []),
                            createdBy: c.createdBy ? String(c.createdBy) : "",
                            disappearingSeconds: String(c.disappearingSeconds || 0),
                        },
                    });
                }}
                onNavigateRoute={(route) => router.push(route as any)}
                onClose={() => setShowQuickJump(false)}
            />

            <RemindersListModal
                visible={showRemindersModal}
                reminders={reminders}
                onCancelReminder={async (id) => {
                    await cancelMessageReminder(id);
                    setReminders(await getActiveReminders());
                }}
                onPressReminder={(rem) => {
                    setShowRemindersModal(false);
                    const targetConv = conversations.find((c) => c._id === rem.conversationId);
                    router.push({
                        pathname: "/(main)/conversation",
                        params: {
                            id: rem.conversationId,
                            name: targetConv?.name || rem.senderName || "Chat",
                            avatar: targetConv?.avatar || "",
                            type: targetConv?.type || "direct",
                            participants: targetConv ? JSON.stringify(targetConv.participants || []) : "[]",
                            admins: targetConv ? JSON.stringify(targetConv.admins || []) : "[]",
                            createdBy: targetConv?.createdBy ? String(targetConv.createdBy) : "",
                            disappearingSeconds: String(targetConv?.disappearingSeconds || 0),
                            highlightMessageId: rem.messageId,
                        },
                    });
                }}
                onClose={() => setShowRemindersModal(false)}
            />

            <DailyDigestModal
                visible={showDigestModal}
                activity={dailyActivity}
                unreadDirect={totalUnreadDirect}
                unreadGroups={totalUnreadGroup}
                unreadConversations={[...directConversations, ...groupConversations].filter(c => (c.unreadCount || 0) > 0)}
                currentUserId={currentUser?.id}
                nicknames={nicknamesMap}
                onSelectConversation={(c) => {
                    router.push({
                        pathname: "/(main)/conversation",
                        params: {
                            id: c._id,
                            name: c.name,
                            avatar: c.avatar,
                            type: c.type,
                            participants: JSON.stringify(c.participants),
                            admins: JSON.stringify(c.admins || []),
                            createdBy: c.createdBy ? String(c.createdBy) : "",
                            disappearingSeconds: String(c.disappearingSeconds || 0),
                        },
                    });
                }}
                onClose={() => setShowDigestModal(false)}
            />

        </ScreenWrapper>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._10,
        paddingBottom: spacingY._15,
        gap: spacingY._12,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: scale(12),
    },
    headerLeft: {
        flex: 1,
        minWidth: 0,
        gap: verticalScale(2),
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        marginBottom: verticalScale(2),
    },
    brandBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(5),
        paddingVertical: verticalScale(2),
        borderRadius: radius._6,
        flexShrink: 0,
    },
    headerQuickRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
    },
    headerQuickPill: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(5),
        height: verticalScale(36),
        borderRadius: radius.full,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.14)",
        paddingHorizontal: scale(6),
    },
    avatarBtn: {
        position: "relative",
        flexShrink: 0,
    },
    avatarBadge: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: verticalScale(12),
        height: verticalScale(12),
        borderRadius: radius.full,
        backgroundColor: colors.green,
        borderWidth: 2,
        borderColor: colors.white,
    },

    // Sheet
    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._35,
        borderTopRightRadius: radius._35,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingTop: spacingY._15,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },

    // Segmented Tabs
    tabsRow: {
        flexDirection: "row",
        marginHorizontal: spacingX._20,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        padding: 4,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: verticalScale(10),
        borderRadius: radius.full,
    },
    tabActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    tabBadge: {
        backgroundColor: colors.rose,
        borderRadius: radius.full,
        minWidth: scale(16),
        height: scale(16),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scale(4),
    },

    // Filter Chips
    filterChipsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        gap: scale(8),
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(4),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        borderWidth: 1,
        borderColor: "transparent",
    },
    filterChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },

    // Search
    searchRow: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral50,
        borderRadius: radius.full,
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(Platform.OS === 'ios' ? 10 : 8),
        gap: spacingX._10,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    searchBarActive: {
        borderColor: colors.primary,
        backgroundColor: colors.white,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontSize: verticalScale(14),
        color: colors.neutral900,
        padding: 0,
    },
    clearBtn: {
        backgroundColor: colors.neutral400,
        borderRadius: radius.full,
        width: verticalScale(17),
        height: verticalScale(17),
        alignItems: "center",
        justifyContent: "center",
    },

    // Count
    countRow: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._10,
        paddingBottom: verticalScale(2),
        minHeight: verticalScale(24),
    },

    // List
    listContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._5,
        paddingBottom: verticalScale(110),
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        gap: spacingY._10,
        paddingTop: verticalScale(50),
        paddingHorizontal: spacingX._30,
    },
    emptyIconWrap: {
        backgroundColor: colors.primaryLight,
        padding: spacingY._20,
        borderRadius: radius._30,
        marginBottom: spacingY._5,
    },
    centerState: {
        paddingTop: verticalScale(80),
        alignItems: "center",
    },

    // FAB
    fabWrap: {
        position: "absolute",
        bottom: verticalScale(28),
        right: scale(24),
    },
    fab: {
        height: verticalScale(56),
        width: verticalScale(56),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },

    // ── VIP Pinned Carousel ──
    vipSection: {
        paddingTop: spacingY._10,
        paddingBottom: verticalScale(8),
    },
    vipHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacingX._20,
        marginBottom: verticalScale(8),
    },
    vipTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    vipScrollContent: {
        paddingHorizontal: spacingX._20,
        gap: scale(14),
    },
    vipCard: {
        alignItems: 'center',
        width: scale(62),
    },
    vipAvatarWrap: {
        position: 'relative',
    },
    vipRing: {
        padding: 2,
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    vipOnlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: verticalScale(12),
        height: verticalScale(12),
        borderRadius: radius.full,
        backgroundColor: colors.green,
        borderWidth: 2,
        borderColor: colors.white,
    },
    vipPinBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: scale(16),
        height: scale(16),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.white,
    },
    vipUnreadBadge: {
        position: 'absolute',
        top: -2,
        left: -2,
        minWidth: scale(16),
        height: scale(16),
        borderRadius: radius.full,
        backgroundColor: colors.rose,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: colors.white,
    },
    vipName: {
        marginTop: verticalScale(5),
        textAlign: 'center',
    },

    // ── Action Sheet Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        justifyContent: "flex-end",
    },
    actionSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        paddingHorizontal: spacingX._20,
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(34),
    },
    sheetHandle: {
        width: scale(36),
        height: verticalScale(4),
        borderRadius: radius.full,
        backgroundColor: colors.neutral300,
        alignSelf: "center",
        marginBottom: verticalScale(14),
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        paddingBottom: verticalScale(14),
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
        marginBottom: verticalScale(6),
    },
    sheetCloseBtn: {
        width: scale(32),
        height: scale(32),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
    },
    sheetOptions: {
        gap: verticalScale(2),
    },
    sheetOptionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: verticalScale(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral100,
    },
    sheetOptionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
    },
    sheetOptionIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
    },
    notesSelfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(11),
        marginBottom: spacingY._10,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    notesSelfLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
        flex: 1,
    },
    notesSelfIcon: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notesSelfBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
    },
});
