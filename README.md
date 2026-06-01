# shpit.dev skills

Hand-authored public Agent Skills for ShpitDev projects.

Skills are prompts, not generated docs. Each `skills/<name>/SKILL.md` should be
small, direct, and useful to a capable model with no private project context.

## Install

Install a skill with a compatible skills installer:

```bash
npx skills add shpitdev/skills --skill tabex
npx skills add shpitdev/skills --skill meshix
```

For agents that read local Agent Skills directly, copy or install the folder
under `skills/<name>`.

## Meshix

[Meshix](https://meshix.app) turns natural-language CAD briefs into printable
3D artifacts through Studio and the Meshix MCP server. First-time agent setup
starts at [meshix.app/agents](https://meshix.app/agents).

![USB-C cable label tag generated with Meshix](skills/meshix/assets/examples/usb-c-tag-isometric.png)

The Meshix skill is tuned for practical CAD work: choosing the right generation
surface, polling long-running jobs, returning the Studio run link, and reviewing
renders before a user prints anything.

## Repository Layout

```text
AGENTS.md                   # editorial guidance for maintaining skills
skills/<name>/SKILL.md      # canonical hand-authored skill prompt
skills/<name>/agents/       # optional agent UI metadata
skills/<name>/assets/       # logos and other UI assets
skills/<name>/references/   # optional setup/deep detail loaded on demand
scripts/validate-skills.mjs # syntax validation only
```

## Check

```bash
bun run check
```

The check validates required skill files, frontmatter shape, basic YAML-like
syntax, and optional `agents/openai.yaml` metadata. It does not generate or
rewrite skills.

## Design Rules

- Hand curate every skill.
- Include only what helps a new model use the public app or tool.
- Prefer live product docs, MCP metadata, or CLI `--help` over copied schemas.
- Remove old scaffolding when the approach changes.
