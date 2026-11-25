import { Server as SocketIOServer, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import Call from "../modals/Call";
import User from "../modals/User";
import { areBlocked, getMembership } from "../utils/permissions";
import { createAndBroadcastMessage } from "../services/messageService";
import {
    isValidExpoPushToken,
    sendCallPushNotification,
    sendMissedCallPushNotification,
} from "../services/pushNotificationService";
import { userRoom } from "./io";

interface ActiveCallEntry {
    callerId: string;
    calleeId: string;
    ringingTimer?: NodeJS.Timeout;
}

const activeCalls = new Map<string, ActiveCallEntry>();

function cleanupCall(callId: string) {
    const entry = activeCalls.get(callId);
    if (entry?.ringingTimer) {
        clearTimeout(entry.ringingTimer);
    }
    activeCalls.delete(callId);
}

export async function acceptCallById(io: SocketIOServer, callId: string, userId: string) {
    const call = await Call.findById(callId);
    if (!call || call.calleeId.toString() !== userId) {
        throw new Error("Call not found");
    }
    if (!["ringing", "connecting"].includes(call.status)) {
        throw new Error(`Call is already ${call.status}`);
    }

    const entry = activeCalls.get(call._id.toString());
    if (entry?.ringingTimer) {
        clearTimeout(entry.ringingTimer);
        entry.ringingTimer = undefined;
    }

    call.status = "connecting";
    await call.save();

    const channelName = call._id.toString();

    io.to(userRoom(call.callerId.toString())).emit("call:accepted", {
        callId: call._id,
        channelName,
    });
    io.to(userRoom(call.calleeId.toString())).emit("call:accepted", {
        callId: call._id,
        channelName,
    });

    return call;
}

export async function rejectCallById(io: SocketIOServer, callId: string, userId: string) {
    const call = await Call.findById(callId);
    if (!call) return null;
    if (call.calleeId.toString() !== userId && call.callerId.toString() !== userId) return null;
    if (!["ringing", "connecting"].includes(call.status)) return call;

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

    return call;
}

export async function handleUserDisconnectCalls(io: SocketIOServer, userId: string) {
    const remainingSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => s.data.userId === userId
    );
    if (remainingSockets.length > 0) return;

    for (const [callId, callData] of Array.from(activeCalls.entries())) {
        if (callData.callerId === userId || callData.calleeId === userId) {
            try {
                const call = await Call.findById(callId);
                if (!call) {
                    cleanupCall(callId);
                    continue;
                }

                // If the callee's stale background socket disconnects while the call is still ringing
                // (e.g. pushed to wake up the closed app), keep ringing until timeout or answer.
                if (callData.calleeId === userId && call.status === "ringing") {
                    continue;
                }

                cleanupCall(callId);
                const otherUserId = callData.callerId === userId ? callData.calleeId : callData.callerId;

                if (["ringing", "connecting", "connected"].includes(call.status)) {
                    const wasConnected = call.status === "connected";
                    const now = new Date();
                    const duration = call.startedAt
                        ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
                        : 0;
                    call.status = wasConnected ? "ended" : "failed";
                    call.endedAt = now;
                    call.duration = duration;
                    await call.save();

                    await createAndBroadcastMessage({
                        conversationId: call.conversationId.toString(),
                        senderId: call.callerId.toString(),
                        type: "call",
                        callMeta: {
                            callId: call._id.toString(),
                            kind: call.kind,
                            status: wasConnected ? "ended" : "failed",
                            duration,
                        },
                        skipRateLimit: true,
                        skipPermissionCheck: true,
                    });
                }

                io.to(userRoom(otherUserId)).emit("call:ended", {
                    callId,
                    reason: "disconnected",
                });
            } catch (err) {
                console.error("Error finalizing call on disconnect:", err);
            }
        }
    }
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
            const calleeUser = await User.findById(data.calleeId)
                .select("pushTokens notificationsEnabled")
                .lean();
            const hasPushTokens =
                calleeUser?.notificationsEnabled !== false &&
                Array.isArray(calleeUser?.pushTokens) &&
                calleeUser.pushTokens.some(isValidExpoPushToken);

            if (calleeSockets.length === 0 && !hasPushTokens) {
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

            const callerName = socket.data.name || "Someone";

            // Auto-timeout ringing after 60 seconds if no answer
            const ringingTimer = setTimeout(async () => {
                try {
                    const pendingCall = await Call.findById(call._id);
                    if (pendingCall && pendingCall.status === "ringing") {
                        pendingCall.status = "missed";
                        pendingCall.endedAt = new Date();
                        await pendingCall.save();
                        cleanupCall(call._id.toString());

                        await createAndBroadcastMessage({
                            conversationId: pendingCall.conversationId.toString(),
                            senderId: callerId,
                            type: "call",
                            callMeta: { callId: pendingCall._id.toString(), kind: data.kind, status: "missed", duration: 0 },
                            skipRateLimit: true,
                            skipPermissionCheck: true,
                        });

                        sendMissedCallPushNotification({
                            calleeId: data.calleeId,
                            callerName,
                            callId: pendingCall._id.toString(),
                            kind: data.kind,
                            conversationId: pendingCall.conversationId.toString(),
                        }).catch((err) => console.error("Missed call push error:", err));

                        io.to(userRoom(data.calleeId)).emit("call:ended", { callId: call._id, reason: "timeout" });
                        io.to(userRoom(callerId)).emit("call:ended", { callId: call._id, reason: "timeout" });
                    }
                } catch (timeoutErr) {
                    console.error("Error timing out ringing call:", timeoutErr);
                }
            }, 60_000);

            activeCalls.set(call._id.toString(), { callerId, calleeId: data.calleeId, ringingTimer });

            const payload = {
                callId: call._id,
                conversationId: data.conversationId,
                kind: data.kind,
                caller: { id: callerId, name: callerName, avatar: socket.data.avatar },
                calleeId: data.calleeId,
            };

            if (calleeSockets.length > 0) {
                io.to(userRoom(data.calleeId)).emit("call:incoming", payload);
            }

            if (hasPushTokens) {
                sendCallPushNotification({
                    calleeId: data.calleeId,
                    caller: { id: callerId, name: callerName, avatar: socket.data.avatar },
                    callId: call._id.toString(),
                    kind: data.kind,
                    conversationId: data.conversationId,
                }).catch((err) => console.error("Call push notification error:", err));
            }

            socket.emit("call:ringing", payload);
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message || "Could not start call" });
        }
    });

    socket.on("call:accept", async (data: { callId: string }) => {
        try {
            if (!data?.callId || !isValidObjectId(data.callId)) throw new Error("Invalid callId");
            await acceptCallById(io, data.callId, socket.data.userId);
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message || "Could not accept call" });
        }
    });

    socket.on("call:reject", async (data: { callId: string }) => {
        try {
            if (!data?.callId || !isValidObjectId(data.callId)) return;
            await rejectCallById(io, data.callId, socket.data.userId);
        } catch (error: any) {
            socket.emit("call:failed", { success: false, msg: error.message });
        }
    });

    socket.on("call:cancel", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.callId || !isValidObjectId(data.callId)) return;
            const call = await Call.findById(data.callId);
            if (!call || call.callerId.toString() !== userId) return;
            if (!["ringing", "connecting"].includes(call.status)) return;
            call.status = "cancelled";
            call.endedAt = new Date();
            await call.save();
            cleanupCall(call._id.toString());
            io.to(userRoom(call.calleeId.toString())).emit("call:ended", { callId: call._id, reason: "cancelled" });
            io.to(userRoom(call.callerId.toString())).emit("call:ended", { callId: call._id, reason: "cancelled" });
        } catch (error) {
            console.log("call:cancel", error);
        }
    });

    socket.on("call:connected", async (data: { callId: string }) => {
        try {
            if (!data?.callId || !isValidObjectId(data.callId)) return;
            const call = await Call.findById(data.callId);
            if (!call) return;
            const userId = socket.data.userId;
            if (call.callerId.toString() !== userId && call.calleeId.toString() !== userId) return;
            if (!["ringing", "connecting", "connected"].includes(call.status)) return;
            call.status = "connected";
            call.startedAt = call.startedAt || new Date();
            await call.save();
            io.to(userRoom(call.callerId.toString())).emit("call:connected", { callId: call._id });
            io.to(userRoom(call.calleeId.toString())).emit("call:connected", { callId: call._id });
        } catch (error) {
            console.log("call:connected", error);
        }
    });

    socket.on("call:end", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.callId || !isValidObjectId(data.callId)) return;

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
}
