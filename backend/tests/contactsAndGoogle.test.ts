import { test, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { normalizePhone, getLast10Digits } from "../controllers/contact.controller";
import { registerUser } from "../controllers/auth.controller";
import { generateToken } from "../utils/token";

describe("Phone Contacts & Google Auth Service", () => {
    process.env.JWT_SECRET = "super_secret_test_key_for_testing_purposes_only_123456789";

    test("normalizes various phone number formats correctly", () => {
        assert.equal(normalizePhone("+1 (555) 234-5678"), "+15552345678");
        assert.equal(normalizePhone("  +91 98765-43210  "), "+919876543210");
        assert.equal(normalizePhone("09876543210"), "09876543210");
        assert.equal(normalizePhone(""), "");
        assert.equal(normalizePhone(null as any), "");
    });

    test("extracts last 10 digits accurately for regional phone matching", () => {
        assert.equal(getLast10Digits("+919876543210"), "9876543210");
        assert.equal(getLast10Digits("+14155552671"), "4155552671");
        assert.equal(getLast10Digits("9876543210"), "9876543210");
        assert.equal(getLast10Digits("12345"), "12345");
    });

    test("generates valid JWT token for Google OAuth authenticated user", () => {
        const googleUser = {
            id: "user_google_999",
            name: "Google Traveler",
            email: "traveler@gmail.com",
            avatar: "https://lh3.googleusercontent.com/a/photo.jpg",
            phoneNumber: "+15551234567",
        };

        const token = generateToken(googleUser);
        assert.ok(token);

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string, {
            algorithms: ["HS256"],
        });

        assert.equal(decoded.user.id, googleUser.id);
        assert.equal(decoded.user.email, googleUser.email);
        assert.equal(decoded.user.name, googleUser.name);
        assert.equal(decoded.user.phoneNumber, googleUser.phoneNumber);
    });

    test("deduplicates and limits contact phone numbers cleanly", () => {
        const inputNumbers = [
            "+1 (555) 000-1111",
            "+15550001111", // duplicate when normalized
            "  +91 98765 43210 ",
            "invalid",
            "+44 20 7946 0991",
        ];

        const cleanedSet = new Set<string>();
        for (const num of inputNumbers) {
            const cleaned = normalizePhone(num);
            if (cleaned.length >= 7) {
                cleanedSet.add(cleaned);
            }
        }

        assert.equal(cleanedSet.size, 3);
        assert.ok(cleanedSet.has("+15550001111"));
        assert.ok(cleanedSet.has("+919876543210"));
        assert.ok(cleanedSet.has("+442079460991"));
    });

    test("validates phone number length bounds (7 to 18 characters)", () => {
        const tooShort = normalizePhone("123456");
        const minValid = normalizePhone("+123456");
        const maxValid = normalizePhone("+12345678901234567");
        const tooLong = normalizePhone("+1234567890123456789");

        assert.equal(tooShort.length < 7, true);
        assert.equal(minValid.length >= 7 && minValid.length <= 18, true);
        assert.equal(maxValid.length >= 7 && maxValid.length <= 18, true);
        assert.equal(tooLong.length > 18, true);
    });

    test("ensures updated phone number is correctly encoded into regenerated session token", () => {
        const existingUser = {
            id: "user_phone_update_01",
            name: "Updated User",
            email: "updated@example.com",
            avatar: "",
            phoneNumber: "+15559876543",
        };

        const refreshedToken = generateToken(existingUser);
        const decoded: any = jwt.verify(refreshedToken, process.env.JWT_SECRET as string, {
            algorithms: ["HS256"],
        });

        assert.equal(decoded.user.phoneNumber, "+15559876543");
        assert.equal(decoded.user.name, "Updated User");
    });

    test("registerUser requires both email and phoneNumber", async () => {
        const makeRes = () => {
            const state = { status: 200, body: null as any };
            return {
                state,
                res: {
                    status(code: number) {
                        state.status = code;
                        return this;
                    },
                    json(payload: any) {
                        state.body = payload;
                    },
                } as any,
            };
        };

        const missingPhone = makeRes();
        await registerUser(
            { body: { name: "Test User", email: "user@example.com", password: "password123" } } as any,
            missingPhone.res
        );
        assert.equal(missingPhone.state.status, 400);
        assert.equal(missingPhone.state.body.success, false);

        const missingEmail = makeRes();
        await registerUser(
            { body: { name: "Test User", phoneNumber: "+15551234567", password: "password123" } } as any,
            missingEmail.res
        );
        assert.equal(missingEmail.state.status, 400);
        assert.equal(missingEmail.state.body.success, false);
    });
});
