import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
    user?: { id: string; name: string; email: string; avatar?: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET environment variable is not defined");
        res.status(500).json({ success: false, msg: "Server authentication configuration error" });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        }) as {
            user?: { id?: string; name?: string; email?: string; avatar?: string };
        };

        if (!decoded || typeof decoded !== "object" || !decoded.user?.id) {
            res.status(401).json({ success: false, msg: "Invalid token payload" });
            return;
        }

        req.user = decoded.user as { id: string; name: string; email: string; avatar?: string };
        req.userId = decoded.user.id;
        next();
    } catch {
        res.status(401).json({ success: false, msg: "Invalid token" });
    }
}
