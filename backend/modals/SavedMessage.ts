import mongoose from "mongoose";

const savedMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        required: true,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    note: { type: String, default: "" },
}, { timestamps: true });

savedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
savedMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("SavedMessage", savedMessageSchema);
