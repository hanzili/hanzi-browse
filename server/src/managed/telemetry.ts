/**
 * Telemetry for the managed backend (api.hanzilla.co).
 * Gated by SENTRY_DSN and POSTHOG_API_KEY env vars — no-op in dev.
 */

import * as Sentry from "@sentry/node";
import { PostHog } from "posthog-node";

let posthog: PostHog | null = null;
let initialized = false;

export function initManagedTelemetry(): void {
  if (initialized) return;
  initialized = true;

  const sentryDsn = process.env.SENTRY_DSN;
  const posthogKey = process.env.POSTHOG_API_KEY;

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.2,
    });
  }

  if (posthogKey) {
    posthog = new PostHog(posthogKey, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 10,
      flushInterval: 30000,
    });
  }
}

export function trackManagedEvent(
  name: string,
  workspaceId: string,
  properties?: Record<string, any>
): void {
  if (!posthog) return;
  posthog.capture({
    distinctId: workspaceId,
    event: name,
    properties,
  });
}

export function captureManagedError(
  error: Error,
  context?: Record<string, string>
): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("task", context);
      // Set searchable tags for key identifiers
      if (context.workspace_id) scope.setTag("workspace_id", context.workspace_id);
      if (context.task_id) scope.setTag("task_id", context.task_id);
    }
    scope.captureException(error);
  });
}

export async function shutdownManagedTelemetry(): Promise<void> {
  await Promise.all([
    Sentry.close(2000),
    posthog?.shutdown(),
  ]);
}
