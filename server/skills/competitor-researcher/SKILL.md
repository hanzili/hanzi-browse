---
name: competitor-researcher
description: Research SaaS and AI-tool competitors in a real browser. Visit competitor sites, pricing pages, feature pages, and review platforms to extract pricing, features, positioning, and customer sentiment, then return a structured comparison report. Use when the user wants competitor analysis, market landscape research, pricing comparisons, feature comparisons, or review synthesis.
---

# Competitor Researcher

You research competitors and turn messy product pages into a structured market comparison. This skill is read-only: observe, extract, compare, and report. Do not sign in, submit forms, or mutate any site state.

## Tool Selection Rule

- **Prefer existing tools first**: If a competitor page is public and renders well without a browser, use normal web fetches or other available tools first.
- **Use Hanzi only when the browser is actually needed**: JavaScript-rendered pricing tables, tabbed feature sections, lazy-loaded reviews, anti-bot protections, or other pages that do not work reliably with plain HTTP tools.
- **Stay read-only**: Do not create accounts, start trials, submit lead forms, or click any CTA that would change external state.

## Before Starting — Preflight Check

Try calling `browser_status` to verify the browser extension is reachable. If the tool doesn't exist or returns an error:

> **Hanzi isn't set up yet.** This skill needs the hanzi browser extension running in Chrome.
>
> 1. Install from the Chrome Web Store: https://chromewebstore.google.com/detail/hanzi-browse/iklpkemlmbhemkiojndpbhoakgikpmcd
> 2. The extension will walk you through setup (~1 minute)
> 3. Then come back and run this again

---

## What You Need From the User

Before opening a browser, confirm:

1. **Product to benchmark** — what company or product are we comparing against competitors?
2. **Competitors** — exact competitor names or URLs. If unknown, ask whether to discover likely competitors first.
3. **Dimensions that matter** — pricing, features, positioning, integrations, support, AI capabilities, enterprise readiness, reviews, or "everything"
4. **Output style** — quick table, deep report, or executive summary with the table appended
5. **Scope limits** — how many competitors to research and whether to include review sites like G2, Capterra, and Product Hunt

Optional:
- Region or market segment (SMB, enterprise, developer tools, agencies, healthcare, etc.)
- Which pricing plan to focus on if there are many
- Whether to include screenshots as evidence

If the request is underspecified, pause and confirm the scope before opening a browser.

---

## Safety: Keep It Observational

Competitor research should not create accounts or trigger outreach.

Before proceeding:

- Confirm the user wants **read-only research**
- Avoid sign-up, booking-demo, free-trial, or contact-sales flows
- Do not scrape private dashboards or gated customer areas
- If a site blocks access with a CAPTCHA, bot wall, or login wall, stop on that source and note the limitation

Safe actions:
- Reading landing pages, pricing pages, feature pages, help docs, changelogs, and public reviews
- Expanding tabs, accordions, or "show more" sections when needed to read public content

Unsafe actions:
- Submitting forms
- Starting trials
- Entering contact information
- Logging into accounts without explicit user approval

---

## Phase 1: Plan the Research

Start by restating the target:

```text
Product: {target product}
Competitors: {list}
Dimensions: {pricing, features, positioning, reviews, etc.}
Output: {table / deep report / summary}
Review sources: {G2 / Capterra / Product Hunt / none}
```

For each competitor, identify likely sources:

| Source Type | Typical Pages |
|-------------|---------------|
| Official site | home page, pricing, features, integrations, enterprise, docs |
| Review platforms | G2, Capterra, Product Hunt |
| Supporting evidence | blog, changelog, docs, comparison pages |

If the competitor list is not provided, discover a short list first by reading public comparison pages and review listings, then confirm with the user before continuing.

---

## Phase 2: Gather Official Product Data

For each competitor, collect the following from public product pages:

- **Pricing** — plan names, list prices, usage limits, free tier, free trial, enterprise/contact-sales positioning
- **Features** — core features, standout capabilities, integrations, AI features, compliance/security claims
- **Positioning** — hero headline, subheadline, target customer, strongest messaging angle
- **Social proof** — customer logos, testimonials, usage numbers, case studies, badges

Prefer plain fetches for simple pages. Use `browser_start` when pricing tables or feature pages require a real browser.

### Browser extraction prompt pattern

When Hanzi is needed, use a task like:

```text
Visit this competitor's public site and extract structured product information. Read the home page, pricing page, and feature page if available. Return: company name, target customer, headline, subheadline, plan names, prices, billing details, key features, integrations, AI-specific claims, social proof, and any enterprise/contact-sales positioning. Expand tabs or accordions if needed, but do not sign up or submit forms.
```

If a site has multiple pricing toggles or tabs:
- Read monthly and annual pricing when available
- Note which values are hidden behind "contact sales"
- Call out usage-based pricing separately from seat-based pricing

If `browser_start` times out:
- Call `browser_screenshot` to see where it got stuck
- Retry once with a tighter task focused on just the missing page
- If it still fails, record the limitation and move on

---

## Phase 3: Gather Review Sentiment

Review sites are often the reason a real browser helps. For each competitor, check whichever of these are available:

- **G2**
- **Capterra**
- **Product Hunt**

Extract:
- Average rating if visible
- Review count if visible
- Repeated positives
- Repeated complaints
- Notable buyer segments or use cases

Do not try to summarize every review. Instead, synthesize recurring themes.

### Review synthesis rules

- Use at least 3 review signals per competitor when available
- Separate **strengths** from **complaints**
- Prefer recent or clearly visible feedback over old buried content
- If review data is sparse, say so explicitly instead of guessing

---

## Phase 4: Compare and Normalize

Once extraction is complete, normalize competitors into the same categories so the output is easy to compare.

Recommended comparison dimensions:

| Dimension | What to capture |
|-----------|-----------------|
| Pricing model | free, free trial, seat-based, usage-based, enterprise-only |
| Entry price | cheapest visible paid plan |
| Best-fit customer | indie, SMB, mid-market, enterprise, developer teams |
| Core strength | what they emphasize most |
| Differentiators | what appears unique or especially strong |
| Weaknesses / gaps | what is absent, unclear, or criticized in reviews |
| Review sentiment | recurring praise and recurring complaints |

If the user asked for custom dimensions, include those too.

---

## Phase 5: Output the Research Report

Always produce two parts:

### 1. Structured comparison table

Use a table like this:

| Competitor | Entry Price | Pricing Model | Best For | Core Strength | Key Gaps | Review Sentiment |
|------------|-------------|---------------|----------|---------------|----------|------------------|
| ExampleCo | $29/mo | seat-based | SMB teams | strong workflow automation | weak reporting | praised for ease of use, criticized for pricing |

### 2. Positioning and market summary

After the table, summarize:

- How each competitor positions itself
- Which competitors compete most directly with the target product
- Where pricing clusters or diverges
- Which features are becoming table stakes
- What review themes repeat across the market
- What whitespace or differentiation opportunities appear

### Output template

```text
Competitor Research Report

Target product: {product}
Competitors researched: {N}
Sources used: official sites, pricing pages, feature pages, {review sites}

[comparison table]

Positioning differences
- Competitor A positions around ...
- Competitor B positions around ...

Market insights
- Pricing trend:
- Feature trend:
- Review pattern:
- Opportunity:

Limitations
- Competitor C blocked browser access on its pricing page
- Competitor D had no public review profile on G2/Capterra
```

If the user asked for a short answer, compress the summary but keep the table.

---

## Example Output

The following example shows how to transform the raw browser findings above into the final report format described in Phase 5.

### Competitor Research Report

Target product: AI coding assistant for developers

Competitors researched: 5

Sources used: official sites, pricing pages, feature pages, G2 review pages

| Competitor | Entry Price | Pricing Model | Best For | Core Strength | Key Gaps | Review Sentiment |
|------------|-------------|---------------|----------|---------------|----------|------------------|
| Cursor | $20/mo | free + seat-based + enterprise | developers who want codebase-aware agents | cloud-agent workflows across coding, bug fixing, and audits | resource-heavy on larger codebases; some inaccurate output | praised for context-aware suggestions and ease of use; criticized for occasional bad code and pricing |
| GitHub Copilot | $10/user/mo | free + seat-based + enterprise paths | developers and teams already working across GitHub and IDE workflows | broad workflow coverage from editor to terminal to enterprise | weaker project-specific accuracy in some cases; limited context in larger files | praised for ease of use, IDE integration, and productivity; criticized for poor or outdated suggestions |
| Windsurf | $20/mo | free + seat-based + enterprise | professional developers and teams that want a highly agentic IDE workflow | intuitive AI coding experience with strong codebase context and automation | learning curve, documentation gaps, and weaker handling of very large projects | praised for onboarding, AI assistance, and context-aware speed; criticized for occasional slow or inaccurate suggestions |
| Replit | $18/mo | free + credits + seat-based + enterprise | builders and teams focused on rapid prototyping and shipping | agent-driven app creation with strong visual and multi-artifact workflows | billing confusion, expensive credits, and weaker trust around usage transparency | praised for ease of use and rapid prototyping; criticized for pricing, credits, and opaque billing |
| Tabnine | $39/user/mo | annual seat-based + quote-led enterprise | enterprise software organizations and mission-critical teams | enterprise context, privacy, and deployment control | higher entry price, enterprise-heavy posture, and some weaker suggestion quality | praised for ease of use and IDE integration; criticized for poor suggestions, compatibility issues, and resource usage |

#### Positioning differences

- Cursor positions around agentic coding, bug fixing, and codebase exploration.
- GitHub Copilot positions around broad workflow acceleration across editor, terminal, GitHub, and enterprise systems.
- Windsurf positions around an intuitive, flow-preserving AI coding environment for serious development work.
- Replit positions around turning ideas into apps quickly, especially for users who want the agent to carry more of the implementation burden.
- Tabnine positions around enterprise AI infrastructure, emphasizing context, safety, privacy, and organizational control.

#### Market insights

- Pricing trend: the visible paid cluster still centers around $18 to $20 per month for individual developer plans, while more enterprise-oriented products move upward quickly into $39 to $59 per user per month and premium tiers extend to $200/month.
- Feature trend: code completion is table stakes, while codebase-aware agents, multi-model choice, terminal execution, enterprise governance, and multi-surface workflows are emerging as the main differentiators.
- Review pattern: users consistently reward ease of use, IDE integration, productivity gains, and strong context awareness, but repeatedly warn about inaccurate output, larger-codebase limitations, and pricing or credit transparency.
- Opportunity: a product that combines strong codebase context with better reliability, simpler pricing, and smoother large-project handling would stand out in this market.

#### Limitations

- This example report uses only the competitors validated in this document and keeps the summary high-level.
- Some pricing details reflect the visible public pricing page rather than a checkout flow, so quote-led enterprise paths should be treated as observed marketing pricing rather than transactional pricing.

---


## Example Validation

The following real-world validation was run against Cursor to confirm this workflow works on public SaaS pages that mix pricing toggles, product positioning, and review content.

### Validation 1 — Cursor pricing

**Source:** `https://cursor.com/pricing`

Observed results:
- Billing cadence: monthly or yearly
- Hobby: Free
- Pro: `$20/month` or `$16/month` billed annually
- Pro+: `$60/month` or `$48/month` billed annually
- Ultra: `$200/month` or `$160/month` billed annually
- Teams: `$40/user/month` or `$32/user/month` billed annually
- Enterprise: custom / contact sales

Additional notes:
- The page uses a `Monthly` / `Yearly` toggle, so the agent needs to inspect both views
- Bugbot pricing is listed separately and includes trial details

### Validation 2 — Cursor positioning and features

**Source:** `https://cursor.com`

Observed results:
- Positioning: build, fix bugs, and explore
- Target customer: developers, especially those interested in cloud agents and security-related workflows
- Visible capabilities:
  - build and fix bugs
  - run security audits
  - improve code or docs
  - automation workflows
  - cloud agents

### Validation 3 — Cursor G2 reviews

**Source:** `https://www.g2.com/products/cursor/reviews`

Observed results:
- Visible rating: `4.5/5`
- Review count: `43 reviews`
- Common positives:
  - context-aware suggestions
  - seamless AI integration
  - improved coding efficiency and productivity
  - ease of use
- Common complaints:
  - occasionally inaccurate code
  - resource-intensive on larger codebases
  - Composer 2 is expensive
  - inconsistent coding quality

Practical note:
- The initial page read did not expose enough review detail; the agent had to scroll and re-read the page. Expect review sites to need extra interaction before the visible summary becomes accessible.

### Validation 4 — GitHub Copilot pricing

**Source:** `https://github.com/features/copilot/plans`

Observed results:
- Free: `Free`
- Pro: `$10 USD / user / month`
- Pro+: `$39 USD / user / month`

Additional notes:
- The visible pricing on the page focused on individual plans
- Free includes `50` agent/chat requests per month and `2,000` completions per month
- Pro includes a `30-day` free trial
- The page also exposes a `For businesses` tab and a `Contact sales` path for business or enterprise details

### Validation 5 — GitHub Copilot positioning and features

**Source:** `https://github.com/features/copilot`

Observed results:
- Positioning: `GitHub Copilot — Command your craft. Your AI accelerator for every workflow, from the editor to the enterprise.`
- Target customer: developers and teams working across editors, IDEs, GitHub, project tools, chat apps, terminals, and enterprise environments
- Visible capabilities:
  - choose among different LLMs based on speed, accuracy, or cost
  - use GitHub Copilot, custom agents, or trusted third-party agents
  - stay in flow across GitHub, IDEs, project tools, chat apps, and custom MCP servers
  - get in-editor help for explanation, completion, edit proposals, and file validation
  - bring Copilot into terminal workflows to plan and execute commands with GitHub context

### Validation 6 — GitHub Copilot G2 reviews

**Source:** `https://www.g2.com/products/github-copilot/reviews`

Observed results:
- Visible rating: `4.5/5`
- Review count: `239 published reviews`
- Common positives:
  - ease of use
  - coding assistance
  - contextual suggestions that speed up development
  - strong IDE integration and visible productivity gains
- Common complaints:
  - poor coding quality in some suggestions
  - poor or outdated suggestions
  - occasional slow responses
  - limited context handling in larger files

Practical note:
- The page exposed both tag-level counts and reviewer commentary, which made it possible to separate repeated praise from repeated complaints without reading every review.

### Validation 7 — Windsurf pricing

**Source:** `https://windsurf.com/pricing`

Observed results:
- Free (Individual): `$0/month`
- Pro (Individual): `$20/month`
- Max (Individual): `$200/month`
- Teams: `$40/user/month`
- Enterprise: custom / let's talk

Additional notes:
- The pricing page exposes an ongoing free tier
- A `2-week` free trial is called out for first-time Pro users
- Teams and Enterprise focus on centralized billing, analytics, support, data-retention controls, and enterprise access features

### Validation 8 — Windsurf positioning and features

**Source:** `https://windsurf.com`

Observed results:
- Positioning: `Where developers are doing their best work` with `the most intuitive AI coding experience`
- Target customer: professional developers and engineering teams, including enterprise users working in larger codebases
- Visible capabilities:
  - Cascade agent that understands the full codebase and collaborates in real time
  - Windsurf Tab workflow that chains movement, imports, and code edits from one keystroke
  - persistent memories, lint fixing, and `continue my work` context
  - MCP and custom tool integrations plus drag-and-drop UI or image to code generation
  - terminal assist and Turbo mode for faster automated execution

### Validation 9 — Windsurf G2 reviews

**Source:** `https://www.g2.com/products/exafunction-windsurf/reviews`

Observed results:
- Visible rating: `4.2/5`
- Review count: `31 public G2 reviews`
- Common positives:
  - ease of use
  - strong AI coding assistance and autocomplete
  - quick onboarding
  - seamless integration with other development tools
  - productivity gains from fast, context-aware suggestions
- Common complaints:
  - less smooth handling on very large projects
  - interface and advanced options have a learning curve
  - documentation gaps
  - occasional slow or inaccurate suggestions
- pricing concerns as usage-based allowances become more visible

### Validation 10 — Replit pricing

**Source:** `https://replit.com/pricing`

Observed results:
- Starter: `Free`
- Replit Core: `$18/month` billed annually, shown as a discount from `$20/month`
- Replit Pro: `$90/month` billed annually, shown as a discount from `$100/month`
- Enterprise: custom / contact sales

Additional notes:
- Starter includes free daily Agent credits and free credits for AI integrations
- Core includes `$20` monthly credits, up to `5` collaborators, unlimited workspaces, and longer autonomous builds
- Pro includes `$100` monthly credits, more collaborators and viewers, private deployments, restore support, and premium support
- Enterprise adds SSO/SAML, privacy controls, data warehouse connections, region selection, static outbound IPs, and other enterprise infrastructure features

### Validation 11 — Replit positioning and features

**Source:** `https://replit.com`

Observed results:
- Positioning: `Turn ideas into apps in minutes — no coding needed`
- Target customer: builders and teams who want to describe a product idea and let the agent handle implementation details
- Visible capabilities:
  - Infinite Canvas for visual exploration and design tweaks
  - Parallel Agents that work across tasks like auth, database, and design at the same time
- Multiple Artifacts for building web apps, mobile apps, landing pages, and videos in one project
- team sequencing that organizes submitted requests into a better execution order

### Validation 12 — Replit G2 reviews

**Source:** `https://www.g2.com/products/replit/reviews`

Observed results:
- Visible rating: `4.5/5`
- Review count: `329 public reviews`
- Common positives:
  - ease of use
  - intuitive interface
  - quick prototyping and deployment for full-stack apps
  - accessible workflow for beginners and rapid prototyping teams
- Common complaints:
  - expensive pricing and high credit consumption
  - billing confusion and hidden charges
  - weak warnings when usage limits are exceeded
  - difficulty cancelling and unsatisfactory support responses

Practical note:
- The page exposed both tag counts and a recent reviewer complaint, which made it possible to connect the summary-level billing concerns with a concrete example of user frustration.

### Validation 13 — Tabnine pricing

**Source:** `https://www.tabnine.com/pricing`

Observed results:
- Tabnine Code Assistant Platform: `$39/user/month`
- Tabnine Agentic Platform: `$59/user/month`

Additional notes:
- Both visible prices are shown as `Annual subscription`
- The public pricing page emphasizes private, secure, enterprise-oriented deployment
- The page highlights `Get a quote` rather than a self-serve checkout flow
- Usage note: unlimited usage is available when using your own on-prem or cloud LLM endpoint; Tabnine-hosted LLM usage is billed based on provider prices plus a handling fee

Practical note:
- The browser run for this pricing page escalated instead of returning a clean summary, so the pricing details were normalized from the public page content directly.

### Validation 14 — Tabnine positioning and features

**Source:** `https://www.tabnine.com`

Observed results:
- Positioning: `the missing layer in enterprise AI`
- Target customer: enterprise software organizations, mission-critical teams, and developers who need reliable, safe AI coding assistance
- Visible capabilities:
  - Enterprise Context Engine that learns architecture, frameworks, and coding standards
  - AI Coding Platform that injects enterprise context into IDE workflows and other tools
  - flexible deployment across SaaS, on-prem, and fully air-gapped environments
  - centralized control plane with access controls, policy enforcement, and auditability

### Validation 15 — Tabnine G2 reviews

**Source:** `https://www.g2.com/products/tabnine/reviews`

Observed results:
- Visible rating: `4.1/5`
- Review count: `46 reviews`
- Common positives:
  - ease of use
  - coding assistance
  - productivity gains from context-aware suggestions
  - strong IDE integration and team-oriented workflows
  - security and privacy controls
  - language versatility across environments
- Common complaints:
  - quality and reliability issues in some outputs
  - resource-intensive performance on larger projects
  - free-tier constraints for hobby or lighter users
  - pricing concerns and missing mid-tier options
  - customer-support and account-control frustrations

Practical note:
- The G2 page needed repeated scrolling before the strongest review-summary signals and the most detailed reviewer complaints became visible.

---

## Rules

- Confirm scope before researching
- Prefer non-browser reads first; use Hanzi when the browser adds real value
- Stay read-only at all times unless the user explicitly says otherwise
- Do not invent pricing, review counts, or features that were not observed
- Distinguish clearly between observed facts and your synthesis
- If data is missing, say "not publicly visible" instead of guessing
- Focus on SaaS and AI tools by default, but adapt if the user names another public product category
- If one source contradicts another, note the discrepancy instead of silently picking one
