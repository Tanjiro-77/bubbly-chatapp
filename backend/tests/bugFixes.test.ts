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
import SavedMessage from "../modals/SavedMessage";
import { areBlocked } from "../utils/permissions";
import { getAgoraUid } from "../controllers/call.controller";
import { getAgoraServerConfig } from "../utils/agora";
import { registerCallEvents } from "../socket/callEvents";
import Call from "../modals/Call";
import { getUserPreferences, updateUserPreferences } from "../controllers/preferences.controller";
import { extractGeminiTranscript, isAllowedAudioUrl, resolveGeminiEndpoints, transcribeAudio } from "../controllers/transcribe.controller";

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

    test("areBlocked batches both user lookups into one query and short-circuits self checks", async () => {
        const origUserFind = User.find;
        cleanups.push(() => {
            (User as any).find = origUserFind;
        });

        let findCallCount = 0;
        (User as any).find = () => {
            findCallCount += 1;
            return {
                select: () => ({
                    lean: async () => [
                        { _id: "507f1f77bcf86cd799439021", blockedUsers: ["507f1f77bcf86cd799439022"] },
                        { _id: "507f1f77bcf86cd799439022", blockedUsers: [] },
                    ],
                }),
            };
        };

        assert.equal(await areBlocked("507f1f77bcf86cd799439021", "507f1f77bcf86cd799439021"), false);
        assert.equal(findCallCount, 0);

        assert.equal(await areBlocked("507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"), true);
        assert.equal(findCallCount, 1);
    });

    test("getMessages uses limit+1 pagination without countDocuments on normal page fetches", async () => {
        const origConvFindOne = Conversation.findOne;
        const origConvFindById = Conversation.findById;
        const origMsgFind = Message.find;
        const origMsgCount = Message.countDocuments;
        const origSavedFind = SavedMessage.find;
        cleanups.push(() => {
            (Conversation as any).findOne = origConvFindOne;
            (Conversation as any).findById = origConvFindById;
            (Message as any).find = origMsgFind;
            (Message as any).countDocuments = origMsgCount;
            (SavedMessage as any).find = origSavedFind;
        });

        (Conversation as any).findOne = () => ({ select: () => ({ lean: async () => ({ _id: "507f1f77bcf86cd799439013" }) }) });
        (Conversation as any).findById = () => ({
            select: () => ({
                populate: () => ({ lean: async () => ({ pinnedMessages: [] }) }),
            }),
        });
        (Message as any).countDocuments = async () => {
            throw new Error("countDocuments should not be called without aroundMessageId");
        };
        const makeMsg = (i: number) => ({
            _id: `507f1f77bcf86cd7994390${String(10 + i).padStart(2, "0")}`,
            conversationId: "507f1f77bcf86cd799439013",
            senderId: { _id: "507f1f77bcf86cd799439011", name: "Tester", avatar: "" },
            content: `msg ${i}`,
            type: "text",
            createdAt: new Date(),
        });
        (Message as any).find = () => ({
            sort: () => ({
                skip: () => ({
                    limit: (n: number) => ({
                        populate: () => ({
                            populate: () => ({
                                lean: async () => {
                                    assert.equal(n, 3);
                                    return [makeMsg(1), makeMsg(2), makeMsg(3)];
                                },
                            }),
                        }),
                    }),
                }),
            }),
        });
        (SavedMessage as any).find = () => ({ select: () => ({ lean: async () => [] }) });

        const fakeIo: any = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
        const sock = new MockSocket();
        registerChatEvents(fakeIo, sock as any);

        await sock.trigger("getMessages", {
            conversationId: "507f1f77bcf86cd799439013",
            page: 0,
            limit: 2,
        });

        const res = sock.emitted.find((e) => e.event === "getMessages")?.payload;
        assert.equal(res?.success, true);
        assert.equal(res?.data?.length, 2);
        assert.equal(res?.hasMore, true);
    });

    test("updatePrivacy syncs socket privacy cache and typing uses room/privacy cache without DB hits", async () => {
        const origUserFindByIdAndUpdate = User.findByIdAndUpdate;
        const origConvExists = Conversation.exists;
        const origUserFindById = User.findById;
        cleanups.push(() => {
            (User as any).findByIdAndUpdate = origUserFindByIdAndUpdate;
            (Conversation as any).exists = origConvExists;
            (User as any).findById = origUserFindById;
        });

        (User as any).findByIdAndUpdate = () => ({
            select: async () => ({
                privacy: { typingIndicators: false, readReceipts: true },
                theme: { mode: "light" },
            }),
        });
        (Conversation as any).exists = async () => {
            throw new Error("Conversation.exists should be skipped when socket is in room");
        };
        (User as any).findById = () => {
            throw new Error("User.findById should be skipped when privacy is cached on socket");
        };

        const convId = "507f1f77bcf86cd799439013";
        const sock: any = new MockSocket();
        sock.rooms = new Set([convId]);
        sock.to = () => ({
            emit: (ev: string, payload: any) => sock.emitted.push({ event: `room:${ev}`, payload }),
        });

        const fakeIo: any = {
            to: () => ({ emit: () => {} }),
            sockets: { sockets: new Map([["sock_test_1", sock]]) },
        };

        registerAppEvents(fakeIo, sock);
        registerChatEvents(fakeIo, sock);

        await sock.trigger("updatePrivacy", { typingIndicators: false });
        assert.equal(sock.data.privacy?.typingIndicators, false);

        await sock.trigger("typing", { conversationId: convId, senderId: sock.data.userId, senderName: "Tester" });
        assert.equal(sock.emitted.some((e: any) => e.event === "room:typing"), false);

        sock.data.privacy.typingIndicators = true;
        await sock.trigger("typing", { conversationId: convId, senderId: sock.data.userId, senderName: "Tester" });
        assert.equal(sock.emitted.some((e: any) => e.event === "room:typing"), true);
    });

    test("getAgoraUid always returns a deterministic positive signed 31-bit integer", () => {
        const sampleIds = Array.from({ length: 40 }, (_, i) => `507f1f77bcf86cd7994390${String(i).padStart(2, "0")}`);
        for (const id of sampleIds) {
            const uid = getAgoraUid(id);
            assert.equal(Number.isInteger(uid), true);
            assert.ok(uid >= 1 && uid <= 0x7fffffff, `Expected 31-bit signed int for ${id}, got ${uid}`);
            assert.equal(getAgoraUid(id), uid);
        }
    });

    test("updateUserPreferences persists settings across reloads via User model", async () => {
        const origFindById = User.findById;
        const origFindByIdAndUpdate = User.findByIdAndUpdate;
        let savedState: any = {
            notificationsEnabled: true,
            callRingtone: "incoming_call",
            theme: { mode: "system", accent: "#facc15", wallpaper: "", bubbleStyle: "rounded" },
            privacy: { lastSeen: "everyone", readReceipts: true, typingIndicators: true, storyPrivacy: "everyone" },
            appPreferences: {},
        };
        cleanups.push(() => {
            (User as any).findById = origFindById;
            (User as any).findByIdAndUpdate = origFindByIdAndUpdate;
        });

        (User as any).findById = () => ({
            select: () => ({ lean: async () => savedState }),
        });
        (User as any).findByIdAndUpdate = (_id: string, update: any) => {
            const $set = update?.$set || {};
            if ($set.notificationsEnabled !== undefined) savedState.notificationsEnabled = $set.notificationsEnabled;
            if ($set.callRingtone) savedState.callRingtone = $set.callRingtone;
            if ($set["theme.bubbleStyle"]) savedState.theme.bubbleStyle = $set["theme.bubbleStyle"];
            if ($set["theme.accent"]) savedState.theme.accent = $set["theme.accent"];
            if ($set["privacy.lastSeen"]) savedState.privacy.lastSeen = $set["privacy.lastSeen"];
            if ($set["privacy.readReceipts"] !== undefined) savedState.privacy.readReceipts = $set["privacy.readReceipts"];
            if ($set.appPreferences) savedState.appPreferences = $set.appPreferences;
            return {
                select: () => ({ lean: async () => savedState }),
            };
        };

        let responseJson: any = null;
        const mockRes: any = {
            status() { return this; },
            json(data: any) { responseJson = data; },
        };

        await updateUserPreferences(
            {
                userId: "507f1f77bcf86cd799439011",
                body: {
                    notificationsEnabled: false,
                    soundEnabled: false,
                    hapticStrength: "ultra",
                    callRingtone: "incoming_call_3",
                    appearance: { bubbleStyle: "sharp", fontScale: "large", accentColor: "#8b5cf6" },
                    privacy: { lastSeen: "contacts", readReceipts: false, typingIndicators: true },
                    updatedAt: 1700000000000,
                },
            } as any,
            mockRes
        );

        assert.equal(responseJson?.success, true);
        assert.equal(responseJson?.data?.notificationsEnabled, false);
        assert.equal(responseJson?.data?.soundEnabled, false);
        assert.equal(responseJson?.data?.hapticStrength, "ultra");
        assert.equal(responseJson?.data?.appearance?.bubbleStyle, "sharp");
        assert.equal(responseJson?.data?.privacy?.lastSeen, "contacts");
        assert.equal(responseJson?.data?.privacy?.readReceipts, false);

        responseJson = null;
        await getUserPreferences({ userId: "507f1f77bcf86cd799439011" } as any, mockRes);
        assert.equal(responseJson?.success, true);
        assert.equal(responseJson?.data?.notificationsEnabled, false);
        assert.equal(responseJson?.data?.callRingtone, "incoming_call_3");
        assert.equal(responseJson?.data?.appearance?.fontScale, "large");
    });

    test("transcribeAudio enforces SSRF allowlist, returns cached transcripts, and reports unconfigured STT honestly", async () => {
        const vertexTargets = resolveGeminiEndpoints("AQ.sampleVertexKey");
        assert.ok(vertexTargets[0].url.startsWith("https://aiplatform.googleapis.com/v1/publishers/google/models/"));
        assert.equal(vertexTargets[0].headers["x-goog-api-key"], "AQ.sampleVertexKey");
        assert.ok(vertexTargets[0].url.includes("gemini-3.8-flash"));
        assert.ok(vertexTargets.some((t) => t.url.includes("gemini-3.6-flash")));
        assert.ok(vertexTargets.some((t) => t.url.includes("gemini-3.5-flash")));
        assert.ok(vertexTargets.some((t) => t.url.includes("gemini-3.5-flash-lite")));
        assert.equal(vertexTargets.some((t) => t.url.includes("generativelanguage.googleapis.com")), false);
        assert.equal(vertexTargets.some((t) => /gemini-2\.(0|5)/i.test(t.url)), false);

        const aiStudioTargets = resolveGeminiEndpoints("AIzaSampleStudioKey");
        assert.ok(aiStudioTargets[0].url.startsWith("https://generativelanguage.googleapis.com/"));
        assert.ok(aiStudioTargets[0].url.includes("gemini-3.8-flash"));
        assert.equal(aiStudioTargets.some((t) => /gemini-2\.(0|5)/i.test(t.url)), false);

        const overrideTargets = resolveGeminiEndpoints("AIzaSampleStudioKey", "gemini-3.5-flash-lite");
        assert.ok(overrideTargets[0].url.includes("gemini-3.5-flash-lite"));
        assert.equal(overrideTargets.length, 8);

        assert.equal(
            extractGeminiTranscript({
                candidates: [
                    {
                        content: {
                            parts: [
                                { thought: true, text: "Internal reasoning" },
                                { text: "Hello there!" },
                            ],
                        },
                    },
                ],
            }),
            "Hello there!"
        );
        assert.equal(
            extractGeminiTranscript({
                candidates: [{ content: { parts: [{ text: '""' }] } }],
            }),
            ""
        );

        assert.equal(isAllowedAudioUrl("https://res.cloudinary.com/demo/video/upload/voice.m4a"), true);
        assert.equal(isAllowedAudioUrl("http://res.cloudinary.com/demo/voice.m4a"), false);
        assert.equal(isAllowedAudioUrl("http://127.0.0.1:5000/secret"), false);
        assert.equal(isAllowedAudioUrl("https://evil.example.com/audio.m4a"), false);

        const origMsgFindById = Message.findById;
        const origConvFindById = Conversation.findById;
        const prevGroq = process.env.GROQ_API_KEY;
        const prevGemini = process.env.GEMINI_API_KEY;
        const prevGoogleAi = process.env.GOOGLE_AI_API_KEY;
        const prevGoogleApi = process.env.GOOGLE_API_KEY;
        const prevOpenAi = process.env.OPENAI_API_KEY;
        const prevDeepgram = process.env.DEEPGRAM_API_KEY;

        cleanups.push(() => {
            (Message as any).findById = origMsgFindById;
            (Conversation as any).findById = origConvFindById;
            if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq; else delete process.env.GROQ_API_KEY;
            if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini; else delete process.env.GEMINI_API_KEY;
            if (prevGoogleAi !== undefined) process.env.GOOGLE_AI_API_KEY = prevGoogleAi; else delete process.env.GOOGLE_AI_API_KEY;
            if (prevGoogleApi !== undefined) process.env.GOOGLE_API_KEY = prevGoogleApi; else delete process.env.GOOGLE_API_KEY;
            if (prevOpenAi !== undefined) process.env.OPENAI_API_KEY = prevOpenAi; else delete process.env.OPENAI_API_KEY;
            if (prevDeepgram !== undefined) process.env.DEEPGRAM_API_KEY = prevDeepgram; else delete process.env.DEEPGRAM_API_KEY;
        });

        let statusCode = 200;
        let responseJson: any = null;
        const mockRes: any = {
            status(code: number) { statusCode = code; return this; },
            json(data: any) { responseJson = data; },
        };

        // Case 1: Cached DB transcript returned cleanly
        (Conversation as any).findById = async () => ({
            _id: "507f1f77bcf86cd799439013",
            participants: ["507f1f77bcf86cd799439011"],
            admins: [],
        });
        (Message as any).findById = () => ({
            select: async () => ({
                _id: "507f1f77bcf86cd799439099",
                conversationId: "507f1f77bcf86cd799439013",
                voiceUrl: "https://res.cloudinary.com/demo/voice.m4a",
                transcript: "Hey Arnav, checking in on v4.2.1!",
                isDeleted: false,
            }),
        });

        await transcribeAudio(
            { userId: "507f1f77bcf86cd799439011", body: { messageId: "507f1f77bcf86cd799439099" } } as any,
            mockRes
        );
        assert.equal(statusCode, 200);
        assert.equal(responseJson?.success, true);
        assert.equal(responseJson?.data?.transcript, "Hey Arnav, checking in on v4.2.1!");
        assert.equal(responseJson?.data?.cached, true);

        // Case 2: Unconfigured server STT returns honest 503 instead of fake placeholder
        delete process.env.GROQ_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_AI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.DEEPGRAM_API_KEY;
        statusCode = 200;
        responseJson = null;

        await transcribeAudio(
            {
                userId: "507f1f77bcf86cd799439011",
                body: { audioUrl: "https://res.cloudinary.com/demo/voice.m4a" },
            } as any,
            mockRes
        );
        assert.equal(statusCode, 503);
        assert.equal(responseJson?.success, false);
        assert.equal(responseJson?.code, "STT_NOT_CONFIGURED");
    });

    test("getAgoraServerConfig rejects placeholders and supports both certificate and explicit appId-only mode", () => {
        const prevAppId = process.env.AGORA_APP_ID;
        const prevPublicAppId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
        const prevCert = process.env.AGORA_APP_CERTIFICATE;
        const prevAppIdOnly = process.env.AGORA_ALLOW_APP_ID_ONLY;

        cleanups.push(() => {
            if (prevAppId !== undefined) process.env.AGORA_APP_ID = prevAppId; else delete process.env.AGORA_APP_ID;
            if (prevPublicAppId !== undefined) process.env.EXPO_PUBLIC_AGORA_APP_ID = prevPublicAppId; else delete process.env.EXPO_PUBLIC_AGORA_APP_ID;
            if (prevCert !== undefined) process.env.AGORA_APP_CERTIFICATE = prevCert; else delete process.env.AGORA_APP_CERTIFICATE;
            if (prevAppIdOnly !== undefined) process.env.AGORA_ALLOW_APP_ID_ONLY = prevAppIdOnly; else delete process.env.AGORA_ALLOW_APP_ID_ONLY;
        });

        process.env.AGORA_APP_ID = "your_agora_app_id_here";
        process.env.AGORA_APP_CERTIFICATE = "your_agora_app_certificate_here";
        delete process.env.EXPO_PUBLIC_AGORA_APP_ID;
        delete process.env.AGORA_ALLOW_APP_ID_ONLY;

        const missing = getAgoraServerConfig();
        assert.equal(missing.ready, false);

        process.env.AGORA_APP_ID = "ff4f2dea21944c55b1512724e18448aa";
        const missingCert = getAgoraServerConfig();
        assert.equal(missingCert.ready, false);

        process.env.AGORA_ALLOW_APP_ID_ONLY = "true";
        const appIdOnlyCfg = getAgoraServerConfig();
        assert.equal(appIdOnlyCfg.ready, true);
        assert.equal(appIdOnlyCfg.appIdOnly, true);

        delete process.env.AGORA_ALLOW_APP_ID_ONLY;
        process.env.AGORA_APP_CERTIFICATE = "0123456789abcdef0123456789abcdef";
        const fullCfg = getAgoraServerConfig();
        assert.equal(fullCfg.ready, true);
        assert.equal(fullCfg.appIdOnly, false);
    });

    test("call:invite fails before ringing an available callee when Agora is unconfigured, and call:cancel emits call:ended immediately", async () => {
        const prevAppId = process.env.AGORA_APP_ID;
        const prevPublicAppId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
        const prevCert = process.env.AGORA_APP_CERTIFICATE;
        const prevAppIdOnly = process.env.AGORA_ALLOW_APP_ID_ONLY;
        const origConvFindById = Conversation.findById;
        const origUserFind = User.find;
        const origUserFindById = User.findById;
        const origCallCreate = Call.create;
        const origCallFindOneAndUpdate = Call.findOneAndUpdate;
        const origMessageCreate = Message.create;

        cleanups.push(() => {
            if (prevAppId !== undefined) process.env.AGORA_APP_ID = prevAppId; else delete process.env.AGORA_APP_ID;
            if (prevPublicAppId !== undefined) process.env.EXPO_PUBLIC_AGORA_APP_ID = prevPublicAppId; else delete process.env.EXPO_PUBLIC_AGORA_APP_ID;
            if (prevCert !== undefined) process.env.AGORA_APP_CERTIFICATE = prevCert; else delete process.env.AGORA_APP_CERTIFICATE;
            if (prevAppIdOnly !== undefined) process.env.AGORA_ALLOW_APP_ID_ONLY = prevAppIdOnly; else delete process.env.AGORA_ALLOW_APP_ID_ONLY;
            (Conversation as any).findById = origConvFindById;
            (User as any).find = origUserFind;
            (User as any).findById = origUserFindById;
            (Call as any).create = origCallCreate;
            (Call as any).findOneAndUpdate = origCallFindOneAndUpdate;
            (Message as any).create = origMessageCreate;
        });

        const callerId = "507f1f77bcf86cd799439011";
        const calleeId = "507f1f77bcf86cd799439012";
        const convId = "507f1f77bcf86cd799439013";
        const callId = "507f1f77bcf86cd799439014";

        (Conversation as any).findById = async () => ({
            _id: convId,
            type: "direct",
            participants: [callerId, calleeId],
            admins: [],
        });
        (User as any).find = () => ({
            select: () => ({
                lean: async () => [
                    { _id: callerId, blockedUsers: [] },
                    { _id: calleeId, blockedUsers: [] },
                ],
            }),
        });
        (User as any).findById = () => ({
            select: () => ({
                lean: async () => ({ _id: calleeId, isOnline: true, pushTokens: [], notificationsEnabled: true }),
            }),
        });

        let createdCall = false;
        (Call as any).create = async () => {
            createdCall = true;
            return { _id: callId };
        };

        const emittedRooms: Array<{ room: string; event: string; payload: any }> = [];
        const calleeSocket = new MockSocket();
        calleeSocket.data = { userId: calleeId, name: "Callee" };
        const fakeIo: any = {
            sockets: { sockets: new Map([["s_callee", calleeSocket]]) },
            to: (room: string) => ({
                emit: (event: string, payload: any) => {
                    emittedRooms.push({ room, event, payload });
                },
            }),
        };

        delete process.env.AGORA_APP_ID;
        delete process.env.EXPO_PUBLIC_AGORA_APP_ID;
        delete process.env.AGORA_APP_CERTIFICATE;
        delete process.env.AGORA_ALLOW_APP_ID_ONLY;

        const callerSock = new MockSocket();
        callerSock.data = { userId: callerId, name: "Caller" };
        registerCallEvents(fakeIo, callerSock as any);

        await callerSock.trigger("call:invite", { conversationId: convId, calleeId, kind: "video" });
        assert.equal(createdCall, false);
        assert.equal(emittedRooms.some((e) => e.event === "call:incoming"), false);
        const failEvent = callerSock.emitted.find((e) => e.event === "call:failed");
        assert.equal(failEvent?.payload?.reason, "not_configured");

        // Now verify call:cancel notifies the callee immediately even if chat log write throws
        (Call as any).findOneAndUpdate = async () => ({
            _id: callId,
            conversationId: convId,
            callerId,
            calleeId,
            kind: "voice",
            status: "cancelled",
        });
        (Message as any).create = async () => {
            throw new Error("Simulated DB message write failure");
        };

        await callerSock.trigger("call:cancel", { callId });
        const calleeEnded = emittedRooms.find((e) => e.room === `user:${calleeId}` && e.event === "call:ended");
        assert.equal(calleeEnded?.payload?.callId, callId);
        assert.equal(calleeEnded?.payload?.reason, "cancelled");
    });
});
