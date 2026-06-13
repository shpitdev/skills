# Slant4D Direct MCP Setup

Read this only when the user is connecting an agent directly to the Slant4D
Worker MCP endpoint, debugging OAuth, or asking how the direct MCP surface works.

## Agent Connection

- Product: `https://slant4d.com`
- Codex plugin: `slant4d-mcp`
- Client MCP server: `slant4d-direct`
- Remote MCP endpoint: `https://agents.slant4d.com/mcp`
- Local dev MCP endpoint: `http://localhost:5177/mcp`
- Code Mode skill, for the portal search/execute surface: `$slant4d-codemode`
- Auth: Cloudflare Access Managed OAuth for interactive clients, or service
  token headers from environment-managed scripts

Use this setup only when the user explicitly wants direct top-level Slant4D MCP
tools. If the goal is Code Mode or Codex API-style JavaScript execution, use
`$slant4d-codemode`.

Slant4D auth is handled by Cloudflare Access. Do not ask the user for an API key,
bearer token, Cloudflare Access cookie, or service token, and do not suggest
pasting secrets into chat. If an unauthenticated MCP request returns `401` with
protected resource metadata, the endpoint is reachable and the next step is
interactive sign-in from the MCP client.

## Codex

Install the Codex plugin:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add slant4d-mcp@shpitdev-skills
```

To add the direct Streamable HTTP server manually:

```bash
codex mcp add slant4d-direct --url https://agents.slant4d.com/mcp
codex mcp login slant4d-direct
```

After login, verify the client lists the direct Slant4D tools such as
`operator.health`, not only `portal_codemode_search` and
`portal_codemode_execute`.

## Claude Code

Add the direct HTTP server:

```bash
claude mcp add --transport http slant4d-direct https://agents.slant4d.com/mcp
```

Claude Code should start the Access OAuth flow on first use when authentication
is required.

## Service-Token Smoke Tests

For CI or operator smoke scripts, keep Access service tokens in environment
variables and pass them as request headers from code. The Slant4D repo smoke
scripts use:

```text
SLANT4D_AGENTS_MCP_ACCESS_CLIENT_ID
SLANT4D_AGENTS_MCP_ACCESS_CLIENT_SECRET
SLANT4D_AGENTS_MCP_URL
```

Do not paste those values into chat. In the Slant4D repo, the relevant scripts
are:

```bash
corepack pnpm run smoke:mcp:agents
corepack pnpm run smoke:mcp:agents:access
```

## Direct MCP Surface

Current tools:

- `operator.health`
- `catalog.searchProducts`
- `catalog.getProduct`
- `catalog.listProductImages`
- `catalog.syncProducts`
- `catalog.pruneToSeed`
- `inventory.listRecords`
- `corpus.getManifest`
- `corpus.validateManifest`
- `corpus.diffManifest`
- `corpus.applyManifest`
- `proof.runLifecycleCase`

Current prompts:

- `audit-environment`
- `sync-corpus-case`
- `prove-lifecycle-case`

Use `operator.health` first. For broad reads, prefer summary modes and bounded
limits before requesting record-level output.

## Troubleshooting

- Confirm the client is pointed at `https://agents.slant4d.com/mcp`, not the
  portal URL.
- Confirm the MCP server name is `slant4d-direct` when using this setup.
- If the client shows only `portal_codemode_search` and
  `portal_codemode_execute`, it is connected to the Code Mode portal. Switch to
  `$slant4d-codemode` or replace the registration with the direct endpoint.
- If the direct tools do not include `operator.health` and `catalog.syncProducts`,
  the client is seeing a stale deployment or stale cached plugin.
- If an OAuth browser opens, let the user complete the Cloudflare Access sign-in
  before retrying the MCP call.
- If service-token smoke tests fail, check that both Access client id and secret
  environment variables are set together.
