import { Response, NextFunction } from "express";
import { AuthRequest, extractBearerUser } from "./auth";

/**
 * Optional authentication middleware:
 * If a valid JWT is provided, extracts and sets req.user and req.userId.
 * If not provided or invalid, proceeds without error so unauthenticated crashes/bugs can still be reported.
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const result = extractBearerUser(req.headers.authorization);
    if (result.ok) {
        req.user = result.user;
        req.userId = result.user.id;
    }
    next();
}
