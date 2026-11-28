import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";

async function fetchJsonWithRetry(
    path: string,
    options: {
        method?: "GET" | "POST";
        body?: Record<string, unknown>;
        timeoutMs?: number;
        retries?: number;
        fallbackErrorMsg: string;
    }
): Promise<{ ok: boolean; status: number; data: any }> {
    const {
        method = "GET",
        body,
        timeoutMs = 8000,
        retries = 2,
        fallbackErrorMsg,
    } = options;

    const token = await AsyncStorage.getItem("token");
    if (!token) {
        return {
            ok: false,
            status: 401,
            data: { success: false, msg: "Authentication token not found" },
        };
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${API_URL}${path}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
                signal: controller.signal,
            });
            clearTimeout(timer);

            const rawText = await response.text();
            let parsed: any = null;
            if (rawText) {
                try {
                    parsed = JSON.parse(rawText);
                } catch {
                    parsed = { success: false, msg: fallbackErrorMsg };
                }
            } else {
                parsed = { success: response.ok, msg: response.ok ? undefined : fallbackErrorMsg };
            }

            if (
                (response.status === 502 || response.status === 503 || response.status === 504) &&
                parsed?.code !== "AGORA_NOT_CONFIGURED" &&
                attempt < retries
            ) {
                await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
                continue;
            }

            return { ok: response.ok, status: response.status, data: parsed };
        } catch (error: any) {
            clearTimeout(timer);
            if (attempt < retries) {
                await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
                continue;
            }
            const msg = error?.name === "AbortError" ? "Call server request timed out" : fallbackErrorMsg;
            return {
                ok: false,
                status: 0,
                data: { success: false, msg },
            };
        }
    }

    return { ok: false, status: 0, data: { success: false, msg: fallbackErrorMsg } };
}

export const getAgoraToken = async (
    callId: string,
    channelName: string
) => {
    try {
        const { ok, data } = await fetchJsonWithRetry("/api/call/token", {
            method: "POST",
            body: { callId, channelName },
            timeoutMs: 12000,
            retries: 2,
            fallbackErrorMsg: "Failed to get Agora token",
        });

        if (!ok) {
            return {
                success: false,
                msg: data?.msg || "Failed to get Agora token",
            };
        }

        const hasTokenOrAppIdOnly =
            typeof data?.data?.token === "string" &&
            (data.data.token.length > 0 || data?.data?.appIdOnly === true);

        if (
            !data?.success ||
            !hasTokenOrAppIdOnly ||
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
    const { ok, data } = await fetchJsonWithRetry(`/api/call/history?page=${page}`, {
        method: "GET",
        timeoutMs: 8000,
        retries: 1,
        fallbackErrorMsg: "Failed to get call history",
    });
    if (!ok) {
        return { success: false, msg: data?.msg || "Failed to get call history" };
    }
    return data;
};

async function callActionRequest(
    path: string,
    method: "GET" | "POST" = "GET",
    options?: { timeoutMs?: number; retries?: number }
) {
    const { status, data } = await fetchJsonWithRetry(path, {
        method,
        timeoutMs: options?.timeoutMs ?? 8000,
        retries: options?.retries ?? 2,
        fallbackErrorMsg: "Call request failed",
    });
    return data && typeof data === "object" ? { ...data, httpStatus: status } : data;
}

export const getCallStatus = (callId: string) =>
    callActionRequest(`/api/call/${callId}/status`, "GET", { timeoutMs: 5000, retries: 0 });

export const getPendingIncomingCall = () =>
    callActionRequest(`/api/call/pending`, "GET");

export const acceptCallHttp = (callId: string) =>
    callActionRequest(`/api/call/${callId}/accept`, "POST");

export const rejectCallHttp = (callId: string) =>
    callActionRequest(`/api/call/${callId}/reject`, "POST");

export const endCallHttp = (callId: string) =>
    callActionRequest(`/api/call/${callId}/end`, "POST");