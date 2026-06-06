# Plugin Installation

Use plugins when the user wants the full harness integration: skill metadata,
MCP server registration, marketplace updates, and app/plugin UI visibility.
Use plain skill installation only when the target agent does not support this
plugin system.

## Codex

Codex plugins are published in this repo as `meshix@shpitdev-skills`,
`tabex@shpitdev-skills`, and `slant4d@shpitdev-skills`.

### Meshix

Install from the GitHub marketplace source:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add meshix@shpitdev-skills
```

For PR or branch validation before merge:

```bash
codex plugin marketplace add shpitdev/skills --ref <branch-or-tag>
codex plugin add meshix@shpitdev-skills
```

Verify the plugin and MCP server:

```bash
codex plugin list
codex mcp list
```

Authenticate Meshix MCP:

```bash
codex mcp login meshix
```

Codex plugin metadata marks Meshix auth as `ON_INSTALL`, so the Codex app can
prompt during install. CLI installs may still need the explicit `codex mcp login
meshix` step. A healthy unauthenticated install shows the `meshix` MCP server as
enabled with OAuth; it is not ready to generate designs until OAuth completes.

### Tabex

Install from the GitHub marketplace source:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add tabex@shpitdev-skills
```

Tabex is a CLI and browser-extension workflow. The Codex plugin packages the
skill guidance and UI metadata, but it does not install the Tabex CLI or register
an MCP server. Use the skill setup guidance when `command -v tabex` fails or the
browser source is disconnected.

### Slant4D

Install from the GitHub marketplace source:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add slant4d@shpitdev-skills
```

For PR or branch validation before merge:

```bash
codex plugin marketplace add shpitdev/skills --ref <branch-or-tag>
codex plugin add slant4d@shpitdev-skills
```

Verify the plugin and MCP server:

```bash
codex plugin list
codex mcp list
```

The Slant4D plugin registers only the Cloudflare Code Mode portal as
`slant4d-codemode`. If an existing install does not show `slant4d-codemode`, add
it explicitly:

```bash
codex mcp add slant4d-codemode -- \
  npx -y mcp-remote@latest \
  'https://agents-portal.slant4d.com/mcp?codemode=search_and_execute'
```

Slant4D MCP uses Cloudflare Access OAuth through the portal. Code Mode uses the
`mcp-remote` stdio bridge because Codex native HTTP MCP currently treats the
query-string portal URL as the OAuth resource; the bridge authenticates against
the base portal resource and exposes only `portal_codemode_search` and
`portal_codemode_execute`. If `codex mcp list` still shows a direct `slant4d`
server, remove the stale install and reinstall the Slant4D plugin.

Update an existing Codex install:

```bash
codex plugin marketplace upgrade shpitdev-skills
codex plugin remove meshix@shpitdev-skills
codex plugin add meshix@shpitdev-skills
codex plugin remove tabex@shpitdev-skills
codex plugin add tabex@shpitdev-skills
codex plugin remove slant4d@shpitdev-skills
codex plugin add slant4d@shpitdev-skills
```

Remove old personal/local duplicates first if `codex plugin list` shows more
than one entry for the same plugin:

```bash
codex plugin remove meshix@personal
codex plugin remove tabex@personal
codex plugin remove slant4d@personal
```

## Claude Code

Meshix is currently the only Claude Code plugin published in this repo.
Slant4D is available to Claude Code through MCP setup in the Slant4D skill
reference instead of a Claude plugin. Register only the `mcp-remote` stdio
`slant4d-codemode` server for the Cloudflare Code Mode portal.

Install from the GitHub marketplace source:

```bash
claude plugin marketplace add shpitdev/skills
claude plugin install meshix@shpitdev-skills
```

For PR or branch validation before merge:

```bash
claude plugin marketplace add shpitdev/skills@<branch-or-tag> --sparse .claude-plugin plugins
claude plugin install meshix@shpitdev-skills
```

Verify the plugin and MCP server:

```bash
claude plugin details meshix@shpitdev-skills
claude mcp list
```

Claude Code handles OAuth for HTTP MCP servers interactively. If `claude mcp
list` shows Meshix as `Needs authentication`, open an interactive Claude Code
session and use a Meshix MCP-backed request; Claude opens the browser OAuth flow
on first use. No API key should be pasted into chat.

Update an existing Claude install:

```bash
claude plugin marketplace update shpitdev-skills
claude plugin update meshix@shpitdev-skills
```

Restart Claude Code after plugin updates so new skills and MCP tools are loaded.

If `~/.claude/settings.json` is managed by Nix or another read-only system,
user-scope installs can fail. Use a local/project scope for validation, or add
the durable Claude plugin settings in the machine configuration:

```bash
claude plugin install meshix@shpitdev-skills --scope local
```

### Claude.ai and Claude Desktop

Claude.ai and Claude Desktop do not consume the Claude Code plugin manifest.
Use Claude's remote MCP custom connector flow instead:

1. Open Claude connector settings.
2. Add a custom connector named `Meshix`.
3. Set the connector URL to `https://meshix.app/mcp`.
4. Complete the Meshix OAuth flow when Claude prompts for authentication.

Shortcut link:
[Add Meshix custom connector](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Meshix&connectorUrl=https%3A%2F%2Fmeshix.app%2Fmcp).

This path is the right one for Claude.ai and Claude Desktop because the
connection is hosted by Claude and reaches Meshix over public HTTPS. The
connector can call Meshix MCP tools, but current Claude connector behavior does
not provide host-side polling, MCP subscriptions, or webhook delivery. For
long-running Meshix jobs, ask Claude to run the appropriate follow-up
status/tool call after generation starts.

## Local Development

Use local marketplace installs only while editing this checkout:

```bash
codex plugin marketplace add .
codex plugin add meshix@shpitdev-skills
codex plugin add tabex@shpitdev-skills
codex plugin add slant4d@shpitdev-skills
claude plugin marketplace add . --scope local
claude plugin install meshix@shpitdev-skills --scope local
```

Run the validators before publishing:

```bash
bun run check
uv run --with pyyaml python /Users/anandpant/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py "$PWD/plugins/meshix"
uv run --with pyyaml python /Users/anandpant/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py "$PWD/plugins/tabex"
uv run --with pyyaml python /Users/anandpant/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py "$PWD/plugins/slant4d"
claude plugin validate "$PWD/plugins/meshix" --strict
claude plugin validate "$PWD" --strict
```

Codex plugin packaging currently rejects skill and asset symlinks that point
outside the plugin directory. Keep plugin bundles self-contained and let
`bun run check` enforce that bundled skill files match `skills/<name>`.
