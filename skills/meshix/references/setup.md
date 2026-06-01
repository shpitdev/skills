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

## Auth Troubleshooting

- Confirm the client is pointed at `https://meshix.app/mcp`.
- Start from `https://meshix.app/agents` when the user needs a browser-guided
  setup path.
- If OAuth opens a browser, let the user complete the sign-in flow before
  retrying the MCP call.
- If the agent already has Meshix MCP tools registered, prefer its live status or
  account diagnostic tool before guessing.

## Long-Running Runs

CAD generation can take minutes. Poll for status and artifacts. Stop only when
the run is ready, needs attention, or errors.

## Visual Review In Codex

When a design has render images, save useful PNGs under `<cwd>/.memory/meshix/`
if working in a repo. If there is no repo or `.memory` convention, use a temp
directory. In Codex App, show the image with an absolute Markdown path so the
user can inspect it inline.
