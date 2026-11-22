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

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            user: { id: string; name: string; email: string; avatar?: string };
        };
        req.user = decoded.user;
        req.userId = decoded.user.id;
        next();
    } catch {
        res.status(401).json({ success: false, msg: "Invalid token" });
    }
}
