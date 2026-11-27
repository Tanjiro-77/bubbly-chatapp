import { Schema, model } from "mongoose";
import { UserProps } from "../types";

const userSchema = new Schema<UserProps>({
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: false,
        default: "",
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true,
    },
    phoneNumber: {
        type: String,
        sparse: true,
        unique: true,
        index: true,
        trim: true,
    },
    authProvider: {
        type: String,
        enum: ["local", "google", "phone"],
        default: "local",
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
    pushTokens: { type: [String], default: [] },
    notificationsEnabled: { type: Boolean, default: true },
    callRingtone: {
        type: String,
        enum: ["incoming_call", "incoming_call_2", "incoming_call_3", "incoming_call_4"],
        default: "incoming_call",
    },
    theme: {
        mode: { type: String, enum: ["light", "dark", "system"], default: "system" },
        accent: { type: String, default: "#facc15" },
        wallpaper: { type: String, default: "" },
        bubbleStyle: { type: String, enum: ["rounded", "sharp", "minimal"], default: "rounded" },
    },
    appPreferences: {
        type: Schema.Types.Mixed,
        default: {},
    },
    customStatus: {
        emoji: { type: String, default: "" },
        text: { type: String, default: "" },
        updatedAt: { type: Date, default: null },
    },
});

userSchema.index({ name: "text", email: "text" });
userSchema.index({ pushTokens: 1 });

export default model<UserProps>("User", userSchema);
