# A11y Audit

A free accessibility audit demo that runs WCAG-style checks in a real browser using Hanzi Browse.

This example shows how to run a WCAG-style accessibility audit in a real paired browser instead of relying only on static DOM analysis. It plans an audit, runs browser-based checks against rendered UI and interactive state, then compiles a severity-grouped report with screenshots and fix guidance.

## What It Does

- Audits a given URL using real browser interaction
- Supports `quick` (single page) and `deep` (multi-page) scopes
- Pairs with a live browser session via Hanzi Browse
- Runs accessibility checks across key phases:
  - rendered contrast and readability
  - keyboard navigation and focus order
  - ARIA roles, labels, and landmarks
  - dynamic UI (dialogs, async content)
- Generates a final report grouped by severity (`Critical`, `Serious`, `Moderate`, `Minor`)

## Architecture

The example follows the same broad structure as `examples/x-marketing/`.

- The client owns UI state and drives the flow
- The server is stateless and provides API routes
- Browser AI performs the real-browser audit steps
- Strategy logic plans the audit and compiles the final report

This mirrors the two-layer pattern used in Hanzi examples: Strategy AI for planning and summarization, and Browser AI for real execution.

Main files:

- [server.js](./server.js)
- [index.html](./index.html)
- [package.json](./package.json)

## Requirements

- Node.js 18+
- A valid `HANZI_API_KEY`
- Hanzi Browse Chrome extension installed and available for pairing

Optional if you want external LLM-backed planning/report generation:

- `ANTHROPIC_API_KEY`
- or `LLM_BASE_URL` and `LLM_MODEL`

## Environment Variables

Required:

```bash
export HANZI_API_KEY=hic_live_xxx
```

Optional (for LLM-backed planning and reporting):

```bash
export ANTHROPIC_API_KEY=sk-xxx
```

Optional:

```bash
export HANZI_API_URL=https://api.hanzilla.co
export LLM_BASE_URL=https://api.anthropic.com
export LLM_MODEL=claude-sonnet-4-6
export PORT=3001
```

## Install

```bash
cd examples/a11y-audit
npm install
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3001
```

## User Flow

1. Enter a target URL
2. Select audit scope (`Quick check` or `Deep scan`)
3. Pair a browser session
4. Observe the audit running across pages and phases
5. Review the final report and optional JSON export

## Scope Modes

`Quick check`

- Audits one page
- Best for a landing page, pricing page, or reproducing one bug quickly

`Deep scan`

- Samples up to three pages
- Better for forms, dialogs, and broader interaction coverage

## API Routes

- `POST /api/plan`
  - creates the audit plan from URL + scope
- `POST /api/audit-phase`
  - runs one browser audit phase on one page
- `POST /api/report`
  - compiles the final report
- `GET /api/sessions`
  - lists browser sessions
- `POST /api/pair`
  - creates a pairing URL

## How To Test

1. Start the server
2. Open `http://localhost:3001`
3. Enter a reachable URL
4. Pair the Hanzi browser session
5. Run a quick audit first
6. Verify:
   - setup screen renders
   - pairing works
   - per-check progress updates
   - findings appear in severity groups
   - screenshot evidence is shown when available
   - JSON export downloads successfully

## Notes

- This example is meant to demonstrate the product flow and architecture, not full WCAG coverage.
- Audit quality depends on the paired browser session, the target page behavior, and available model/configuration.
- Some findings may not include screenshots if the underlying task did not capture one at the right step.
- This demo prioritizes real interaction-based testing over static DOM analysis.
