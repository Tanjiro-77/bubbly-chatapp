import { Server as SocketIOServer } from "socket.io";

let ioRef: SocketIOServer | null = null;

export function setIO(io: SocketIOServer) {
    ioRef = io;
}

export function getIO(): SocketIOServer {
    if (!ioRef) throw new Error("Socket.IO not initialized");
    return ioRef;
}

export function userRoom(userId: string) {
    return `user:${userId}`;
}
