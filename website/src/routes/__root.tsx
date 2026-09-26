import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Home, RotateCcw, AlertTriangle, Wifi } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader, SiteFooter } from "@/components/site/shared";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
      <div className="pointer-events-none absolute inset-0 glow-backdrop" />

      {/* Large slow orb — top left */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-125 w-125 rounded-full opacity-15 blur-[120px] float-soft"
        style={{ background: "var(--gradient-warm)", animationDuration: "9s" }}
      />
      {/* Smaller fast orb — bottom right */}
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-10 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)", animationDelay: "3s", animationDuration: "7s" }}
      />

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-lg pop-in">
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          {/* Top shimmer line */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

          {/* Bubbly logo watermark */}
          <div className="pointer-events-none absolute right-6 top-6 opacity-5 select-none">
            <img src="/icon-foreground.png" alt="" className="h-24 w-24" />
          </div>

          {/* 404 number */}
          <div className="relative mx-auto mb-1 w-fit">
            <span
              className="select-none font-display text-[9rem] font-bold leading-none text-gradient"
              style={{
                filter: "drop-shadow(0 0 80px color-mix(in oklab, var(--primary) 45%, transparent))",
              }}
            >
              404
            </span>
            {/* Reflection */}
            <span
              className="pointer-events-none absolute inset-x-0 top-full select-none font-display text-[9rem] font-bold leading-none text-gradient opacity-10"
              style={{ transform: "scaleY(-0.3) translateY(-8px)", filter: "blur(4px)" }}
              aria-hidden
            >
              404
            </span>
          </div>

          {/* Pill divider */}
          <div className="mx-auto mb-6 mt-4 h-1 w-20 rounded-full bg-linear-to-r from-transparent via-primary/70 to-transparent" />

          {/* Badge */}
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Page not found</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">
            Lost in the void?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The page you're looking for doesn't exist or has been moved somewhere else.
            <br />
            Let's get you back to the conversation.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="btn-base btn-primary">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          {/* Bottom tag */}
          <p className="mt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Bubbly · Error 404
          </p>

          {/* Bottom shimmer line */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Card outer glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-40 blur-2xl"
          style={{ background: "var(--gradient-warm)", transform: "scale(0.85) translateY(16px)" }}
        />
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />

      {/* Destructive ambient orb */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-100 w-100 -translate-x-1/2 rounded-full opacity-8 blur-[100px] float-soft"
        style={{ backgroundColor: "var(--destructive)", animationDuration: "10s" }}
      />
      {/* Warm orb bottom */}
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl float-soft"
        style={{ background: "var(--gradient-warm)", animationDelay: "2s" }}
      />

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-lg pop-in">
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          {/* Top destructive shimmer */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-destructive/50 to-transparent" />

          {/* Watermark */}
          <div className="pointer-events-none absolute right-6 top-6 opacity-5 select-none">
            <img src="/icon-foreground.png" alt="" className="h-24 w-24" />
          </div>

          {/* Icon stack */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            {/* Outer ring pulse */}
            <div className="absolute inset-0 rounded-3xl border-2 border-destructive/20 animate-ping opacity-30" />
            {/* Mid ring */}
            <div className="absolute inset-0 rounded-3xl border border-destructive/15" />
            {/* Icon badge */}
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground">
            Something broke
          </h1>

          {/* Status badge */}
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/8 px-4 py-1.5">
            <Wifi className="h-3 w-3 text-destructive" />
            <span className="font-mono text-xs text-destructive/80 tracking-widest uppercase">
              Runtime error
            </span>
          </div>

          {/* Error message pill */}
          {error?.message && (
            <div className="mx-auto mt-5 max-w-xs overflow-hidden rounded-xl border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-muted-foreground/80 truncate">
                <span className="text-destructive/60 mr-1">✕</span>
                {error.message}
              </p>
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Something went wrong on our end. You can try again or head back home — we'll get it sorted.
          </p>

          {/* Divider */}
          <div className="mx-auto my-6 h-px w-32 bg-linear-to-r from-transparent via-border to-transparent" />

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="btn-base btn-primary"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <a href="/" className="btn-base btn-ghost-outline">
              <Home className="h-4 w-4" />
              Go home
            </a>
          </div>

          <p className="mt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
            Bubbly · Runtime Error
          </p>

          {/* Bottom shimmer */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Card outer glow — destructive tint */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-20 blur-2xl"
          style={{ backgroundColor: "var(--destructive)", transform: "scale(0.85) translateY(16px)" }}
        />
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bubbly — Chat. Connect. Bubbly." },
      { name: "description", content: "Bubbly, a self-built Android chat app." },
      { name: "author", content: "Arnav" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteHeader />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <SiteFooter />
    </QueryClientProvider>
  );
}