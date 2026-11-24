import React, { useState, useEffect } from "react";
import { UserProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { getContacts, newConversation } from "../../socket/socketEvents";
import { X, Search, Users, UserPlus, Check } from "lucide-react";
import { uploadMediaToCloudinary } from "../../services/mediaService";

interface NewChatModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreated: (conv: any) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUserId,
  onClose,
  onCreated,
}) => {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [contacts, setContacts] = useState<UserProps[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContacts((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        setContacts(res.data.filter((u: any) => (u.id || u._id) !== currentUserId));
      }
      setLoading(false);
    });
  }, [currentUserId]);

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateDirect = (recipientId: string) => {
    newConversation({
      type: "direct",
      participants: [recipientId],
    });
    onClose();
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    newConversation({
      type: "group",
      name: groupName.trim(),
      avatar: groupAvatar,
      participants: selectedUserIds,
    });
    onClose();
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
            {mode === "direct" ? "New Conversation" : "Create New Group"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Mode Toggle (Direct / Group) */}
        <div className="p-3 bg-stone-100 dark:bg-zinc-800/60 flex items-center gap-2">
          <button
            onClick={() => setMode("direct")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              mode === "direct"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Direct Chat
          </button>
          <button
            onClick={() => setMode("group")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              mode === "group"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <Users className="w-4 h-4" /> New Group
          </button>
        </div>

        {mode === "group" && (
          <div className="p-4 border-b border-stone-200 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center overflow-hidden bg-amber-50 dark:bg-zinc-800">
                  {groupAvatar ? (
                    <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGroupAvatarUpload}
                  className="hidden"
                />
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group Name..."
                className="flex-1 py-2.5 px-4 rounded-2xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">
              Select members ({selectedUserIds.length} selected):
            </span>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-stone-200 dark:border-white/10">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-100 dark:bg-zinc-800 border border-stone-200/60 dark:border-white/5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center py-10 text-stone-400 text-xs">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-xs">No contacts found</div>
          ) : (
            filteredContacts.map((contact) => {
              const id = contact.id || (contact as any)._id;
              const isSelected = selectedUserIds.includes(id);

              return (
                <div
                  key={id}
                  onClick={() => {
                    if (mode === "direct") {
                      handleCreateDirect(id);
                    } else {
                      toggleSelectUser(id);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${
                    isSelected
                      ? "bg-amber-500/15 border border-amber-500/30"
                      : "hover:bg-stone-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={contact.avatar}
                      name={contact.name}
                      size="md"
                      isOnline={contact.isOnline}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                        {contact.name}
                      </h4>
                      <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                        {contact.email}
                      </span>
                    </div>
                  </div>

                  {mode === "group" && (
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-stone-400 dark:border-zinc-500"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {mode === "group" && (
          <div className="p-4 border-t border-stone-200 dark:border-white/10">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUserIds.length === 0 || uploadingAvatar}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/30 transition transform active:scale-95 disabled:opacity-50"
            >
              Create Group ({selectedUserIds.length} members)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
