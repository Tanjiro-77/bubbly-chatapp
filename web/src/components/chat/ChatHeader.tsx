import React, { useState } from "react";
import { ConversationProps } from "../../types";
import { Avatar } from "../common/Avatar";
import {
  Phone,
  Video,
  Search,
  Star,
  MoreVertical,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface ChatHeaderProps {
  conversation: ConversationProps;
  currentUserId: string;
  isOnline: boolean;
  typingUser: string | null;
  searchQuery: string;
  searchMatchesCount: number;
  currentMatchIndex: number;
  isSearching: boolean;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleSearch: () => void;
  onChangeSearchQuery: (q: string) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onCloseSearch: () => void;
  onOpenStarred: () => void;
  onOpenDetails: () => void;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentUserId,
  isOnline,
  typingUser,
  searchQuery,
  searchMatchesCount,
  currentMatchIndex,
  isSearching,
  onVoiceCall,
  onVideoCall,
  onToggleSearch,
  onChangeSearchQuery,
  onPrevMatch,
  onNextMatch,
  onCloseSearch,
  onOpenStarred,
  onOpenDetails,
  onBack,
}) => {
  const isGroup = conversation.type === "group";

  // Partner or Group Name
  const partner = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const displayName = isGroup
    ? conversation.name || "Group Chat"
    : partner?.name || "User";
  const avatarSrc = isGroup ? conversation.avatar : partner?.avatar;

  const renderSubtitle = () => {
    if (typingUser) {
      return (
        <span className="text-[#22c55e] font-bold flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          {isGroup ? `${typingUser} is typing...` : "typing..."}
        </span>
      );
    }
    if (isGroup) {
      const count = conversation.participants?.length || 0;
      return (
        <span className="text-white/60 font-medium">
          {count} member{count === 1 ? "" : "s"}
        </span>
      );
    }
    if (isOnline) {
      return (
        <span className="text-[#22c55e] font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Online
        </span>
      );
    }
    return <span className="text-white/50 font-medium">Offline</span>;
  };

  return (
    <div className="relative shrink-0 bg-[#1c1917] select-none text-white shadow-md z-20">
      {/* Background wallpaper pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 bg-repeat z-0"
        style={{
          backgroundImage: `url('/bgPattern.png')`,
          backgroundSize: "280px 280px",
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-white/10">
        {/* Left Side: Back + Avatar + Contact Details */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/15 text-white transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onOpenDetails}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              <Avatar
                uri={avatarSrc}
                size={42}
                isGroup={isGroup}
              />
              {!isGroup && isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-[#1c1917]" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate leading-tight group-hover:text-amber-400 transition">
                {displayName}
              </h2>
              <div className="text-[11.5px] mt-0.5 truncate flex items-center gap-1.5">
                {renderSubtitle()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons (40px glass buttons matching mobile) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio Call */}
          <button
            onClick={onVoiceCall}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call */}
          <button
            onClick={onVideoCall}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Search in chat */}
          <button
            onClick={onToggleSearch}
            className={`w-9 h-9 rounded-full transition flex items-center justify-center backdrop-blur-md ${
              isSearching
                ? "bg-[#f59e0b] text-[#1c1917]"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Search in Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Starred Messages */}
          <button
            onClick={onOpenStarred}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md hidden sm:flex"
            title="Starred Messages"
          >
            <Star className="w-4 h-4" />
          </button>

          {/* Details / Group info */}
          <button
            onClick={onOpenDetails}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white backdrop-blur-md"
            title="Details & Shared Media"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Collapsible In-Chat Search Bar ── */}
      {isSearching && (
        <div className="relative z-10 px-4 sm:px-6 py-2.5 bg-[#292524] border-b border-white/10 flex items-center gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search in this conversation..."
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              autoFocus
              className="w-full py-1.5 pl-9 pr-16 rounded-xl bg-stone-800 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <span className="absolute right-3 text-[11px] font-bold text-amber-400">
                {searchMatchesCount > 0
                  ? `${currentMatchIndex + 1} of ${searchMatchesCount}`
                  : "0 matches"}
              </span>
            )}
          </div>

          {searchMatchesCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={onPrevMatch}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-300"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={onNextMatch}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-300"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={onCloseSearch}
            className="p-1.5 rounded-full hover:bg-white/10 text-stone-400 hover:text-white"
            title="Close Search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
