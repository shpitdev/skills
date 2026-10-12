# Meshix

Create, revise, and inspect 3D CAD models of physical parts with
[Meshix Studio](https://meshix.app) and the Meshix MCP server. Find your designs
and public designs, then review design progress, CAD previews, and available
STL, STEP, render, and Assembly outputs.
Generation is asynchronous; inspect the result before printing or using a part.
Assembly is a beta feature that requires explicit opt-in.

## Setup

In a Claude Code session, install from the public marketplace:

```text
/plugin install meshix --marketplace shpitdev/skills
```

For Codex:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add meshix@shpitdev-skills
```

To update, refresh the marketplace and reinstall the plugin, then restart the
session:

```bash
codex plugin marketplace upgrade shpitdev-skills
codex plugin remove meshix@shpitdev-skills
codex plugin add meshix@shpitdev-skills
```

```bash
claude plugin marketplace update shpitdev-skills
claude plugin update meshix@shpitdev-skills
```

Connect to **https://meshix.app/mcp** and complete OAuth sign-in with your Meshix
account. Codex supports `codex mcp login meshix`; Claude Code prompts for
interactive authentication. Never paste access tokens or account credentials
into a conversation. See [agent setup](https://meshix.app/agents) for connection
instructions.

## Example requests

- “Show my Meshix designs.”
- “Open the public Meshix bridge riser design.”
- “Help prepare a Meshix CAD design from my dimensions.”

After a generation or revision, Meshix returns a status and Studio link. Ask
for another status check when you want one. If generation needs clarification,
answer the saved questions before continuing.

## Data handling

OAuth connects requests to your Meshix account. Meshix processes CAD briefs,
dimensions, and clarification answers to create and revise saved designs.
Discovery can return your owned designs or other users' public designs and
Community History. Public Community History includes public prompts and run
status; avoid putting secrets in a design brief. Downloads use expiring URLs,
and files you save remain in the location you choose.

Read the [privacy policy](https://meshix.app/privacy) for data handling,
retention, and controls, and the [terms](https://meshix.app/terms) for service
conditions.

## Troubleshooting and support

If authentication is required, confirm the endpoint above and finish the
browser sign-in flow before retrying. Use `get_account_status` when available
to check account and backend access. For a clarification checkpoint or a
Studio-only recovery action, follow the returned questions or Studio link.
If an artifact is missing, check its readiness and request fresh download URLs;
run completion alone does not prove every output is available.

For connection or design problems, visit [Meshix support](https://meshix.app/support).
Meshix is published by **SHPIT LLC**. This plugin is licensed under MIT.
