import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "./auth";

/**
 * Optional authentication middleware:
 * If a valid JWT is provided, extracts and sets req.user and req.userId.
 * If not provided or invalid, proceeds without error so unauthenticated crashes/bugs can still be reported.
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        }) as {
            user?: { id?: string; name?: string; email?: string; avatar?: string };
        };

        if (decoded && typeof decoded === "object" && decoded.user?.id) {
            req.user = decoded.user as { id: string; name: string; email: string; avatar?: string };
            req.userId = decoded.user.id;
        }
    } catch {
        // Token was invalid or expired; continue as guest
    }

    next();
}
