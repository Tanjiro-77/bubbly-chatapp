import { test, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/token";

describe("Authentication & Token Service", () => {
    process.env.JWT_SECRET = "super_secret_test_key_for_testing_purposes_only_123456789";

    test("generates valid HS256 JWT with expected claims", () => {
        const user = {
            id: "user_abc_123",
            name: "Test User",
            email: "test@example.com",
            avatar: "https://example.com/avatar.jpg",
        };

        const token = generateToken(user);
        assert.ok(token);

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string, {
            algorithms: ["HS256"],
        });

        assert.equal(decoded.user.id, user.id);
        assert.equal(decoded.user.name, user.name);
        assert.equal(decoded.user.email, user.email);
        assert.equal(decoded.user.avatar, user.avatar);
        assert.equal(decoded.exp, undefined);
    });

    test("rejects token with wrong secret or algorithm", () => {
        const user = {
            id: "user_xyz",
            name: "Hacker",
            email: "hacker@example.com",
        };

        const maliciousToken = jwt.sign({ user }, "different_secret", { algorithm: "HS256" });

        assert.throws(() => {
            jwt.verify(maliciousToken, process.env.JWT_SECRET as string, {
                algorithms: ["HS256"],
            });
        }, /invalid signature/i);
    });

    test("fails safely when secret is missing", () => {
        const original = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        try {
            assert.throws(() => {
                generateToken({ id: "user_1", name: "User", email: "user@test.com" } as any);
            }, /JWT_SECRET environment variable is missing/i);
        } finally {
            process.env.JWT_SECRET = original;
        }
    });
});
