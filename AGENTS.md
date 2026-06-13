# Agent Guidelines

This repo publishes hand-authored Agent Skills for ShpitDev apps. Treat each
skill as prompt tuning for a capable model with no private project context.

## Editorial Standard

- `skills/<name>/SKILL.md` is the source of truth.
- Keep skills short, specific, and operational.
- Include when to use the skill, the public product surface, the first action to
  take, key judgment calls, and how to verify work.
- Do not add generated sections, internal implementation notes, boundary essays,
  stale roadmaps, or generic product marketing.
- Prefer public docs, live MCP metadata, or CLI `--help` for concrete command and
  tool schemas.
- If a reference file is added, it must carry real user value that would clutter
  `SKILL.md`; otherwise keep the skill self-contained.
- Setup belongs in `references/setup.md` when it is valuable for first-time use
  but not useful on every invocation.

## Skills

- `meshix`: Meshix is a public 3D CAD product at `https://meshix.app`. The skill
  should help a user or agent create, route, and review Meshix CAD work through
  Studio or the Meshix MCP server without relying on private repo context.
- `tabex`: Tabex is a browser workbench CLI at `https://tabex.dev`. The skill
  should help a user or agent install/check the CLI, inspect real browser
  sessions, run page actions or JavaScript, and preserve browser evidence.
- `slant4d-codemode`: Slant4D API/Code Mode is the Cloudflare Code Mode portal
  and JSON operator API surface for `https://slant4d.com`. The skill should help
  a user or agent move from market evidence to upstream catalog resolution,
  operator API sync, source-part readiness, insert bundle readiness, and
  lifecycle proof without treating competitor listings as geometry truth.
- `slant4d-mcp`: Slant4D Direct MCP is the Streamable HTTP Worker MCP surface
  for `https://slant4d.com`. The skill should cover direct MCP tools/prompts for
  operator health, catalog, inventory, corpus, and lifecycle proof workflows
  without drifting into Code Mode setup instructions.

## Validation

Use `bun run check` before publishing changes. The check is intentionally small:
it validates skill file presence, frontmatter shape, and basic metadata syntax.
It must not generate skills or mutate content.
