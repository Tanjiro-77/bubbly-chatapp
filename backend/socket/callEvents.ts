import { Server as SocketIOServer, Socket } from "socket.io";
import Call from "../modals/Call";
import Conversation from "../modals/Conversation";
import { areBlocked, getMembership } from "../utils/permissions";
import { createAndBroadcastMessage } from "../services/messageService";
import { userRoom } from "./io";

const activeCalls = new Map<string, { callerId: string; calleeId: string }>();

function cleanupCall(callId: string) {
    activeCalls.delete(callId);
}

export function registerCallEvents(io: SocketIOServer, socket: Socket) {
    socket.on("call:invite", async (data: {
        conversationId: string;
        calleeId: string;
        kind: "voice" | "video";
    }) => {
        try {
            const callerId = socket.data.userId;
            if (!["voice", "video"].includes(data.kind)) throw new Error("Invalid call type");
            const { conversation, isMember } = await getMembership(data.conversationId, callerId);
            if (!conversation || !isMember) throw new Error("Conversation not found");
            if (!conversation.participants.some((p) => p.toString() === data.calleeId)) {
                throw new Error("User is not in this conversation");
            }
            if (await areBlocked(callerId, data.calleeId)) throw new Error("Unable to call this user");

            const calleeSockets = Array.from(io.sockets.sockets.values()).filter(
                (s) => s.data.userId === data.calleeId
            );
            if (calleeSockets.length === 0) {
                const missed = await Call.create({
                    conversationId: data.conversationId,
                    callerId,
                    calleeId: data.calleeId,
                    kind: data.kind,
                    status: "missed",
                    endedAt: new Date(),
                });
                await createAndBroadcastMessage({
                    conversationId: data.conversationId,
                    senderId: callerId,
                    type: "call",
                    content: "",
                    callMeta: { callId: missed._id.toString(), kind: data.kind, status: "missed", duration: 0 },
                    skipRateLimit: true,
                });
                socket.emit("call:failed", { success: false, msg: "User is unavailable", callId: missed._id, reason: "offline" });
                return;
            }

            const existing = [...activeCalls.values()].find(
                (c) => c.callerId === data.calleeId || c.calleeId === data.calleeId || c.callerId === callerId || c.calleeId === callerId
            );
            if (existing) {
                socket.emit("call:failed", { success: false, msg: "User is busy", reason: "busy" });
                return;
            }

            const call = await Call.create({
                conversationId: data.conversationId,
                callerId,
                calleeId: data.calleeId,
                kind: data.kind,
                status: "ringing",
            });
            activeCalls.set(call._id.toString(), { callerId, calleeId: data.calleeId });

            const payload = {
                callId: call._id,
                conversationId: data.conversationId,
                kind: data.kind,
                caller: { id: callerId, name: socket.data.name, avatar: socket.data.avatar },
                calleeId: data.calleeId,
            };
            io.to(userRoom(data.calleeId)).emit("call:incoming", payload);
            socket.emit("call:ringing", payload);
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message || "Could not start call" });
        }
    });

    socket.on("call:accept", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            const call = await Call.findById(data.callId);
            if (!call || call.calleeId.toString() !== userId) throw new Error("Call not found");

            call.status = "connecting";
            await call.save();

            // ── Channel name is the callId ──
            const channelName = call._id.toString();

            io.to(userRoom(call.callerId.toString())).emit("call:accepted", {
                callId: call._id,
                channelName, // ── Send channel name to both ──
            });
            io.to(userRoom(call.calleeId.toString())).emit("call:accepted", {
                callId: call._id,
                channelName,
            });
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message || "Could not accept call" });
        }
    });

    socket.on("call:reject", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            const call = await Call.findById(data.callId);
            if (!call) return;
            if (call.calleeId.toString() !== userId && call.callerId.toString() !== userId) return;
            call.status = "rejected";
            call.endedAt = new Date();
            await call.save();
            cleanupCall(call._id.toString());
            await createAndBroadcastMessage({
                conversationId: call.conversationId.toString(),
                senderId: call.callerId.toString(),
                type: "call",
                callMeta: { callId: call._id.toString(), kind: call.kind, status: "rejected", duration: 0 },
                skipRateLimit: true,
                skipPermissionCheck: true,
            });
            io.to(userRoom(call.callerId.toString())).emit("call:ended", { callId: call._id, reason: "rejected" });
            io.to(userRoom(call.calleeId.toString())).emit("call:ended", { callId: call._id, reason: "rejected" });
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message });
        }
    });

    socket.on("call:cancel", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            const call = await Call.findById(data.callId);
            if (!call || call.callerId.toString() !== userId) return;
            call.status = "cancelled";
            call.endedAt = new Date();
            await call.save();
            cleanupCall(call._id.toString());
            io.to(userRoom(call.calleeId.toString())).emit("call:ended", { callId: call._id, reason: "cancelled" });
            socket.emit("call:ended", { callId: call._id, reason: "cancelled" });
        } catch (error) {
            console.log("call:cancel", error);
        }
    });

    socket.on("call:connected", async (data: { callId: string }) => {
        const call = await Call.findById(data.callId);
        if (!call) return;
        const userId = socket.data.userId;
        if (call.callerId.toString() !== userId && call.calleeId.toString() !== userId) return;
        call.status = "connected";
        call.startedAt = call.startedAt || new Date();
        await call.save();
        io.to(userRoom(call.callerId.toString())).emit("call:connected", { callId: call._id });
        io.to(userRoom(call.calleeId.toString())).emit("call:connected", { callId: call._id });
    });

    socket.on("call:end", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;

            const call = await Call.findById(data.callId);
            if (!call) return;

            if (
                call.callerId.toString() !== userId &&
                call.calleeId.toString() !== userId
            ) {
                return;
            }

            // Already finalized → do nothing.
            if (
                call.status === "ended" ||
                call.status === "missed" ||
                call.status === "rejected" ||
                call.status === "failed" ||
                call.status === "cancelled"
            ) {
                return;
            }

            const now = new Date();

            const wasConnected =
                call.status === "connected" ||
                call.status === "connecting";

            const finalStatus = wasConnected
                ? "ended"
                : "missed";

            const duration = call.startedAt
                ? Math.max(
                    0,
                    Math.floor(
                        (now.getTime() - call.startedAt.getTime()) / 1000
                    )
                )
                : 0;

            // IMPORTANT:
            // Atomically finalize the call.
            // Only the FIRST request can update it.
            const finalizedCall = await Call.findOneAndUpdate(
                {
                    _id: call._id,
                    status: {
                        $in: ["ringing", "connecting", "connected"],
                    },
                },
                {
                    $set: {
                        endedAt: now,
                        status: finalStatus,
                        duration,
                    },
                },
                {
                    new: true,
                }
            );

            // Another call:end already finalized this call.
            if (!finalizedCall) {
                return;
            }

            cleanupCall(finalizedCall._id.toString());

            await createAndBroadcastMessage({
                conversationId: finalizedCall.conversationId.toString(),
                senderId: finalizedCall.callerId.toString(),
                type: "call",
                callMeta: {
                    callId: finalizedCall._id.toString(),
                    kind: finalizedCall.kind,
                    status: finalStatus,
                    duration: finalizedCall.duration,
                },
                skipRateLimit: true,
                skipPermissionCheck: true,
            });

            io.to(
                userRoom(finalizedCall.callerId.toString())
            ).emit("call:ended", {
                callId: finalizedCall._id,
                reason: "ended",
                duration: finalizedCall.duration,
            });

            io.to(
                userRoom(finalizedCall.calleeId.toString())
            ).emit("call:ended", {
                callId: finalizedCall._id,
                reason: "ended",
                duration: finalizedCall.duration,
            });

        } catch (error) {
            console.log("call:end", error);
        }
    });

    socket.on("call:signal", (data: { callId: string; targetUserId: string; payload: unknown }) => {
        const userId = socket.data.userId;
        const active = activeCalls.get(data.callId);
        if (!active) return;
        if (active.callerId !== userId && active.calleeId !== userId) return;
        if (data.targetUserId !== active.callerId && data.targetUserId !== active.calleeId) return;
        io.to(userRoom(data.targetUserId)).emit("call:signal", {
            callId: data.callId,
            fromUserId: userId,
            payload: data.payload,
        });
    });

    socket.on("disconnect", async () => {
        const userId = socket.data.userId;
        for (const [callId, info] of activeCalls.entries()) {
            if (info.callerId === userId || info.calleeId === userId) {
                const call = await Call.findById(callId);
                if (!call) continue;
                call.status = call.status === "connected" ? "ended" : "failed";
                call.endedAt = new Date();
                await call.save();
                cleanupCall(callId);
                io.to(userRoom(info.callerId)).emit("call:ended", { callId, reason: "disconnected" });
                io.to(userRoom(info.calleeId)).emit("call:ended", { callId, reason: "disconnected" });
            }
        }
    });
}
