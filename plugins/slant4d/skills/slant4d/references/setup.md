# Slant4D Setup

Read this only when the user is connecting an agent to Slant4D, debugging
OAuth, or asking how Slant4D operator MCP auth works.

## Agent Connection

- Product: `https://slant4d.com`
- MCP endpoint: `https://agents.slant4d.com/mcp`
- Auth: Cloudflare Access OAuth

Slant4D MCP uses OAuth. Do not ask the user for an API key, bearer token, or
Cloudflare Access cookie, and do not suggest pasting secrets into chat. If an
unauthenticated MCP request returns `401` with protected resource metadata, the
endpoint is reachable and the next step is interactive sign-in from the MCP
client.

## Codex

Run:

```bash
codex mcp add slant4d --url https://agents.slant4d.com/mcp
codex mcp login slant4d
```

Use the normal Slant4D/Cloudflare Access login when the browser opens. The
client should store and refresh OAuth credentials.

## Claude Code

Run:

```bash
claude mcp add --transport http slant4d https://agents.slant4d.com/mcp
```

Then start Claude Code, run `/mcp`, choose the `slant4d` server, and follow the
browser login flow. Claude Code marks HTTP MCP servers as needing auth after a
`401` or `403` response with OAuth metadata.

## OpenCode

Add this to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "slant4d": {
      "type": "remote",
      "url": "https://agents.slant4d.com/mcp",
      "enabled": true
    }
  }
}
```

OpenCode should prompt for OAuth on first use. To trigger auth immediately, run:

```bash
opencode mcp auth slant4d
```

## Pi

Do not invent a Pi MCP setup command. Use Codex, Claude Code, or OpenCode until
Pi has documented remote MCP OAuth support for this endpoint.

## Troubleshooting

- Confirm the client is pointed at `https://agents.slant4d.com/mcp`.
- A bare HTTP check should return `401` and include protected resource metadata;
  that is good reachability evidence, not a server outage.
- If the browser opens, let the user finish the Cloudflare Access sign-in before
  retrying the MCP call.
- If Claude Code does not open a browser, run `/mcp` and authenticate from that
  menu. If a redirect fails after sign-in, paste the full callback URL from the
  browser into Claude's URL prompt.
- If OpenCode does not prompt automatically, run `opencode mcp auth slant4d`.
- After sign-in, start with read-only operator tools such as inventory, catalog,
  corpus validation, or diff tools before applying writes.
