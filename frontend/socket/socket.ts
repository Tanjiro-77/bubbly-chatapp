import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from 'socket.io-client';
import { API_URL } from "../constants";

let socket: Socket | null = null;
let connectInFlight: Promise<Socket> | null = null;
const connectionSubscribers = new Set<(connected: boolean) => void>();
const persistentListeners = new Map<string, Set<(...args: any[]) => void>>();

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

function bindAllPersistentListeners(target: Socket) {
    persistentListeners.forEach((handlers, event) => {
        handlers.forEach((fn) => {
            target.off(event, fn);
            target.on(event, fn);
        });
    });
}

export function addSocketListener(event: string, fn: (...args: any[]) => void): void {
    let set = persistentListeners.get(event);
    if (!set) {
        set = new Set();
        persistentListeners.set(event, set);
    }
    set.add(fn);
    if (socket) {
        socket.off(event, fn);
        socket.on(event, fn);
    }
}

export function removeSocketListener(event: string, fn: (...args: any[]) => void): void {
    const set = persistentListeners.get(event);
    if (set) {
        set.delete(fn);
        if (set.size === 0) persistentListeners.delete(event);
    }
    if (socket) {
        socket.off(event, fn);
    }
}

export async function connectSocket(): Promise<Socket> {
    if (connectInFlight) return connectInFlight;

    connectInFlight = (async () => {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
            throw new Error("no token found. User must login first");
        }

        // If socket exists and is already connected, ensure listeners are bound and return it
        if (socket && socket.connected) {
            bindAllPersistentListeners(socket);
            return socket;
        }

        // If socket exists but disconnected, reconnect immediately with current token
        if (socket && !socket.connected) {
            socket.auth = { token };
            bindAllPersistentListeners(socket);
            socket.connect();
            return socket;
        }

        const created = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 15000,
        });
        socket = created;

        bindAllPersistentListeners(created);

        created.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            emitConnectionStatus(false);
        });

        created.on('connect', () => {
            console.log('Socket connected:', created.id);
            bindAllPersistentListeners(created);
            emitConnectionStatus(true);
        });

        // Wait briefly for initial connection so app never freezes on offline/slow launch
        await new Promise((resolve) => {
            if (created.connected) {
                resolve(true);
                return;
            }
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, 6000);

            created.once("connect", () => {
                clearTimeout(timeoutId);
                resolve(true);
            });

            created.once("connect_error", (err) => {
                clearTimeout(timeoutId);
                console.log("Initial socket connect_error:", err.message);
                resolve(false);
            });
        });

        return created;
    })();

    try {
        return await connectInFlight;
    } finally {
        connectInFlight = null;
    }
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
