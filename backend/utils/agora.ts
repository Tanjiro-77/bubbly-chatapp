import { createHash } from "crypto";

export interface AgoraServerConfig {
    ready: boolean;
    appId: string;
    appCertificate: string;
    appIdOnly: boolean;
    missingReason?: string;
}

function cleanEnvValue(raw?: string): string {
    const trimmed = (raw || "").trim();
    if (!trimmed || /^your_/i.test(trimmed) || /placeholder|changeme/i.test(trimmed)) {
        return "";
    }
    return trimmed;
}

/**
 * Resolves and validates server-side Agora credentials.
 * Rejects empty or placeholder values (e.g. `your_agora_app_id_here`).
 * Set `AGORA_ALLOW_APP_ID_ONLY=true` only when the Agora project is in Testing Mode without a Primary Certificate.
 */
export function getAgoraServerConfig(): AgoraServerConfig {
    const appId = cleanEnvValue(process.env.AGORA_APP_ID) || cleanEnvValue(process.env.EXPO_PUBLIC_AGORA_APP_ID);
    const appCertificate = cleanEnvValue(process.env.AGORA_APP_CERTIFICATE);
    const appIdOnly = process.env.AGORA_ALLOW_APP_ID_ONLY === "true";

    if (!appId) {
        return {
            ready: false,
            appId: "",
            appCertificate: "",
            appIdOnly: false,
            missingReason: "AGORA_APP_ID is not configured on the server",
        };
    }

    if (!appCertificate && !appIdOnly) {
        return {
            ready: false,
            appId,
            appCertificate: "",
            appIdOnly: false,
            missingReason: "AGORA_APP_CERTIFICATE is not configured on the server",
        };
    }

    return {
        ready: true,
        appId,
        appCertificate,
        appIdOnly: !appCertificate && appIdOnly,
    };
}

/**
 * Derives a deterministic positive signed 31-bit integer UID from a user ID
 * so Agora's int32 SDK UID matches across client & token.
 */
export function getAgoraUid(userId: string): number {
    const hash = createHash("sha256")
        .update(userId)
        .digest();

    const uid = hash.readUInt32BE(0) & 0x7fffffff;

    return uid === 0 ? 1 : uid;
}
