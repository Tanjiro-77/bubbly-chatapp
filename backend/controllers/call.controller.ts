import { Request, Response } from "express";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { isValidObjectId } from "mongoose";
import Call from "../modals/Call";
import { getIO } from "../socket/io";
import { acceptCallById, rejectCallById } from "../socket/callEvents";
import { getAgoraServerConfig, getAgoraUid } from "../utils/agora";

export { getAgoraUid };

export const generateAgoraToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { callId: rawCallId } = req.body ?? {};

        const agora = getAgoraServerConfig();

        if (!userId) {
            return res.status(401).json({
                success: false,
                msg: "Unauthorized",
            });
        }

         if (
            typeof rawCallId !== "string" ||
            !rawCallId ||
            !isValidObjectId(rawCallId)
        ) {
            return res.status(400).json({
                success: false,
                msg: "Valid callId is required",
            });
        }

        const callId = rawCallId;

        if (!agora.ready) {
            console.error("Agora credentials are missing:", agora.missingReason);

            return res.status(503).json({
                success: false,
                code: "AGORA_NOT_CONFIGURED",
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

        if (!["ringing", "connecting", "connected"].includes(call.status)) {
            return res.status(409).json({
                success: false,
                msg: `Call is already ${call.status}`,
            });
        }

        // IMPORTANT:
        // Always derive the Agora channel from the actual Call document.
        // Do NOT trust a channelName sent by the client.
        const channelName = call._id.toString();

        // Generate a stable numeric Agora UID from the user's MongoDB ID.
        const uid = getAgoraUid(userId);

        const expirationTimeInSeconds = 3600;

        // Generate token for the SAME numeric UID
        // that the frontend will use in joinChannel().
        // agora-token v2 expects relative seconds from now for both tokenExpire and privilegeExpire.
        const token = agora.appIdOnly
            ? ""
            : RtcTokenBuilder.buildTokenWithUid(
                  agora.appId,
                  agora.appCertificate,
                  channelName,
                  uid,
                  RtcRole.PUBLISHER,
                  expirationTimeInSeconds,
                  expirationTimeInSeconds
              );

        return res.status(200).json({
            success: true,
            data: {
                token,
                appId: agora.appId,
                channelName,
                uid,
                appIdOnly: agora.appIdOnly,
                ...(call.e2eeMediaKey && call.e2eeMediaSalt
                    ? {
                          e2eeMediaKey: call.e2eeMediaKey,
                          e2eeMediaSalt: call.e2eeMediaSalt,
                      }
                    : {}),
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
        const rawPage = parseInt(req.query.page as string, 10);
        const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
        const limit = 20;

        const filter = { $or: [{ callerId: userId }, { calleeId: userId }] };
        const rawCalls = await Call.find(filter)
            .populate("callerId", "name avatar")
            .populate("calleeId", "name avatar")
            .populate("conversationId", "_id")
            .sort({ createdAt: -1 })
            .skip(page * limit)
            .limit(limit + 1)
            .lean();

        const hasMore = rawCalls.length > limit;
        const calls = hasMore ? rawCalls.slice(0, limit) : rawCalls;

        return res.status(200).json({
            success: true,
            data: calls,
            hasMore,
            page,
        });
    } catch (error: any) {
        console.error("getCallHistory error:", error?.message || error);
        return res.status(500).json({ success: false, msg: "Failed to fetch call history" });
    }
};

export const getCallStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const callId = req.params.callId as string;

        if (!userId) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }
        if (!callId || !isValidObjectId(callId)) {
            return res.status(400).json({ success: false, msg: "Invalid callId" });
        }

        const call = await Call.findById(callId).select("status kind callerId calleeId conversationId").lean();
        if (!call) {
            return res.status(404).json({ success: false, msg: "Call not found" });
        }
        if (call.callerId.toString() !== userId && call.calleeId.toString() !== userId) {
            return res.status(403).json({ success: false, msg: "Not authorized" });
        }

        return res.status(200).json({
            success: true,
            data: {
                callId: call._id.toString(),
                status: call.status,
                kind: call.kind,
                conversationId: call.conversationId.toString(),
            },
        });
    } catch (error: any) {
        console.error("getCallStatus error:", error?.message || error);
        return res.status(500).json({ success: false, msg: "Failed to get call status" });
    }
};

export const acceptCallHttp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const callId = req.params.callId as string;

        if (!userId) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }
        if (!callId || !isValidObjectId(callId)) {
            return res.status(400).json({ success: false, msg: "Invalid callId" });
        }

        const io = getIO();
        const call = await acceptCallById(io, callId, userId);

        return res.status(200).json({
            success: true,
            data: { callId: call._id.toString(), status: call.status },
        });
    } catch (error: any) {
        return res.status(400).json({ success: false, msg: error?.message || "Could not accept call" });
    }
};

export const getPendingIncomingCall = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }

        const pendingCall: any = await Call.findOne({
            calleeId: userId,
            status: "ringing",
            createdAt: { $gte: new Date(Date.now() - 65_000) },
        })
            .populate("callerId", "name avatar")
            .sort({ createdAt: -1 })
            .lean();

        if (!pendingCall) {
            return res.status(200).json({ success: true, data: null });
        }

        const callerDoc = pendingCall.callerId as any;
        return res.status(200).json({
            success: true,
            data: {
                callId: pendingCall._id.toString(),
                conversationId: pendingCall.conversationId.toString(),
                kind: pendingCall.kind,
                caller: {
                    id: callerDoc?._id ? callerDoc._id.toString() : pendingCall.callerId.toString(),
                    name: callerDoc?.name || "Someone",
                    avatar: callerDoc?.avatar || "",
                },
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, msg: "Failed to check pending calls" });
    }
};

export const rejectCallHttp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const callId = req.params.callId as string;

        if (!userId) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }
        if (!callId || !isValidObjectId(callId)) {
            return res.status(400).json({ success: false, msg: "Invalid callId" });
        }

        const io = getIO();
        const call = await rejectCallById(io, callId, userId);
        if (!call) {
            return res.status(404).json({ success: false, msg: "Call not found" });
        }

        return res.status(200).json({
            success: true,
            data: { callId: call._id.toString(), status: call.status },
        });
    } catch (error: any) {
        return res.status(400).json({ success: false, msg: error?.message || "Could not reject call" });
    }
};

export const endCallHttp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const callId = req.params.callId as string;

        if (!userId) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }
        if (!callId || !isValidObjectId(callId)) {
            return res.status(400).json({ success: false, msg: "Invalid callId" });
        }

        const io = getIO();
        const call = await (await import("../socket/callEvents")).endCallById(io, callId, userId);
        if (!call) {
            return res.status(404).json({ success: false, msg: "Call not found" });
        }

        return res.status(200).json({
            success: true,
            data: { callId: call._id.toString(), status: call.status, duration: call.duration || 0 },
        });
    } catch (error: any) {
        return res.status(400).json({ success: false, msg: error?.message || "Could not end call" });
    }
};