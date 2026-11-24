import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from 'socket.io';
import { registerUserEvents } from "./useEvents";
import { registerChatEvents } from "./chatEvents";
import { registerGroupEvents } from "./groupEvents";
import { registerCallEvents, handleUserDisconnectCalls } from "./callEvents";
import { registerAppEvents } from "./appEvents";
import Conversation from "../modals/Conversation";
import User from "../modals/User";
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

    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: no token provided"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new Error("Authentication error: server misconfigured"));
        }

        jwt.verify(token, secret, { algorithms: ["HS256"] }, (err: any, decoded: any) => {
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

        try {
            await User.findByIdAndUpdate(userId, {
                isOnline: true,
                lastSeen: null,
            });
        } catch (error) {
            console.log("Error updating online status:", error);
        }

        registerUserEvents(io, socket);
        registerChatEvents(io, socket);
        registerGroupEvents(io, socket);
        registerCallEvents(io, socket);
        registerAppEvents(io, socket);

        try {
            const conversations = await Conversation.find({
                participants: userId
            }).select("_id");

            conversations.forEach(conversation => {
                socket.join(conversation._id.toString());
            });

            const me = await User.findById(userId).select("privacy isOnline lastSeen").lean();
            conversations.forEach(conversation => {
                const status = sanitizeLastSeen("broadcast", me, true);
                socket.to(conversation._id.toString()).emit("userStatus", {
                    userId,
                    isOnline: status.hidden ? false : true,
                    lastSeen: null,
                });
            });

        } catch (error: any) {
            console.log("Error joining conversations:", error);
        }

        socket.on('disconnect', async () => {
            console.log(`user disconnected: ${userId}`);

            // Clean up any pending or ongoing calls for this user
            handleUserDisconnectCalls(io, userId).catch((err) => {
                console.error("Error handling user disconnect calls:", err);
            });

            const lastSeen = new Date();

            try {
                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen,
                });

                const conversations = await Conversation.find({
                    participants: userId
                }).select("_id");

                conversations.forEach(conversation => {
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
