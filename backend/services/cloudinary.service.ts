import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload an image (base64 data URI or remote URL) to Cloudinary
 * @param imageUri base64 string or image URI
 * @param folder Cloudinary folder name
 * @returns Secure URL of the uploaded image
 */
export async function uploadImageToCloudinary(imageUri: string, folder: string = "bubbly_reports"): Promise<string> {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
            console.warn("Cloudinary is not fully configured in environment variables.");
            return imageUri; // fallback: return data URI as-is if Cloudinary is unconfigured
        }

        const uploadResponse = await cloudinary.uploader.upload(imageUri, {
            folder,
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
        });

        return uploadResponse.secure_url;
    } catch (error) {
        console.error("Failed to upload image to Cloudinary:", error);
        throw new Error("Image upload failed");
    }
}

export default cloudinary;
