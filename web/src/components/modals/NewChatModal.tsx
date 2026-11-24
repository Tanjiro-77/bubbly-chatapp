import React, { useState, useEffect, useMemo } from "react";
import { UserProps } from "../../types";
import { Avatar } from "../common/Avatar";
import {
  getContacts,
  fetchContacts,
  newConversation,
} from "../../socket/socketEvents";
import {
  X,
  Search,
  Users,
  UserCheck,
  Check,
  Camera,
  MessageSquare,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { uploadMediaToCloudinary } from "../../services/mediaService";

interface NewChatModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreated: (conv: any) => void;
}

const CACHED_CONTACTS_KEY = "bubbly_cache_contacts";

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUserId,
  onClose,
  onCreated,
}) => {
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [contacts, setContacts] = useState<UserProps[]>(() => {
    // 0ms instant loading from cache!
    try {
      const cached = localStorage.getItem(CACHED_CONTACTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Listen for contacts from server
    const handleContacts = (res: any) => {
      if (res.success && Array.isArray(res.data)) {
        const validContacts = res.data.filter(
          (u: any) => (u.id || u._id) !== currentUserId
        );
        setContacts(validContacts);
        try {
          localStorage.setItem(CACHED_CONTACTS_KEY, JSON.stringify(validContacts));
        } catch {}
      }
    };

    // Listen for new conversation created
    const handleNewConv = (res: any) => {
      setIsLoading(false);
      if (res.success && res.data) {
        onCreated(res.data);
        onClose();
      }
    };

    getContacts(handleContacts);
    newConversation(handleNewConv);

    // Explicitly emit to server to fetch fresh contacts immediately
    fetchContacts();

    return () => {
      getContacts(handleContacts, true);
      newConversation(handleNewConv, true);
    };
  }, [currentUserId, onCreated, onClose]);

  // Toggle selection for group members
  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Direct chat creation
  const handleSelectUser = (user: UserProps) => {
    const targetId = user.id || user._id;
    if (!targetId) return;

    if (isGroupMode) {
      toggleParticipant(targetId);
    } else {
      setIsLoading(true);
      newConversation({
        type: "direct",
        participants: [currentUserId, targetId],
      });
    }
  };

  // Group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length < 1) {
      alert("Please enter a group name and select at least one contact.");
      return;
    }

    setIsLoading(true);
    newConversation({
      type: "group",
      name: groupName.trim(),
      avatar: groupAvatar,
      participants: [currentUserId, ...selectedParticipants],
    });
  };

  // Image upload
  const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingAvatar(true);
      try {
        const res = await uploadMediaToCloudinary(file, file.name, "avatars");
        if (res.success && res.data?.url) {
          setGroupAvatar(res.data.url);
        }
      } catch {
        alert("Avatar upload failed");
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  const selectedUsers = useMemo(() => {
    return contacts.filter((c) =>
      selectedParticipants.includes(c.id || c._id || "")
    );
  }, [contacts, selectedParticipants]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#1c1917] rounded-[32px] overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Modal Header (Matching Mobile newConversationModal.tsx) ── */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-white/10 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition text-stone-700 dark:text-stone-300"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-extrabold text-lg text-stone-900 dark:text-white flex items-center gap-2">
                {isGroupMode ? "Create New Group" : "New Conversation"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {isGroupMode
                  ? "Select members and give your group a name"
                  : "Choose someone to chat with"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Segmented Switch: Direct vs Group ── */}
        <div className="p-3 px-5 bg-white dark:bg-[#1c1917]">
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setIsGroupMode(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                !isGroupMode
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              Direct Chat
            </button>
            <button
              type="button"
              onClick={() => setIsGroupMode(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                isGroupMode
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              Group Chat
            </button>
          </div>
        </div>

        {/* ── Group Customizer (Group Mode Only) ── */}
        {isGroupMode && (
          <div className="px-5 pb-3 pt-1 border-b border-stone-200 dark:border-white/10 flex flex-col gap-3 bg-white dark:bg-[#1c1917]">
            <div className="flex items-center gap-4">
              <label className="relative w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-dashed border-amber-500/40 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-amber-500 transition shrink-0">
                {groupAvatar ? (
                  <img
                    src={groupAvatar}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-6 h-6 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGroupAvatarUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Group Name (e.g. Design Team)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-sm font-semibold text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Selected Member Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none">
                {selectedUsers.map((u) => {
                  const uid = u.id || u._id || "";
                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-semibold shrink-0 animate-in fade-in"
                    >
                      <Avatar uri={u.avatar} size={18} />
                      <span className="max-w-[100px] truncate">{u.name.split(" ")[0]}</span>
                      <button
                        type="button"
                        onClick={() => toggleParticipant(uid)}
                        className="p-0.5 hover:bg-black/10 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Search Bar ── */}
        <div className="p-4 px-5 pb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search contacts by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-stone-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Contact List ── */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-2 divide-y divide-stone-100 dark:divide-stone-800/60">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                {searchQuery ? "No contacts match search" : "No other registered contacts"}
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs">
                {searchQuery
                  ? "Check spelling or search by email address."
                  : "Invite friends or register a second account to start chatting!"}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const cid = contact.id || contact._id || "";
              const isSelected = selectedParticipants.includes(cid);

              return (
                <div
                  key={cid}
                  onClick={() => handleSelectUser(contact)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                    isSelected
                      ? "bg-amber-50 dark:bg-amber-500/10"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      uri={contact.avatar}
                      size={44}
                      isOnline={contact.isOnline}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                        {contact.name}
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {contact.email}
                      </p>
                    </div>
                  </div>

                  {isGroupMode ? (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-stone-300 dark:border-stone-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition"
                    >
                      Chat
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer for Group Mode ── */}
        {isGroupMode && (
          <div className="p-4 px-5 border-t border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">
              {selectedParticipants.length} member
              {selectedParticipants.length === 1 ? "" : "s"} selected
            </span>
            <button
              onClick={handleCreateGroup}
              disabled={isLoading || !groupName.trim() || selectedParticipants.length === 0}
              className="py-2.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-500/30 transition transform active:scale-95 flex items-center gap-2"
            >
              {isLoading ? "Creating..." : "Create Group"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
