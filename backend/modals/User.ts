import { Schema, model } from "mongoose";
import { UserProps } from "../types";

const userSchema = new Schema<UserProps>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        index: true,
    },
    avatar: {
        type: String,
        default: "",
    },
    created: {
        type: Date,
        default: Date.now,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
        default: null,
    },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    privacy: {
        lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
        readReceipts: { type: Boolean, default: true },
        typingIndicators: { type: Boolean, default: true },
        storyPrivacy: { type: String, enum: ["everyone", "contacts", "except"], default: "everyone" },
        storyHiddenFrom: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    isModerator: { type: Boolean, default: false },
    recentSearches: { type: [String], default: [] },
    theme: {
        mode: { type: String, enum: ["light", "dark", "system"], default: "system" },
        accent: { type: String, default: "#facc15" },
        wallpaper: { type: String, default: "" },
        bubbleStyle: { type: String, enum: ["rounded", "sharp"], default: "rounded" },
    },
});

userSchema.index({ name: "text", email: "text" });

export default model<UserProps>("User", userSchema);
