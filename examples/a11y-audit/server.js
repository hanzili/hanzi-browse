import express from "express";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { HanziClient } from "../../sdk/dist/index.js";

if (!process.env.no_proxy) process.env.no_proxy = "localhost,127.0.0.1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

const POSTHOG_KEY = process.env.POSTHOG_API_KEY || "";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const HANZI_KEY = process.env.HANZI_API_KEY;
const HANZI_URL = process.env.HANZI_API_URL || "https://api.hanzilla.co";
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "ccproxy";
const LLM_URL = process.env.LLM_BASE_URL || "https://api.anthropic.com";
const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-6";
const PORT = process.env.PORT || 3001;

if (!HANZI_KEY) {
  console.error("Set HANZI_API_KEY");
  process.exit(1);
}

const POSTHOG_SNIPPET = POSTHOG_KEY
  ? `<script>!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(POSTHOG_KEY)},{api_host:${JSON.stringify(POSTHOG_HOST)},person_profiles:'anonymous'})</script>`
  : "";
const HTML = readFileSync(join(__dirname, "index.html"), "utf-8").replace("__POSTHOG_SNIPPET__", POSTHOG_SNIPPET);
const hanziClient = new HanziClient({ apiKey: HANZI_KEY, baseUrl: HANZI_URL });

const rateLimits = new Map();
const LIMITS = { plan: 8, audit: 12, report: 8 };

function track(event, properties = {}, ip) {
  if (!POSTHOG_KEY) return;
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: ip || "server",
      properties: { tool: "a11y-audit", ...properties },
    }),
  }).catch(() => {});
}

function checkRate(req, res, action) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry || now - entry.reset > 86400000) {
    entry = { plan: 0, audit: 0, report: 0, reset: now };
    rateLimits.set(ip, entry);
  }
  if (entry[action] >= LIMITS[action]) {
    res.status(429).json({
      error: `Daily limit reached (${LIMITS[action]} ${action} requests/day).`,
    });
    return false;
  }
  entry[action]++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now - entry.reset > 86400000) rateLimits.delete(ip);
  }
}, 3600000);

function extractJSON(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const firstObj = text.match(/\{[\s\S]*\}/);
  if (firstObj) {
    try { return JSON.parse(firstObj[0]); } catch {}
  }
  return null;
}

async function llm(system, user) {
  const res = await fetch(`${LLM_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data.content?.[0]?.text || "";
}

async function fetchPageSnapshot(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Hanzi A11y Audit Preview Bot" },
      redirect: "follow",
    });
    const html = await res.text();
    return html.replace(/\s+/g, " ").slice(0, 12000);
  } catch {
    return "";
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    throw new Error("Enter a valid URL including https://");
  }
}

function severityRank(level) {
  return { Critical: 0, Serious: 1, Moderate: 2, Minor: 3 }[level] ?? 4;
}

async function collectScreenshots(taskId, count) {
  try {
    const steps = await hanziClient.getTaskSteps(taskId);
    const screenshotSteps = steps.filter((s) => s.screenshot).slice(0, Math.max(0, count));
    const images = [];
    for (const step of screenshotSteps) {
      try {
        const base64 = await hanziClient.getScreenshot(taskId, step.step);
        images.push({
          step: step.step,
          image: `data:image/jpeg;base64,${base64}`,
        });
      } catch {}
    }
    return images;
  } catch {
    return [];
  }
}

function buildPlanFallback(url, scope) {
  const u = new URL(url);
  const base = `${u.protocol}//${u.host}`;
  const pages = [{ url, label: "Primary page", reason: "Starting page provided by the user." }];
  if (scope === "deep") {
    pages.push(
      { url: `${base}/pricing`, label: "Pricing", reason: "Pricing pages often have dense UI and comparison tables." },
      { url: `${base}/contact`, label: "Contact or form flow", reason: "Forms and validation frequently contain accessibility regressions." },
    );
  }
  return {
    standard: "WCAG 2.1 AA",
    pages,
    phases: [
      { id: "visual", label: "Rendered contrast and readability" },
      { id: "keyboard", label: "Keyboard navigation and focus order" },
      { id: "semantics", label: "ARIA, names, labels, and landmarks" },
      { id: "dynamic", label: "Dynamic UI, modals, and async state" },
    ],
  };
}

async function generatePlan(url, scope, htmlSnippet) {
  const response = await llm(
    "You are an accessibility strategist preparing a real-browser WCAG 2.1 AA audit. Return strict JSON only.",
    `Create an audit plan for this website.

URL: ${url}
Scope: ${scope}
Standard: WCAG 2.1 AA

Methodology to follow:
- Phase 1: code-informed semantic review
- Phase 2: visual checks in a real browser for contrast, font size, focus visibility, touch target size
- Phase 3: keyboard checks for tab order, skip links, Enter/Space operability, focus traps
- Phase 4: ARIA and dynamic content checks for landmarks, names, labels, aria-live, dialogs, dropdowns, async content

If scope is "quick", audit exactly 1 page.
If scope is "deep", choose 2 or 3 pages most likely to expose accessibility regressions.

Page HTML snapshot, if available:
<html>${htmlSnippet || "unavailable"}</html>

Return JSON:
\`\`\`json
{
  "standard": "WCAG 2.1 AA",
  "pages": [
    { "url": "https://...", "label": "Home", "reason": "..." }
  ],
  "phases": [
    { "id": "visual", "label": "Rendered contrast and readability" },
    { "id": "keyboard", "label": "Keyboard navigation and focus order" },
    { "id": "semantics", "label": "ARIA, names, labels, and landmarks" },
    { "id": "dynamic", "label": "Dynamic UI, modals, and async state" }
  ],
  "checks": [
    { "id": "contrast", "label": "Rendered color contrast" },
    { "id": "focus", "label": "Visible focus state" }
  ]
}
\`\`\`
`
  );
  return extractJSON(response);
}

function auditPrompt(page, phase) {
  const shared = `Audit ${page.url} for WCAG 2.1 AA. This is a real-browser accessibility audit.

Core rules:
- Verify issues before reporting them.
- Be specific about the exact element and user impact.
- For each finding, take a screenshot immediately before or while observing the issue.
- Prefer 0 to 4 real findings over padded output.
- Also record passing checks that you verified.
- Return strict JSON only.
`;

  const phaseInstructions = {
    visual: `Focus on rendered accessibility:
- color contrast on rendered text and controls
- font size and readability
- visible focus indicators
- touch target sizing if obvious
- reduced-motion or motion-heavy UI if present

Tab through interactive elements where needed to verify focus visibility.`,
    keyboard: `Focus on keyboard behavior:
- tab order and logical reading order
- keyboard access with Tab, Shift+Tab, Enter, and Space
- skip links if present
- traps or lost focus inside menus, dialogs, drawers, or widgets

Use keyboard interaction instead of describing likely issues.`,
    semantics: `Focus on semantics and accessible names:
- landmark structure such as header, nav, main, footer
- buttons, links, inputs, and icons having correct names
- label association for forms
- heading hierarchy
- image alt text when exposed in context

Use page reading tools plus targeted interaction where needed.`,
    dynamic: `Focus on dynamic and asynchronous UI:
- modals, menus, accordions, dropdowns, tabs, and toast notifications
- async content appearing after interaction
- announcements for status messages or live updates
- dialog focus management and return focus behavior

Trigger obvious interactive UI on the page before concluding none exists.`,
  };

  return `${shared}
Phase: ${phase.label}
${phaseInstructions[phase.id] || ""}

Return JSON:
\`\`\`json
{
  "phase_summary": "1-2 sentence summary",
  "passes": ["specific check that passed"],
  "coverage_notes": ["what you tested or why coverage was limited"],
  "findings": [
    {
      "title": "Short issue title",
      "severity": "Critical|Serious|Moderate|Minor",
      "wcag": "e.g. 1.4.3 Contrast (Minimum)",
      "element": "specific element or location",
      "selector": "best selector or text hook if visible",
      "impact": "who is affected and how",
      "evidence": "what you observed in the browser",
      "fix": "specific implementation guidance"
    }
  ]
}
\`\`\`
`;
}

app.get("/embed.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  const localPath = join(__dirname, "embed.js");
  const repoPath = join(__dirname, "../../landing/embed.js");
  res.end(readFileSync(existsSync(localPath) ? localPath : repoPath, "utf-8"));
});

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(HTML);
});

app.get("/v1/browser-sessions", async (req, res) => {
  try {
    const sessions = await hanziClient.listSessions();
    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        connected_at: s.connectedAt,
        last_heartbeat: s.lastHeartbeat,
        label: s.label || null,
        external_user_id: s.externalUserId || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/v1/browser-sessions/pair", async (req, res) => {
  try {
    const data = await hanziClient.createPairingToken();
    res.json({
      pairing_token: data.pairingToken,
      pairing_url: `${HANZI_URL}/pair/${data.pairingToken}`,
      expires_at: data.expiresAt,
      expires_in_seconds: data.expiresInSeconds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await hanziClient.listSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pair", async (req, res) => {
  try {
    const data = await hanziClient.createPairingToken();
    res.json({ pairing_url: `${HANZI_URL}/pair/${data.pairingToken}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/plan", async (req, res) => {
  if (!checkRate(req, res, "plan")) return;
  try {
    const url = normalizeUrl(req.body.url || "");
    const scope = req.body.scope === "deep" ? "deep" : "quick";
    const htmlSnippet = await fetchPageSnapshot(url);
    const planned = await generatePlan(url, scope, htmlSnippet).catch(() => null);
    const fallback = buildPlanFallback(url, scope);
    const audit = {
      id: `audit-${Date.now()}`,
      url,
      scope,
      standard: planned?.standard || fallback.standard,
      pages: (planned?.pages?.length ? planned.pages : fallback.pages).slice(0, scope === "deep" ? 3 : 1),
      phases: planned?.phases?.length ? planned.phases : fallback.phases,
      checks: planned?.checks?.length ? planned.checks : [
        { id: "contrast", label: "Rendered color contrast" },
        { id: "focus", label: "Visible focus state" },
        { id: "keyboard", label: "Keyboard operability" },
        { id: "labels", label: "Labels and accessible names" },
        { id: "dynamic", label: "Dialogs and async UI" },
      ],
    };
    track("a11y_plan_created", { scope, page_count: audit.pages.length }, req.ip);
    res.json({ audit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/audit-phase", async (req, res) => {
  if (!checkRate(req, res, "audit")) return;
  try {
    const { browser_session_id, page, phase } = req.body;
    if (!browser_session_id || !page?.url || !phase?.id) {
      return res.status(400).json({ error: "browser_session_id, page, and phase are required" });
    }

    const task = await hanziClient.runTask({
      browserSessionId: browser_session_id,
      task: auditPrompt(page, phase),
      url: page.url,
    }, { timeoutMs: 8 * 60 * 1000, pollIntervalMs: 3000 });

    if (task.status !== "complete" || !task.answer) {
      return res.status(500).json({ error: `Audit phase failed: ${task.status}` });
    }

    const parsed = extractJSON(task.answer);
    if (!parsed) {
      return res.status(500).json({ error: "Could not parse audit output" });
    }

    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    const screenshots = await collectScreenshots(task.id, findings.length);
    const enrichedFindings = findings.map((finding, index) => ({
      ...finding,
      severity: ["Critical", "Serious", "Moderate", "Minor"].includes(finding?.severity) ? finding.severity : "Moderate",
      screenshot: screenshots[index]?.image || null,
      screenshot_step: screenshots[index]?.step || null,
    }));

    const result = {
      page,
      phase,
      phase_summary: parsed.phase_summary || "",
      passes: Array.isArray(parsed.passes) ? parsed.passes : [],
      coverage_notes: Array.isArray(parsed.coverage_notes) ? parsed.coverage_notes : [],
      findings: enrichedFindings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
      task_id: task.id,
      raw_status: task.status,
    };

    track("a11y_phase_complete", {
      phase: phase.id,
      findings: result.findings.length,
      page: page.label || page.url,
    }, req.ip);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/report", async (req, res) => {
  if (!checkRate(req, res, "report")) return;
  try {
    const { audit, phase_results = [] } = req.body;
    if (!audit?.url || !Array.isArray(phase_results)) {
      return res.status(400).json({ error: "audit and phase_results are required" });
    }

    const findings = phase_results.flatMap((r) =>
      (r.findings || []).map((f) => ({
        ...f,
        page_url: r.page?.url,
        page_label: r.page?.label,
        phase_id: r.phase?.id,
        phase_label: r.phase?.label,
      }))
    );

    const passes = [...new Set(phase_results.flatMap((r) => r.passes || []))];
    const severity_totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
    for (const finding of findings) {
      severity_totals[finding.severity] = (severity_totals[finding.severity] || 0) + 1;
    }

    const summaryText = await llm(
      "You are a senior accessibility consultant summarizing a WCAG 2.1 AA browser audit. Return strict JSON only.",
      `Summarize this audit for an engineering team.

Audit:
${JSON.stringify({ url: audit.url, scope: audit.scope, standard: audit.standard }, null, 2)}

Findings:
${JSON.stringify(findings.map((f) => ({
  title: f.title,
  severity: f.severity,
  wcag: f.wcag,
  page: f.page_label || f.page_url,
  impact: f.impact,
  fix: f.fix,
})), null, 2)}

Passing checks:
${JSON.stringify(passes, null, 2)}

Return JSON:
\`\`\`json
{
  "headline": "short audit verdict",
  "summary": "2-3 sentence summary",
  "top_priorities": ["priority 1", "priority 2", "priority 3"],
  "score": 0
}
\`\`\`
`
    ).catch(() => "");

    const summary = extractJSON(summaryText) || {
      headline: findings.length ? "Accessibility issues found in real-browser testing" : "No verified issues found in sampled flows",
      summary: findings.length
        ? "The audit found verified issues across rendered UI and interaction states. Prioritize issues that block keyboard use, hide focus, or remove accessible names."
        : "The sampled pages passed the tested checks in this run. Coverage is limited to the selected pages and interactions.",
      top_priorities: findings.slice(0, 3).map((f) => f.title),
      score: Math.max(15, 100 - severity_totals.Critical * 28 - severity_totals.Serious * 16 - severity_totals.Moderate * 8 - severity_totals.Minor * 3),
    };

    const grouped_findings = {
      Critical: findings.filter((f) => f.severity === "Critical"),
      Serious: findings.filter((f) => f.severity === "Serious"),
      Moderate: findings.filter((f) => f.severity === "Moderate"),
      Minor: findings.filter((f) => f.severity === "Minor"),
    };

    track("a11y_report_built", {
      scope: audit.scope,
      findings: findings.length,
      critical: severity_totals.Critical,
    }, req.ip);

    res.json({
      audit,
      summary: {
        headline: summary.headline,
        summary: summary.summary,
        top_priorities: Array.isArray(summary.top_priorities) ? summary.top_priorities.slice(0, 3) : [],
        score: typeof summary.score === "number" ? Math.max(0, Math.min(100, Math.round(summary.score))) : 72,
        severity_totals,
      },
      grouped_findings,
      passes,
      phase_results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`
  A11y Audit — Free Tool by Hanzi Browse
  http://localhost:${PORT}

  Strategy AI: ${LLM_URL} (${LLM_MODEL})
  Browser:     ${HANZI_URL}
  Rate limits: ${JSON.stringify(LIMITS)}
  `);
});
