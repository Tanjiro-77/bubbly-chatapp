import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canSendInGroup, sanitizeLastSeen } from "../utils/permissions";

describe("Permissions & Privacy Utilities", () => {
    test("canSendInGroup allows all when permission is 'all'", () => {
        const conversation = {
            type: "group",
            permissions: { sendMessages: "all" },
            admins: ["admin1"],
        };

        assert.equal(canSendInGroup(conversation, "user1"), true);
    });

    test("canSendInGroup restricts to admins when configured", () => {
        const conversation = {
            type: "group",
            permissions: { sendMessages: "admins" },
            admins: ["admin1"],
            createdBy: "creator1",
        };

        assert.equal(canSendInGroup(conversation, "user1"), false);
        assert.equal(canSendInGroup(conversation, "admin1"), true);
        assert.equal(canSendInGroup(conversation, "creator1"), true);
    });

    test("sanitizeLastSeen respects 'nobody' privacy", () => {
        const target = {
            _id: "userA",
            isOnline: true,
            lastSeen: new Date(),
            privacy: { lastSeen: "nobody" },
        };

        // Different viewer
        const sanitized = sanitizeLastSeen("userB", target, true);
        assert.equal(sanitized.hidden, true);
        assert.equal(sanitized.isOnline, false);
        assert.equal(sanitized.lastSeen, null);

        // Self viewer sees own status
        const selfSanitized = sanitizeLastSeen("userA", target, true);
        assert.equal(selfSanitized.hidden, false);
        assert.equal(selfSanitized.isOnline, true);
    });
});
