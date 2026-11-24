import React, { useState, useEffect } from "react";
import { getStarredMessages, toggleStarMessage } from "../../socket/socketEvents";
import { Star, X, Search, MessageSquare, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface StarredMessagesModalProps {
  onClose: () => void;
  onJumpToMessage: (conversationId: string, messageId: string) => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
  onClose,
  onJumpToMessage,
}) => {
  const [starredList, setStarredList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStarredMessages((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        setStarredList(res.data);
      }
      setLoading(false);
    });
  }, []);

  const handleUnstar = (messageId: string, conversationId: string) => {
    toggleStarMessage({ messageId, conversationId });
    setStarredList((prev) => prev.filter((item) => (item.message?.id || item.message?._id) !== messageId));
  };

  const filtered = starredList.filter((item) => {
    const content = item.message?.content || "";
    return content.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Starred Messages
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
              placeholder="Search starred messages..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-100 dark:bg-zinc-800 border border-stone-200/60 dark:border-white/5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              Loading starred messages...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              No starred messages found
            </div>
          ) : (
            filtered.map((item) => {
              const msg = item.message;
              const msgId = msg?.id || msg?._id;
              const convId = item.conversationId;

              return (
                <div
                  key={msgId || item._id}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5 hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {msg?.sender?.name || "Sender"}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                      {msg?.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                    </span>
                  </div>

                  <p className="text-xs text-stone-800 dark:text-zinc-200 mb-2 leading-relaxed whitespace-pre-wrap">
                    {msg?.content || (msg?.attachement ? "[Attachment]" : "Message")}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
                    <button
                      onClick={() => handleUnstar(msgId, convId)}
                      className="text-stone-400 hover:text-rose-500 font-semibold transition"
                    >
                      Unstar
                    </button>

                    <button
                      onClick={() => {
                        onJumpToMessage(convId, msgId);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      Jump to chat <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
