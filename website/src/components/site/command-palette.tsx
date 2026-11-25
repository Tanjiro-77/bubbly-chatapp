import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Home,
  Sparkles,
  Download,
  UserRound,
  HelpCircle,
  FileText,
  ShieldCheck,
  Sun,
  Volume2,
  Github,
  ArrowRight,
  X,
} from "lucide-react";
import { GITHUB_URL, APK_DOWNLOAD_LINK } from "./shared";
import { sounds } from "@/lib/sound";

interface CommandItem {
  id: string;
  label: string;
  subtitle: string;
  group: "Pages" | "Actions";
  icon: typeof Home;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        subtitle: "Overview, interactive simulator & benchmarks",
        group: "Pages",
        icon: Home,
        action: () => navigate({ to: "/" }),
      },
      {
        id: "features",
        label: "Features Catalog",
        subtitle: "Explore 35+ messaging, calling & story features",
        group: "Pages",
        icon: Sparkles,
        action: () => navigate({ to: "/features" }),
      },
      {
        id: "download",
        label: "Download Bubbly APK",
        subtitle: "Get v3.4.0 for Android & Indus Appstore guide",
        group: "Pages",
        icon: Download,
        action: () => navigate({ to: "/download" }),
      },
      {
        id: "about",
        label: "Story & Creator",
        subtitle: "Architecture story, timeline & feedback hub",
        group: "Pages",
        icon: UserRound,
        action: () => navigate({ to: "/about" }),
      },
      {
        id: "privacy",
        label: "Privacy Policy",
        subtitle: "Data collection, permissions & DPDP compliance",
        group: "Pages",
        icon: FileText,
        action: () => navigate({ to: "/privacy-policy" }),
      },
      {
        id: "security",
        label: "Security & Data Safety",
        subtitle: "Encryption, JWT auth, RTC tokens & safety matrix",
        group: "Pages",
        icon: ShieldCheck,
        action: () => navigate({ to: "/security" }),
      },
      {
        id: "faq",
        label: "FAQ & Help",
        subtitle: "Installation, Agora calls & permissions answers",
        group: "Pages",
        icon: HelpCircle,
        action: () => navigate({ to: "/faq" }),
      },
      {
        id: "theme",
        label: "Toggle Dark / Light Theme",
        subtitle: "Switch between Honey Amber Light and Obsidian Dark",
        group: "Actions",
        icon: Sun,
        action: () => {
          const isDark = !document.documentElement.classList.contains("dark");
          document.documentElement.classList.toggle("dark", isDark);
          localStorage.setItem("bubbly-theme", isDark ? "dark" : "light");
        },
      },
      {
        id: "sound",
        label: "Toggle UI Sound Effects",
        subtitle: "Mute or unmute tactile audio feedback",
        group: "Actions",
        icon: Volume2,
        action: () => {
          sounds.toggleMute();
        },
      },
      {
        id: "apk",
        label: "Direct Download APK",
        subtitle: "Download latest Bubbly Android release",
        group: "Actions",
        icon: Download,
        action: () => {
          window.open(APK_DOWNLOAD_LINK, "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "github",
        label: "Open GitHub Repository",
        subtitle: "Inspect full-stack source code",
        group: "Actions",
        icon: Github,
        action: () => {
          window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
        },
      },
    ],
    [navigate],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        sounds.playPop();
        filtered[activeIndex].action();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pop-in w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4 w-4 text-primary shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page, Privacy Policy, Security, or action..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No matching pages or actions for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    sounds.playPop();
                    item.action();
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                    active ? "bg-primary/14 text-foreground" : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      active
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <span className="hidden sm:inline-flex rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {item.group}
                  </span>
                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                      active ? "opacity-100 text-primary" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2 text-[11px] text-muted-foreground font-mono">
          <span>↑↓ Navigate · ↵ Select</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
