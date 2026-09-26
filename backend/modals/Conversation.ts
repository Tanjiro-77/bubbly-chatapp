import { Schema, model } from "mongoose";
import { ConversationProps } from "../types";
import crypto from "crypto";

const ConversationSchema = new Schema<ConversationProps>({
    type: {
        type: String,
        enum: ["direct", "group"],
        required: true,
        index: true,
    },
    name: { type: String, index: true },
    description: { type: String, default: "" },
    participants: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    ],
    admins: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: "Message",
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    avatar: {
        type: String,
        default: "",
    },
    unreadCounts: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            count: {
                type: Number,
                default: 0,
            },
        },
    ],
    permissions: {
        sendMessages: { type: String, enum: ["all", "admins"], default: "all" },
        editInfo: { type: String, enum: ["all", "admins"], default: "admins" },
        addMembers: { type: String, enum: ["all", "admins"], default: "admins" },
    },
    inviteCode: { type: String, unique: true, sparse: true, index: true },
    disappearingSeconds: { type: Number, default: 0 },
    wallpaper: { type: String, default: "" },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

ConversationSchema.pre("save", function () {
    this.updatedAt = new Date();
    if (this.type === "group" && !this.inviteCode) {
        this.inviteCode = crypto.randomBytes(6).toString("hex");
    }
});

ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ name: "text", description: "text" });

export default model<ConversationProps>("Conversation", ConversationSchema);
