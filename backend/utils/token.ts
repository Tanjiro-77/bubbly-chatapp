import jwt from "jsonwebtoken";
import { UserProps } from "../types";

export const generateToken = (user: UserProps) => {
    const payload = {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
        }
    };

    return jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: "30d",
    });
};