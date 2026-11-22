import { Request, Response } from "express";
import User from "../modals/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, avatar } = req.body;
    try {
        if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
            res.status(400).json({ success: false, msg: "Invalid input fields" });
            return;
        }

        const trimmedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!trimmedName || trimmedName.length > 70) {
            res.status(400).json({ success: false, msg: "Name must be between 1 and 70 characters" });
            return;
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            res.status(400).json({ success: false, msg: "Please enter a valid email address" });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ success: false, msg: "Password must be at least 6 characters long" });
            return;
        }

        if (password.length > 128) {
            res.status(400).json({ success: false, msg: "Password cannot exceed 128 characters" });
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: { $eq: normalizedEmail } });
        if (existingUser) {
            res.status(400).json({ success: false, msg: "User already exists" });
            return;
        }

        const safeAvatar = typeof avatar === "string" ? avatar.slice(0, 500) : "";

        // Create a new user
        const user = new User({
            email: normalizedEmail,
            password,
            name: trimmedName,
            avatar: safeAvatar,
        });

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save the user
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            token,
        });

    } catch (error) {
        console.error("registerUser error:", error instanceof Error ? error.message : "Unknown error");
        res.status(500).json({ success: false, msg: "Server error during registration" });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ success: false, msg: "Invalid Credentials" });
        return;
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // Find user by normalized email
        const user = await User.findOne({ email: { $eq: normalizedEmail } });
        if (!user) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
        });

    } catch (error) {
        console.error("loginUser error:", error instanceof Error ? error.message : "Unknown error");
        res.status(500).json({ success: false, msg: "Server error during login" });
    }
};
