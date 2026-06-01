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

## Codex Plugins

Repo-managed Codex plugins live under `plugins/<name>` and are exposed through
the local marketplace at `.agents/plugins/marketplace.json`.

To add this checkout as a local Codex marketplace:

```bash
codex plugin marketplace add .
```

This makes `meshix@shpitdev-skills-local` visible to Codex. Disable or remove
older personal Meshix plugin installs first if you want to avoid duplicate
Meshix entries from different marketplaces.

Plugin bundles are self-contained for installation, but the canonical skill
source remains `skills/<name>`. `bun run check` validates plugin metadata,
marketplace entries, MCP config files, assets, and bundled skill copies.

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
.agents/plugins/marketplace.json # repo-local Codex plugin marketplace
skills/<name>/SKILL.md      # canonical hand-authored skill prompt
skills/<name>/agents/       # optional agent UI metadata
skills/<name>/assets/       # logos and other UI assets
skills/<name>/references/   # optional setup/deep detail loaded on demand
plugins/<name>/             # self-contained Codex plugin bundle
scripts/validate-skills.mjs # skill metadata and local shim validation
scripts/link-local-skills.mjs # local ignored Claude/.agents install shims
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
