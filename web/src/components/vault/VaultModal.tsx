import React, { useState, useEffect } from "react";
import { ConversationProps } from "../../types";
import { Lock, Unlock, KeyRound, X, ShieldCheck, Check } from "lucide-react";
import { Avatar } from "../common/Avatar";

interface VaultModalProps {
  conversations: ConversationProps[];
  lockedChatIds: string[];
  currentUserId: string;
  onClose: () => void;
  onToggleLockChat: (conversationId: string) => void;
  onSelectConversation: (conv: ConversationProps) => void;
}

const PIN_STORAGE_KEY = "bubbly_vault_pin";

export const VaultModal: React.FC<VaultModalProps> = ({
  conversations,
  lockedChatIds,
  currentUserId,
  onClose,
  onToggleLockChat,
  onSelectConversation,
}) => {
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinStage, setPinStage] = useState<"enter" | "setup" | "confirm">("enter");
  const [setupPin, setSetupPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PIN_STORAGE_KEY);
    if (!saved) {
      setPinStage("setup");
    } else {
      setStoredPin(saved);
      setPinStage("enter");
    }
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        validatePin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const validatePin = (inputPin: string) => {
    if (pinStage === "enter") {
      if (inputPin === storedPin) {
        setIsUnlocked(true);
      } else {
        setError("Incorrect PIN. Please try again.");
        setTimeout(() => setPin(""), 600);
      }
    } else if (pinStage === "setup") {
      setSetupPin(inputPin);
      setPin("");
      setPinStage("confirm");
    } else if (pinStage === "confirm") {
      if (inputPin === setupPin) {
        localStorage.setItem(PIN_STORAGE_KEY, inputPin);
        setStoredPin(inputPin);
        setIsUnlocked(true);
      } else {
        setError("PINs do not match. Try again.");
        setPinStage("setup");
        setSetupPin("");
        setTimeout(() => setPin(""), 600);
      }
    }
  };

  const lockedConversations = conversations.filter((c) => lockedChatIds.includes(c._id));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Secret Chat Vault
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {!isUnlocked ? (
          // PIN Entry Keypad Stage
          <div className="p-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <KeyRound className="w-7 h-7" />
            </div>

            <h4 className="font-bold text-sm text-stone-800 dark:text-zinc-200 mb-1">
              {pinStage === "setup"
                ? "Set a 4-digit PIN"
                : pinStage === "confirm"
                ? "Confirm your PIN"
                : "Enter Vault PIN"}
            </h4>

            <p className="text-xs text-stone-500 dark:text-zinc-400 mb-6 text-center">
              {pinStage === "setup"
                ? "Create a secure PIN to hide and lock confidential conversations."
                : "Enter PIN to access your locked chats."}
            </p>

            {/* PIN Dots */}
            <div className="flex items-center gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    pin.length > idx
                      ? "bg-amber-500 scale-110 shadow-md shadow-amber-500/30"
                      : "border-2 border-stone-300 dark:border-zinc-700 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {error && (
              <span className="text-xs font-bold text-rose-500 mb-4 animate-shake">
                {error}
              </span>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((btn, i) => {
                if (btn === "") return <div key={i} />;
                if (btn === "del") {
                  return (
                    <button
                      key={i}
                      onClick={handleBackspace}
                      className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-xs flex items-center justify-center transition"
                    >
                      Delete
                    </button>
                  );
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleKeyPress(btn)}
                    className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-900 dark:text-white font-bold text-lg flex items-center justify-center transition shadow-xs transform active:scale-95"
                  >
                    {btn}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Unlocked Vault View: List of locked conversations
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
                {lockedConversations.length} Locked Conversations
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Vault Unlocked
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 max-h-72">
              {lockedConversations.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs">
                  No chats locked yet. Lock any conversation to hide it from the main screen.
                </div>
              ) : (
                lockedConversations.map((c) => {
                  const isGroup = c.type === "group";
                  const partner = !isGroup
                    ? c.participants?.find((p) => p._id !== currentUserId)
                    : null;
                  const title = isGroup ? c.name || "Group" : partner?.name || "User";

                  return (
                    <div
                      key={c._id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-100 dark:hover:bg-zinc-800 transition"
                    >
                      <div
                        onClick={() => {
                          onSelectConversation(c);
                          onClose();
                        }}
                        className="flex items-center gap-3 cursor-pointer truncate flex-1"
                      >
                        <Avatar
                          src={isGroup ? c.avatar : partner?.avatar}
                          name={title}
                          size="sm"
                        />
                        <span className="font-bold text-xs truncate text-stone-900 dark:text-white">
                          {title}
                        </span>
                      </div>

                      <button
                        onClick={() => onToggleLockChat(c._id)}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-amber-500 rounded-full transition ml-2"
                        title="Unlock & Unhide Chat"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Lock another chat dropdown / list */}
            <div className="mt-4 pt-4 border-t border-stone-200 dark:border-white/10">
              <h5 className="font-bold text-xs text-stone-700 dark:text-zinc-300 mb-2">
                Lock an existing chat:
              </h5>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {conversations
                  .filter((c) => !lockedChatIds.includes(c._id))
                  .map((c) => {
                    const isGroup = c.type === "group";
                    const partner = !isGroup
                      ? c.participants?.find((p) => p._id !== currentUserId)
                      : null;
                    const title = isGroup ? c.name || "Group" : partner?.name || "User";

                    return (
                      <div
                        key={c._id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition text-xs"
                      >
                        <span className="truncate font-medium text-stone-800 dark:text-zinc-200">
                          {title}
                        </span>
                        <button
                          onClick={() => onToggleLockChat(c._id)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" /> Lock
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
