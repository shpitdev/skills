# shpit.dev skills

Hand-authored public Agent Skills for ShpitDev projects.

Skills are prompts, not generated docs. Each `skills/<name>/SKILL.md` should be
small, direct, and useful to a capable model with no private project context.

## Install

Install a skill with a compatible skills installer:

```bash
npx skills add shpitdev/skills --skill tabex
npx skills add shpitdev/skills --skill meshix
npx skills add shpitdev/skills --skill slant4d
```

For agents that read local Agent Skills directly, copy or install the folder
under `skills/<name>`.

For local Claude Code/project validation without copying skills into your home
directory, create ignored install shims:

```bash
bun run link:local
```

This links `.claude/skills` and `.agents/skills` to the canonical `skills/`
folder. `bun run check` validates those shims when they are present.

## Agent Plugins

Repo-managed plugins live under `plugins/<name>` and are exposed through
marketplace manifests for each harness. Prefer installing from the GitHub
marketplace source for normal use.

Install Meshix for Codex:

```bash
codex plugin marketplace add shpitdev/skills
codex plugin add meshix@shpitdev-skills
codex mcp login meshix
```

Install Meshix for Claude Code:

```bash
claude plugin marketplace add shpitdev/skills
claude plugin install meshix@shpitdev-skills
```

Connect Meshix in Claude.ai or Claude Desktop:

1. Open Claude's connector settings.
2. Add a custom connector named `Meshix`.
3. Use `https://meshix.app/mcp` as the connector URL.

Shortcut: [Add Meshix custom connector](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Meshix&connectorUrl=https%3A%2F%2Fmeshix.app%2Fmcp).

This remote connector works for direct Meshix MCP calls in Claude.ai and Claude
Desktop. Current Claude connector behavior does not provide host-side polling,
subscriptions, or webhook delivery, so long-running Meshix jobs must be checked
with follow-up status/tool calls.

See [Plugin Installation](docs/plugin-installation.md) for local development,
updates, duplicate cleanup, and MCP OAuth notes.

Plugin bundles are self-contained because Codex plugin archives reject skill and
asset symlinks that point outside the plugin directory. The canonical skill
source remains `skills/<name>`, and `bun run check` validates that bundled skill
copies stay byte-for-byte in sync with the canonical source.

## Meshix

[Meshix](https://meshix.app) turns natural-language CAD briefs into printable
3D artifacts through Studio and the Meshix MCP server. First-time agent setup
starts at [meshix.app/agents](https://meshix.app/agents).

![USB-C cable label tag generated with Meshix](skills/meshix/assets/examples/usb-c-tag-isometric.png)

The Meshix skill is tuned for practical CAD work: choosing the right generation
surface, polling long-running jobs, returning the Studio run link, and reviewing
renders before a user prints anything.

## Slant4D

[Slant4D](https://slant4d.com) is a catalog-backed product for discovering,
customizing, generating, and reviewing printable organizer inserts. The skill is
tuned for market-derived corpus triage, upstream catalog resolution, operator
MCP/API sync, source-part readiness, insert bundle readiness, and lifecycle proof
planning.

## Repository Layout

```text
AGENTS.md                   # editorial guidance for maintaining skills
.agents/plugins/marketplace.json # Codex plugin marketplace
.claude-plugin/marketplace.json  # Claude Code plugin marketplace
skills/<name>/SKILL.md      # canonical hand-authored skill prompt
skills/<name>/agents/       # optional agent UI metadata
skills/<name>/assets/       # logos and other UI assets
skills/<name>/references/   # optional setup/deep detail loaded on demand
plugins/<name>/             # repo-contained plugin bundle
scripts/validate-skills.mjs # skill, marketplace, and plugin validation
scripts/link-local-skills.mjs # local ignored Claude/.agents install shims
docs/plugin-installation.md # plugin install, update, and MCP auth guide
```

## Check

```bash
bun run check
```

The check validates required skill files, frontmatter shape, basic YAML-like
syntax, optional `agents/openai.yaml` metadata, and local install shims when
present. It does not generate or rewrite skills.

## Design Rules

- Hand curate every skill.
- Include only what helps a new model use the public app or tool.
- Prefer live product docs, MCP metadata, or CLI `--help` over copied schemas.
- Remove old scaffolding when the approach changes.
