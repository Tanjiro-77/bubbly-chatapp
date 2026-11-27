import React, { useState } from "react";
import { ConversationProps } from "../../types";
import { Avatar } from "../common/Avatar";
import {
  X,
  Shield,
  ShieldAlert,
  UserMinus,
  UserPlus,
  LogOut,
  ImageIcon,
  Users,
  BellOff,
  Bell,
} from "lucide-react";
import {
  setGroupAdmin,
  removeGroupMember,
  leaveGroup,
  toggleMuteConversation,
} from "../../socket/socketEvents";
import { bubblyConfirm } from "../common/BubblyDialog";

interface GroupDetailsDrawerProps {
  conversation: ConversationProps;
  currentUserId: string;
  onClose: () => void;
  onOpenSharedMedia: () => void;
  onToggleMute?: () => void;
}

function getGroupAdminIds(conversation: ConversationProps): string[] {
  const fromAdmins = (conversation.admins || [])
    .map((a) => (typeof a === "string" ? a : a?._id))
    .filter((id): id is string => Boolean(id));
  const legacy = conversation.groupAdmins || [];
  return Array.from(new Set([...fromAdmins, ...legacy]));
}

export const GroupDetailsDrawer: React.FC<GroupDetailsDrawerProps> = ({
  conversation,
  currentUserId,
  onClose,
  onOpenSharedMedia,
  onToggleMute,
}) => {
  const adminIds = getGroupAdminIds(conversation);
  const isMeAdmin = adminIds.includes(currentUserId) || conversation.createdBy === currentUserId;

  const handleToggleAdmin = (targetUserId: string, promote: boolean) => {
    setGroupAdmin({
      conversationId: conversation._id,
      targetUserId,
      promote,
    });
  };

  const handleRemoveMember = async (targetUserId: string) => {
    const confirmed = await bubblyConfirm({
      title: "Remove Member",
      message: "Are you sure you want to remove this member from the group?",
      confirmText: "Remove",
      variant: "danger",
    });
    if (confirmed) {
      removeGroupMember({
        conversationId: conversation._id,
        targetUserId,
      });
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = await bubblyConfirm({
      title: "Leave Group",
      message: "Are you sure you want to leave this group?",
      confirmText: "Leave Group",
      variant: "danger",
    });
    if (confirmed) {
      leaveGroup({ conversationId: conversation._id });
      onClose();
    }
  };

  const handleToggleMute = () => {
    if (onToggleMute) {
      onToggleMute();
      return;
    }
    toggleMuteConversation({
      conversationId: conversation._id,
      unmute: !!conversation.isMuted,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl border-l border-stone-200/80 dark:border-white/10 flex flex-col select-none animate-slide-up">
      {/* Header */}
      <div className="h-16 px-4 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between">
        <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
          Group Info
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
        >
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Group Profile Summary */}
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={conversation.avatar}
            name={conversation.name || "Group"}
            size="xl"
            isGroup={true}
          />
          <h2 className="font-extrabold text-lg text-stone-900 dark:text-white mt-3 leading-tight">
            {conversation.name || "Group Chat"}
          </h2>
          <span className="text-xs text-stone-500 dark:text-zinc-400 font-medium mt-0.5">
            Group • {conversation.participants?.length || 0} participants
          </span>
        </div>

        {/* Quick Actions (Shared Media, Mute) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenSharedMedia}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-stone-100 hover:bg-amber-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-stone-700 dark:text-zinc-200 hover:text-amber-600 transition"
          >
            <ImageIcon className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold">Shared Media</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-stone-100 hover:bg-amber-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-stone-700 dark:text-zinc-200 hover:text-amber-600 transition"
          >
            {conversation.isMuted ? (
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
        </div>

        {/* Participants List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              Members ({conversation.participants?.length || 0})
            </span>
          </div>

          <div className="space-y-1">
            {conversation.participants?.map((participant) => {
              const isUserAdmin = adminIds.includes(participant._id);
              const isThisUser = participant._id === currentUserId;

              return (
                <div
                  key={participant._id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Avatar
                      src={participant.avatar}
                      name={participant.name}
                      size="sm"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-stone-900 dark:text-white truncate">
                          {participant.name}
                        </span>
                        {isThisUser && (
                          <span className="text-[10px] text-stone-400 font-semibold">(You)</span>
                        )}
                        {isUserAdmin && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500 truncate block">
                        {participant.email}
                      </span>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {isMeAdmin && !isThisUser && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAdmin(participant._id, !isUserAdmin)}
                        className={`p-1.5 rounded-xl transition ${
                          isUserAdmin
                            ? "hover:bg-rose-500/10 text-rose-500"
                            : "hover:bg-amber-500/10 text-amber-500"
                        }`}
                        title={isUserAdmin ? "Dismiss as Admin" : "Make Group Admin"}
                      >
                        <Shield className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveMember(participant._id)}
                        className="p-1.5 hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 rounded-xl transition"
                        title="Remove Member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Action */}
        <div className="pt-4 border-t border-stone-200 dark:border-white/10">
          <button
            onClick={handleLeaveGroup}
            className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Exit Group
          </button>
        </div>
      </div>
    </div>
  );
};
