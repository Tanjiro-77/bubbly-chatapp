import React from "react";
import { ConversationProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { Phone, Video, Search, Star, MoreVertical, ShieldAlert, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ChatHeaderProps {
  conversation: ConversationProps;
  currentUserId: string;
  isOnline: boolean;
  typingUser: string | null;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleSearch: () => void;
  onOpenStarred: () => void;
  onOpenDetails: () => void;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentUserId,
  isOnline,
  typingUser,
  onVoiceCall,
  onVideoCall,
  onToggleSearch,
  onOpenStarred,
  onOpenDetails,
  onBack,
}) => {
  const isGroup = conversation.type === "group";

  // Get recipient details for 1-on-1 chat
  const partner = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const title = isGroup ? conversation.name || "Group Chat" : partner?.name || "User";
  const avatarSrc = isGroup ? conversation.avatar : partner?.avatar;

  return (
    <div className="h-16 px-4 border-b border-stone-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl flex items-center justify-between select-none z-10">
      {/* Left: Avatar & Partner Info */}
      <div className="flex items-center gap-3 truncate">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-stone-500 hover:text-stone-800 dark:hover:text-white rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div onClick={onOpenDetails} className="cursor-pointer">
          <Avatar
            src={avatarSrc}
            name={title}
            size="md"
            isGroup={isGroup}
            isOnline={isOnline}
          />
        </div>

        <div onClick={onOpenDetails} className="cursor-pointer truncate">
          <h2 className="font-bold text-sm text-stone-900 dark:text-white truncate hover:underline">
            {title}
          </h2>

          <div className="text-[11px] font-medium truncate">
            {typingUser ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                {typingUser} is typing...
              </span>
            ) : isGroup ? (
              <span className="text-stone-500 dark:text-zinc-400">
                {conversation.participants?.length || 0} participants
              </span>
            ) : isOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online
              </span>
            ) : (
              <span className="text-stone-400 dark:text-zinc-500">Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions (Voice, Video, Search, Starred, Details) */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onVoiceCall}
          className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-zinc-300 hover:text-amber-500 transition"
          title="Voice Call"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={onVideoCall}
          className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-zinc-300 hover:text-amber-500 transition"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleSearch}
          className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-zinc-300 hover:text-amber-500 transition"
          title="Search in conversation"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenStarred}
          className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-zinc-300 hover:text-amber-500 transition hidden sm:block"
          title="Starred Messages"
        >
          <Star className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenDetails}
          className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-zinc-300 hover:text-amber-500 transition"
          title="Conversation Info"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
