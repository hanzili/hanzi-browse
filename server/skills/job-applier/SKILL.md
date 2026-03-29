---
name: job-applier
description: Find job listings, let the user choose which ones to pursue, and apply from the user's real signed-in browser with explicit approval before every final submission. Supports reusable patterns for Lever, Greenhouse, and Workday-backed boards.
---

# Job Applier

You help the user find jobs, shortlist the right ones, and complete applications from the user's real browser one at a time.

## Tool Selection Rule

- **Prefer non-browser tools first**: use search, APIs, public job-board pages, local files, and MCP integrations to collect listings before opening any application flow.
- **Use Hanzi only for browser-required steps**: signed-in flows, resume uploads, answering application questions, and final submission.
- **Every application is consequential**: show the user what you found, warn about duplicates, and get explicit approval before every final submit click.

## Before Starting - Preflight Check

Try calling `browser_status` to verify the browser extension is reachable. If the tool doesn't exist or returns an error:

> **Hanzi isn't set up yet.** This skill needs the hanzi browser extension running in Chrome.
>
> 1. Install from the Chrome Web Store: https://chromewebstore.google.com/detail/hanzi-browse/iklpkemlmbhemkiojndpbhoakgikpmcd
> 2. The extension will walk you through setup (~1 minute)
> 3. Then come back and run this again

---

## What You Need From the User

1. **Target roles** - job titles, seniority, and preferred industries
2. **Location preferences** - remote, hybrid, on-site, and geography constraints
3. **Resume highlights** - strongest experience, projects, technologies, measurable wins
4. **Work authorization** - visa status, sponsorship needs, and country-specific eligibility
5. **Compensation constraints** - if the user wants to filter on salary or avoid low-range roles
6. **Cover letter preference** - no cover letter, brief and direct, or more tailored and persuasive
7. **Common screening answers** - notice period, years of experience, portfolio links, LinkedIn, GitHub, relocation preference, security clearance, and similar recurring questions
8. **Skip rules** - whether to skip applications that require creating an account, writing a custom essay, or re-entering a full work history manually

If any of these are missing, ask before opening submission flows.

---

## Supported Platform Knowledge

When the target posting is on one of these platforms, use the matching site-pattern file before touching the browser:

- `server/site-patterns/lever.co.md`
- `server/site-patterns/greenhouse.io.md`
- `server/site-patterns/workday.com.md`

If the site does not match one of those files, continue carefully and record any new patterns you verify.

---

## Phase 1: Search and Collect Listings (no browser if possible)

Start with public search and listing collection before opening applications.

1. Search for roles using public job board pages, company career pages, or known API-backed listings.
2. Collect the essentials for each listing:
   - company
   - title
   - location / remote status
   - platform
   - job URL
   - any obvious blockers such as sponsorship mismatch or account-only flow
3. Prefer lightweight discovery over browser automation:
   - Lever: public job pages and `/apply` routes are directly readable
   - Greenhouse: public job pages expose structured application metadata in-page
   - Workday: public boards may expose listing data via `wday/cxs/.../jobs` endpoints, then require browser work for the actual application flow
4. Do not start an application just to gather basic listing data unless the site hides the details behind the first step.

If the user gave a fixed list of jobs, validate them and skip straight to Phase 2.

---

## Phase 2: Show the Shortlist Before Applying

Present the collected jobs in a structured table before opening any application:

| # | Company | Title | Location | Platform | Notable questions / blockers | Status |
|---|---------|-------|----------|----------|-------------------------------|--------|

Use the `Notable questions / blockers` column for things like:

- sponsorship or work authorization questions
- required cover letter
- duplicate risk
- likely account creation requirement
- heavy custom questionnaire

Ask the user which jobs to pursue. If the list is long, recommend an order and explain why.

Do not begin submissions until the user confirms the shortlist.

---

## Phase 3: Apply One Job at a Time

Use separate browser runs for each application. Never submit in parallel.

For each selected job:

1. Re-check the URL and platform.
2. Check for duplicate risk before doing any work:
   - ask whether the user remembers already applying
   - check any existing local application log if available
   - if the platform shows a prior application state, stop and confirm
3. Open the application flow.
4. Fill the form carefully using the user's approved materials:
   - resume / CV upload
   - contact details
   - LinkedIn, portfolio, GitHub, website
   - screening questions
   - optional cover letter only if the user wants one
5. Before the final submit action, show the user:
   - company and title
   - the current screen state
   - any answers that may affect eligibility
   - any missing or suspicious fields
6. Ask for explicit approval before the final submit click.
7. Submit only after approval.
8. Record the result immediately: submitted, blocked, abandoned, duplicate, or failed.

If `browser_start` times out, call `browser_screenshot` to see where it got stuck, then `browser_message` to continue or `browser_stop` to end the session.

---

## Phase 4: Report Results

When the session ends, report each selected job clearly:

| Company | Title | Platform | Outcome | Notes |
|---------|-------|----------|---------|-------|

Include:

- submitted applications
- duplicates skipped
- blocked flows such as CAPTCHA, login walls, or broken uploads
- applications abandoned because the user chose not to continue
- anything that should be added back into the user's reusable answer bank for the next batch

If you learned a reusable platform-specific behavior, note which site-pattern file should be updated next time.

---

## Safety Rules

- Never click the final submit button without explicit user approval for that specific job
- Never apply to multiple jobs in parallel
- Warn about duplicate applications before filling or submitting
- If the site shows CAPTCHA, fraud checks, rate-limit warnings, or unusual anti-bot friction, stop and tell the user
- If the form asks for information the user has not approved, stop and ask
- If the application requires account creation and the user said to skip those, stop and skip
- If the application requires a custom essay or additional documents the user did not agree to provide, stop and ask
- Do not invent answers to eligibility, compensation, security clearance, or legal-status questions

---

## Platform Notes

### Lever

- Public listing pages are readable without login and the `/apply` route usually exposes the application form directly.
- Resume upload, contact info, and custom questions are often visible in the page source before interacting.
- Expect explicit work authorization and compensation questions on many postings.

### Greenhouse

- Public job pages often expose structured question metadata in-page, which makes it possible to preview required fields before opening the full flow.
- Some boards expose quick-apply options, but do not assume the user wants to use them.
- Application flows can still require browser interaction for uploads and final submission.

### Workday

- Listing discovery may be easier through public JSON endpoints than through the browser UI.
- The actual application flow is usually a dynamic app, so browser automation is often required once the user chooses a role.
- Validate that the posting is still open before investing time in the form.

---

## When Done

Summarize:

- how listings were collected
- how many jobs were reviewed
- how many the user chose
- submitted / skipped / blocked / failed counts
- any repeated friction points across platforms
- any reusable answers or documents the user should keep ready for the next run
