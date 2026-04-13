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
import { betterAuth } from "better-auth";
import pg from "pg";
import { log } from "./log.js";
const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || "";
// Shared pool for workspace provisioning queries (separate from Better Auth's pool)
let provisionPool = null;
function getProvisionPool() {
    if (!provisionPool) {
        provisionPool = new Pool({ connectionString: DATABASE_URL, max: 3 });
    }
    return provisionPool;
}
// Singleton — created once, reused across all requests
let authInstance = null;
let authInitialized = false;
export function createAuth() {
    if (authInitialized)
        return authInstance;
    authInitialized = true;
    if (!DATABASE_URL) {
        log.info("No DATABASE_URL — Better Auth disabled");
        return null;
    }
    const authSecret = process.env.BETTER_AUTH_SECRET;
    if (!authSecret) {
        if (process.env.NODE_ENV === "production") {
            log.error("FATAL: BETTER_AUTH_SECRET not set — sessions lost on restart");
            process.exit(1);
        }
        log.warn("BETTER_AUTH_SECRET not set — sessions invalidated on restart");
    }
    authInstance = betterAuth({
        database: new Pool({ connectionString: DATABASE_URL, max: 5 }),
        secret: authSecret,
        baseURL: process.env.BETTER_AUTH_URL || "https://api.hanzilla.co",
        emailAndPassword: {
            enabled: true,
        },
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID || "",
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            },
        },
        basePath: "/api/auth",
        advanced: {
            useSecureCookies: true, // Behind Caddy reverse proxy — force consistent __Secure- prefix
        },
        trustedOrigins: [
            "https://browse.hanzilla.co",
            "https://api.hanzilla.co",
            "http://localhost:3000",
            "http://localhost:3456",
        ],
        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        // Auto-provision workspace when a new user is created
                        const userId = user.id;
                        if (!userId)
                            return;
                        const client = await getProvisionPool().connect();
                        try {
                            await client.query("BEGIN");
                            const wsRes = await client.query("INSERT INTO workspaces (name) VALUES ($1) RETURNING id", [`${user.name || "My"}'s Workspace`]);
                            const workspaceId = wsRes.rows[0].id;
                            await client.query("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')", [workspaceId, userId]);
                            await client.query("COMMIT");
                            log.info("Provisioned workspace", { workspaceId }, { userId });
                        }
                        catch (err) {
                            await client.query("ROLLBACK").catch(() => { });
                            log.error("Workspace provisioning error", undefined, { error: err.message });
                        }
                        finally {
                            client.release();
                        }
                    },
                },
            },
        },
    });
    log.info("Better Auth initialized");
    return authInstance;
}
/**
 * Resolve a Better Auth session cookie to workspace info.
 * Returns { userId, workspaceId } or null.
 * Uses direct DB lookup (same reason as resolveSessionProfile).
 */
export async function resolveSessionToWorkspace(req) {
    try {
        const cookieHeader = req.headers.cookie || '';
        const tokenMatch = cookieHeader.match(/better-auth[.\-]session_token=([^;]+)/);
        if (!tokenMatch)
            return null;
        const rawValue = decodeURIComponent(tokenMatch[1]);
        const token = rawValue.split('.')[0];
        if (!token)
            return null;
        const db = getProvisionPool();
        const sessionRes = await db.query(`SELECT "userId", "expiresAt" FROM session WHERE token = $1 LIMIT 1`, [token]);
        if (sessionRes.rows.length === 0)
            return null;
        if (new Date(sessionRes.rows[0].expiresAt) < new Date())
            return null;
        const userId = sessionRes.rows[0].userId;
        const requestedWs = req.headers["x-workspace-id"];
        const query = requestedWs
            ? "SELECT workspace_id FROM workspace_members WHERE user_id = $1 AND workspace_id = $2 LIMIT 1"
            : "SELECT workspace_id FROM workspace_members WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1";
        const params = requestedWs ? [userId, requestedWs] : [userId];
        const res = await db.query(query, params);
        if (res.rows.length === 0)
            return null;
        return { userId, workspaceId: res.rows[0].workspace_id };
    }
    catch {
        return null;
    }
}
/**
 * Resolve session to full profile (user name, email, workspace name).
 * Used by GET /v1/me for the developer console.
 *
 * Uses direct DB lookup instead of auth.api.getSession() because
 * Better Auth's cookie reading fails behind Caddy reverse proxy
 * (cookie prefix mismatch between set and read paths).
 */
export async function resolveSessionProfile(req) {
    try {
        // Extract session token from cookie (handles both __Secure- and plain prefix)
        const cookieHeader = req.headers.cookie || '';
        const tokenMatch = cookieHeader.match(/better-auth[.\-]session_token=([^;]+)/);
        if (!tokenMatch)
            return null;
        // Token format: "rawToken.signature" — we only need the raw token for DB lookup
        const rawValue = decodeURIComponent(tokenMatch[1]);
        const token = rawValue.split('.')[0];
        if (!token)
            return null;
        const db = getProvisionPool();
        const sessionRes = await db.query(`SELECT s."userId", s."expiresAt", u.name, u.email
       FROM session s
       JOIN "user" u ON u.id = s."userId"
       WHERE s.token = $1 LIMIT 1`, [token]);
        if (sessionRes.rows.length === 0)
            return null;
        const row = sessionRes.rows[0];
        // Check expiry
        if (new Date(row.expiresAt) < new Date())
            return null;
        const wsRes = await db.query(`SELECT wm.workspace_id, w.name as workspace_name
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY wm.created_at ASC LIMIT 1`, [row.userId]);
        if (wsRes.rows.length === 0)
            return null;
        return {
            userId: row.userId,
            workspaceId: wsRes.rows[0].workspace_id,
            userName: row.name || "",
            userEmail: row.email || "",
            workspaceName: wsRes.rows[0].workspace_name,
            plan: "free",
        };
    }
    catch (err) {
        log.error("resolveSessionProfile failed", undefined, { error: err.message });
        return null;
    }
}
