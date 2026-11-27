import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Server as SocketIOServer, Socket } from 'socket.io';
import { registerUserEvents } from "./useEvents";
import { registerChatEvents } from "./chatEvents";
import { registerGroupEvents } from "./groupEvents";
import { registerCallEvents, handleUserDisconnectCalls } from "./callEvents";
import { registerAppEvents } from "./appEvents";
import Conversation from "../modals/Conversation";
import User from "../modals/User";
import Call from "../modals/Call";
import { setIO, userRoom } from "./io";
import { sanitizeLastSeen } from "../utils/permissions";

dotenv.config();

export function intializeSocket(server: any): SocketIOServer {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
        : "*";

    const io = new SocketIOServer(server, {
        cors: { origin: allowedOrigins },
        pingTimeout: 20000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e7,
        connectTimeout: 45000,
    });
    setIO(io);

    // Clear stale online flags & abandoned calls left behind by an unclean shutdown
    if (mongoose.connection.readyState === 1) {
        const now = new Date();
        User.updateMany({ isOnline: true }, { isOnline: false, lastSeen: now }).catch(() => {});
        Call.updateMany(
            { status: { $in: ["ringing", "connecting", "connected"] } },
            { status: "failed", endedAt: now }
        ).catch(() => {});
    }

    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: no token provided"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new Error("Authentication error: server misconfigured"));
        }

        jwt.verify(token, secret, { algorithms: ["HS256"], ignoreExpiration: true }, (err: any, decoded: any) => {
            if (err || !decoded?.user?.id) {
                return next(new Error("Authentication error: invalid token"));
            }
            let userData = decoded.user;
            socket.data = { ...userData, userId: userData.id };
            next();
        });
    });

    io.on('connection', async (socket: Socket) => {
        const userId = socket.data.userId;
        console.log(`User connected: ${userId}, username: ${socket.data.name}`);

        socket.join(userRoom(userId));

        registerUserEvents(io, socket);
        registerChatEvents(io, socket);
        registerGroupEvents(io, socket);
        registerCallEvents(io, socket);
        registerAppEvents(io, socket);

        try {
            const [, conversations, me] = await Promise.all([
                User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: null,
                }),
                Conversation.find({ participants: userId }).select("_id type").lean(),
                User.findById(userId).select("privacy isOnline lastSeen").lean(),
            ]);

            conversations.forEach(conversation => {
                socket.join(conversation._id.toString());
            });

            if (me) {
                const visibility = me.privacy?.lastSeen || "everyone";
                conversations.forEach(conversation => {
                    const isContact = conversation.type === "direct";
                    const status = sanitizeLastSeen("broadcast", me, isContact);
                    if (!status.hidden) {
                        socket.to(conversation._id.toString()).emit("userStatus", {
                            userId,
                            isOnline: visibility === "nobody" ? false : true,
                            lastSeen: null,
                        });
                    }
                });
            }

        } catch (error: any) {
            console.log("Error initializing user session:", error);
        }

        // Re-deliver any still-ringing incoming call that arrived while this user was reconnecting
        try {
            const pendingCall: any = await Call.findOne({
                calleeId: userId,
                status: "ringing",
                createdAt: { $gte: new Date(Date.now() - 65_000) },
            })
                .populate("callerId", "name avatar")
                .sort({ createdAt: -1 })
                .lean();

            if (pendingCall) {
                const callerDoc = pendingCall.callerId as any;
                socket.emit("call:incoming", {
                    callId: pendingCall._id.toString(),
                    conversationId: pendingCall.conversationId.toString(),
                    kind: pendingCall.kind,
                    caller: {
                        id: callerDoc?._id ? callerDoc._id.toString() : pendingCall.callerId.toString(),
                        name: callerDoc?.name || "Someone",
                        avatar: callerDoc?.avatar || "",
                    },
                    calleeId: userId,
                });
            }
        } catch (callErr) {
            console.log("Error checking pending calls on connect:", callErr);
        }

        socket.on('disconnect', async () => {
            console.log(`user disconnected: ${userId}`);

            // Clean up any pending or ongoing calls for this user
            handleUserDisconnectCalls(io, userId).catch((err) => {
                console.error("Error handling user disconnect calls:", err);
            });

            // Only mark offline if user has no remaining connected sockets
            const remainingSockets = Array.from(io.sockets.sockets.values()).filter(
                (s) => s.id !== socket.id && s.data.userId === userId
            );
            if (remainingSockets.length > 0) {
                return;
            }

            const lastSeen = new Date();

            try {
                const updated = await User.findByIdAndUpdate(
                    userId,
                    { isOnline: false, lastSeen },
                    { new: true }
                ).select("privacy").lean();

                const visibility = updated?.privacy?.lastSeen || "everyone";
                if (visibility === "nobody") return;

                const conversations = await Conversation.find({
                    participants: userId
                }).select("_id type").lean();

                conversations.forEach(conversation => {
                    if (visibility === "contacts" && conversation.type !== "direct") return;
                    socket.to(conversation._id.toString()).emit("userStatus", {
                        userId,
                        isOnline: false,
                        lastSeen: lastSeen.toISOString(),
                    });
                });

            } catch (error) {
                console.log("Error updating offline status:", error);
            }
        });
    });

    return io;
}
