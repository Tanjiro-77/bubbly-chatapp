import mongoose from "mongoose";

const scheduledMessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    content: { type: String, default: "" },
    type: { type: String, default: "text" },
    attachement: String,
    attachmentMeta: mongoose.Schema.Types.Mixed,
    location: mongoose.Schema.Types.Mixed,
    voiceUrl: String,
    voiceDuration: Number,
    sendAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: "UTC" },
    status: {
        type: String,
        enum: ["pending", "sent", "cancelled", "failed"],
        default: "pending",
        index: true,
    },
    sentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    error: String,
}, { timestamps: true });

scheduledMessageSchema.index({ status: 1, sendAt: 1 });

export default mongoose.model("ScheduledMessage", scheduledMessageSchema);
