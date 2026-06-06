# Slant4D Setup

Read this only when the user is connecting an agent to Slant4D, debugging
OAuth, or asking how Slant4D operator MCP auth works.

## Agent Connection

- Product: `https://slant4d.com`
- Client MCP server: `slant4d-codemode`
- Code Mode portal URL: `https://agents-portal.slant4d.com/mcp?codemode=search_and_execute`
- Upstream MCP server, Cloudflare AI Controls only: `https://agents.slant4d.com/mcp`
- Auth: Cloudflare Access OAuth through the portal

Register only the Code Mode portal with agent clients. The direct upstream
endpoint is owned by Cloudflare AI Controls and should not be added to Codex,
Claude Code, OpenCode, or other user-facing MCP configs from this skill. Adding
it directly exposes every operator tool to the client and defeats Code Mode's
small search/execute surface.

Slant4D MCP uses OAuth. Do not ask the user for an API key, bearer token,
Cloudflare Access cookie, or service token, and do not suggest pasting secrets
into chat. If an unauthenticated MCP request returns `401` with protected
resource metadata, the endpoint is reachable and the next step is interactive
sign-in from the MCP client.

## Codex

The Slant4D Codex plugin registers this server automatically. To add it
manually:

```bash
codex mcp add slant4d-codemode -- \
  npx -y mcp-remote@latest \
  'https://agents-portal.slant4d.com/mcp?codemode=search_and_execute'
```

Use the `mcp-remote` stdio bridge for Codex Code Mode. Codex native HTTP MCP
can treat the query-string URL as the OAuth resource, while the portal expects
the base MCP URL as its resource. The bridge authenticates against the portal
correctly and exposes the portal Code Mode tools.

## Claude Code

Add only the Code Mode portal:

```bash
claude mcp add slant4d-codemode -- \
  npx -y mcp-remote@latest \
  'https://agents-portal.slant4d.com/mcp?codemode=search_and_execute'
```

Use the `mcp-remote` stdio bridge for Claude Code Mode too. Claude native HTTP
MCP can start the OAuth flow for the portal, but non-interactive agent runs may
only see auth helper tools until browser auth finishes. The bridge exposes the
portal Code Mode tools once its OAuth cache is valid.

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

Use search to inspect available upstream tools. `codemode.tools()` is available
in the search sandbox:

```js
async () => {
  const tools = await codemode.tools();
  return tools.map((tool) => ({
    name: tool.name,
    rawName: tool.rawName,
    params: Object.keys(tool.inputSchema?.properties || {})
  }));
}
```

Use execute to call a JavaScript-safe upstream method name returned by search.
`codemode.tools()` is not available in the execute sandbox:

```js
async () => {
  return codemode.slant4d_agents_prod_catalog_pruneToSeed({
    dryRun: true,
    limit: 5
  });
}
```

Tool responses may be structured objects or MCP content blocks depending on the
upstream operation. When the response is a text content block containing JSON,
parse the `text` field before summarizing it.

## Pi

Do not invent a Pi MCP setup command. Use Codex, Claude Code, or OpenCode until
Pi has documented remote MCP OAuth support for this endpoint.

## Troubleshooting

- Confirm the client is pointed at the portal URL with
  `?codemode=search_and_execute`.
- Confirm `slant4d-codemode` is a stdio server that runs
  `npx -y mcp-remote@latest` against the portal URL.
- A bare HTTP check should return `401` and include protected resource metadata;
  that is good reachability evidence, not a server outage.
- Expected visible tools are only `portal_codemode_search` and
  `portal_codemode_execute`. Some clients may display those as search and
  execute.
- If catalog, corpus, inventory, or lifecycle proof tools appear directly in the
  client tool list, an old direct `slant4d` MCP registration is still present.
  Remove it and keep only `slant4d-codemode`.
- If a native HTTP Code Mode entry times out, shows zero tools, or only exposes
  auth helper tools, replace it with the `mcp-remote` stdio entry above.
- If execute returns a re-authentication error, complete the portal OAuth flow
  for the `mcp-remote` server and retry the same execute call.
- If the browser opens, let the user finish the Cloudflare Access sign-in before
  retrying the MCP call.
- If Claude Code does not open a browser, run `/mcp` and authenticate from that
  menu. If a redirect fails after sign-in, paste the full callback URL from the
  browser into Claude's URL prompt.
- After sign-in, start with Code Mode search plus read-only upstream operations
  such as inventory, catalog, corpus validation, or diff tools before applying
  writes.
