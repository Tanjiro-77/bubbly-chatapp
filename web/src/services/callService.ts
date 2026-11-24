import { API_URL } from "../constants";

export const getAgoraToken = async (callId: string, channelName: string) => {
  try {
    const token = localStorage.getItem("bubbly_token");
    if (!token) return { success: false, msg: "Auth token not found" };

    const res = await fetch(`${API_URL}/api/call/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ callId, channelName }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, msg: err.message || "Failed to fetch Agora token" };
  }
};

export const getCallHistory = async (page = 0) => {
  try {
    const token = localStorage.getItem("bubbly_token");
    const res = await fetch(`${API_URL}/api/call/history?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, msg: "Failed to fetch call history" };
  }
};
