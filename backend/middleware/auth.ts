import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
    user?: { id: string; name: string; email: string; avatar?: string };
}

export type VerifiedTokenUser = { id: string; name: string; email: string; avatar?: string };

/** Extract and verify a Bearer JWT user payload without enforcing token expiry. */
export function extractBearerUser(authHeader?: string):
    | { ok: true; user: VerifiedTokenUser }
    | { ok: false; status: 401 | 500; msg: string } {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) {
        return { ok: false, status: 401, msg: "Unauthorized" };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET environment variable is not defined");
        return { ok: false, status: 500, msg: "Server authentication configuration error" };
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
            ignoreExpiration: true,
        }) as {
            user?: Partial<VerifiedTokenUser>;
        };

        if (!decoded || typeof decoded !== "object" || !decoded.user?.id) {
            return { ok: false, status: 401, msg: "Invalid token payload" };
        }

        return { ok: true, user: decoded.user as VerifiedTokenUser };
    } catch {
        return { ok: false, status: 401, msg: "Invalid token" };
    }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const result = extractBearerUser(req.headers.authorization);
    if (!result.ok) {
        res.status(result.status).json({ success: false, msg: result.msg });
        return;
    }

    req.user = result.user;
    req.userId = result.user.id;
    next();
}
