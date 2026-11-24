import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MessageCircle, Sparkles, Lock, Mail, User, Eye, EyeOff, ArrowRight, Upload } from "lucide-react";
import { uploadMediaToCloudinary } from "../../services/mediaService";

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingAvatar(true);
      try {
        const res = await uploadMediaToCloudinary(file, file.name, "avatars");
        if (res.success && res.data?.url) {
          setAvatar(res.data.url);
        } else {
          // Fallback to local data URL if offline/upload failed
          const reader = new FileReader();
          reader.onload = () => setAvatar(reader.result as string);
          reader.readAsDataURL(file);
        }
      } catch {
        const reader = new FileReader();
        reader.onload = () => setAvatar(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        if (!name.trim()) throw new Error("Please enter your name");
        await register(email, password, name, avatar);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-500/10 via-stone-100 to-amber-500/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 overflow-hidden">
      {/* Decorative floating golden circles */}
      <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
      <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-yellow-400/20 dark:bg-yellow-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-stone-200/80 dark:border-white/10 z-10 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 transform hover:rotate-6 transition">
            <MessageCircle className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-1.5">
            Bubbly <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1 font-medium">
            Connect Beyond Messages • Real-time across all devices
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm font-medium animate-slide-up">
            {error}
          </div>
        )}

        {mode === "welcome" ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                Synced with Mobile App
              </p>
              <p className="text-xs text-stone-600 dark:text-zinc-400">
                Log in with your existing Bubbly account to continue chats, view stories, and make calls seamlessly.
              </p>
            </div>

            <button
              onClick={() => setMode("login")}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
            >
              Sign In to Your Account
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMode("register")}
              className="w-full py-3.5 px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold transition transform active:scale-[0.98]"
            >
              Create New Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            {mode === "register" && (
              <>
                <div className="flex flex-col items-center mb-4">
                  <label className="cursor-pointer group relative">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400/80 group-hover:border-amber-500 flex items-center justify-center overflow-hidden bg-amber-50/50 dark:bg-zinc-800 transition">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-amber-600 dark:text-amber-400">
                          <Upload className="w-5 h-5 mb-0.5" />
                          <span className="text-[10px] font-semibold">Avatar</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {uploadingAvatar && (
                    <span className="text-xs text-amber-600 mt-1">Uploading...</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 mb-1.5 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Walker"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition font-medium"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 mt-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode("welcome")}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {mode === "login" ? "Don't have an account? Sign Up" : "Have an account? Sign In"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
