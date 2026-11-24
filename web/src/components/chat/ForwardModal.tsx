import React, { useState } from "react";
import { ConversationProps, MessageProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { X, Share2, Check, Search } from "lucide-react";

interface ForwardModalProps {
  message: MessageProps;
  conversations: ConversationProps[];
  currentUserId: string;
  onClose: () => void;
  onConfirmForward: (targetConversationIds: string[]) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  message,
  conversations,
  currentUserId,
  onClose,
  onConfirmForward,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    if (selectedIds.length === 0) return;
    onConfirmForward(selectedIds);
    onClose();
  };

  const filtered = conversations.filter((c) => {
    const isGroup = c.type === "group";
    const partner = !isGroup ? c.participants?.find((p) => p._id !== currentUserId) : null;
    const title = isGroup ? c.name || "Group" : partner?.name || "User";
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Forward Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-200 dark:border-white/10">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-100 dark:bg-zinc-800 border border-stone-200/60 dark:border-white/5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((c) => {
            const isGroup = c.type === "group";
            const partner = !isGroup ? c.participants?.find((p) => p._id !== currentUserId) : null;
            const title = isGroup ? c.name || "Group" : partner?.name || "User";
            const isSelected = selectedIds.includes(c._id);

            return (
              <div
                key={c._id}
                onClick={() => toggleSelect(c._id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "hover:bg-stone-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Avatar
                    src={isGroup ? c.avatar : partner?.avatar}
                    name={title}
                    size="sm"
                    isGroup={isGroup}
                  />
                  <span className="font-bold text-xs truncate text-stone-900 dark:text-white">
                    {title}
                  </span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-stone-400 dark:border-zinc-500"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-white/10">
          <button
            onClick={handleForward}
            disabled={selectedIds.length === 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/30 transition transform active:scale-95 disabled:opacity-50"
          >
            Forward to {selectedIds.length} Chat{selectedIds.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
};
