import mongoose from "mongoose";

const translationCacheSchema = new mongoose.Schema({
    sourceHash: { type: String, required: true },
    sourceLang: { type: String, default: "auto" },
    targetLang: { type: String, required: true },
    sourceText: { type: String, required: true },
    translatedText: { type: String, required: true },
}, { timestamps: true });

translationCacheSchema.index({ sourceHash: 1, targetLang: 1 }, { unique: true });
translationCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30-day TTL eviction

export default mongoose.model("TranslationCache", translationCacheSchema);
