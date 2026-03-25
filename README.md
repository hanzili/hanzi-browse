# Your agent stops when it needs a browser. Hanzi Browse lets it keep going.

**Hanzi Browse** gives your AI agent your real signed-in browser. One tool call, entire task delegated.

Works with Claude Code, Cursor, Codex, Windsurf, VS Code, Gemini CLI, Amp, Cline, Roo Code, and more.

[![Watch demo](https://img.youtube.com/vi/3tHzg2ps-9w/maxresdefault.jpg)](https://www.youtube.com/watch?v=3tHzg2ps-9w)

## Get Started

```bash
npx hanzi-browse setup
```

One command. Detects your browsers, installs the extension, finds every AI agent on your machine, configures the MCP server, and installs browser skills. Setup asks how you want to provide the AI:

- **Managed** — we handle the AI. 20 free tasks/month, then $0.05/task. No API key needed.
- **Bring your own model** — use your Claude Pro/Max subscription, GPT Plus, or any API key. Free forever, runs locally.

<details>
<summary>Manual setup</summary>

1. **[Install the browser extension](https://chrome.google.com/webstore/detail/iklpkemlmbhemkiojndpbhoakgikpmcd)**

2. Add the MCP server:

**Claude Code:**
```bash
claude mcp add browser -- npx -y hanzi-browse
```

**Cursor / Windsurf / Others** (mcp.json):
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "hanzi-browse"]
    }
  }
}
```

3. Credentials — pick one:
   - Claude Pro/Max: uses `claude login` automatically
   - GPT Plus / Codex: run `codex login`
   - API key: set `ANTHROPIC_API_KEY`
   - Managed: set `HANZI_API_KEY` (get one from [the dashboard](https://api.hanzilla.co/dashboard))
</details>

## Build with Hanzi Browse

Embed browser automation in your product. Your app calls the Hanzi API, a real browser executes the task, you get the result back.

1. **Get an API key** — [sign in](https://api.hanzilla.co/dashboard) to your developer console, then create a key
2. **Pair a browser** — create a pairing token, send your user a pairing link (`/pair/{token}`) — they click it and auto-pair
3. **Run a task** — `POST /v1/tasks` with a task and browser session ID
4. **Get the result** — poll `GET /v1/tasks/:id` until complete, or use `runTask()` which blocks

```typescript
import { HanziClient } from '@hanzi/browser-agent';

const client = new HanziClient({ apiKey: process.env.HANZI_API_KEY });

const { pairingToken } = await client.createPairingToken();
const sessions = await client.listSessions();

const result = await client.runTask({
  browserSessionId: sessions[0].id,
  task: 'Read the patient chart on the current page',
});
console.log(result.answer);
```

[API reference](https://browse.hanzilla.co/docs.html#build-with-hanzi) · [Dashboard](https://api.hanzilla.co/dashboard) · [Sample integration](examples/partner-quickstart/)

## Examples

```
"Go to Gmail and unsubscribe from all marketing emails from the last week"
"Apply for the senior engineer position on careers.acme.com"
"Log into my bank and download last month's statement"
"Find AI engineer jobs on LinkedIn in San Francisco"
```

## Agent Skills

Teach your agent *when* and *how* to use the browser. Install the plugin for your agent:

**Claude Code:**
```bash
/plugin install hanzi-browse
```

**Cursor:**
```bash
/add-plugin hanzi-browse
```

**Codex:**
```bash
git clone https://github.com/hanzili/hanzi-browse.git ~/.codex/hanzi-browse
mkdir -p ~/.agents/skills
ln -s ~/.codex/hanzi-browse/skills ~/.agents/skills/hanzi-browse
```

**Gemini CLI:**
```bash
gemini extensions install https://github.com/hanzili/hanzi-browse
```

The plugin loads browser automation skills into your agent's context. It includes workflow skills for common tasks:

| Skill | Description |
|-------|-------------|
| `hanzi-browse` | Core skill — when and how to use browser automation |
| `e2e-tester` | Test your app in a real browser, report bugs with screenshots |
| `social-poster` | Draft per-platform posts, publish from your signed-in accounts |
| `linkedin-prospector` | Find prospects, send personalized connection requests |
| `a11y-auditor` | Run accessibility audits in a real browser |
| `x-marketer` | Twitter/X marketing workflows |

Open source — [add your own](https://github.com/hanzili/hanzi-browse/tree/main/server/skills).

## Tools

| Tool | Description |
|------|-------------|
| `browser_start` | Run a task. Blocks until complete. |
| `browser_message` | Send follow-up to an existing session. |
| `browser_status` | Check progress. |
| `browser_stop` | Stop a task. |
| `browser_screenshot` | Capture current page as PNG. |

## Pricing

| | Managed | BYOM |
|--|---------|------|
| **Price** | $0.05/task (20 free/month) | Free forever |
| **AI model** | We handle it (Gemini) | Your own key |
| **Data** | Processed on Hanzi servers | Never leaves your machine |
| **Billing** | Only completed tasks. Errors are free. | N/A |

Building a product? [Contact us](mailto:hanzili0217@gmail.com?subject=Partner%20pricing) for volume pricing.

## Development

Prerequisites: [Docker](https://docs.docker.com/get-docker/), Node.js 18+.

```bash
git clone https://github.com/hanzili/hanzi-browse
cd hanzi-browse
make dev
```

This starts Postgres, runs migrations, builds the server + dashboard + extension, and starts the dev servers. Edit `.env` for Google OAuth credentials if you want sign-in to work.

| Command | What it does |
|---------|-------------|
| `make dev` | Start everything |
| `make build` | Build server + dashboard + extension |
| `make stop` | Stop Postgres |
| `make clean` | Stop + delete database |
| `make help` | Show all commands |

Load the extension: open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the `dist/` folder.

## Community

[Join our Discord](https://discord.gg/hahgu5hcA5) · [Documentation](https://browse.hanzilla.co/docs.html)

## Privacy

Hanzi operates in different modes with different data handling. [Read the privacy policy](PRIVACY.md).

- **BYOM**: No data sent to Hanzi servers. Screenshots go to your chosen AI provider only.
- **Managed / API**: Task data processed on Hanzi servers via Google Vertex AI.

## License

[Polyform Noncommercial 1.0.0](LICENSE)
