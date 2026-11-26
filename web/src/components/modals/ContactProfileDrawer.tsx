import React from "react";
import { UserProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { X, Mail, ShieldAlert, ImageIcon, BellOff, Bell, UserX } from "lucide-react";
import { toggleMuteConversation, blockUser } from "../../socket/socketEvents";
import { bubblyAlert, bubblyConfirm } from "../common/BubblyDialog";

interface ContactProfileDrawerProps {
  contact: UserProps;
  conversationId?: string;
  isMuted?: boolean;
  isOnline?: boolean;
  onClose: () => void;
  onOpenSharedMedia: () => void;
}

export const ContactProfileDrawer: React.FC<ContactProfileDrawerProps> = ({
  contact,
  conversationId,
  isMuted = false,
  isOnline = false,
  onClose,
  onOpenSharedMedia,
}) => {
  const handleToggleMute = () => {
    if (!conversationId) return;
    toggleMuteConversation({
      conversationId,
      unmute: isMuted,
    });
  };

  const handleBlock = async () => {
    const id = contact.id || contact._id;
    if (!id) return;
    const confirmed = await bubblyConfirm({
      title: `Block ${contact.name}?`,
      message: "You will not receive messages or calls from them.",
      confirmText: "Block Contact",
      variant: "danger",
    });
    if (confirmed) {
      blockUser({ targetUserId: id, block: true });
      bubblyAlert("Contact Blocked", `${contact.name} has been blocked.`, { variant: "success" });
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl border-l border-stone-200/80 dark:border-white/10 flex flex-col select-none animate-slide-up">
      {/* Header */}
      <div className="h-16 px-4 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between">
        <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
          Contact Details
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
        >
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile Avatar & Name */}
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={contact.avatar}
            name={contact.name}
            size="2xl"
            isOnline={isOnline}
          />
          <h2 className="font-extrabold text-xl text-stone-900 dark:text-white mt-4 leading-tight">
            {contact.name}
          </h2>
          <span className="text-xs text-stone-500 dark:text-zinc-400 font-medium mt-1">
            {contact.email}
          </span>
          <span
            className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              isOnline
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400"
            }`}
          >
            {isOnline ? "● Online" : "Offline"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenSharedMedia}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-stone-100 hover:bg-amber-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-stone-700 dark:text-zinc-200 hover:text-amber-600 transition"
          >
            <ImageIcon className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold">Shared Media</span>
          </button>

          {conversationId && (
            <button
              onClick={handleToggleMute}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-stone-100 hover:bg-amber-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-stone-700 dark:text-zinc-200 hover:text-amber-600 transition"
            >
              {isMuted ? (
                <>
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-bold">Unmute</span>
                </>
              ) : (
                <>
                  <BellOff className="w-5 h-5 text-stone-500" />
                  <span className="text-xs font-bold">Mute Chat</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
              Email Address
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-white">
              <Mail className="w-4 h-4 text-amber-500" />
              <span>{contact.email}</span>
            </div>
          </div>
        </div>

        {/* Block User Action */}
        <div className="pt-4 border-t border-stone-200 dark:border-white/10">
          <button
            onClick={handleBlock}
            className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <UserX className="w-4 h-4" /> Block Contact
          </button>
        </div>
      </div>
    </div>
  );
};
