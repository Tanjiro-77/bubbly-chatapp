import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from 'socket.io-client';
import { API_URL } from "../constants";

let socket: Socket | null = null;
const connectionSubscribers = new Set<(connected: boolean) => void>();

export function subscribeSocketStatus(handler: (connected: boolean) => void): () => void {
    connectionSubscribers.add(handler);
    return () => {
        connectionSubscribers.delete(handler);
    };
}

function emitConnectionStatus(connected: boolean) {
    connectionSubscribers.forEach((fn) => {
        try { fn(connected); } catch {}
    });
}

export async function connectSocket(): Promise<Socket> {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
        throw new Error("no token found. User must login first");
    }

    // If socket exists but disconnected, reconnect immediately with current token
    if (socket && !socket.connected) {
        socket.auth = { token };
        socket.connect();
        return socket;
    }

    if (!socket) {
        socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 15000,
        });

        // Wait for initial connection with a 6-second timeout race so app never freezes on launch
        await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, 6000);

            socket?.once("connect", () => {
                clearTimeout(timeoutId);
                console.log("Socket connected:", socket?.id);
                emitConnectionStatus(true);
                resolve(true);
            });

            socket?.once("connect_error", (err) => {
                clearTimeout(timeoutId);
                console.log("Initial socket connect_error:", err.message);
                resolve(false);
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            emitConnectionStatus(false);
        });

        socket.on('connect', () => {
            console.log('Socket reconnected:', socket?.id);
            emitConnectionStatus(true);
        });
    }

    return socket;
}

export function getSocket(): Socket | null {
    return socket;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
        emitConnectionStatus(false);
    }
}
