---
domain: lever.co
aliases: [Lever]
updated: 2026-03-29
---

## Platform traits

- Verified on public posting and application pages under `https://jobs.lever.co/{company}/{posting-id}` and `https://jobs.lever.co/{company}/{posting-id}/apply`.
- The application form is server-rendered HTML. Public pages expose meaningful structure without needing to execute the full app first.
- Lever boards commonly expose the entire application form on the `/apply` URL, including upload fields, custom questions, and the final submit button.
- The tested application page included Cloudflare-managed assets and an hCaptcha widget, so public access does not guarantee friction-free submission.

## Effective patterns

- Use the listing URL first, then append `/apply` when you are ready to inspect or fill the form:
  - Listing example: `https://jobs.lever.co/applydigital/b8990278-260e-495b-9eaa-f6f39eae9eff`
  - Apply example: `https://jobs.lever.co/applydigital/b8990278-260e-495b-9eaa-f6f39eae9eff/apply`
- The tested `/apply` page exposed these stable hooks directly in HTML:
  - submit button: `button#btn-submit[data-qa="btn-submit"]`
  - additional info field: `textarea[name="comments"]`
  - hCaptcha container: `div#h-captcha.h-captcha`
  - hidden LinkedIn payload field: `input[name="linkedInData"]`
- Resume upload guidance was visible before interacting:
  - label text: `Attach resume/CV`
  - allowed types shown on page: `pdf, doc, docx, txt, rtf`
  - size note shown on page: `100MB max`
- Custom questions were embedded in the HTML in `cards[...]` sections, with field types visible from source. Verified examples included:
  - free-text textarea for project / portfolio details
  - radio-button questions for timezone overlap, work authorization, English proficiency, and background-check consent
  - text inputs for notice period and compensation
- Because the form is visible in source, Lever is a good candidate for preflight inspection before opening a full browser automation session. You can often learn whether a cover letter, compensation answer, or work authorization response will be required before filling anything.

## Known traps

- hCaptcha is present on the tested apply page. If it blocks submission, stop and ask the user to solve it manually rather than retrying automatically.
- Lever custom questions vary a lot by company. Do not assume the same required fields across postings, even within the same board.
- The page included LinkedIn apply hooks, but that does not mean a LinkedIn autofill path is reliable or available for every posting. Treat it as optional enhancement, not the primary plan.
- Cloudflare challenge scripts were present in the tested page. If the browser lands on a challenge screen or gets rate-limited, pause and let the user intervene.
