import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
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
    attachement: String,
    type: {
        type: String,
        enum: ["text", "image", "video", "voice", "file", "location", "system", "call", "announcement", "poll"],
        default: "text",
        index: true,
    },
    attachmentMeta: {
        url: String,
        name: String,
        mimeType: String,
        size: Number,
        resourceType: { type: String, enum: ["image", "video", "raw", "audio"] },
    },
    location: {
        latitude: Number,
        longitude: Number,
        label: String,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
    reactions: [
        {
            emoji: { type: String, required: true },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            userName: { type: String, required: true },
        },
    ],
    voiceUrl: {
        type: String,
        default: null,
    },
    voiceDuration: {
        type: Number,
        default: 0,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    systemEvent: {
        kind: String,
        actorId: String,
        targetId: String,
        meta: mongoose.Schema.Types.Mixed,
    },
    callMeta: {
        callId: String,
        kind: { type: String, enum: ["voice", "video"] },
        status: { type: String, enum: ["missed", "rejected", "ended", "failed"] },
        duration: { type: Number, default: 0 },
    },
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        default: null,
    },
    // ── NEW: Poll fields ──
    poll: {
        question: { type: String, default: "" },
        options: [
            {
                id: { type: String, required: true },
                text: { type: String, required: true },
                votes: [
                    {
                        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                        userName: { type: String },
                    }
                ],
            }
        ],
        allowMultiple: { type: Boolean, default: false },
        isAnonymous: { type: Boolean, default: false },
        endsAt: { type: Date, default: null },
        isClosed: { type: Boolean, default: false },
    },
}, {
    timestamps: true,
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ content: "text" });
messageSchema.index({ "attachmentMeta.mimeType": 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

const Message = mongoose.model("Message", messageSchema);

export default Message;