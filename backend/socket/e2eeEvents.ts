import { Server as SocketIOServer, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import User from "../modals/User";
import Conversation from "../modals/Conversation";

function isValidBase64Key(val: unknown, expectedByteLength = 32): boolean {
    if (typeof val !== "string" || !val.trim()) return false;
    try {
        return Buffer.from(val.trim(), "base64").length === expectedByteLength;
    } catch {
        return false;
    }
}

export function registerE2EEEvents(io: SocketIOServer, socket: Socket) {
    socket.on("e2ee:publishKey", async (data: {
        publicKey: string;
        keyVersion?: number;
        fingerprint?: string;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !isValidBase64Key(data?.publicKey, 32)) {
                socket.emit("e2ee:publishKey", { success: false, msg: "Invalid E2EE public key" });
                return;
            }

            const keyVersion = typeof data.keyVersion === "number" && data.keyVersion >= 1
                ? Math.floor(data.keyVersion)
                : 1;
            const fingerprint = typeof data.fingerprint === "string"
                ? data.fingerprint.trim().slice(0, 128)
                : "";

            await User.findByIdAndUpdate(userId, {
                $set: {
                    e2eePublicKey: data.publicKey.trim(),
                    e2eeKeyVersion: keyVersion,
                    e2eeKeyFingerprint: fingerprint,
                },
            });

            socket.emit("e2ee:publishKey", {
                success: true,
                data: { userId, publicKey: data.publicKey.trim(), keyVersion, fingerprint },
            });
        } catch (error) {
            console.log("e2ee:publishKey error:", error);
            socket.emit("e2ee:publishKey", { success: false, msg: "Failed to publish key" });
        }
    });

    socket.on("e2ee:getKeys", async (data: { userIds: string[] }) => {
        try {
            const rawIds = Array.isArray(data?.userIds) ? data.userIds : [];
            const uniqueIds = Array.from(new Set(rawIds.map(String)))
                .filter((id) => isValidObjectId(id))
                .slice(0, 100);

            if (uniqueIds.length === 0) {
                socket.emit("e2ee:getKeys", { success: true, data: {} });
                return;
            }

            const users = await User.find({ _id: { $in: uniqueIds } })
                .select("_id e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint")
                .lean();

            const keyMap: Record<string, { publicKey: string; keyVersion: number; fingerprint: string }> = {};
            for (const u of users) {
                keyMap[u._id.toString()] = {
                    publicKey: u.e2eePublicKey || "",
                    keyVersion: u.e2eeKeyVersion || 1,
                    fingerprint: u.e2eeKeyFingerprint || "",
                };
            }

            socket.emit("e2ee:getKeys", { success: true, data: keyMap });
        } catch (error) {
            console.log("e2ee:getKeys error:", error);
            socket.emit("e2ee:getKeys", { success: false, msg: "Failed to fetch keys" });
        }
    });

    socket.on("e2ee:setConversationKeys", async (data: {
        conversationId: string;
        encryptedKeys: Array<{
            userId: string;
            encryptedKey: string;
            nonce: string;
            senderPublicKey: string;
            keyVersion?: number;
        }>;
        keyVersion?: number;
    }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.conversationId || !isValidObjectId(data.conversationId)) {
                socket.emit("e2ee:setConversationKeys", { success: false, msg: "Invalid conversation ID" });
                return;
            }
            if (!Array.isArray(data.encryptedKeys) || data.encryptedKeys.length === 0) {
                socket.emit("e2ee:setConversationKeys", { success: false, msg: "encryptedKeys required" });
                return;
            }

            const conversation = await Conversation.findById(data.conversationId)
                .select("participants encryptedKeys e2eeKeyVersion");
            if (!conversation) {
                socket.emit("e2ee:setConversationKeys", { success: false, msg: "Conversation not found" });
                return;
            }

            const participantSet = new Set(conversation.participants.map((p: any) => p.toString()));
            if (!participantSet.has(userId.toString())) {
                socket.emit("e2ee:setConversationKeys", { success: false, msg: "Not a member" });
                return;
            }

            const sanitized = data.encryptedKeys
                .filter((e) =>
                    e &&
                    isValidObjectId(String(e.userId)) &&
                    participantSet.has(String(e.userId)) &&
                    typeof e.encryptedKey === "string" && e.encryptedKey.length > 0 &&
                    typeof e.nonce === "string" && e.nonce.length > 0 &&
                    isValidBase64Key(e.senderPublicKey, 32)
                )
                .map((e) => ({
                    userId: e.userId as any,
                    encryptedKey: e.encryptedKey,
                    nonce: e.nonce,
                    senderPublicKey: e.senderPublicKey.trim(),
                    keyVersion: typeof e.keyVersion === "number" ? e.keyVersion : (typeof data.keyVersion === "number" ? data.keyVersion : 1),
                }));

            if (sanitized.length === 0) {
                socket.emit("e2ee:setConversationKeys", { success: false, msg: "No valid key entries" });
                return;
            }

            const existingMap = new Map<string, any>();
            for (const existing of (conversation.encryptedKeys || [])) {
                existingMap.set(existing.userId.toString(), existing);
            }
            for (const entry of sanitized) {
                existingMap.set(entry.userId.toString(), entry);
            }

            conversation.isEncrypted = true;
            if (typeof data.keyVersion === "number" && data.keyVersion >= 1) {
                conversation.e2eeKeyVersion = Math.floor(data.keyVersion);
            }
            conversation.encryptedKeys = Array.from(existingMap.values());
            await conversation.save();

            io.to(data.conversationId).emit("e2ee:conversationKeysUpdated", {
                success: true,
                data: {
                    conversationId: data.conversationId,
                    e2eeKeyVersion: conversation.e2eeKeyVersion || 1,
                    encryptedKeys: conversation.encryptedKeys,
                },
            });
            socket.emit("e2ee:setConversationKeys", { success: true, conversationId: data.conversationId });
        } catch (error) {
            console.log("e2ee:setConversationKeys error:", error);
            socket.emit("e2ee:setConversationKeys", { success: false, msg: "Failed to save conversation keys" });
        }
    });

    socket.on("e2ee:requestConversationKey", async (data: { conversationId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!userId || !data?.conversationId || !isValidObjectId(data.conversationId)) return;

            const conversation = await Conversation.findOne({
                _id: data.conversationId,
                participants: userId,
            }).select("_id").lean();
            if (!conversation) return;

            const user = await User.findById(userId).select("e2eePublicKey e2eeKeyVersion").lean();
            if (!user?.e2eePublicKey) return;

            socket.to(data.conversationId).emit("e2ee:conversationKeyRequested", {
                conversationId: data.conversationId,
                requesterId: userId,
                requesterPublicKey: user.e2eePublicKey,
                keyVersion: user.e2eeKeyVersion || 1,
            });
        } catch (error) {
            console.log("e2ee:requestConversationKey error:", error);
        }
    });
}
