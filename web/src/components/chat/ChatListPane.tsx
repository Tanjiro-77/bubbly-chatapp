import React, { useState, useMemo } from "react";
import { ConversationProps, StoryGroupProps } from "../../types";
import { ConversationItem } from "./ConversationItem";
import { StoryBar } from "../stories/StoryBar";
import { Avatar } from "../common/Avatar";
import {
  Search,
  Plus,
  Lock,
  PhoneCall,
  Settings,
  QrCode,
  Pin,
  X,
  MessageCircle,
  Users,
  Check,
  BellOff,
  Bell,
  Trash2,
  ShieldCheck,
  MoreVertical,
} from "lucide-react";

interface ChatListPaneProps {
  conversations: ConversationProps[];
  activeConversationId: string | null;
  stories: StoryGroupProps[];
  currentUserId: string;
  userAvatar?: string | null;
  userName?: string;
  onlineMap: Record<string, boolean>;
  typingMap: Record<string, string>;
  draftMap: Record<string, string>;
  lockedChatIds: string[];
  onSelectConversation: (conv: ConversationProps) => void;
  onOpenNewChat: () => void;
  onOpenVault: () => void;
  onOpenCallLogs: () => void;
  onOpenStarred: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenCreateStory: () => void;
  onViewStoryGroup: (group: StoryGroupProps) => void;
  onTogglePin?: (convId: string) => void;
  onToggleMute?: (convId: string, currentMuted: boolean) => void;
  onDeleteConversation?: (convId: string) => void;
  onLockChatToVault?: (convId: string) => void;
}

type FilterCategory = "all" | "unread" | "pinned";

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning ☀️";
  if (hour < 17) return "Good afternoon 🌤️";
  return "Good evening 🌙";
};

export const ChatListPane: React.FC<ChatListPaneProps> = ({
  conversations,
  activeConversationId,
  stories,
  currentUserId,
  userAvatar,
  userName,
  onlineMap,
  typingMap,
  draftMap,
  lockedChatIds,
  onSelectConversation,
  onOpenNewChat,
  onOpenVault,
  onOpenCallLogs,
  onOpenStarred,
  onOpenSettings,
  onOpenProfile,
  onOpenCreateStory,
  onViewStoryGroup,
  onTogglePin,
  onToggleMute,
  onDeleteConversation,
  onLockChatToVault,
}) => {
  const [selectedTab, setSelectedTab] = useState<0 | 1>(0); // 0 = Direct, 1 = Groups
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Context action sheet modal state (mirroring mobile long-press sheet)
  const [contextConv, setContextConv] = useState<ConversationProps | null>(null);

  // Filter direct and group chats
  const sortByDate = (a: ConversationProps, b: ConversationProps) => {
    const aDate = a?.lastMessage?.createdAt || a.createdAt;
    const bDate = b?.lastMessage?.createdAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  };

  const directConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === "direct" && !lockedChatIds.includes(c._id))
      .sort(sortByDate);
  }, [conversations, lockedChatIds]);

  const groupConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === "group" && !lockedChatIds.includes(c._id))
      .sort(sortByDate);
  }, [conversations, lockedChatIds]);

  const activeList = selectedTab === 0 ? directConversations : groupConversations;

  // VIP Pinned Contacts (matching mobile home.tsx VIP carousel)
  const pinnedVIPs = useMemo(() => {
    return conversations.filter((c) => !lockedChatIds.includes(c._id) && !!c.isPinned);
  }, [conversations, lockedChatIds]);

  // Unread counts
  const totalUnreadDirect = useMemo(() => {
    return directConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [directConversations]);

  const totalUnreadGroup = useMemo(() => {
    return groupConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [groupConversations]);

  const totalUnreadCurrent = selectedTab === 0 ? totalUnreadDirect : totalUnreadGroup;
  const totalPinnedCurrent = activeList.filter((c) => !!c.isPinned).length;

  // Filter category
  const categorizedList = useMemo(() => {
    if (filterCategory === "unread") {
      return activeList.filter((c) => (c.unreadCount || 0) > 0);
    }
    if (filterCategory === "pinned") {
      return activeList.filter((c) => !!c.isPinned);
    }
    return activeList;
  }, [activeList, filterCategory]);

  // Search filtering
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return categorizedList;
    const q = searchQuery.toLowerCase().trim();
    return categorizedList.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(q);
      const messageMatch = item.lastMessage?.content?.toLowerCase().includes(q);
      const participantMatch = item.participants?.some((p) =>
        p.name?.toLowerCase().includes(q)
      );
      return nameMatch || messageMatch || participantMatch;
    });
  }, [searchQuery, categorizedList]);

  return (
    <div className="h-full w-full flex flex-col bg-[#1c1917] select-none relative overflow-hidden font-sans border-r border-black/10 dark:border-white/5">
      {/* ── Background Pattern Wallpaper Overlay (Authentic Mobile bgPattern.png) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-repeat z-0"
        style={{
          backgroundImage: `url('/bgPattern.png')`,
          backgroundSize: "320px 320px",
        }}
      />

      {/* ── TOP HEADER (1:1 Mobile Header) ── */}
      <div className="relative z-10 px-5 pt-4 pb-5 flex items-center justify-between text-white shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="bg-[#f59e0b] text-[#1c1917] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider shadow-sm">
              V3.2.0
            </span>
            <span className="text-[12.5px] text-white/60 font-medium">
              {getGreeting()}
            </span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight leading-tight text-white drop-shadow-sm truncate max-w-[200px]">
            Bubbly Chat
          </h1>
        </div>

        {/* Header Action Buttons (40px circular glass buttons matching mobile) */}
        <div className="flex items-center gap-2">
          {/* Call Logs */}
          <button
            onClick={onOpenCallLogs}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Call Logs"
          >
            <PhoneCall className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Secret Chat Vault */}
          <button
            onClick={onOpenVault}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Secret Vault"
          >
            <Lock className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Settings"
          >
            <Settings className="w-4 h-4 stroke-[2]" />
          </button>

          {/* User Profile Avatar with Online Badge */}
          <button
            onClick={onOpenProfile}
            className="relative ml-0.5 active:scale-95 transition"
            title="Profile"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden shadow-md">
              <Avatar uri={userAvatar} name={userName} size={40} isOnline={false} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-[#1c1917]" />
          </button>
        </div>
      </div>

      {/* ── MAIN SHEET (Curved 40px sheet matching mobile content) ── */}
      <div className="relative z-10 flex-1 bg-white dark:bg-[#121214] rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col pt-4">
        
        {/* Story Bar */}
        <div className="shrink-0 mb-1">
          <StoryBar
            stories={stories}
            currentUserId={currentUserId}
            onOpenCreateStory={onOpenCreateStory}
            onViewStoryGroup={onViewStoryGroup}
          />
        </div>

        {/* ── VIP Pinned Carousel (Matching mobile home.tsx VIP section) ── */}
        {pinnedVIPs.length > 0 && (
          <div className="px-5 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-stone-800 dark:text-stone-200">
                <Pin className="w-3.5 h-3.5 text-[#d97706] fill-[#d97706]" />
                <span>PINNED VIP CHATS</span>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">
                {pinnedVIPs.length} Pinned
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {pinnedVIPs.map((vip) => {
                const other =
                  vip.type === "direct"
                    ? vip.participants?.find((p) => p._id !== currentUserId)
                    : null;
                const vipAvatar = vip.type === "direct" ? other?.avatar || vip.avatar : vip.avatar;
                const vipName = (vip.type === "direct" ? other?.name : vip.name) || "VIP";
                const isOnline = other ? !!onlineMap[other._id] : false;
                const unread = vip.unreadCount || 0;

                return (
                  <button
                    key={vip._id}
                    onClick={() => onSelectConversation(vip)}
                    className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                  >
                    <div className="relative">
                      <div className="p-0.5 rounded-full ring-2 ring-[#f59e0b] shadow-sm">
                        <Avatar
                          uri={vipAvatar}
                          size={46}
                          isGroup={vip.type === "group"}
                        />
                      </div>
                      {vip.type === "direct" && isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white dark:border-stone-900" />
                      )}
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f59e0b] flex items-center justify-center text-white shadow-sm">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                      </div>
                      {unread > 0 && (
                        <div className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full bg-[#ef4444] text-[9px] font-black text-white shadow-sm">
                          {unread > 9 ? "9+" : unread}
                        </div>
                      )}
                    </div>
                    <span className="text-[11.5px] font-semibold text-stone-800 dark:text-stone-200 max-w-[56px] truncate">
                      {vipName.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Segmented Tabs: Direct Messages vs Groups (Matching mobile tabsRow) ── */}
        <div className="px-5 mb-2 shrink-0">
          <div className="flex bg-[#f5f5f4] dark:bg-stone-800/80 p-1 rounded-full gap-1">
            <button
              onClick={() => {
                setSelectedTab(0);
                setSearchQuery("");
                setFilterCategory("all");
              }}
              className={`flex-1 py-2 px-3 rounded-full text-[13px] font-bold transition flex items-center justify-center gap-2 ${
                selectedTab === 0
                  ? "bg-white dark:bg-stone-900 text-[#1c1917] dark:text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              }`}
            >
              <MessageCircle
                className={`w-4 h-4 ${
                  selectedTab === 0
                    ? "fill-[#1c1917] dark:fill-white text-[#1c1917] dark:text-white"
                    : "text-stone-400"
                }`}
              />
              <span>Direct Messages</span>
              {totalUnreadDirect > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#ef4444] text-white rounded-full text-[9px] font-extrabold">
                  {totalUnreadDirect > 99 ? "99+" : totalUnreadDirect}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedTab(1);
                setSearchQuery("");
                setFilterCategory("all");
              }}
              className={`flex-1 py-2 px-3 rounded-full text-[13px] font-bold transition flex items-center justify-center gap-2 ${
                selectedTab === 1
                  ? "bg-white dark:bg-stone-900 text-[#1c1917] dark:text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              }`}
            >
              <Users
                className={`w-4 h-4 ${
                  selectedTab === 1
                    ? "fill-[#1c1917] dark:fill-white text-[#1c1917] dark:text-white"
                    : "text-stone-400"
                }`}
              />
              <span>Groups</span>
              {totalUnreadGroup > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#ef4444] text-white rounded-full text-[9px] font-extrabold">
                  {totalUnreadGroup > 99 ? "99+" : totalUnreadGroup}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filter Chips: All, Unread, Pinned (Matching mobile filterChipsRow) ── */}
        <div className="px-5 mb-2.5 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              filterCategory === "all"
                ? "bg-[#fef3c7] text-[#1c1917] border border-[#f59e0b] shadow-xs"
                : "bg-[#f5f5f4] dark:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            All ({activeList.length})
          </button>

          <button
            onClick={() => setFilterCategory("unread")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              filterCategory === "unread"
                ? "bg-[#fef3c7] text-[#1c1917] border border-[#f59e0b] shadow-xs"
                : "bg-[#f5f5f4] dark:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            Unread {totalUnreadCurrent > 0 ? `(${totalUnreadCurrent})` : ""}
          </button>

          <button
            onClick={() => setFilterCategory("pinned")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
              filterCategory === "pinned"
                ? "bg-[#fef3c7] text-[#1c1917] border border-[#f59e0b] shadow-xs"
                : "bg-[#f5f5f4] dark:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <Pin className="w-3 h-3 text-[#d97706] fill-[#d97706]" />
            <span>Pinned {totalPinnedCurrent > 0 ? `(${totalPinnedCurrent})` : ""}</span>
          </button>
        </div>

        {/* ── Search Bar (Matching mobile searchRow) ── */}
        <div className="px-5 mb-2 shrink-0">
          <div
            className={`flex items-center px-3.5 py-2 rounded-full transition bg-[#f5f5f4] dark:bg-stone-800/80 border ${
              isSearchActive
                ? "border-[#f59e0b] bg-white dark:bg-stone-900"
                : "border-transparent"
            }`}
          >
            <Search className="w-4 h-4 text-stone-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder={
                selectedTab === 0
                  ? "Search messages or friends..."
                  : "Search groups or topics..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchActive(true)}
              onBlur={() => setIsSearchActive(false)}
              className="bg-transparent text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none flex-1"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-4 h-4 rounded-full bg-stone-400 text-white flex items-center justify-center hover:bg-stone-500"
              >
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* ── Results Count Row ── */}
        <div className="px-5 mb-1 text-[11.5px] font-medium text-stone-400 shrink-0">
          {searchQuery.trim() ? (
            <span>
              {filteredList.length === 0
                ? "No results found"
                : `${filteredList.length} result${
                    filteredList.length === 1 ? "" : "s"
                  } for "${searchQuery}"`}
            </span>
          ) : (
            filteredList.length > 0 && (
              <span>
                {filteredList.length}{" "}
                {selectedTab === 0
                  ? filteredList.length === 1
                    ? "conversation"
                    : "conversations"
                  : filteredList.length === 1
                  ? "group"
                  : "groups"}
              </span>
            )
          )}
        </div>

        {/* ── Virtualized Conversation List (Matching mobile listContent) ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/50">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-48 select-none">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                {selectedTab === 0 ? (
                  <MessageCircle className="w-7 h-7" />
                ) : (
                  <Users className="w-7 h-7" />
                )}
              </div>
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {searchQuery
                  ? "No results found"
                  : filterCategory !== "all"
                  ? `No ${filterCategory} chats`
                  : selectedTab === 0
                  ? "Your inbox is clear"
                  : "No groups yet"}
              </h4>
              <p className="text-xs text-stone-400 mt-1 max-w-[240px]">
                {selectedTab === 0
                  ? "Connect with friends by clicking the + button below."
                  : "Create a group conversation to share stories and plans together."}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const other =
                item.type === "direct"
                  ? item.participants?.find((p) => p._id !== currentUserId)
                  : null;
              const isOnline = other ? !!onlineMap[other._id] : false;
              const typingUser = typingMap[item._id] || null;
              const draftText = draftMap[item._id] || null;

              return (
                <div
                  key={item._id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextConv(item);
                  }}
                >
                  <ConversationItem
                    conversation={item}
                    currentUserId={currentUserId}
                    isActive={activeConversationId === item._id}
                    isOnline={isOnline}
                    typingUser={typingUser}
                    draftText={draftText}
                    searchQuery={searchQuery}
                    onSelect={() => onSelectConversation(item)}
                    onOpenActions={() => setContextConv(item)}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* ── Floating Action Button (FAB) (Matching mobile styles.fab) ── */}
        <div className="absolute bottom-5 right-5 z-30">
          <button
            onClick={onOpenNewChat}
            className="w-14 h-14 rounded-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-[#1c1917] flex items-center justify-center shadow-lg shadow-amber-500/40 transition transform duration-150"
            title="Start New Chat"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── Context Menu Action Sheet (Mirroring mobile handleLongPress sheet) ── */}
      {contextConv && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setContextConv(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#1c1917] rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-2 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-2" />

            {/* Header info */}
            <div className="flex items-center gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
              <Avatar
                uri={
                  contextConv.type === "direct"
                    ? contextConv.participants?.find((p) => p._id !== currentUserId)?.avatar || contextConv.avatar
                    : contextConv.avatar
                }
                size={44}
                isGroup={contextConv.type === "group"}
              />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                  {contextConv.type === "direct"
                    ? contextConv.participants?.find((p) => p._id !== currentUserId)?.name || contextConv.name
                    : contextConv.name}
                </h4>
                <p className="text-xs text-stone-400">
                  {contextConv.type === "direct" ? "Direct Conversation" : "Group Chat"}
                </p>
              </div>
              <button
                onClick={() => setContextConv(null)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="flex flex-col py-1 divide-y divide-stone-100 dark:divide-stone-800/60 text-sm">
              {/* Pin */}
              <button
                onClick={() => {
                  onTogglePin?.(contextConv._id);
                  setContextConv(null);
                }}
                className="flex items-center gap-3 py-3 px-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition text-stone-800 dark:text-stone-200 font-semibold"
              >
                <div className="w-8 h-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
                  <Pin className="w-4 h-4 fill-current" />
                </div>
                <span>
                  {contextConv.isPinned ? "Unpin Conversation" : "Pin to Top"}
                </span>
              </button>

              {/* Mute */}
              <button
                onClick={() => {
                  onToggleMute?.(contextConv._id, !!contextConv.isMuted);
                  setContextConv(null);
                }}
                className="flex items-center gap-3 py-3 px-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition text-stone-800 dark:text-stone-200 font-semibold"
              >
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center">
                  {contextConv.isMuted ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </div>
                <span>
                  {contextConv.isMuted ? "Unmute Notifications" : "Mute Notifications"}
                </span>
              </button>

              {/* Lock to Vault */}
              <button
                onClick={() => {
                  onLockChatToVault?.(contextConv._id);
                  setContextConv(null);
                }}
                className="flex items-center gap-3 py-3 px-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition text-stone-800 dark:text-stone-200 font-semibold"
              >
                <div className="w-8 h-8 rounded-lg bg-[#dcfce7] text-[#16a34a] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <span>Lock to Secret Vault</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  onDeleteConversation?.(contextConv._id);
                  setContextConv(null);
                }}
                className="flex items-center gap-3 py-3 px-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition text-[#ef4444] font-semibold"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-[#ef4444] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>Delete Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
