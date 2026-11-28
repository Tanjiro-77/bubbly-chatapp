import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import User from "../modals/User";
import Conversation from "../modals/Conversation";
import { getIO } from "../socket/io";

function isValidBase64Key(val: unknown, expectedByteLength = 32): boolean {
    if (typeof val !== "string" || !val.trim()) return false;
    try {
        const buf = Buffer.from(val.trim(), "base64");
        return buf.length === expectedByteLength;
    } catch {
        return false;
    }
}

export async function publishE2EEKey(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, msg: "Unauthorized" });

        const { publicKey, keyVersion, fingerprint, keyBackup } = req.body || {};
        if (!isValidBase64Key(publicKey, 32)) {
            return res.status(400).json({ success: false, msg: "Invalid E2EE public key (expected 32-byte base64)" });
        }

        const update: Record<string, any> = {
            e2eePublicKey: publicKey.trim(),
            e2eeKeyVersion: typeof keyVersion === "number" && keyVersion >= 1 ? Math.floor(keyVersion) : 1,
            e2eeKeyFingerprint: typeof fingerprint === "string" ? fingerprint.trim().slice(0, 128) : "",
        };

        if (keyBackup && typeof keyBackup === "object") {
            const { ciphertext, nonce, salt, kdfVersion } = keyBackup;
            if (typeof ciphertext === "string" && typeof nonce === "string" && typeof salt === "string") {
                update.e2eeKeyBackup = {
                    ciphertext,
                    nonce,
                    salt,
                    kdfVersion: typeof kdfVersion === "number" ? kdfVersion : 1,
                };
            }
        }

        const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
            .select("_id e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint")
            .lean();

        if (!updated) return res.status(404).json({ success: false, msg: "User not found" });

        return res.json({
            success: true,
            data: {
                userId: updated._id.toString(),
                publicKey: updated.e2eePublicKey,
                keyVersion: updated.e2eeKeyVersion || 1,
                fingerprint: updated.e2eeKeyFingerprint || "",
            },
        });
    } catch (error: any) {
        console.error("publishE2EEKey error:", error);
        return res.status(500).json({ success: false, msg: "Failed to publish E2EE key" });
    }
}

export async function getUserPublicKey(req: Request, res: Response) {
    try {
        const targetId = String(req.params.userId || "");
        if (!isValidObjectId(targetId)) {
            return res.status(400).json({ success: false, msg: "Invalid user ID" });
        }

        const user = await User.findById(targetId)
            .select("_id e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint")
            .lean();

        if (!user) return res.status(404).json({ success: false, msg: "User not found" });

        return res.json({
            success: true,
            data: {
                userId: user._id.toString(),
                publicKey: user.e2eePublicKey || "",
                keyVersion: user.e2eeKeyVersion || 1,
                fingerprint: user.e2eeKeyFingerprint || "",
            },
        });
    } catch (error: any) {
        console.error("getUserPublicKey error:", error);
        return res.status(500).json({ success: false, msg: "Failed to fetch E2EE public key" });
    }
}

export async function getBatchPublicKeys(req: Request, res: Response) {
    try {
        const rawIds = req.body?.userIds;
        if (!Array.isArray(rawIds)) {
            return res.status(400).json({ success: false, msg: "userIds array is required" });
        }

        const uniqueIds = Array.from(new Set(rawIds.map((id) => String(id))))
            .filter((id) => isValidObjectId(id))
            .slice(0, 100);

        if (uniqueIds.length === 0) {
            return res.json({ success: true, data: {} });
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

        return res.json({ success: true, data: keyMap });
    } catch (error: any) {
        console.error("getBatchPublicKeys error:", error);
        return res.status(500).json({ success: false, msg: "Failed to fetch E2EE public keys" });
    }
}

export async function getE2EEKeyBackup(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, msg: "Unauthorized" });

        const user = await User.findById(userId)
            .select("e2eePublicKey e2eeKeyVersion e2eeKeyFingerprint e2eeKeyBackup")
            .lean();

        if (!user) return res.status(404).json({ success: false, msg: "User not found" });

        return res.json({
            success: true,
            data: {
                publicKey: user.e2eePublicKey || "",
                keyVersion: user.e2eeKeyVersion || 1,
                fingerprint: user.e2eeKeyFingerprint || "",
                keyBackup: user.e2eeKeyBackup?.ciphertext ? user.e2eeKeyBackup : null,
            },
        });
    } catch (error: any) {
        console.error("getE2EEKeyBackup error:", error);
        return res.status(500).json({ success: false, msg: "Failed to fetch E2EE key backup" });
    }
}

export async function setConversationKeys(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const conversationId = String(req.params.conversationId || "");
        if (!userId) return res.status(401).json({ success: false, msg: "Unauthorized" });
        if (!isValidObjectId(conversationId)) {
            return res.status(400).json({ success: false, msg: "Invalid conversation ID" });
        }

        const { encryptedKeys, keyVersion } = req.body || {};
        if (!Array.isArray(encryptedKeys) || encryptedKeys.length === 0) {
            return res.status(400).json({ success: false, msg: "encryptedKeys array is required" });
        }

        const conversation = await Conversation.findById(conversationId).select("participants encryptedKeys e2eeKeyVersion");
        if (!conversation) return res.status(404).json({ success: false, msg: "Conversation not found" });

        const participantSet = new Set(conversation.participants.map((p: any) => p.toString()));
        if (!participantSet.has(userId.toString())) {
            return res.status(403).json({ success: false, msg: "Not a member of this conversation" });
        }

        const sanitizedEntries = encryptedKeys
            .filter((e: any) =>
                e &&
                isValidObjectId(String(e.userId)) &&
                participantSet.has(String(e.userId)) &&
                typeof e.encryptedKey === "string" && e.encryptedKey.length > 0 &&
                typeof e.nonce === "string" && e.nonce.length > 0 &&
                isValidBase64Key(e.senderPublicKey, 32)
            )
            .map((e: any) => ({
                userId: e.userId,
                encryptedKey: e.encryptedKey,
                nonce: e.nonce,
                senderPublicKey: e.senderPublicKey.trim(),
                keyVersion: typeof e.keyVersion === "number" ? e.keyVersion : (typeof keyVersion === "number" ? keyVersion : 1),
            }));

        if (sanitizedEntries.length === 0) {
            return res.status(400).json({ success: false, msg: "No valid encryptedKeys entries" });
        }

        const existingMap = new Map<string, any>();
        for (const existing of (conversation.encryptedKeys || [])) {
            existingMap.set(existing.userId.toString(), existing);
        }
        for (const entry of sanitizedEntries) {
            existingMap.set(entry.userId.toString(), entry);
        }

        conversation.isEncrypted = true;
        if (typeof keyVersion === "number" && keyVersion >= 1) {
            conversation.e2eeKeyVersion = Math.floor(keyVersion);
        }
        conversation.encryptedKeys = Array.from(existingMap.values());
        await conversation.save();

        try {
            const io = getIO();
            io.to(conversationId).emit("e2ee:conversationKeysUpdated", {
                success: true,
                data: {
                    conversationId,
                    e2eeKeyVersion: conversation.e2eeKeyVersion || 1,
                    encryptedKeys: conversation.encryptedKeys,
                },
            });
        } catch {
            // Socket IO may not be initialized in unit tests
        }

        return res.json({
            success: true,
            data: {
                conversationId,
                e2eeKeyVersion: conversation.e2eeKeyVersion || 1,
                encryptedKeys: conversation.encryptedKeys,
            },
        });
    } catch (error: any) {
        console.error("setConversationKeys error:", error);
        return res.status(500).json({ success: false, msg: "Failed to save conversation keys" });
    }
}
