/**
 * Better Auth Configuration
 *
 * Human auth for the managed platform.
 * - Google sign-in (default)
 * - Email/password (fallback)
 * - Session management
 * - Linked to Hanzi workspace model
 *
 * Better Auth handles: user accounts, sessions, OAuth.
 * Hanzi handles: workspaces, API keys, browser sessions, tasks, billing.
 */
export declare function createAuth(): any;
/**
 * Resolve a Better Auth session cookie to workspace info.
 * Returns { userId, workspaceId } or null.
 * Uses direct DB lookup (same reason as resolveSessionProfile).
 */
export declare function resolveSessionToWorkspace(req: import("http").IncomingMessage): Promise<{
    userId: string;
    workspaceId: string;
} | null>;
/**
 * Resolve session to full profile (user name, email, workspace name).
 * Used by GET /v1/me for the developer console.
 *
 * Uses direct DB lookup instead of auth.api.getSession() because
 * Better Auth's cookie reading fails behind Caddy reverse proxy
 * (cookie prefix mismatch between set and read paths).
 */
export declare function resolveSessionProfile(req: import("http").IncomingMessage): Promise<{
    userId: string;
    workspaceId: string;
    userName: string;
    userEmail: string;
    workspaceName: string;
    plan: string;
} | null>;
