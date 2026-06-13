# Slant4D API/Code Mode Setup

Read this only when the user is connecting an agent to Slant4D API/Code Mode,
debugging OAuth, or asking how the Code Mode portal works.

## Agent Connection

- Product: `https://slant4d.com`
- Codex plugin: `slant4d-codemode`
- Client MCP server: `slant4d-codemode`
- Code Mode portal URL: `https://agents-portal.slant4d.com/mcp?codemode=search_and_execute`
- Direct MCP skill, for the Worker `/mcp` endpoint: `$slant4d-mcp`
- Auth: Cloudflare Access OAuth through the portal

Register the Code Mode portal for this skill. Use `$slant4d-mcp` only when the
user explicitly wants the direct Worker MCP surface.

Slant4D auth is handled by Cloudflare Access. Do not ask the user for an API key,
bearer token, Cloudflare Access cookie, or service token, and do not suggest
pasting secrets into chat. If an unauthenticated MCP request returns `401` with
protected resource metadata, the endpoint is reachable and the next step is
interactive sign-in from the MCP client.

## Codex

Install the Codex plugin:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add slant4d-codemode@shpitdev-skills
```

To add the Code Mode bridge manually:

```bash
codex mcp add slant4d-codemode -- \
  npx -y mcp-remote@latest \
  'https://agents-portal.slant4d.com/mcp?codemode=search_and_execute'
```

Use the `mcp-remote` stdio bridge for Codex Code Mode. The bridge exposes the
two Cloudflare Code Mode APIs as `portal_codemode_search` and
`portal_codemode_execute`.

## Claude Code

Add only the Code Mode portal:

```bash
claude mcp add slant4d-codemode -- \
  npx -y mcp-remote@latest \
  'https://agents-portal.slant4d.com/mcp?codemode=search_and_execute'
```

Use the `mcp-remote` stdio bridge for Claude Code Mode too. The bridge exposes
the two Cloudflare Code Mode APIs as `portal_codemode_search` and
`portal_codemode_execute` once OAuth is complete.

## OpenCode

Add this to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "slant4d-codemode": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "mcp-remote@latest",
        "https://agents-portal.slant4d.com/mcp?codemode=search_and_execute"
      ],
      "enabled": true
    }
  }
}
```

OpenCode should run the local bridge and prompt for OAuth on first use.

## How Code Mode Works

Clients should see only the portal Code Mode tools, usually named
`portal_codemode_search` and `portal_codemode_execute`.

Use search to inspect available upstream functions. Search code is JavaScript; a
normal discovery call is:

```js
async () => {
  const tools = await codemode.tools();
  return tools
    .filter((tool) => tool.rawName?.startsWith("slant4d-agents-prod_"))
    .map((tool) => ({
      name: tool.name,
      rawName: tool.rawName,
      params: Object.keys(tool.inputSchema?.properties || {})
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
```

Use execute to call a JavaScript-safe function name returned by search:

```js
async () => {
  return codemode.slant4d_agents_prod_operator_health({});
}
```

For broad results, filter inside the execute JavaScript before returning:

```js
async () => {
  const result = await codemode.slant4d_agents_prod_inventory_listRecords({
    kind: "all",
    mode: "summary"
  });
  const blocks = Array.isArray(result) ? result : result?.content ?? [];
  const text = blocks
    ?.filter((item) => item.type === "text")
    .map((item) => item.text.trim())
    .join("\n");
  const payload = text ? JSON.parse(text) : result?.structuredContent ?? result;
  return {
    counts: payload.counts,
    targetEnvironment: payload.targetEnvironment
  };
}
```

Tool responses may be structured objects or MCP content blocks depending on the
upstream operation. When the response is a text content block containing JSON,
parse the `text` field before summarizing it. Avoid combining expensive proof
calls or broad record dumps in one execute call because they can timeout or
truncate.

Code Mode cannot write repo-local `.memory/` evidence by itself. When a tool
returns a required local command, run that command from a local Slant4D checkout
before calling it lifecycle proof.

## JSON API

Use `https://agents.slant4d.com/api/operator/*` only from scripts or harnesses
that already have Cloudflare Access credentials. In CI/service-token contexts,
the Slant4D repo smoke scripts use:

```text
SLANT4D_AGENTS_MCP_ACCESS_CLIENT_ID
SLANT4D_AGENTS_MCP_ACCESS_CLIENT_SECRET
```

Do not paste those values into chat. For local development, the operator Worker
serves the same JSON routes under `http://localhost:5177/api/operator/*`.

## Pi

Do not invent a Pi MCP setup command. Use Codex, Claude Code, or OpenCode until
Pi has documented remote MCP OAuth support for this endpoint.

## Troubleshooting

- Confirm the client is pointed at the portal URL with
  `?codemode=search_and_execute`.
- Confirm `slant4d-codemode` is a stdio server that runs
  `npx -y mcp-remote@latest` against the portal URL.
- Expected visible tools are only `portal_codemode_search` and
  `portal_codemode_execute`, plus any portal management tools Cloudflare
  provides.
- If catalog, corpus, inventory, or lifecycle proof tools appear directly in the
  client tool list, use `$slant4d-mcp` for that direct surface or remove the old
  direct registration and keep only `slant4d-codemode`.
- If execute returns a re-authentication error, complete the portal OAuth flow
  for the `mcp-remote` server and retry the same execute call.
- If Claude Code does not open a browser, run `/mcp` and authenticate from that
  menu. If a redirect fails after sign-in, paste the full callback URL from the
  browser into Claude's URL prompt.
- After sign-in, start with Code Mode search plus read-only upstream operations
  such as health, inventory, catalog, corpus validation, or diff tools before
  applying writes.
