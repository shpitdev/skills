# Meshix Setup

Read this only when the user is connecting an agent to Meshix, debugging OAuth,
or asking how Meshix MCP auth works.

## Agent Connection

- Product: `https://meshix.app`
- Agent setup page: `https://meshix.app/agents`
- MCP endpoint: `https://meshix.app/mcp`

Meshix MCP uses OAuth. Do not ask the user for an API key or suggest pasting a
token into chat. If an unauthenticated MCP request returns `401` with protected
resource metadata, that usually means the endpoint is reachable and the next
step is interactive sign-in or client auth setup.

## Plugin Install

When the user wants the full plugin, not only the standalone skill, prefer the
GitHub marketplace source:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add meshix@shpitdev-skills
codex mcp login meshix
```

```bash
claude plugin marketplace add shpitdev/skills
claude plugin install meshix@shpitdev-skills
```

Codex has an explicit `codex mcp login meshix` command for OAuth. Claude Code
handles HTTP MCP OAuth interactively on first use; if `claude mcp list` shows
Meshix as `Needs authentication`, start an interactive Claude session and invoke
a Meshix MCP-backed request so the browser sign-in flow can complete.

## Auth Troubleshooting

- Confirm the client is pointed at `https://meshix.app/mcp`.
- Start from `https://meshix.app/agents` when the user needs a browser-guided
  setup path.
- If OAuth opens a browser, let the user complete the sign-in flow before
  retrying the MCP call.
- If the agent already has Meshix MCP tools registered, call
  `get_account_status` when present before guessing. It should confirm sign-in,
  server health, and whether the generation backend is available.

## Long-Running Runs

CAD generation can take a few minutes. Poll for status and artifacts every
30-60 seconds. Stop on the top-level design state (`ready`, `needs_attention`,
or a reported error). Treat run-level state changes, iteration counts, and
progress labels as normal progress signals. If the agent blocks direct sleep
commands, use its supported wait, monitor, or background task pattern instead of
giving up.

## Visual Review

When a design has render images, download the actual image files before
replying. Do not only paste signed image URLs, because they can expire and may
not render inline in the harness.

Save useful PNGs under `<cwd>/.memory/meshix/<design-id>/` with view-based
filenames such as `isometric.png`, `top.png`, and `bottom.png`. If there is no
useful working directory, use a temp directory. If the agent's chat can display
local files, show the image with Markdown image syntax and an absolute path:

```markdown
![Meshix isometric render](/absolute/path/.memory/meshix/<design-id>/isometric.png)
```

For STEP, STL, plan, or render downloads, use the user's remembered artifact
folder when the harness has persistent memory and a preference exists. If the
preference is missing, ask once where they like Meshix CAD files saved, then use
that location for future downloads when memory is available. Default to
`<cwd>/.memory/meshix/<design-id>/` when no preference is available.
