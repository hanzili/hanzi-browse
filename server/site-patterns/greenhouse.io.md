---
domain: greenhouse.io
aliases: [Greenhouse]
updated: 2026-03-29
---

## Platform traits

- Verified on a public board page at `https://job-boards.greenhouse.io/typeface/jobs/4827956007`.
- The tested page is a JavaScript application, but it still exposes useful structured application metadata in the initial HTML payload.
- The board used Greenhouse's job-board app assets from `job-boards.cdn.greenhouse.io` and exposed Remix route state in the page source.
- The page exposed both the human-facing job page and the submit / confirmation paths without logging in.

## Effective patterns

- Start from the public posting URL, then inspect the in-page metadata before automating:
  - tested posting URL: `https://job-boards.greenhouse.io/typeface/jobs/4827956007`
  - embedded submit path: `https://boards.greenhouse.io/typeface/jobs/4827956007`
  - embedded confirmation path: `/typeface/jobs/4827956007/confirmation`
  - back-to-jobs pattern: `https://job-boards.greenhouse.io/{company}`
- The tested page exposed an `Apply` button directly in HTML:
  - selector observed in source: `button[aria-label="Apply"]`
  - application container hook observed in source: `div.application--container`
- Structured question metadata was embedded in page JSON. Verified fields included:
  - `first_name`
  - `last_name`
  - `email`
  - `phone`
  - `resume`
  - `resume_text`
  - `cover_letter`
  - `cover_letter_text`
  - LinkedIn / website text inputs
  - single-select sponsorship and work-authorization questions
- Upload requirements were visible in the metadata before interacting:
  - allowed file types for resume and cover letter: `pdf`, `doc`, `docx`, `txt`, `rtf`
- The tested page also exposed `quickApply.active: true` and `quickApply.url: https://my.greenhouse.io`. Treat this as board-specific capability, not a universal guarantee.
- Because the question schema is visible in-page, Greenhouse is well-suited for a two-step workflow:
  1. inspect the posting and identify required fields without using the browser heavily
  2. open the live form only after the user confirms they want to proceed

## Known traps

- The page is still a client-side app. Metadata is visible early, but actual interaction and submission should still be treated as browser work.
- Quick Apply support appeared in the tested posting, but a user may not want to authenticate through Greenhouse. Confirm before using any quick-apply path.
- Required questions differ by employer. Even when the top-level schema is visible, do not assume later steps are trivial or identical across boards.
- If the page renders but the app shell fails to hydrate, fall back to the embedded metadata for planning, then retry in the browser instead of guessing missing fields.
