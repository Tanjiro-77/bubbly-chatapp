import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  MessageCircle,
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Upload,
  Zap,
  PhoneCall,
  Languages,
  CheckCircle2,
} from "lucide-react";
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#1c1917] bubbly-pattern-bg text-white overflow-y-auto select-none">
      {/* Dark tint overlay over bg pattern matching ScreenWrapper */}
      <div className="fixed inset-0 bg-[#1c1917]/75 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto min-h-screen flex flex-col justify-between p-6 sm:p-8">
        {/* Top Header Row matching Welcome.tsx */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/80 animate-pulse" />
            <span className="font-black text-xl tracking-wider text-white">
              BUBBLY
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] tracking-wider uppercase shadow-md shadow-amber-500/30">
            RELEASE V3.2
          </div>
        </div>

        {/* Hero Section */}
        {mode === "welcome" && (
          <div className="my-auto flex flex-col items-center text-center animate-fade-in py-6">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-6">
              <img
                src="/welcome.png"
                alt="Bubbly Welcome"
                className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition duration-300"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Connect Beyond Messages.
            </h1>
            <p className="text-sm text-stone-400 max-w-sm font-medium leading-relaxed mb-6">
              Full-stack real-time conversations, group chats, stories, and HD calls linked across mobile and web.
            </p>

            {/* Feature Chips Strip */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white shadow-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Instant Sync
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white shadow-xs">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> HD Calling
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white shadow-xs">
                <Languages className="w-3.5 h-3.5 text-amber-400" /> Live Translate
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Stories 24h
              </div>
            </div>
          </div>
        )}

        {/* Bottom Card Form matching mobile white sheet */}
        <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-stone-900 dark:text-white transition duration-200">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold animate-slide-up">
              {error}
            </div>
          )}

          {mode === "welcome" ? (
            <div className="space-y-3">
              <button
                onClick={() => setMode("login")}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
              >
                Sign In to Your Account
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setMode("register")}
                className="w-full py-3.5 px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold text-sm transition transform active:scale-[0.98]"
              >
                Create New Bubbly Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                  {mode === "login" ? "Welcome Back 👋" : "Create Account ✨"}
                </h2>
                <button
                  type="button"
                  onClick={() => setMode("welcome")}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Back
                </button>
              </div>

              {mode === "register" && (
                <>
                  <div className="flex flex-col items-center mb-2">
                    <label className="cursor-pointer group relative">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 group-hover:border-amber-500 flex items-center justify-center overflow-hidden bg-amber-50 dark:bg-zinc-800 shadow-inner">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-amber-600 dark:text-amber-400">
                            <Upload className="w-5 h-5 mb-0.5" />
                            <span className="text-[10px] font-bold">Photo</span>
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
                      <span className="text-[10px] text-amber-600 font-semibold mt-1">Uploading...</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 dark:text-zinc-400 mb-1 ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Arnav Khari"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-semibold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-zinc-400 mb-1 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-semibold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-zinc-400 mb-1 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-semibold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {mode === "login"
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
