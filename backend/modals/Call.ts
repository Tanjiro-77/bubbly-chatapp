import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true,
    },
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    calleeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    kind: { type: String, enum: ["voice", "video"], required: true },
    status: {
        type: String,
        enum: ["ringing", "connecting", "connected", "ended", "rejected", "missed", "failed", "cancelled"],
        default: "ringing",
        index: true,
    },
    startedAt: Date,
    endedAt: Date,
    duration: { type: Number, default: 0 },
}, { timestamps: true });

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ calleeId: 1, createdAt: -1 });

export default mongoose.model("Call", callSchema);
