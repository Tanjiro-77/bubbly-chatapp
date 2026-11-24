import { io, Socket } from "socket.io-client";
import { API_URL } from "../constants";

let socket: Socket | null = null;

export function connectSocket(): Promise<Socket> {
  const token = localStorage.getItem("bubbly_token");
  if (!token) {
    return Promise.reject(new Error("No token found. User must login first"));
  }

  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Bubbly Web] Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Bubbly Web] Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Bubbly Web] Socket connection error:", err.message);
    });
  }

  return new Promise((resolve) => {
    if (socket?.connected) {
      resolve(socket);
    } else {
      socket?.once("connect", () => {
        resolve(socket!);
      });
    }
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return !!socket && socket.connected;
}
