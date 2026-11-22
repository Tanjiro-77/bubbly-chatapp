import axios from "axios";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../constants";
import { ResponseProps } from "../types";

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

// ─────────────────────────────────────────────
// UPLOAD IMAGE (existing — unchanged)
// ─────────────────────────────────────────────
export const uploadFileToCloudinary = async (
    file: { uri?: string } | string,
    folderName: string,
): Promise<ResponseProps> => {
    try {
        if (!file) return { success: true, data: null };
        if (typeof file === "string") return { success: true, data: file };

        if (file && file.uri) {
            const formData = new FormData();
            formData.append("file", {
                uri: file.uri,
                type: "image/jpeg",
                name: file.uri.split('/').pop() || "file.jpg",
            } as any);
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
// UPLOAD AUDIO (existing — unchanged)
// ─────────────────────────────────────────────
export const uploadAudioToCloudinary = async (
    uri: string,
    folderName: string = "voice-messages",
): Promise<ResponseProps> => {
    try {
        const formData = new FormData();
        formData.append("file", {
            uri,
            type: "audio/m4a",
            name: `voice_${Date.now()}.m4a`,
        } as any);
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
        formData.append("file", {
            uri,
            type: mimeType,
            name: fileName,
        } as any);
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

// ─────────────────────────────────────────────
// AVATAR HELPER (existing — unchanged)
// ─────────────────────────────────────────────
export const getAvatarPath = (file: any, isGroup = false) => {
    if (file && typeof file === "string") return file;
    if (file && typeof file === "object") return file.uri;
    if (isGroup) return require("../assets/images/defaultGroupAvatar.png");
    return require("../assets/images/defaultAvatar.png");
};