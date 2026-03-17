# Your agent stops when it needs a browser. Hanzi lets it keep going.

**Hanzi** gives your AI agent your real signed-in browser. One tool call, entire task delegated.

Works with Claude Code, Claude Cowork, Cursor, Codex, Windsurf, and more.

[![Watch demo](https://img.youtube.com/vi/3tHzg2ps-9w/maxresdefault.jpg)](https://www.youtube.com/watch?v=3tHzg2ps-9w)

## Setup

```bash
npx hanzi-in-chrome setup
```

Detects your browsers, installs the extension, finds AI agents on your machine (Claude Code, Cursor, etc.), and adds Hanzi to each one.

<details>
<summary>Manual setup</summary>

1. **[Install the browser extension](https://chrome.google.com/webstore/detail/iklpkemlmbhemkiojndpbhoakgikpmcd)**

2. Add the MCP server:

**Claude Code:**
```bash
claude mcp add browser -- npx -y hanzi-in-chrome
```

**Cursor / Windsurf / Others** (mcp.json):
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "hanzi-in-chrome"]
    }
  }
}
```

3. Credentials — pick one:
   - Claude Pro/Max: uses `claude login` automatically
   - Codex: run `codex login`
   - API key: set `ANTHROPIC_API_KEY`
</details>

## Examples

```
"Go to Gmail and unsubscribe from all marketing emails from the last week"
"Apply for the senior engineer position on careers.acme.com"
"Log into my bank and download last month's statement"
"Find AI engineer jobs on LinkedIn in San Francisco"
```

## Skills

Reusable workflows. Open source — [add your own](https://github.com/hanzili/llm-in-chrome/tree/main/server/skills).

| Skill | Description |
|-------|-------------|
| `linkedin-prospector` | Find prospects, send personalized connection requests |
| `e2e-tester` | Test your app in a real browser, report bugs with screenshots |
| `social-poster` | Draft per-platform posts, publish from your signed-in accounts |

## Tools

| Tool | Description |
|------|-------------|
| `browser_start` | Run a task. Blocks until complete. |
| `browser_message` | Send follow-up to an existing session. |
| `browser_status` | Check progress. |
| `browser_stop` | Stop a task. |
| `browser_screenshot` | Capture current page as PNG. |

## Community

[Join our Discord](https://discord.gg/hahgu5hcA5)

## License

[Polyform Noncommercial 1.0.0](LICENSE)
