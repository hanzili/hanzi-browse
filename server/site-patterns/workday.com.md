---
domain: workday.com
aliases: [Workday]
updated: 2026-03-29
---

## Platform traits

- Verified on General Motors' public board hosted at `generalmotors.wd5.myworkdayjobs.com`.
- The tested board uses Workday's `cxs` app pattern. Listing discovery works through a public JSON endpoint, while individual posting pages are mostly a dynamic app shell.
- Public posting pages can still expose useful runtime configuration in the HTML, including locale, posting availability, and file-type restrictions.
- Workday behavior is tenant-specific. The patterns below were confirmed on the GM tenant and should be re-validated when switching to another employer's Workday board.

## Effective patterns

- For listing discovery, the verified public endpoint was:
  - `POST https://generalmotors.wd5.myworkdayjobs.com/wday/cxs/generalmotors/Careers_GM/jobs`
  - sending `{}` returned JSON with `total`, `jobPostings`, and `facets`
- Useful fields from the listing response included:
  - `title`
  - `externalPath`
  - `locationsText`
  - `postedOn`
  - `remoteType`
  - `bulletFields`
- Use `externalPath` from that JSON to build or verify the public job URL before opening the browser.
- A live posting verified during testing:
  - `https://generalmotors.wd5.myworkdayjobs.com/Careers_GM/job/Remote---United-States/Senior-Data-Engineer_JR-202605861-1`
- The same posting also exposed a canonical URL in HTML using the locale-aware pattern:
  - `https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM/job/Remote---United-States/Senior-Data-Engineer_JR-202605861-1`
- The tested posting page was mostly an SPA shell with `div#root`, but the HTML still exposed runtime values that are useful before automation:
  - `postingAvailable: true`
  - `tenant: "generalmotors"`
  - `siteId: "Careers_GM"`
  - `requestLocale: "en-US"`
  - `supportedLocales: ["en-US", "en-CA", "en-GB", "es", "fr-CA", "fr-FR", "pt-BR", "th-TH", "ko-KR"]`
  - `blockedFileTypes: ["bas", "bat", "com", "exe", "js", "lnk", "ocx", "reg", "sct", "sys", "vb", "vbe", "vbs", "wsc", "wsf", "wsh"]`
- Practical workflow for Workday-backed boards:
  1. use the JSON jobs endpoint to search and collect listings without the browser
  2. verify the posting is still open with the public page and `postingAvailable`
  3. use browser automation only after the user picks a role

## Known traps

- The public posting page is not enough to reveal the full interactive application form. Expect to need a real browser session once you begin the application.
- Workday tenants differ. A pattern confirmed on `generalmotors.wd5.myworkdayjobs.com` should be treated as proven for that tenant, not automatically for every Workday employer.
- Some stale posting URLs still return a page shell but expose `postingAvailable: false`. Check that before investing time in automation.
- Upload restrictions may be partially visible from runtime config, but the absence of explicit allowed types in the tested page means you should still validate uploads in the live flow instead of assuming anything beyond the blocked extensions list.
