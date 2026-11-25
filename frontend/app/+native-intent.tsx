/**
 * Intercepts native deep-link Intents before Expo Router navigates.
 * Returning null on active AuthSession callbacks (oauthredirect) prevents Expo Router
 * from showing "Unmatched Route" while expo-auth-session finishes the Google OAuth flow.
 */
export function redirectSystemPath({
    path,
    initial,
}: {
    path: string;
    initial: boolean;
}) {
    try {
        if (path && (path.includes("oauthredirect") || path.includes("oauth2redirect"))) {
            return initial ? "/" : null;
        }
    } catch {
        return "/";
    }
    return path;
}
