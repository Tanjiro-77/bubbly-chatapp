import React, { useState, useMemo } from "react";
import { ConversationProps, StoryGroupProps } from "../../types";
import { ConversationItem } from "./ConversationItem";
import { StoryBar } from "../stories/StoryBar";
import { Avatar } from "../common/Avatar";
import {
  Search,
  MessageSquarePlus,
  Lock,
  PhoneCall,
  Settings,
  Sparkles,
  Bookmark,
  X,
  Filter,
} from "lucide-react";

interface ChatListPaneProps {
  conversations: ConversationProps[];
  activeConversationId: string | null;
  stories: StoryGroupProps[];
  currentUserId: string;
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
}

type TabFilter = "all" | "unread" | "pinned" | "groups";

export const ChatListPane: React.FC<ChatListPaneProps> = ({
  conversations,
  activeConversationId,
  stories,
  currentUserId,
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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  // Filter out locked chats (hidden behind Secret Vault)
  const visibleConversations = useMemo(() => {
    return conversations.filter((c) => !lockedChatIds.includes(c._id));
  }, [conversations, lockedChatIds]);

  // Tab and Search filtering
  const filteredConversations = useMemo(() => {
    return visibleConversations.filter((c) => {
      // Tab filter
      if (activeTab === "unread" && (!c.unreadCount || c.unreadCount === 0)) return false;
      if (activeTab === "pinned" && (!c.pinnedMessages || c.pinnedMessages.length === 0)) return false;
      if (activeTab === "groups" && c.type !== "group") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const isGroup = c.type === "group";
        const partner = !isGroup ? c.participants?.find((p) => p._id !== currentUserId) : null;
        const name = isGroup ? c.name || "" : partner?.name || "";
        const email = partner?.email || "";
        const lastMsg = c.lastMessage?.content || "";
        return (
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          lastMsg.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [visibleConversations, activeTab, searchQuery, currentUserId]);

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border-r border-stone-200/80 dark:border-white/10 select-none">
      {/* Top App Bar */}
      <div className="h-16 px-4 border-b border-stone-200/80 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenProfile}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-stone-900 dark:text-white leading-none">
              Bubbly
            </h1>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Web Edition
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenVault}
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Secret Chat Vault (PIN Protected)"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCallLogs}
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Call Logs"
          >
            <PhoneCall className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenStarred}
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Starred Messages"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="New Conversation or Group"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stories Bar */}
      <StoryBar
        stories={stories}
        currentUserId={currentUserId}
        onOpenCreateStory={onOpenCreateStory}
        onViewStoryGroup={onViewStoryGroup}
      />

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, contacts, or messages..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-stone-100 dark:bg-zinc-800/80 border border-stone-200/60 dark:border-white/5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (All, Unread, Pinned, Groups) */}
      <div className="px-3 pb-2 flex items-center gap-1.5 border-b border-stone-200/60 dark:border-white/5">
        {(["all", "unread", "pinned", "groups"] as TabFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold capitalize transition ${
              activeTab === tab
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conversations Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4 text-stone-400 dark:text-zinc-500">
            <p className="font-semibold text-xs">No conversations found</p>
            <p className="text-[11px] mt-1">
              {searchQuery ? "Try searching another term" : "Click '+' above to start a conversation"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partner =
              conv.type !== "group"
                ? conv.participants?.find((p) => p._id !== currentUserId)
                : null;
            const partnerId = partner?._id || "";

            return (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={conv._id === activeConversationId}
                currentUserId={currentUserId}
                isOnline={onlineMap[partnerId]}
                typingUser={typingMap[conv._id]}
                draftText={draftMap[conv._id]}
                onSelect={onSelectConversation}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
