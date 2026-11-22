type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastEviction = Date.now();
const EVICTION_INTERVAL_MS = 60_000; // 1 minute

function pruneExpiredBuckets(now: number) {
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt < now) {
            buckets.delete(key);
        }
    }
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();

    // Periodic cleanup to prevent unbounded memory growth
    if (now - lastEviction > EVICTION_INTERVAL_MS || buckets.size > 5000) {
        pruneExpiredBuckets(now);
        lastEviction = now;
    }

    const existing = buckets.get(key);
    if (!existing || existing.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (existing.count >= max) return false;
    existing.count += 1;
    return true;
}

export function assertRateLimit(key: string, max: number, windowMs: number) {
    if (!checkRateLimit(key, max, windowMs)) {
        throw new Error("Too many requests. Please slow down.");
    }
}

export function clearRateLimitsForTesting() {
    buckets.clear();
}

