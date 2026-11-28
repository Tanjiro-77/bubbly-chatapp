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
import { getAgoraServerConfig } from "../utils/agora";
import { userRoom } from "./io";

interface ActiveCallEntry {
    callerId: string;
    calleeId: string;
    ringingTimer?: NodeJS.Timeout;
    connectingTimer?: NodeJS.Timeout;
}

const activeCalls = new Map<string, ActiveCallEntry>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const CALL_DISCONNECT_GRACE_MS = 10_000;

export function clearDisconnectTimersForUser(userId: string) {
    const prefix = `${userId}:`;
    for (const [key, timer] of disconnectTimers.entries()) {
        if (key.startsWith(prefix)) {
            clearTimeout(timer);
            disconnectTimers.delete(key);
        }
    }
}

function cleanupCall(callId: string) {
    const entry = activeCalls.get(callId);
    if (entry?.ringingTimer) {
        clearTimeout(entry.ringingTimer);
    }
    if (entry?.connectingTimer) {
        clearTimeout(entry.connectingTimer);
    }
    const suffix = `:${callId}`;
    for (const [key, timer] of disconnectTimers.entries()) {
        if (key.endsWith(suffix)) {
            clearTimeout(timer);
            disconnectTimers.delete(key);
        }
    }
    activeCalls.delete(callId);
}

async function notifyUnansweredCall(params: {
    conversationId: string;
    callerId: string;
    calleeId: string;
    callId: string;
    kind: "voice" | "video";
    messageStatus: "missed" | "rejected" | "ended";
    duration?: number;
    sendPush?: boolean;
}) {
    const { conversationId, callerId, calleeId, callId, kind, messageStatus, duration = 0, sendPush = true } = params;
    await createAndBroadcastMessage({
        conversationId,
        senderId: callerId,
        type: "call",
        callMeta: { callId, kind, status: messageStatus, duration },
        skipRateLimit: true,
        skipPermissionCheck: true,
    });

    if (sendPush) {
        const callerDoc = await User.findById(callerId).select("name avatar").lean();
        sendMissedCallPushNotification({
            calleeId,
            callerId,
            callerName: callerDoc?.name || "Someone",
            callerAvatar: callerDoc?.avatar || undefined,
            callId,
            kind,
            conversationId,
        }).catch((err) => console.error("Missed call push error:", err));
    }
}

export async function endCallById(io: SocketIOServer, callId: string, userId: string) {
    const call = await Call.findById(callId);
    if (!call) return null;

    if (call.callerId.toString() !== userId && call.calleeId.toString() !== userId) {
        throw new Error("Not authorized");
    }

    if (["ended", "missed", "rejected", "failed", "cancelled"].includes(call.status)) {
        return call;
    }

    const now = new Date();
    const isCaller = call.callerId.toString() === userId;
    const finalStatus: "ended" | "cancelled" | "missed" =
        call.status === "connected" || (call.status === "connecting" && Boolean(call.startedAt))
            ? "ended"
            : isCaller
            ? "cancelled"
            : "missed";
    const messageStatus: "ended" | "missed" = finalStatus === "ended" ? "ended" : "missed";
    const duration = call.startedAt
        ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
        : 0;

    const finalizedCall = await Call.findOneAndUpdate(
        { _id: call._id, status: { $in: ["ringing", "connecting", "connected"] } },
        { $set: { endedAt: now, status: finalStatus, duration } },
        { new: true }
    );

    if (!finalizedCall) {
        return await Call.findById(callId);
    }

    cleanupCall(finalizedCall._id.toString());

    io.to(userRoom(finalizedCall.callerId.toString())).emit("call:ended", {
        callId: finalizedCall._id.toString(),
        reason: finalStatus,
        duration: finalizedCall.duration,
    });
    io.to(userRoom(finalizedCall.calleeId.toString())).emit("call:ended", {
        callId: finalizedCall._id.toString(),
        reason: finalStatus,
        duration: finalizedCall.duration,
    });

    try {
        await notifyUnansweredCall({
            conversationId: finalizedCall.conversationId.toString(),
            callerId: finalizedCall.callerId.toString(),
            calleeId: finalizedCall.calleeId.toString(),
            callId: finalizedCall._id.toString(),
            kind: finalizedCall.kind,
            messageStatus,
            duration: finalizedCall.duration,
            sendPush: finalStatus === "missed" || finalStatus === "cancelled",
        });
    } catch (err) {
        console.error("Failed to record/notify ended call:", err);
    }

    return finalizedCall;
}

export async function acceptCallById(io: SocketIOServer, callId: string, userId: string) {
    const updatedCall = await Call.findOneAndUpdate(
        { _id: callId, calleeId: userId, status: "ringing" },
        { $set: { status: "connecting" } },
        { new: true }
    );

    if (!updatedCall) {
        const existing = await Call.findById(callId);
        if (!existing || existing.calleeId.toString() !== userId) {
            throw new Error("Call not found");
        }
        if (existing.status === "connecting" || existing.status === "connected") {
            return existing;
        }
        throw new Error(`Call is already ${existing.status}`);
    }

    const entry = activeCalls.get(updatedCall._id.toString());
    if (entry?.ringingTimer) {
        clearTimeout(entry.ringingTimer);
        entry.ringingTimer = undefined;
    }
    if (entry) {
        if (entry.connectingTimer) clearTimeout(entry.connectingTimer);
        entry.connectingTimer = setTimeout(async () => {
            try {
                const stuck = await Call.findOneAndUpdate(
                    { _id: updatedCall._id, status: "connecting" },
                    { $set: { status: "failed", endedAt: new Date(), duration: 0 } },
                    { new: true }
                );
                if (stuck) {
                    cleanupCall(stuck._id.toString());
                    io.to(userRoom(stuck.callerId.toString())).emit("call:ended", { callId: stuck._id, reason: "timeout" });
                    io.to(userRoom(stuck.calleeId.toString())).emit("call:ended", { callId: stuck._id, reason: "timeout" });
                }
            } catch {}
        }, 45_000);
    }

    const channelName = updatedCall._id.toString();
    const callIdStr = updatedCall._id.toString();

    io.to(userRoom(updatedCall.callerId.toString())).emit("call:accepted", {
        callId: callIdStr,
        channelName,
    });
    io.to(userRoom(updatedCall.calleeId.toString())).emit("call:accepted", {
        callId: callIdStr,
        channelName,
    });

    return updatedCall;
}

export async function rejectCallById(io: SocketIOServer, callId: string, userId: string) {
    const updated = await Call.findOneAndUpdate(
        {
            _id: callId,
            $or: [{ calleeId: userId }, { callerId: userId }],
            status: { $in: ["ringing", "connecting"] },
        },
        { $set: { status: "rejected", endedAt: new Date() } },
        { new: true }
    );

    if (!updated) {
        const existing = await Call.findById(callId);
        if (!existing) return null;
        if (existing.calleeId.toString() !== userId && existing.callerId.toString() !== userId) return null;
        return existing;
    }

    cleanupCall(updated._id.toString());

    io.to(userRoom(updated.callerId.toString())).emit("call:ended", { callId: updated._id.toString(), reason: "rejected" });
    io.to(userRoom(updated.calleeId.toString())).emit("call:ended", { callId: updated._id.toString(), reason: "rejected" });

    try {
        await createAndBroadcastMessage({
            conversationId: updated.conversationId.toString(),
            senderId: updated.callerId.toString(),
            type: "call",
            callMeta: { callId: updated._id.toString(), kind: updated.kind, status: "rejected", duration: 0 },
            skipRateLimit: true,
            skipPermissionCheck: true,
        });
    } catch (err) {
        console.error("Failed to record rejected call message:", err);
    }

    return updated;
}

async function finalizeDisconnectedCall(
    io: SocketIOServer,
    callId: string,
    callData: ActiveCallEntry,
    userId: string
) {
    try {
        const stillHasSockets = Array.from(io.sockets.sockets.values()).some(
            (s) => s.data.userId === userId
        );
        if (stillHasSockets || !activeCalls.has(callId)) return;

        const call = await Call.findById(callId);
        if (!call) {
            cleanupCall(callId);
            return;
        }

        // If the callee's stale background socket disconnects while the call is still ringing
        // or connecting (e.g. pushed to wake up the closed app), keep it alive until timeout or answer.
        if (callData.calleeId === userId && (call.status === "ringing" || call.status === "connecting")) {
            return;
        }

        cleanupCall(callId);
        const otherUserId = callData.callerId === userId ? callData.calleeId : callData.callerId;

        if (["ringing", "connecting", "connected"].includes(call.status)) {
            const wasConnected = call.status === "connected";
            const now = new Date();
            const duration = call.startedAt
                ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
                : 0;
            const finalStatus = wasConnected ? "ended" : "failed";
            const finalized = await Call.findOneAndUpdate(
                { _id: call._id, status: { $in: ["ringing", "connecting", "connected"] } },
                { $set: { status: finalStatus, endedAt: now, duration } },
                { new: true }
            );
            if (!finalized) return;

            io.to(userRoom(otherUserId)).emit("call:ended", {
                callId,
                reason: "disconnected",
            });

            try {
                await createAndBroadcastMessage({
                    conversationId: finalized.conversationId.toString(),
                    senderId: finalized.callerId.toString(),
                    type: "call",
                    callMeta: {
                        callId: finalized._id.toString(),
                        kind: finalized.kind,
                        status: finalStatus,
                        duration,
                    },
                    skipRateLimit: true,
                    skipPermissionCheck: true,
                });
            } catch (msgErr) {
                console.error("Failed to record disconnected call message:", msgErr);
            }
            return;
        }

        io.to(userRoom(otherUserId)).emit("call:ended", {
            callId,
            reason: "disconnected",
        });
    } catch (err) {
        console.error("Error finalizing call on disconnect:", err);
    }
}

export async function handleUserDisconnectCalls(io: SocketIOServer, userId: string) {
    const remainingSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => s.data.userId === userId
    );
    if (remainingSockets.length > 0) return;

    for (const [callId, callData] of Array.from(activeCalls.entries())) {
        if (callData.callerId === userId || callData.calleeId === userId) {
            const timerKey = `${userId}:${callId}`;
            if (disconnectTimers.has(timerKey)) continue;

            // Give mobile clients a grace window to reconnect sockets across Wi-Fi/cellular handoffs
            const timer = setTimeout(() => {
                disconnectTimers.delete(timerKey);
                void finalizeDisconnectedCall(io, callId, callData, userId);
            }, CALL_DISCONNECT_GRACE_MS);
            timer.unref?.();
            disconnectTimers.set(timerKey, timer);
        }
    }
}

export function registerCallEvents(io: SocketIOServer, socket: Socket) {
    if (socket.data?.userId) {
        clearDisconnectTimersForUser(socket.data.userId);
    }
    socket.on("call:invite", async (data: {
        conversationId: string;
        calleeId?: string;
        kind: "voice" | "video";
    }) => {
        try {
            const callerId = socket.data.userId;
            if (!data || !["voice", "video"].includes(data.kind)) throw new Error("Invalid call type");
            const { conversation, isMember } = await getMembership(data.conversationId, callerId);
            if (!conversation || !isMember) throw new Error("Conversation not found");

            let resolvedCalleeId = data.calleeId;
            if ((!resolvedCalleeId || !isValidObjectId(resolvedCalleeId)) && conversation.type === "direct") {
                const other = conversation.participants.find((p) => p.toString() !== callerId.toString());
                if (other) resolvedCalleeId = other.toString();
            }

            if (!resolvedCalleeId || !isValidObjectId(resolvedCalleeId) || resolvedCalleeId === callerId) {
                throw new Error("Invalid callee");
            }
            if (!conversation.participants.some((p) => p.toString() === resolvedCalleeId)) {
                throw new Error("User is not in this conversation");
            }
            if (await areBlocked(callerId, resolvedCalleeId)) throw new Error("Unable to call this user");

            const calleeSockets = Array.from(io.sockets.sockets.values()).filter(
                (s) => s.data.userId === resolvedCalleeId
            );
            const calleeUser = await User.findById(resolvedCalleeId)
                .select("pushTokens notificationsEnabled isOnline")
                .lean();
            const hasPushTokens =
                calleeUser?.notificationsEnabled !== false &&
                Array.isArray(calleeUser?.pushTokens) &&
                calleeUser.pushTokens.some(isValidExpoPushToken);
            const recentlyOnline = Boolean(calleeUser?.isOnline);

            if (calleeSockets.length === 0 && !hasPushTokens && !recentlyOnline) {
                const missed = await Call.create({
                    conversationId: data.conversationId,
                    callerId,
                    calleeId: resolvedCalleeId,
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
                    skipPermissionCheck: true,
                });
                socket.emit("call:failed", { success: false, msg: "User is unavailable", callId: missed._id.toString(), reason: "offline" });
                return;
            }

            const agora = getAgoraServerConfig();
            if (!agora.ready) {
                socket.emit("call:failed", {
                    success: false,
                    msg: "Voice & video calls are unavailable: Agora is not configured on the server.",
                    reason: "not_configured",
                });
                return;
            }

            const existing = [...activeCalls.values()].find(
                (c) => c.callerId === resolvedCalleeId || c.calleeId === resolvedCalleeId || c.callerId === callerId || c.calleeId === callerId
            );
            if (existing) {
                socket.emit("call:failed", { success: false, msg: "User is busy", reason: "busy" });
                return;
            }

            const call = await Call.create({
                conversationId: data.conversationId,
                callerId,
                calleeId: resolvedCalleeId,
                kind: data.kind,
                status: "ringing",
            });

            const callerName = socket.data.name || "Someone";

            // Auto-timeout ringing after 60 seconds if no answer
            const ringingTimer = setTimeout(async () => {
                try {
                    const pendingCall = await Call.findOneAndUpdate(
                        { _id: call._id, status: "ringing" },
                        { $set: { status: "missed", endedAt: new Date() } },
                        { new: true }
                    );
                    if (pendingCall) {
                        cleanupCall(call._id.toString());

                        io.to(userRoom(resolvedCalleeId!)).emit("call:ended", { callId: call._id.toString(), reason: "timeout" });
                        io.to(userRoom(callerId)).emit("call:ended", { callId: call._id.toString(), reason: "timeout" });

                        await notifyUnansweredCall({
                            conversationId: pendingCall.conversationId.toString(),
                            callerId,
                            calleeId: resolvedCalleeId!,
                            callId: pendingCall._id.toString(),
                            kind: data.kind,
                            messageStatus: "missed",
                            sendPush: true,
                        });
                    }
                } catch (timeoutErr) {
                    console.error("Error timing out ringing call:", timeoutErr);
                }
            }, 60_000);

            activeCalls.set(call._id.toString(), { callerId, calleeId: resolvedCalleeId, ringingTimer });

            const payload = {
                callId: call._id.toString(),
                conversationId: data.conversationId,
                kind: data.kind,
                caller: { id: callerId, name: callerName, avatar: socket.data.avatar },
                calleeId: resolvedCalleeId,
            };

            if (calleeSockets.length > 0) {
                io.to(userRoom(resolvedCalleeId)).emit("call:incoming", payload);
            }

            if (hasPushTokens) {
                sendCallPushNotification({
                    calleeId: resolvedCalleeId,
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
            const call = await Call.findOneAndUpdate(
                { _id: data.callId, callerId: userId, status: { $in: ["ringing", "connecting"] } },
                { $set: { status: "cancelled", endedAt: new Date() } },
                { new: true }
            );
            if (!call) return;
            cleanupCall(call._id.toString());
            io.to(userRoom(call.calleeId.toString())).emit("call:ended", { callId: call._id.toString(), reason: "cancelled" });
            io.to(userRoom(call.callerId.toString())).emit("call:ended", { callId: call._id.toString(), reason: "cancelled" });
            try {
                await notifyUnansweredCall({
                    conversationId: call.conversationId.toString(),
                    callerId: call.callerId.toString(),
                    calleeId: call.calleeId.toString(),
                    callId: call._id.toString(),
                    kind: call.kind,
                    messageStatus: "missed",
                    sendPush: true,
                });
            } catch (notifyErr) {
                console.error("Failed to record cancelled call message:", notifyErr);
            }
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
            const entry = activeCalls.get(call._id.toString());
            if (entry?.ringingTimer) {
                clearTimeout(entry.ringingTimer);
                entry.ringingTimer = undefined;
            }
            if (entry?.connectingTimer) {
                clearTimeout(entry.connectingTimer);
                entry.connectingTimer = undefined;
            }
            call.status = "connected";
            call.startedAt = call.startedAt || new Date();
            await call.save();
            io.to(userRoom(call.callerId.toString())).emit("call:connected", { callId: call._id.toString() });
            io.to(userRoom(call.calleeId.toString())).emit("call:connected", { callId: call._id.toString() });
        } catch (error) {
            console.log("call:connected", error);
        }
    });

    socket.on("call:end", async (data: { callId: string }) => {
        try {
            const userId = socket.data.userId;
            if (!data?.callId || !isValidObjectId(data.callId)) return;
            await endCallById(io, data.callId, userId);
        } catch (error) {
            console.log("call:end", error);
        }
    });

    socket.on("call:signal", (data: { callId: string; targetUserId: string; payload: unknown }) => {
        if (!data?.callId || !data?.targetUserId) return;
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
