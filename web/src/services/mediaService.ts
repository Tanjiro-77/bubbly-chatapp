import axios from "axios";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../constants";
import { ResponseProps, AttachmentMetaProps } from "../types";

const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_AUDIO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_RAW_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

export const getResourceType = (mimeType: string): "image" | "video" | "raw" | "audio" => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "raw";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const uploadMediaToCloudinary = async (
  file: File | Blob,
  fileName: string = "upload.bin",
  folderName: string = "bubbly-web"
): Promise<ResponseProps> => {
  try {
    const mimeType = file.type || "application/octet-stream";
    const resourceType = getResourceType(mimeType);

    let uploadUrl = CLOUDINARY_RAW_URL;
    if (resourceType === "image") uploadUrl = CLOUDINARY_IMAGE_URL;
    else if (resourceType === "video") uploadUrl = CLOUDINARY_VIDEO_URL;
    else if (resourceType === "audio") uploadUrl = CLOUDINARY_AUDIO_URL;

    const formData = new FormData();
    formData.append("file", file, fileName);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folderName);

    if (resourceType === "raw") {
      formData.append("resource_type", "raw");
    }

    const response = await axios.post(uploadUrl, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data: AttachmentMetaProps = {
      url: response?.data?.secure_url,
      name: fileName,
      mimeType,
      size: response?.data?.bytes || file.size || 0,
      resourceType,
    };

    return { success: true, data };
  } catch (error: any) {
    console.error("Cloudinary upload failed:", error);
    return {
      success: false,
      msg: error?.response?.data?.error?.message || error?.message || "Upload failed",
    };
  }
};
