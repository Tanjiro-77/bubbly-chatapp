import { API_URL } from "../constants";

export type WarmupStatus = "warming" | "ready" | "bypassed";

export interface WarmupSnapshot {
  status: WarmupStatus;
  elapsedMs: number;
  serverResponded: boolean;
}

const MIN_WARM_SPLASH_MS = 1400;
const MAX_WARMUP_MS = 40000;
const POLL_INTERVAL_MS = 2200;
const FETCH_TIMEOUT_MS = 3500;

let snapshot: WarmupSnapshot = {
  status: "warming",
  elapsedMs: 0,
  serverResponded: false,
};

let started = false;
let startedAt = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let maxTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<(snap: WarmupSnapshot) => void>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn({ ...snapshot });
    } catch {}
  });
}

function cleanupTimers() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
  if (maxTimer) {
    clearTimeout(maxTimer);
    maxTimer = null;
  }
}

function finishWarmup(nextStatus: "ready" | "bypassed", serverResponded: boolean) {
  if (snapshot.status !== "warming") return;
  cleanupTimers();
  snapshot = {
    status: nextStatus,
    elapsedMs: Date.now() - startedAt,
    serverResponded,
  };
  emit();
}

async function pingHealthOnce(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function startServerWarmup(): void {
  if (started) return;
  started = true;
  startedAt = Date.now();
  snapshot = { status: "warming", elapsedMs: 0, serverResponded: false };

  elapsedTimer = setInterval(() => {
    if (snapshot.status !== "warming") return;
    snapshot = { ...snapshot, elapsedMs: Date.now() - startedAt };
    emit();
  }, 500);

  maxTimer = setTimeout(() => {
    finishWarmup("bypassed", false);
  }, MAX_WARMUP_MS);

  const loop = async () => {
    if (snapshot.status !== "warming") return;
    const ok = await pingHealthOnce();
    if (ok) {
      const remainingMin = Math.max(0, MIN_WARM_SPLASH_MS - (Date.now() - startedAt));
      snapshot = { ...snapshot, serverResponded: true };
      emit();
      if (remainingMin > 0) {
        pollTimer = setTimeout(() => finishWarmup("ready", true), remainingMin);
      } else {
        finishWarmup("ready", true);
      }
      return;
    }
    if (snapshot.status === "warming") {
      pollTimer = setTimeout(loop, POLL_INTERVAL_MS);
    }
  };

  loop();
}

export function forceBypassWarmup(): void {
  finishWarmup("bypassed", snapshot.serverResponded);
}

export function getWarmupSnapshot(): WarmupSnapshot {
  return { ...snapshot };
}

export function subscribeWarmupState(fn: (snap: WarmupSnapshot) => void): () => void {
  listeners.add(fn);
  fn({ ...snapshot });
  return () => {
    listeners.delete(fn);
  };
}
