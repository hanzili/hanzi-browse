# Hanzi Self-Serve + Partner Integration Task

## Objective

Make Hanzi self-serve enough that:

1. a technical user can land on the website and get Hanzi working without founder help
2. a technical founder / partner can land on the website, get an API key, pair a browser, run a task, and understand how to embed Hanzi into their product without a custom walkthrough

This task should align the product around two public entry paths:

- `Use Hanzi now`
- `Build with Hanzi`

Within `Use Hanzi now`, `BYOM` vs `Managed` should be treated as an access/auth choice, not as separate top-level products.

## Source Of Truth

Canonical internal docs (the old spec docs have been consolidated):

- `docs/internal/PRODUCT_MODEL.md` — two-path product model, access modes, surface roles
- `docs/internal/PRODUCTION_READINESS.md` — current readiness state, blockers, next work

Also inspect the actual implementation before changing anything:

- `server/src/cli.ts`
- `server/src/cli/setup.ts`
- `src/onboarding/OnboardingApp.jsx`
- `src/background/service-worker.js`
- `src/background/modules/mcp-bridge.js`
- `src/sidepanel-preact/App.jsx`
- `src/sidepanel-preact/hooks/useConfig.js`
- `src/sidepanel-preact/components/SettingsModal.jsx`
- `server/src/managed/api.ts`
- `server/src/managed/auth.ts`
- `server/src/managed/store.ts`
- `server/src/managed/store-pg.ts`
- `server/src/managed/schema.sql`
- `server/src/managed/billing.ts`
- `sdk/src/index.ts`
- `sdk/README.md`
- `landing/index.html`
- `landing/docs.html`
- `landing/pricing.html`
- `README.md`
- `PRIVACY.md`

## Product Reality

The current strongest onboarding surface is already:

```bash
npx hanzi-browse setup
```

That command:

- checks whether the extension is installed
- opens the install page if needed
- detects supported AI clients
- configures MCP
- can import or sync credentials into the extension

So the product should lean into that reality.

The extension should become:

- browser runtime
- status surface
- pairing surface
- troubleshooting surface

not the main conceptual onboarding engine.

## Current Problems To Fix

### 1. Public product packaging is still wrong

The public product still reads like a mix of:

- old local extension
- managed hosted add-on
- API product

Instead, public product packaging should be:

- `Use Hanzi now`
- `Build with Hanzi`

### 2. The CLI does not yet support the new access model

`server/src/cli/setup.ts` does not yet have a real `BYOM` vs `Managed` choice.

It only supports:

- imported Claude / Codex credentials
- provider API keys
- custom endpoints

### 3. The extension onboarding is stale

The extension still uses the old blended onboarding model:

- `WELCOME`
- `SETUP`
- `CONNECT`
- `DONE`

and still treats both sidepanel and agent use as the main story.

### 4. Managed pairing UX is too raw

The current managed UI asks for:

- backend URL
- pairing token

This is acceptable for debugging, not for self-serve partner onboarding.

### 5. The partner path is not actually self-serve yet

The backend has pairing/task primitives, but the self-serve partner path is incomplete because:

- there is no public self-serve API key creation surface
- there is no proper partner quickstart
- there is no sample integration app
- session mapping / partner metadata are missing

### 6. Public pricing is still ahead of backend truth

If pricing remains public, billing must be truthful and enforced.

## Required Outcomes

This task is complete when all of the following are true.

### A. `Use Hanzi now` works

A technical user can:

1. land on the website
2. click `Use Hanzi now`
3. run `npx hanzi-browse setup`
4. install the extension if needed
5. choose `BYOM` or `Managed`
6. run one test task
7. understand whether Hanzi is working

without founder help.

### B. `Build with Hanzi` works

A technical founder / partner can:

1. land on the website
2. click `Build with Hanzi`
3. create or retrieve an API key through the product
4. follow one canonical partner quickstart
5. pair one browser
6. run one SDK or API task
7. understand how Hanzi fits inside their product

without founder help.

## Scope

This task includes:

- public product packaging
- docs restructuring
- CLI-first onboarding alignment
- extension status / pairing alignment
- partner self-serve flow
- sample integration
- necessary backend additions to support partner self-serve
- necessary billing truthfulness fixes if pricing stays public

This task does **not** require:

- a full backend rewrite
- removing the extension
- building a full cloud browser product
- enterprise/admin polish

## Work Items

## 1. Public Website Rewrite

Rewrite the public website around the two real entry paths:

- `Use Hanzi now`
- `Build with Hanzi`

### Required changes

- Update `landing/index.html`
- Update nav and CTA hierarchy
- Make the primary direct-user quickstart:

```bash
npx hanzi-browse setup
```

- Explain `BYOM` vs `Managed` inside the direct-use path
- Create a clear developer / partner path
- Route docs around the same two paths

### Important

Do not keep the old framing that treats `Managed` as a fully separate top-level onboarding path for the public site.

## 2. Docs Rewrite

Turn docs into a real self-serve docs system, not a placeholder page.

### Required structure

Docs should route to:

- `Use Hanzi now`
- `Build with Hanzi`

### Must-have docs

#### Use Hanzi now

- canonical quickstart
- install/setup explanation
- `BYOM` vs `Managed`
- test prompt / first task
- troubleshooting

#### Build with Hanzi

- partner/developer quickstart
- API key creation or retrieval
- browser pairing flow
- browser session model
- SDK quickstart
- reconnect / recovery behavior

### Required public surfaces

- `landing/docs.html`
- `README.md`
- `sdk/README.md`

If you create additional docs files, keep them coherent and linked from the docs home.

## 3. CLI Setup Upgrade

Treat `server/src/cli/setup.ts` as the main direct-user onboarding engine.

### Add a real access choice

After environment / extension / MCP setup, add a clear choice:

- `Use my own model`
- `Use Hanzi-managed access`

### `BYOM` path

Support:

- Claude import
- Codex import
- API key
- custom endpoint

### `Managed` path

Support a real managed bootstrap path.

That can be one of:

- paste Hanzi-issued token
- sign-in / access token flow
- another product-supported managed credential path

but it must be a real supported flow, not just “go do this later somewhere else.”

### End with verification

The CLI should not stop at “configured.”
It should end with:

- a test prompt
- a clear next step
- success / failure clarity

## 4. Extension Simplification

The extension must stop being the main conceptual onboarding surface.

### Update `src/onboarding/OnboardingApp.jsx`

Replace the old blended onboarding with a lighter status-oriented model.

The extension should mainly answer:

- is Hanzi connected?
- is auth configured?
- is this browser paired?
- what should I do next?

### Update sidepanel gating

Review:

- `src/sidepanel-preact/App.jsx`
- `src/sidepanel-preact/hooks/useConfig.js`

The current “Open Setup” gate is too blunt.
It should reflect CLI-first reality and support the new access model.

### Keep the extension responsible for

- runtime
- pairing
- status
- troubleshooting

## 5. Managed Pairing UX Improvement

The current managed pairing UI in `src/sidepanel-preact/components/SettingsModal.jsx` is too raw.

### Improve it

The normal public flow should not force users to manually reason about:

- backend URL
- raw pairing token entry

### Target model

The partner app or Hanzi product should initiate pairing.
The extension should confirm or complete it.

Raw token + backend URL entry can remain as:

- advanced fallback
- debug path

but it should not be the default self-serve flow.

## 6. Self-Serve API Key Creation

This is a major blocker for `Build with Hanzi`.

Right now the backend has store functions for API key creation, but there is no public self-serve product surface for it.

### Add a real self-serve path

Implement one of:

- API key creation endpoint(s)
- dashboard-backed creation flow
- equivalent authenticated self-serve mechanism

### Requirements

- user can create an API key without founder intervention
- product explains the key clearly
- key is shown once
- key is tied to the correct workspace

## 7. Partner / Embedded Quickstart

Create the actual self-serve partner path.

### Required outcome

A partner can:

1. get API key
2. create pairing token
3. pair browser
4. list sessions
5. run a task
6. understand how to embed Hanzi

### Surfaces to update

- public docs
- `sdk/README.md`
- website/docs entry points

## 8. Sample Integration App

Add a minimal sample app or starter for `Build with Hanzi`.

### Minimum required features

- backend route that creates pairing token
- frontend `Connect Browser` flow
- show browser connected state
- run one task
- show task result

### Goal

The sample app should make the embedded model obvious.

### Important

Do not overbuild.
This should be the smallest credible partner integration demo.

## 9. Partner Session Mapping

Partners need a cleaner way to map their own users to Hanzi browser sessions.

### Add partner-friendly session metadata

Examples:

- `external_user_id`
- `label`
- `external_workspace_id`

Add this to the backend/session model in a clean way.

### Goal

A partner should be able to understand:

- which Hanzi browser session belongs to which user in their app

## 10. Billing Truthfulness

If public pricing remains visible, billing must stop overclaiming.

### Required

- either make pricing truthful and enforced
- or soften/remove claims that are not yet supported

### Likely backend work

- persist Stripe customer/subscription state
- wire webhook state to workspace state
- enforce plan gating if needed
- wire task usage metering if API pricing is public

### Minimum honest outcome

No public claim should exceed what the product actually supports.

## 11. Reliability / Backend Hardening

Do not assume all remaining work is just docs/onboarding.
There are still backend/platform tasks needed before partner self-serve is truly easy.

### Must verify / fix

- request-safe response/CORS behavior
- session / tab context correctness
- pairing/session ownership correctness
- task flow reliability for managed/API path

### Add stronger coverage

- one real end-to-end managed task flow
- one real partner-like browser pairing + task flow

## Acceptance Criteria

The task is complete when all of these are true.

### Public product

- homepage clearly presents `Use Hanzi now` and `Build with Hanzi`
- docs clearly mirror those paths
- direct users know to start with `npx hanzi-browse setup`

### Direct onboarding

- CLI setup supports `BYOM` vs `Managed`
- extension supports the new status/pairing model
- a direct technical user can run one real test task without founder help

### Partner onboarding

- a partner can get an API key self-serve
- a partner can pair one browser
- a partner can run one task from the SDK
- a partner can follow one canonical quickstart
- a sample integration exists

### Trust / product truth

- public pricing claims are accurate
- docs and product match the backend reality
- the partner path is not dependent on a custom walkthrough

## Delivery Notes

- Be concrete.
- Reuse existing implementation where possible.
- Do not invent a new architecture if the current primitives already support the flow.
- Prefer shipping a narrow but coherent self-serve path over a broad but vague “platform” story.

## Final Output Required

When done, provide:

1. a summary of what changed
2. what now works end-to-end for `Use Hanzi now`
3. what now works end-to-end for `Build with Hanzi`
4. any remaining blockers or risks
