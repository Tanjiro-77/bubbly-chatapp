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
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
    });

    socket.on("connect", () => {
      console.log("[Bubbly Web] Socket connected:", socket?.id);
      // Immediately request all core data upon connection!
      socket?.emit("getConversations", null);
      socket?.emit("getContacts", null);
      socket?.emit("getStories", null);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Bubbly Web] Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Bubbly Web] Socket connection error:", err.message);
    });
  }

  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not initialized"));
      return;
    }
    if (socket.connected) {
      resolve(socket);
      return;
    }
    const s = socket;
    const onConnect = () => {
      s.off("connect_error", onError);
      resolve(s);
    };
    const onError = (err: Error) => {
      s.off("connect", onConnect);
      reject(err);
    };
    s.once("connect", onConnect);
    s.once("connect_error", onError);
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
