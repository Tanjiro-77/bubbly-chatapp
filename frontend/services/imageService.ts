import axios from "axios";
import { Platform } from "react-native";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../constants";
import { ResponseProps } from "../types";
import { bytesToBase64, decryptBytesForE2EE, encryptBytesForE2EE } from "../utils/e2ee";

const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_AUDIO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_RAW_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export const getResourceType = (
    mimeType: string
): "image" | "video" | "raw" | "audio" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "raw";
};

const getCloudinaryUrl = (resourceType: string): string => {
    switch (resourceType) {
        case "image": return CLOUDINARY_IMAGE_URL;
        case "video": return CLOUDINARY_VIDEO_URL;
        case "audio": return CLOUDINARY_AUDIO_URL;
        default: return CLOUDINARY_RAW_URL;
    }
};

export const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎬";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("sheet")) return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📑";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "🗜️";
    return "📎";
};

export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const inferImageMime = (uri: string, fallback = "image/jpeg"): string => {
    const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "gif") return "image/gif";
    if (ext === "heic" || ext === "heif") return "image/heic";
    return fallback;
};

async function appendUploadFile(formData: FormData, uri: string, type: string, name: string) {
    if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("file", blob, name);
    } else {
        formData.append("file", { uri, type, name } as any);
    }
}

// ─────────────────────────────────────────────
// UPLOAD IMAGE
// ─────────────────────────────────────────────
export const uploadFileToCloudinary = async (
    file: { uri?: string; mimeType?: string; name?: string } | string,
    folderName: string,
): Promise<ResponseProps> => {
    try {
        if (!file) return { success: true, data: null };
        if (typeof file === "string") return { success: true, data: file };

        if (file && file.uri) {
            const formData = new FormData();
            const fileName = file.name || file.uri.split("/").pop() || "file.jpg";
            const mimeType = file.mimeType || inferImageMime(file.uri);
            await appendUploadFile(formData, file.uri, mimeType, fileName);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            formData.append("folder", folderName);

            const response = await axios.post(CLOUDINARY_IMAGE_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            return { success: true, data: response?.data?.secure_url };
        }

        return { success: true, data: null };
    } catch (error: any) {
        console.log("uploadFileToCloudinary error:", error);
        return { success: false, msg: error.message || "Could not upload file" };
    }
};

// ─────────────────────────────────────────────
// UPLOAD AUDIO
// ─────────────────────────────────────────────
export const uploadAudioToCloudinary = async (
    uri: string,
    folderName: string = "voice-messages",
): Promise<ResponseProps> => {
    try {
        const formData = new FormData();
        const isWebAudio = Platform.OS === "web";
        await appendUploadFile(
            formData,
            uri,
            isWebAudio ? "audio/webm" : "audio/m4a",
            `voice_${Date.now()}.${isWebAudio ? "webm" : "m4a"}`
        );
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folderName);
        formData.append("resource_type", "video");

        const response = await axios.post(CLOUDINARY_AUDIO_URL, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return { success: true, data: response?.data?.secure_url };
    } catch (error: any) {
        console.log("uploadAudioToCloudinary error:", error);
        return { success: false, msg: error.message || "Could not upload audio" };
    }
};

// ─────────────────────────────────────────────
// NEW: UPLOAD ANY DOCUMENT / FILE
// ─────────────────────────────────────────────
export const uploadDocumentToCloudinary = async (
    uri: string,
    mimeType: string,
    fileName: string,
    folderName: string = "chat-files",
): Promise<ResponseProps> => {
    try {
        const resourceType = getResourceType(mimeType);
        const cloudinaryUrl = getCloudinaryUrl(resourceType);

        const formData = new FormData();
        await appendUploadFile(formData, uri, mimeType, fileName);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folderName);

        if (resourceType === "raw") {
            formData.append("resource_type", "raw");
        }

        const response = await axios.post(cloudinaryUrl, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return {
            success: true,
            data: {
                url: response?.data?.secure_url,
                name: fileName,
                mimeType,
                size: response?.data?.bytes || 0,
                resourceType,
            },
        };
    } catch (error: any) {
        console.log("uploadDocumentToCloudinary error:", error);
        return { success: false, msg: error.message || "Could not upload file" };
    }
};

async function uriToUint8Array(uri: string): Promise<Uint8Array> {
    const res = await fetch(uri);
    if (typeof res.arrayBuffer === "function") {
        const ab = await res.arrayBuffer();
        return new Uint8Array(ab);
    }
    const blob = await res.blob();
    const ab = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error || new Error("Failed to read file bytes"));
        reader.readAsArrayBuffer(blob);
    });
    return new Uint8Array(ab);
}

export const uploadEncryptedFileToCloudinary = async (
    uri: string,
    folderName: string = "e2ee-media"
): Promise<{ success: boolean; data?: { url: string; fileKey: string; fileNonce: string; size: number }; msg?: string }> => {
    try {
        const plainBytes = await uriToUint8Array(uri);
        const { encryptedBytes, fileKey, fileNonce } = encryptBytesForE2EE(plainBytes);

        const formData = new FormData();
        if (Platform.OS === "web") {
            const blob = new Blob([encryptedBytes as unknown as BlobPart], { type: "application/octet-stream" });
            formData.append("file", blob, `enc_${Date.now()}.bin`);
        } else {
            const b64 = bytesToBase64(encryptedBytes);
            formData.append("file", `data:application/octet-stream;base64,${b64}`);
        }
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folderName);
        formData.append("resource_type", "raw");

        const response = await axios.post(CLOUDINARY_RAW_URL, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return {
            success: true,
            data: {
                url: response?.data?.secure_url,
                fileKey,
                fileNonce,
                size: plainBytes.length,
            },
        };
    } catch (error: any) {
        console.log("uploadEncryptedFileToCloudinary error:", error);
        return { success: false, msg: error?.message || "Could not upload encrypted file" };
    }
};

export const downloadAndDecryptE2EEFile = async (
    url: string,
    fileKey: string,
    fileNonce: string,
    mimeType: string = "application/octet-stream"
): Promise<string | null> => {
    try {
        const encBytes = await uriToUint8Array(url);
        const plain = decryptBytesForE2EE(encBytes, fileKey, fileNonce);
        if (!plain) return null;
        if (Platform.OS === "web") {
            const blob = new Blob([plain as unknown as BlobPart], { type: mimeType });
            return URL.createObjectURL(blob);
        }
        return `data:${mimeType};base64,${bytesToBase64(plain)}`;
    } catch {
        return null;
    }
};

// ─────────────────────────────────────────────
// AVATAR HELPER (existing — unchanged)
// ─────────────────────────────────────────────
export const getAvatarPath = (file: any, isGroup = false) => {
    if (file && typeof file === "string") return file;
    if (file && typeof file === "object") return file.uri;
    if (isGroup) return require("../assets/images/defaultGroupAvatar.png");
    return require("../assets/images/defaultAvatar.png");
};