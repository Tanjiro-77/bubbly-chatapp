import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { inferMessageType, formatMessagePayload, validateAttachment, MAX_FILE_BYTES } from "../utils/messageFormat";

describe("Message Formatting & Validation", () => {
    test("infers text message when no attachments", () => {
        const type = inferMessageType({ content: "Hello world" } as any);
        assert.equal(type, "text");
    });

    test("infers image message correctly", () => {
        const type = inferMessageType({ attachement: "https://cloudinary.com/img.png" } as any);
        assert.equal(type, "image");
    });

    test("infers voice message correctly", () => {
        const type = inferMessageType({ voiceUrl: "https://cloudinary.com/audio.m4a" } as any);
        assert.equal(type, "voice");
    });

    test("infers location message correctly", () => {
        const type = inferMessageType({ location: { latitude: 37.7749 } } as any);
        assert.equal(type, "location");
    });

    test("validates file attachment constraints", () => {
        // Exceeds max bytes
        assert.throws(() => {
            validateAttachment({ size: MAX_FILE_BYTES + 1024 });
        }, /too large/i);

        // Disallowed mime type
        assert.throws(() => {
            validateAttachment({ mimeType: "application/x-msdownload", size: 100 });
        }, /not allowed/i);

        // Invalid file name containing path traversal or illegal characters
        assert.throws(() => {
            validateAttachment({ name: "../secrets.txt" });
        }, /invalid file name/i);

        // Valid file passes
        assert.doesNotThrow(() => {
            validateAttachment({
                name: "document.pdf",
                mimeType: "application/pdf",
                size: 1024 * 50,
            });
        });
    });

    test("formats message payload safely with defaults", () => {
        const payload = formatMessagePayload({
            _id: "msg123",
            content: "Test message",
            createdAt: new Date("2026-11-22T10:00:00.000Z"),
            conversationId: "conv123",
            type: "text",
        });

        assert.equal(payload.id, "msg123");
        assert.equal(payload.content, "Test message");
        assert.equal(payload.isDeleted, false);
        assert.equal(payload.isEdited, false);
        assert.equal(payload.reactions.length, 0);
    });

    test("formats replyTo payload safely without leaking cross-conversation data", () => {
        const payload = formatMessagePayload(
            {
                _id: "msg456",
                content: "Reply text",
                createdAt: new Date(),
                conversationId: "conv1",
                type: "text",
            },
            {
                replyTo: {
                    id: "reply1",
                    content: "Original snippet",
                    senderName: "Alice",
                },
            }
        );

        assert.equal(payload.replyTo.id, "reply1");
        assert.equal(payload.replyTo.content, "Original snippet");
        assert.equal(payload.replyTo.senderName, "Alice");
    });

    test("formats checklist and silent message metadata safely", () => {
        const payload = formatMessagePayload({
            _id: "msg789",
            content: "Sprint Tasks",
            createdAt: new Date("2026-11-26T10:00:00.000Z"),
            conversationId: "conv2",
            type: "checklist",
            isSilent: true,
            checklist: {
                title: "Sprint Tasks",
                items: [
                    { id: "1", text: "Ship v4.0.1", completed: true, completedBy: "Arnav" },
                    { id: "2", text: "Verify tests", completed: false, completedBy: "" },
                ],
            },
        });

        assert.equal(payload.type, "checklist");
        assert.equal(payload.isSilent, true);
        assert.equal(payload.checklist?.title, "Sprint Tasks");
        assert.equal(payload.checklist?.items?.length, 2);
        assert.equal(payload.checklist?.items?.[0]?.completed, true);
    });
});
