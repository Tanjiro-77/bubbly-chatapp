import { Request, Response } from "express";
import User from "../modals/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token";
import { normalizePhone, getLast10Digits } from "./contact.controller";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, avatar, phoneNumber } = req.body ?? {};
        if (typeof password !== "string" || typeof name !== "string") {
            res.status(400).json({ success: false, msg: "Invalid input fields" });
            return;
        }

        const hasEmail = typeof email === "string" && email.trim().length > 0;
        const hasPhone = typeof phoneNumber === "string" && phoneNumber.trim().length > 0;

        if (!hasEmail || !hasPhone) {
            res.status(400).json({
                success: false,
                msg: !hasEmail && !hasPhone
                    ? "Both email and phone number are required"
                    : !hasEmail
                    ? "Email address is required"
                    : "Phone number is required so friends can find you",
            });
            return;
        }

        const trimmedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const cleanedPhone = normalizePhone(phoneNumber);

        if (!trimmedName || trimmedName.length > 70) {
            res.status(400).json({ success: false, msg: "Name must be between 1 and 70 characters" });
            return;
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            res.status(400).json({ success: false, msg: "Please enter a valid email address" });
            return;
        }

        if (cleanedPhone.length < 7 || cleanedPhone.length > 18) {
            res.status(400).json({ success: false, msg: "Phone number must be between 7 and 18 digits" });
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

        if (normalizedEmail) {
            const existingEmail = await User.findOne({ email: { $eq: normalizedEmail } });
            if (existingEmail) {
                res.status(400).json({ success: false, msg: "An account with this email already exists" });
                return;
            }
        }

        if (cleanedPhone) {
            const l10 = getLast10Digits(cleanedPhone);
            const phoneQuery: any[] = [{ phoneNumber: { $eq: cleanedPhone } }];
            if (l10.length >= 10) {
                phoneQuery.push({ phoneNumber: { $regex: `${l10}$` } });
            }
            const existingPhone = await User.findOne({ $or: phoneQuery });
            if (existingPhone) {
                res.status(400).json({ success: false, msg: "This phone number is already registered" });
                return;
            }
        }

        const safeAvatar = typeof avatar === "string" ? avatar.slice(0, 500) : "";

        // Create user with both email and phone number required for reliable contact discovery
        const userDoc: any = {
            email: normalizedEmail,
            phoneNumber: cleanedPhone,
            password,
            name: trimmedName,
            avatar: safeAvatar,
            authProvider: "local",
        };

        const user = new User(userDoc);

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

    } catch (error: any) {
        console.error("registerUser error:", error instanceof Error ? error.message : "Unknown error");
        if (error?.code === 11000) {
            res.status(400).json({ success: false, msg: "An account with this email or phone number already exists" });
            return;
        }
        res.status(500).json({ success: false, msg: "Server error during registration" });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, phoneNumber, password } = req.body ?? {};

        if (typeof password !== "string" || (!password)) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }
        let user = null;
        if (typeof phoneNumber === "string" && phoneNumber.trim()) {
            const cleaned = normalizePhone(phoneNumber);
            if (cleaned.length < 7 || cleaned.length > 18) {
                res.status(400).json({ success: false, msg: "Please enter a valid phone number" });
                return;
            }
            const l10 = getLast10Digits(cleaned);
            const phoneConditions: any[] = [{ phoneNumber: { $eq: cleaned } }];
            if (l10.length >= 10) {
                phoneConditions.push({ phoneNumber: { $regex: `${l10}$` } });
            }
            user = await User.findOne({ $or: phoneConditions });
        } else if (typeof email === "string" && email.trim()) {
            const normalizedEmail = email.trim().toLowerCase();
            // Also allow entering a phone number inside the email field as convenience
            if (!normalizedEmail.includes("@") && /^\+?[\d\s\-()]{7,18}$/.test(email.trim())) {
                const cleaned = normalizePhone(email);
                const l10 = getLast10Digits(cleaned);
                const phoneConditions: any[] = [{ phoneNumber: { $eq: cleaned } }];
                if (l10.length >= 10) phoneConditions.push({ phoneNumber: { $regex: `${l10}$` } });
                user = await User.findOne({ $or: phoneConditions });
            } else {
                user = await User.findOne({ email: { $eq: normalizedEmail } });
            }
        } else {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        if (!user) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // Compare passwords
        if (!user.password) {
            res.status(400).json({ success: false, msg: "Please sign in using Google" });
            return;
        }

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

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken, accessToken, email: bodyEmail, name: bodyName, avatar: bodyAvatar, googleId: bodyGoogleId } = req.body ?? {};

        let email: string | undefined;
        let name: string | undefined;
        let avatar: string | undefined;
        let googleId: string | undefined;
        let verifiedByGoogle = false;

        const allowedAudiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_ANDROID_CLIENT_ID,
            process.env.GOOGLE_IOS_CLIENT_ID,
        ]
            .filter(Boolean)
            .flatMap((val) => String(val).split(",").map((s) => s.trim()))
            .filter(Boolean);

        // 1. Verify Google ID Token if supplied
        if (typeof idToken === "string" && idToken.trim()) {
            const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`);
            if (!gRes.ok) {
                res.status(401).json({ success: false, msg: "Invalid or expired Google ID token" });
                return;
            }
            const gData: any = await gRes.json();
            if (gData.email_verified !== true && gData.email_verified !== "true") {
                res.status(401).json({ success: false, msg: "Google email is not verified" });
                return;
            }
            if (allowedAudiences.length > 0 && (!gData.aud || !allowedAudiences.includes(gData.aud))) {
                res.status(401).json({ success: false, msg: "Google token audience mismatch" });
                return;
            }
            email = gData.email;
            name = gData.name;
            avatar = gData.picture;
            googleId = gData.sub;
            verifiedByGoogle = true;
        }
        // 2. Otherwise verify Google OAuth Access Token if supplied
        else if (typeof accessToken === "string" && accessToken.trim()) {
            const trimmedAccess = accessToken.trim();
            if (allowedAudiences.length > 0) {
                const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(trimmedAccess)}`);
                if (!infoRes.ok) {
                    res.status(401).json({ success: false, msg: "Invalid or expired Google access token" });
                    return;
                }
                const infoData: any = await infoRes.json();
                const aud = infoData.aud || infoData.azp;
                if (!aud || !allowedAudiences.includes(aud)) {
                    res.status(401).json({ success: false, msg: "Google access token audience mismatch" });
                    return;
                }
            }
            const uRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
                headers: { Authorization: `Bearer ${trimmedAccess}` },
            });
            if (!uRes.ok) {
                res.status(401).json({ success: false, msg: "Invalid or expired Google access token" });
                return;
            }
            const uData: any = await uRes.json();
            if (uData.verified_email !== true && uData.verified_email !== "true") {
                res.status(401).json({ success: false, msg: "Google email is not verified" });
                return;
            }
            email = uData.email;
            name = uData.name;
            avatar = uData.picture;
            googleId = uData.id;
            verifiedByGoogle = true;
        }

        // 3. Only permit raw body fallback when explicitly opted in during development
        if (!verifiedByGoogle) {
            const allowDevFallback =
                process.env.ALLOW_DEV_GOOGLE_AUTH === "true" &&
                process.env.NODE_ENV === "development";
            if (!allowDevFallback) {
                res.status(401).json({ success: false, msg: "Verified Google token is required" });
                return;
            }
            email = bodyEmail;
            name = bodyName;
            avatar = bodyAvatar;
            googleId = bodyGoogleId;
        }

        if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
            res.status(400).json({ success: false, msg: "Valid email is required for Google authentication" });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = typeof name === "string" && name.trim() ? name.trim().slice(0, 70) : "Google User";
        const safeAvatar = typeof avatar === "string" ? avatar.slice(0, 500) : "";
        const cleanGoogleId = typeof googleId === "string" && googleId.trim() ? googleId.trim() : undefined;

        // Check if user exists by googleId or email
        let user = await User.findOne({
            $or: [
                ...(cleanGoogleId ? [{ googleId: { $eq: cleanGoogleId } }] : []),
                { email: { $eq: normalizedEmail } }
            ]
        });

        if (user) {
            let updated = false;
            if (cleanGoogleId && !user.googleId) {
                user.googleId = cleanGoogleId;
                updated = true;
            }
            if (!user.avatar && safeAvatar) {
                user.avatar = safeAvatar;
                updated = true;
            }
            if (updated) {
                await user.save();
            }
        } else {
            user = new User({
                email: normalizedEmail,
                name: trimmedName,
                avatar: safeAvatar,
                googleId: cleanGoogleId,
                authProvider: "google",
                password: "",
            });
            await user.save();
        }

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber,
            }
        });
    } catch (error: any) {
        console.error("googleAuth error:", error instanceof Error ? error.message : "Unknown error");
        if (error?.code === 11000) {
            res.status(400).json({ success: false, msg: "An account with this email or Google ID already exists" });
            return;
        }
        res.status(500).json({ success: false, msg: "Google authentication failed" });
    }
};
