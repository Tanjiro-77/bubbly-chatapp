import jwt from "jsonwebtoken";
import { UserProps } from "../types";

export const generateToken = (user: UserProps | any) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is missing");
    }

    const userId = user.id || user._id?.toString();
    const payload = {
        user: {
            id: userId,
            name: user.name,
            email: user.email,
            avatar: user.avatar || "",
            phoneNumber: user.phoneNumber || "",
            customStatus: user.customStatus || undefined,
            theme: user.theme || undefined,
        }
    };

    // Persistent session token with no automatic 30-day expiration
    return jwt.sign(payload, secret, {
        algorithm: "HS256",
    });
};