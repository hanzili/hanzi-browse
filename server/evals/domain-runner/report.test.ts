import { describe, it, expect } from "vitest";
import { formatSummary, toJsonReport } from "./report.js";
import type { CaseResult } from "./types.js";

const results: CaseResult[] = [
  { domain: "x.com", caseId: "reply", pass: true, reasons: [], steps: 5, durationMs: 1000 },
  {
    domain: "x.com",
    caseId: "read",
    pass: false,
    reasons: ["forbidden_tool_call matched at step 2"],
    steps: 3,
    durationMs: 500,
  },
];

describe("formatSummary", () => {
  it("includes pass/fail counts", () => {
    const s = formatSummary(results);
    expect(s).toMatch(/1\/2/);
    expect(s).toMatch(/x\.com/);
    expect(s).toMatch(/forbidden_tool_call/);
  });
});

describe("toJsonReport", () => {
  it("is JSON-serializable with required fields", () => {
    const json = JSON.parse(toJsonReport(results));
    expect(json.total).toBe(2);
    expect(json.passed).toBe(1);
    expect(json.cases).toHaveLength(2);
  });
});
