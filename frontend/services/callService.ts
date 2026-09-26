import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";

export const getAgoraToken = async (
    callId: string,
    channelName: string
) => {
    try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
            return {
                success: false,
                msg: "Authentication token not found",
            };
        }

        const response = await fetch(`${API_URL}/api/call/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                callId,
                channelName,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                msg: data?.msg || "Failed to get Agora token",
            };
        }

        if (
            !data?.success ||
            !data?.data?.token ||
            !data?.data?.appId ||
            !data?.data?.channelName ||
            typeof data?.data?.uid !== "number"
        ) {
            return {
                success: false,
                msg: data?.msg || "Invalid Agora token response",
            };
        }

        return data;
    } catch (error) {
        console.error("getAgoraToken error:", error);

        return {
            success: false,
            msg: "Failed to get token",
        };
    }
};

export const getCallHistory = async (page = 0) => {
    try {
        const token = await AsyncStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/call/history?page=${page}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, msg: "Failed to get call history" };
    }
};