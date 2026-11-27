import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar } from "../common/Avatar";
import {
  X,
  User,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Lock,
  LogOut,
  Sparkles,
  Info,
  ShieldCheck,
  Check,
  Upload,
  Github,
  Mail,
  ExternalLink,
  Code2,
} from "lucide-react";
import { uploadMediaToCloudinary } from "../../services/mediaService";
import { bubblyAlert, bubblyConfirm } from "../common/BubblyDialog";

interface SettingsModalProps {
  onClose: () => void;
  onOpenVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onOpenVault }) => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme, soundEnabled, setSoundEnabled } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploading, setUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        const res = await uploadMediaToCloudinary(file, file.name, "avatars");
        if (res.success && res.data?.url) {
          setAvatar(res.data.url);
          updateUser({ avatar: res.data.url });
        }
      } catch {
        bubblyAlert("Upload Failed", "Avatar upload failed. Please try again.", { variant: "danger" });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateUser({ name: name.trim(), avatar });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Settings & About Bubbly
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Profile Edit Section */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
              Profile
            </span>

            <div className="flex items-center gap-4">
              <label className="cursor-pointer group relative">
                <Avatar src={avatar} name={name} size="xl" />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              <div className="flex-1">
                <label className="text-[11px] font-bold text-stone-500 dark:text-zinc-400 block mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-400 block mt-1">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Profile Updated
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </form>

          {/* Preferences Section */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
              Preferences
            </span>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-amber-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <span className="text-xs font-bold block text-stone-900 dark:text-white">
                    Dark Mode
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                    Sleek dark aesthetics
                  </span>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-11 h-6 rounded-full transition p-1 flex items-center ${
                  theme === "dark" ? "bg-amber-500 justify-end" : "bg-stone-300 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Sound Effects Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <VolumeX className="w-5 h-5 text-stone-400" />
                )}
                <div>
                  <span className="text-xs font-bold block text-stone-900 dark:text-white">
                    Sound Effects & Chimes
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                    Message pops & calling ringer
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 h-6 rounded-full transition p-1 flex items-center ${
                  soundEnabled ? "bg-amber-500 justify-end" : "bg-stone-300 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Secret Chat Vault Shortcut */}
            <div
              onClick={() => {
                onClose();
                onOpenVault();
              }}
              className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5 cursor-pointer hover:border-amber-400 transition"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-500" />
                <div>
                  <span className="text-xs font-bold block text-stone-900 dark:text-white">
                    Secret Chat Vault
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                    PIN protection & locked chats
                  </span>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-stone-400" />
            </div>
          </div>

          {/* Developer & Release Info matching mobile about.tsx */}
          <div className="pt-4 border-t border-stone-200 dark:border-white/10 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
              Developer & Release
            </span>

            {/* Developer Card */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500 shrink-0 shadow-md">
                <img
                  src="/developer-photo.png"
                  alt="Arnav Khari"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 truncate">
                <span className="font-black text-sm text-stone-900 dark:text-white block">
                  Arnav Khari
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold block">
                  Creator & Full-Stack Architect
                </span>
                <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                  arnavkhari.77@gmail.com
                </span>
              </div>
            </div>

            {/* Links & Repository */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <a
                href="https://github.com/Tanjiro-77/bubbly-chatapp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 transition"
              >
                <Github className="w-4 h-4" /> GitHub Repo
              </a>
              <a
                href="mailto:arnavkhari.77@gmail.com"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 transition"
              >
                <Mail className="w-4 h-4" /> Email Feedback
              </a>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2">
            <button
              onClick={async () => {
                const confirmed = await bubblyConfirm({
                  title: "Log Out",
                  message: "Are you sure you want to log out of Bubbly?",
                  confirmText: "Log Out",
                  variant: "danger",
                });
                if (confirmed) {
                  logout();
                  onClose();
                }
              }}
              className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
