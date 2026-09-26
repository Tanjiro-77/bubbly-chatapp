import { Request, Response } from "express";
import { createHash } from "crypto";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import Call from "../modals/Call";

const APP_ID = process.env.AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

const getAgoraUid = (userId: string): number => {
    const hash = createHash("sha256")
        .update(userId)
        .digest();

    const uid = hash.readUInt32BE(0);

    return uid === 0 ? 1 : uid;
};

export const generateAgoraToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { callId } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                msg: "Unauthorized",
            });
        }

        if (!callId) {
            return res.status(400).json({
                success: false,
                msg: "callId is required",
            });
        }

        if (!APP_ID || !APP_CERTIFICATE) {
            console.error("Agora credentials are missing");

            return res.status(500).json({
                success: false,
                msg: "Agora is not configured on the server",
            });
        }

        // Find the call.
        const call = await Call.findById(callId);

        if (!call) {
            return res.status(404).json({
                success: false,
                msg: "Call not found",
            });
        }

        // Make sure this user belongs to the call.
        const isParticipant =
            call.callerId.toString() === userId ||
            call.calleeId.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                msg: "Not authorized",
            });
        }

        // IMPORTANT:
        // Always derive the Agora channel from the actual Call document.
        // Do NOT trust a channelName sent by the client.
        const channelName = call._id.toString();

        // Generate a stable numeric Agora UID from the user's MongoDB ID.
        const uid = getAgoraUid(userId);

        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs =
            currentTimestamp + expirationTimeInSeconds;

        // Generate token for the SAME numeric UID
        // that the frontend will use in joinChannel().
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            uid,
            RtcRole.PUBLISHER,
            expirationTimeInSeconds,
            privilegeExpiredTs
        );

        return res.status(200).json({
            success: true,
            data: {
                token,
                appId: APP_ID,
                channelName,
                uid,
            },
        });
    } catch (error: any) {
        console.error("generateAgoraToken error:", error);

        return res.status(500).json({
            success: false,
            msg: "Failed to generate token",
        });
    }
};

export const getCallHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = parseInt(req.query.page as string) || 0;
        const limit = 20;

        const calls = await Call.find({
            $or: [{ callerId: userId }, { calleeId: userId }],
        })
            .populate("callerId", "name avatar")
            .populate("calleeId", "name avatar")
            .populate("conversationId", "_id")
            .sort({ createdAt: -1 })
            .skip(page * limit)
            .limit(limit);

        const total = await Call.countDocuments({
            $or: [{ callerId: userId }, { calleeId: userId }],
        });

        return res.status(200).json({
            success: true,
            data: calls,
            hasMore: (page + 1) * limit < total,
            page,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, msg: error.message });
    }
};