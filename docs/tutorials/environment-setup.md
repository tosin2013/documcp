---
documcp:
  last_updated: "2026-05-07"
  last_validated: "2026-05-07"
  auto_updated: false
  update_frequency: monthly
---

# Environment Setup

This page walks you through verifying your environment, installing DocuMCP, and connecting it to your AI client. After this page you will be ready to start the [Getting Started](./getting-started.md) tutorial.

## Prerequisites

### Required Versions

| Tool    | Minimum version | Check            |
| ------- | --------------- | ---------------- |
| Node.js | 20.0.0          | `node --version` |
| npm     | latest stable   | `npm --version`  |
| Git     | latest stable   | `git --version`  |

Verify each one now:

```bash
node --version
# expected: v20.x.x or higher

npm --version
# expected: 10.x.x or higher

git --version
# expected: git version 2.x.x
```

If Node.js is below v20, use [nvm](https://github.com/nvm-sh/nvm) or the [Node.js official installer](https://nodejs.org) to upgrade.

---

## Install DocuMCP

### Option A — npm global install (recommended)

```bash
npm install -g documcp
```

Verify the install:

```bash
npx documcp --version
```

You should see `1.0.0` (or higher).

### Option B — Build from source

Use this if you want to contribute to DocuMCP or work with the latest unreleased code.

```bash
git clone https://github.com/tosin2013/documcp.git
cd documcp
npm install
npm run build
```

When using Option B, set the `command` and `args` in your MCP client config to point directly to the built file:

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/absolute/path/to/documcp/dist/index.js"]
    }
  }
}
```

---

## Configure Your AI Client

Pick the config for your client and add it to the correct file, then restart the application.

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (or **Settings > MCP** in the UI)

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

### VS Code (GitHub Copilot)

`settings.json` (open via **Cmd/Ctrl + Shift + P → Preferences: Open User Settings (JSON)**)

```json
{
  "mcp.servers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

### Claude Code (CLI)

If you are using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) from the terminal, register DocuMCP with a single command.

**npm install (global):**

```bash
claude mcp add documcp -- npx documcp
```

**git clone / local build** (replace the path with wherever you cloned the repo):

```bash
claude mcp add documcp -- node /path/to/documcp/dist/index.js
```

Verify the registration:

```bash
claude mcp list
```

No restart needed — Claude Code picks up new MCP servers immediately.

---

## Verify the Connection

After restarting your AI client, send this prompt:

```
What tools does DocuMCP provide?
```

A healthy server responds with a list of available tools. If you get an error:

1. Confirm `npx documcp --version` prints `1.0.0` in your terminal
2. Confirm the config file is valid JSON (use [jsonlint.com](https://jsonlint.com) to check)
3. Fully quit and reopen your AI client (not just a window close)
4. Check the AI client logs for MCP server startup errors

---

## GitHub Token Setup (Optional)

Some DocuMCP features — such as creating GitHub Actions workflows — work without a token. If you want DocuMCP to interact with GitHub's API (checking repository settings, verifying Actions permissions, etc.), provide a token.

### Create a token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes: `repo`, `workflow`, `read:org`
4. Copy the token

### Pass it to DocuMCP

Add it as an environment variable in your MCP config:

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_yourTokenHere"
      }
    }
  }
}
```

---

## Next Steps

Your environment is ready. Continue with the [Getting Started](./getting-started.md) tutorial to run your first repository analysis and set up documentation.
