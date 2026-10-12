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

The user signs in through their agent client:

- Codex: the user runs `codex mcp login meshix`.
- Claude Code: OAuth starts on first use. If `claude mcp list` shows Meshix as
  `Needs authentication`, the user starts an interactive Claude session and
  makes a Meshix request so the browser sign-in flow can complete.

Do not pass scopes manually; the client reads them from the Meshix OAuth
metadata.

For plugin install or update steps, point the user to the
[plugin installation guide](https://github.com/shpitdev/skills/blob/main/docs/plugin-installation.md).
After an update, the user restarts the agent session so it loads the new skill
and tools.

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

CAD generation can take a few minutes. After creating, revising, or forking,
call `render_design_progress` once with the returned `next_tool_args`. It accepts
`design_id` and optional `version_id`, never `run_id`. Summarize the status
briefly and include the Studio link without commenting on whether the host
displayed a card.

Follow any `action_required` instruction before ending the turn. A
`needs_attention` result may require saved clarification questions or a
Studio-only recovery path; follow the returned action and wait for the user's
answers when needed. For passive progress, end the turn and call `get_design`
when the user asks for status. Never start an automatic polling loop or promise
automatic updates or completion notifications.

## Visual Review

Use the host's native image display when available. `get_design_assets` returns
fresh signed URLs; they expire and may not render inline. Save files only when
the user asks, to a location they choose, and report the saved paths.
