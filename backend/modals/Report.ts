import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    targetType: {
        type: String,
        enum: ["user", "message", "group"],
        required: true,
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    targetConversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    category: {
        type: String,
        enum: ["spam", "harassment", "hate", "nudity", "violence", "scam", "other"],
        required: true,
    },
    description: { type: String, default: "" },
    status: {
        type: String,
        enum: ["open", "reviewed", "actioned", "dismissed"],
        default: "open",
        index: true,
    },
    moderatorNote: String,
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
