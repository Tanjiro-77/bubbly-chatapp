type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
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
