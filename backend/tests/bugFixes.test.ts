import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import jwt from "jsonwebtoken";
import { formatMessagePayload } from "../utils/messageFormat";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";
import User from "../modals/User";
import { bumpConversationForMessage, emitUnreadCountUpdates } from "../services/messageService";
import { updatePhoneNumber } from "../controllers/contact.controller";
import { registerUser, googleAuth } from "../controllers/auth.controller";
import { registerChatEvents } from "../socket/chatEvents";
import { registerGroupEvents } from "../socket/groupEvents";
import { registerAppEvents } from "../socket/appEvents";

class MockSocket extends EventEmitter {
    id = "sock_test_1";
    data: any = { userId: "507f1f77bcf86cd799439011", name: "Tester", avatar: "" };
    emitted: Array<{ event: string; payload: any }> = [];

    override emit(event: string | symbol, ...args: any[]): boolean {
        this.emitted.push({ event: String(event), payload: args[0] });
        return true;
    }

    trigger(event: string, data?: any) {
        const listeners = this.rawListeners(event);
        return Promise.all(listeners.map((fn) => fn.call(this, data)));
    }
}

describe("Cross-stack Bug Fixes Regression Tests", () => {
    const cleanups: Array<() => void> = [];

    afterEach(() => {
        while (cleanups.length > 0) {
            cleanups.pop()?.();
        }
    });

    test("formatMessagePayload scrubs checklist, callMeta, media, and content when isDeleted is true", () => {
        const payload = formatMessagePayload({
            _id: "msg_del_1",
            content: "Secret secret",
            createdAt: new Date("2026-11-27T00:00:00.000Z"),
            conversationId: "conv_1",
            type: "checklist",
            isDeleted: true,
            isPinned: true,
            isViewOnce: true,
            attachement: "https://cdn.example.com/a.jpg",
            voiceUrl: "https://cdn.example.com/v.m4a",
            attachmentMeta: { url: "https://cdn.example.com/a.jpg" },
            location: { latitude: 10, longitude: 20 },
            callMeta: { callId: "c1", kind: "voice", status: "ended", duration: 10 },
            checklist: { title: "Private", items: [{ id: "1", text: "Task", completed: false }] },
            reactions: [{ emoji: "❤️", userId: "u1", userName: "Alice" }],
            viewOnceOpenedBy: ["u1"],
        });

        assert.equal(payload.isDeleted, true);
        assert.equal(payload.content, "");
        assert.equal(payload.attachement, null);
        assert.equal(payload.voiceUrl, null);
        assert.equal(payload.attachmentMeta, null);
        assert.equal(payload.location, null);
        assert.equal(payload.poll, null);
        assert.equal(payload.checklist, null);
        assert.equal(payload.callMeta, null);
        assert.equal(payload.isPinned, false);
        assert.equal(payload.isViewOnce, false);
        assert.deepEqual(payload.reactions, []);
        assert.deepEqual(payload.viewOnceOpenedBy, []);
    });

    test("bumpConversationForMessage sets updatedAt, handles missing unreadCounts, and emits fresh counts", async () => {
        const origUpdateOne = Conversation.updateOne;
        const origFindById = Conversation.findById;
        cleanups.push(() => {
            (Conversation as any).updateOne = origUpdateOne;
            (Conversation as any).findById = origFindById;
        });

        let capturedUpdate: any = null;
        let savedRefreshed = false;

        (Conversation as any).updateOne = async (_filter: any, update: any) => {
            capturedUpdate = update;
            return { modifiedCount: 1 };
        };

        const refreshedConv: any = {
            _id: "conv_poll_1",
            participants: ["sender_1", "user_2", "user_3"],
            unreadCounts: [{ userId: "user_2", count: 2 }], // user_3 entry missing intentionally
            save: async () => {
                savedRefreshed = true;
            },
        };
        (Conversation as any).findById = async () => refreshedConv;

        const updatedConv = await bumpConversationForMessage(
            { _id: "conv_poll_1", participants: ["sender_1", "user_2", "user_3"] },
            "sender_1",
            "msg_poll_1"
        );

        assert.ok(capturedUpdate.$set.updatedAt instanceof Date);
        assert.equal(capturedUpdate.$set.lastMessage, "msg_poll_1");
        assert.deepEqual(capturedUpdate.$set.deletedFor, []);
        assert.equal(savedRefreshed, true);
        assert.equal(
            updatedConv.unreadCounts.find((u: any) => u.userId === "user_3")?.count,
            1
        );

        const socket2 = new MockSocket();
        socket2.data = { userId: "user_2" };
        const fakeIo: any = { sockets: { sockets: new Map([["s2", socket2]]) } };
        emitUnreadCountUpdates(fakeIo, "conv_poll_1", updatedConv);
        assert.deepEqual(socket2.emitted[0], {
            event: "unreadCountUpdate",
            payload: { conversationId: "conv_poll_1", unreadCount: 2 },
        });
    });

    test("bumpConversationForMessage skips $inc when sender has no other participants (avoids empty $inc error)", async () => {
        const origUpdateOne = Conversation.updateOne;
        cleanups.push(() => {
            (Conversation as any).updateOne = origUpdateOne;
        });

        let capturedUpdate: any = null;
        (Conversation as any).updateOne = async (_filter: any, update: any) => {
            capturedUpdate = update;
            return { modifiedCount: 1 };
        };

        await bumpConversationForMessage(
            { _id: "conv_solo", participants: ["sender_1"] },
            "sender_1",
            "msg_solo_1"
        );

        assert.equal(capturedUpdate.$inc, undefined);
        assert.ok(capturedUpdate.$set.updatedAt instanceof Date);
    });

    test("updatePhoneNumber preserves customStatus and theme inside refreshed JWT", async () => {
        process.env.JWT_SECRET = "super_secret_test_key_for_testing_purposes_only_123456789";
        const origFindOne = User.findOne;
        const origFindByIdAndUpdate = User.findByIdAndUpdate;
        cleanups.push(() => {
            (User as any).findOne = origFindOne;
            (User as any).findByIdAndUpdate = origFindByIdAndUpdate;
        });

        let selectedFields = "";
        (User as any).findOne = async () => null;
        (User as any).findByIdAndUpdate = () => ({
            select: async (sel: string) => {
                selectedFields = sel;
                return {
                    _id: "user_123",
                    name: "Arnav",
                    email: "arnav@example.com",
                    avatar: "https://cdn.example.com/av.png",
                    phoneNumber: "+15551234567",
                    customStatus: { emoji: "🚀", text: "Shipping" },
                    theme: { mode: "dark", accent: "#f59e0b", bubbleStyle: "rounded" },
                };
            },
        });

        const req: any = { userId: "user_123", body: { phoneNumber: "+1 555 123 4567" } };
        let statusCode = 200;
        let jsonBody: any = null;
        const res: any = {
            status(code: number) {
                statusCode = code;
                return this;
            },
            json(body: any) {
                jsonBody = body;
            },
        };

        await updatePhoneNumber(req, res);
        assert.equal(statusCode, 200);
        assert.equal(jsonBody.success, true);
        assert.match(selectedFields, /customStatus/);
        assert.match(selectedFields, /theme/);

        const decoded: any = jwt.verify(jsonBody.token, process.env.JWT_SECRET as string);
        assert.equal(decoded.user.phoneNumber, "+15551234567");
        assert.equal(decoded.user.customStatus?.emoji, "🚀");
        assert.equal(decoded.user.theme?.mode, "dark");
    });

    test("registerUser and googleAuth map Mongo E11000 duplicate key errors to HTTP 400", async () => {
        process.env.ALLOW_DEV_GOOGLE_AUTH = "true";
        process.env.NODE_ENV = "development";
        const origFindOne = User.findOne;
        const origSave = User.prototype.save;
        cleanups.push(() => {
            (User as any).findOne = origFindOne;
            User.prototype.save = origSave;
            delete process.env.ALLOW_DEV_GOOGLE_AUTH;
        });

        (User as any).findOne = async () => null;
        User.prototype.save = async function () {
            const err: any = new Error("E11000 duplicate key error");
            err.code = 11000;
            throw err;
        };

        const mkRes = () => {
            const out = { statusCode: 200, body: null as any };
            return {
                out,
                res: {
                    status(c: number) {
                        out.statusCode = c;
                        return this;
                    },
                    json(b: any) {
                        out.body = b;
                    },
                } as any,
            };
        };

        const reg = mkRes();
        await registerUser(
            { body: { email: "dup@example.com", phoneNumber: "+15550009999", password: "password123", name: "Dup User" } } as any,
            reg.res
        );
        assert.equal(reg.out.statusCode, 400);
        assert.equal(reg.out.body.success, false);

        const g = mkRes();
        await googleAuth(
            { body: { email: "dup@example.com", name: "Dup User", googleId: "g123" } } as any,
            g.res
        );
        assert.equal(g.out.statusCode, 400);
        assert.equal(g.out.body.success, false);
    });

    test("socket event handlers reject malformed/null payloads safely without uncaught throws", async () => {
        const fakeIo: any = {
            to: () => ({ emit: () => {} }),
            sockets: { sockets: new Map() },
        };
        const sock = new MockSocket();
        registerChatEvents(fakeIo, sock as any);
        registerGroupEvents(fakeIo, sock as any);
        registerAppEvents(fakeIo, sock as any);

        await sock.trigger("newMessage", null);
        await sock.trigger("toggleMuteConversation", { conversationId: "not-an-objectid" });
        await sock.trigger("updatePrivacy", null);
        await sock.trigger("saveMessage", { messageId: "invalid-id", save: true });
        await sock.trigger("updateGroup", undefined);

        const byEvent = (ev: string) => sock.emitted.filter((e) => e.event === ev);
        assert.equal(byEvent("newMessage")[0]?.payload?.success, false);
        assert.equal(byEvent("toggleMuteConversation")[0]?.payload?.success, false);
        assert.equal(byEvent("updatePrivacy")[0]?.payload?.success, false);
        assert.equal(byEvent("saveMessage")[0]?.payload?.success, false);
        assert.equal(byEvent("updateGroup")[0]?.payload?.success, false);
    });

    test("deleteMessage clears checklist and callMeta alongside content and attachments", async () => {
        const origFindById = Message.findById;
        const origConvUpdate = Conversation.findOneAndUpdate;
        cleanups.push(() => {
            (Message as any).findById = origFindById;
            (Conversation as any).findOneAndUpdate = origConvUpdate;
        });

        const msgDoc: any = {
            _id: "507f1f77bcf86cd799439012",
            conversationId: "507f1f77bcf86cd799439013",
            senderId: "507f1f77bcf86cd799439011",
            isDeleted: false,
            content: "Tasks",
            checklist: { title: "Secret", items: [{ id: "1", text: "Item", completed: false }] },
            callMeta: { callId: "c1", kind: "voice", status: "ended", duration: 5 },
            reactions: [{ emoji: "👍" }],
            isPinned: true,
            async save() {},
        };
        (Message as any).findById = async () => msgDoc;
        (Conversation as any).findOneAndUpdate = () => ({
            select: () => ({
                populate: () => ({
                    lean: async () => null,
                }),
            }),
        });

        const fakeIo: any = {
            to: () => ({ emit: () => {} }),
            sockets: { sockets: new Map() },
        };
        const sock = new MockSocket();
        registerChatEvents(fakeIo, sock as any);

        await sock.trigger("deleteMessage", {
            messageId: "507f1f77bcf86cd799439012",
            conversationId: "507f1f77bcf86cd799439013",
        });

        assert.equal(msgDoc.isDeleted, true);
        assert.equal(msgDoc.content, "");
        assert.equal(msgDoc.checklist, undefined);
        assert.equal(msgDoc.callMeta, undefined);
        assert.equal(msgDoc.isPinned, false);
    });
});
