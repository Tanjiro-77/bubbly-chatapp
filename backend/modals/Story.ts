import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["text", "image", "video"],
        required: true,
    },
    text: { type: String, default: "" },
    backgroundColor: { type: String, default: "#1c1917" },
    mediaUrl: { type: String, default: "" },
    viewers: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            viewedAt: { type: Date, default: Date.now },
        },
    ],
    reactions: [
        {
            emoji: { type: String, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            userName: { type: String, required: true },
        },
    ],
    hiddenFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Story", storySchema);
