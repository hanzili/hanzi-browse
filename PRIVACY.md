# Privacy Policy for Hanzi

Last updated: March 18, 2026

## Overview

Hanzi is a browser execution platform for AI agents. It operates in multiple modes with different data handling characteristics. This policy explains what data is processed in each mode.

## BYOM Local Mode

When you use Hanzi locally with your own model provider (BYOM Local):

- **No data is sent to Hanzi servers.** All processing happens on your machine.
- Screenshots and page content are sent only to your chosen AI provider (Anthropic, OpenAI, Google, etc.) according to their privacy policies.
- API keys and credentials are stored locally in Chrome's secure storage.
- Conversation history is stored locally and can be cleared at any time.

## Managed Mode

When you use Hanzi's managed service (sign in at api.hanzilla.co):

- **Task data is processed on Hanzi servers.** This includes task descriptions, page content, screenshots, and tool execution results.
- Hanzi routes AI inference through its own model provider (currently Google Vertex AI). Your data is processed according to [Google Cloud's data processing terms](https://cloud.google.com/terms/data-processing-terms).
- Task records, usage data, and session metadata are stored in Hanzi's database (hosted on Neon Postgres in AWS US East).
- Browser session tokens are stored as hashed values. API keys are stored as hashed values.
- You can request deletion of your data by contacting us.

## API / SDK Mode

When a developer integrates Hanzi via the API/SDK:

- The same data handling as Managed Mode applies.
- Task execution data is attributed to the developer's workspace for usage tracking.
- The developer is responsible for informing their end users about Hanzi's role in data processing.

## What Hanzi Does Not Do

Across all modes, Hanzi:

- Does NOT sell or share user data with third parties for advertising
- Does NOT track browsing history outside of active task execution
- Does NOT retain screenshots or page content beyond the task session (managed mode stores task answers and usage metrics, not raw page content)

## Third-Party Services

Depending on your mode, data may be processed by:

- **Google Vertex AI** (managed mode): [Google Cloud Privacy](https://cloud.google.com/terms/data-processing-terms)
- **Anthropic** (BYOM local): [Anthropic Privacy](https://www.anthropic.com/privacy)
- **OpenAI** (BYOM local): [OpenAI Privacy](https://openai.com/privacy)
- **Neon** (managed mode database): [Neon Privacy](https://neon.tech/privacy)

## Extension Permissions

The Chrome extension requires broad permissions (`<all_urls>`) to:

- Read page content for AI understanding
- Take screenshots for visual analysis
- Interact with page elements (click, type, scroll)
- Manage browser tabs

These permissions are used solely for browser automation at your request.

## Contact

For questions about this privacy policy: hanzili0217@gmail.com

Or open an issue: https://github.com/hanzili/hanzi-browse/issues

## Changes

We may update this policy as the product evolves. Changes will be posted to this page with an updated date.
