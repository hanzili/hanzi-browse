/**
 * Tests the trusted `source` field on browser sessions.
 *
 * Purpose: prove that `source` flows from pairing-token creation through
 * token consumption onto the session, and that the default is the least-
 * trusted value ('partner') when not explicitly set.
 *
 * Uses the in-memory store (store.ts) — Postgres path is exercised by the
 * same contracts in integration.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  createWorkspace,
  createApiKey,
  createPairingToken,
  consumePairingToken,
  getBrowserSession,
} from "../src/managed/store.js";

describe("session source", () => {

  it("defaults to 'partner' when the caller doesn't pass a source", () => {
    const ws = createWorkspace("t1");
    const key = createApiKey(ws.id, "k");
    const pt = createPairingToken(ws.id, key.id);
    expect(pt.source).toBe("partner");
  });

  it("honors an explicit 'self' source set by internal routes", () => {
    const ws = createWorkspace("t2");
    const key = createApiKey(ws.id, "k");
    const pt = createPairingToken(ws.id, key.id, { source: "self", label: "Sidepanel" });
    expect(pt.source).toBe("self");
  });

  it("honors an explicit 'dashboard' source", () => {
    const ws = createWorkspace("t3");
    const key = createApiKey(ws.id, "k");
    const pt = createPairingToken(ws.id, key.id, { source: "dashboard", label: "User pairing link" });
    expect(pt.source).toBe("dashboard");
  });

  it("propagates source from token to the browser session on consume", () => {
    const ws = createWorkspace("t4");
    const key = createApiKey(ws.id, "k");
    const pt = createPairingToken(ws.id, key.id, { source: "self" });
    const session = consumePairingToken(pt._plainToken);
    expect(session).not.toBeNull();
    expect(session!.source).toBe("self");

    // Re-reading via getBrowserSession should see the same source.
    const stored = getBrowserSession(session!.id);
    expect(stored?.source).toBe("self");
  });

  it("each source value flows through independently for the four enum values", () => {
    const ws = createWorkspace("t5");
    const key = createApiKey(ws.id, "k");
    for (const s of ["self", "dashboard", "partner", "test"] as const) {
      const pt = createPairingToken(ws.id, key.id, { source: s });
      const session = consumePairingToken(pt._plainToken);
      expect(session!.source).toBe(s);
    }
  });
});
