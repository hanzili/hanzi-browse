import type { CaseResult } from "./types.js";

export function formatSummary(results: CaseResult[]): string {
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const lines: string[] = [
    "",
    `Domain-skills eval — ${passed}/${total} passed`,
    "",
  ];
  for (const r of results) {
    const mark = r.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    lines.push(`  ${mark} ${r.domain.padEnd(22)} ${r.caseId}`);
    for (const reason of r.reasons) {
      lines.push(`      → ${reason}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function toJsonReport(results: CaseResult[]): string {
  const passed = results.filter(r => r.pass).length;
  return JSON.stringify(
    {
      total: results.length,
      passed,
      failed: results.length - passed,
      cases: results,
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  );
}
