import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../modals/User";
import { generateToken } from "../utils/token";

/**
 * Normalizes phone numbers by stripping whitespace, dashes, brackets, etc.
 * Preserves leading '+' for international numbers.
 */
export const normalizePhone = (raw: string): string => {
    if (!raw || typeof raw !== "string") return "";
    const trimmed = raw.trim();
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";
    return hasPlus ? `+${digits}` : digits;
};

/**
 * Extracts the last 10 digits of a phone number for regional/national matching
 * (e.g. +91 98765 43210 vs 9876543210).
 */
export const getLast10Digits = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
};

/**
 * Sync phone contacts against registered Bubbly users.
 * POST /api/contacts/sync
 */
export const syncContacts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { phoneNumbers } = req.body;

        if (!Array.isArray(phoneNumbers)) {
            res.status(400).json({ success: false, msg: "phoneNumbers must be an array of strings" });
            return;
        }

        // Limit maximum batch size to prevent abuse
        const rawList = phoneNumbers.slice(0, 1500);

        // Normalize all phone numbers and collect their last 10 digits
        const cleanedSet = new Set<string>();
        const last10Set = new Set<string>();

        for (const num of rawList) {
            if (typeof num === "string") {
                const cleaned = normalizePhone(num);
                if (cleaned.length >= 7) {
                    cleanedSet.add(cleaned);
                    const l10 = getLast10Digits(cleaned);
                    if (l10.length >= 10) {
                        last10Set.add(l10);
                    }
                }
            }
        }

        if (cleanedSet.size === 0) {
            res.json({
                success: true,
                matchedContacts: [],
                totalMatched: 0,
            });
            return;
        }

        const cleanedArray = Array.from(cleanedSet);
        const last10Array = Array.from(last10Set);

        // Build regex array for last 10 digits matching to handle country code differences
        const regexConditions = last10Array.map(l10 => ({
            phoneNumber: { $regex: `${l10}$` }
        }));

        // Find matching registered users (excluding the requester)
        const matchedUsers = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { phoneNumber: { $in: cleanedArray } },
                ...regexConditions,
            ],
        })
        .select("_id name avatar email phoneNumber isOnline lastSeen")
        .lean();

        const formatted = matchedUsers.map(u => ({
            id: u._id.toString(),
            _id: u._id.toString(),
            name: u.name,
            avatar: u.avatar || null,
            email: u.email,
            phoneNumber: u.phoneNumber,
            isOnline: !!u.isOnline,
            lastSeen: u.lastSeen || null,
        }));

        res.json({
            success: true,
            matchedContacts: formatted,
            totalMatched: formatted.length,
        });
    } catch (error) {
        console.error("syncContacts error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to sync contacts" });
    }
};

/**
 * Update user phone number.
 * PUT /api/user/phone
 */
export const updatePhoneNumber = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { phoneNumber } = req.body ?? {};

        if (typeof phoneNumber !== "string") {
            res.status(400).json({ success: false, msg: "Please provide a valid phone number" });
            return;
        }

        const cleaned = normalizePhone(phoneNumber);
        if (cleaned.length < 7 || cleaned.length > 18) {
            res.status(400).json({ success: false, msg: "Phone number must be between 7 and 18 digits" });
            return;
        }

        const l10 = getLast10Digits(cleaned);
        const phoneConditions: any[] = [{ phoneNumber: { $eq: cleaned } }];
        if (l10.length >= 10) {
            phoneConditions.push({ phoneNumber: { $regex: `${l10}$` } });
        }

        // Check if phone number (or last-10-digits match) is already taken by another user
        const existing = await User.findOne({
            _id: { $ne: req.userId },
            $or: phoneConditions,
        });

        if (existing) {
            res.status(400).json({ success: false, msg: "This phone number is already linked to another Bubbly account" });
            return;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { phoneNumber: cleaned },
            { new: true }
        ).select("_id name email avatar phoneNumber");

        if (!user) {
            res.status(404).json({ success: false, msg: "User not found" });
            return;
        }

        const token = generateToken(user);

        res.json({
            success: true,
            msg: "Phone number updated successfully",
            phoneNumber: user.phoneNumber,
            token,
            user,
        });
    } catch (error) {
        console.error("updatePhoneNumber error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to update phone number" });
    }
};

/**
 * Find a registered Bubbly user by exact phone number (WhatsApp-style direct lookup).
 * POST /api/contacts/find
 */
export const findUserByPhone = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { phoneNumber } = req.body ?? {};
        if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
            res.status(400).json({ success: false, msg: "Phone number is required" });
            return;
        }

        const cleaned = normalizePhone(phoneNumber);
        if (cleaned.length < 7 || cleaned.length > 18) {
            res.status(400).json({ success: false, msg: "Enter a valid phone number (7-18 digits)" });
            return;
        }

        const l10 = getLast10Digits(cleaned);
        const conditions: any[] = [{ phoneNumber: { $eq: cleaned } }];
        if (l10.length >= 10) {
            conditions.push({ phoneNumber: { $regex: `${l10}$` } });
        }

        const user = await User.findOne({
            _id: { $ne: req.userId },
            $or: conditions,
        })
            .select("_id name avatar email phoneNumber isOnline lastSeen")
            .lean();

        if (!user) {
            res.status(404).json({ success: false, msg: "No Bubbly account found with this phone number" });
            return;
        }

        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                _id: user._id.toString(),
                name: user.name,
                avatar: user.avatar || null,
                email: user.email,
                phoneNumber: user.phoneNumber,
                isOnline: !!user.isOnline,
                lastSeen: user.lastSeen || null,
            },
        });
    } catch (error) {
        console.error("findUserByPhone error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to look up phone number" });
    }
};
