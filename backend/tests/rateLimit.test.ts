import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, assertRateLimit, clearRateLimitsForTesting } from "../utils/rateLimit";

describe("Rate Limiting Service", () => {
    test("allows requests within threshold", () => {
        clearRateLimitsForTesting();
        const key = "test:user:1";
        const max = 3;
        const windowMs = 5000;

        assert.equal(checkRateLimit(key, max, windowMs), true);
        assert.equal(checkRateLimit(key, max, windowMs), true);
        assert.equal(checkRateLimit(key, max, windowMs), true);
    });

    test("blocks requests exceeding threshold", () => {
        clearRateLimitsForTesting();
        const key = "test:user:2";
        const max = 2;
        const windowMs = 5000;

        assert.equal(checkRateLimit(key, max, windowMs), true);
        assert.equal(checkRateLimit(key, max, windowMs), true);
        assert.equal(checkRateLimit(key, max, windowMs), false);

        assert.throws(() => {
            assertRateLimit(key, max, windowMs);
        }, /Too many requests/);
    });
});
