---
name: slant4d-mcp
description: Use when working directly with the Slant4D Streamable HTTP MCP endpoint at agents.slant4d.com/mcp, including operator health, catalog, inventory, corpus, and lifecycle prompts/tools.
---

# Slant4D Direct MCP

Slant4D is a catalog-backed product for discovering, customizing, generating,
and reviewing printable organizer inserts. Use this skill when the agent has
direct access to the Slant4D Worker MCP endpoint, not the Cloudflare Code Mode
portal.

## Start

- In a Slant4D repo, read the local `AGENTS.md` first. Project rules can be
  stricter than this skill.
- Read the current Slant4D docs that govern the requested workflow before
  mutating anything. For operator work, start with `docs/operator_mcp.md`,
  `docs/upstream_product_data_consumption.md`,
  `docs/market_insert_landscape.md`, and
  `assets/seeds/market_e2e_corpus.json`.
- For first-time direct MCP connection, OAuth, or setup problems, read
  [setup.md](references/setup.md).
- Confirm the MCP server is connected, then call `operator.health` before other
  reads or writes.
- If the client only shows `portal_codemode_search` and
  `portal_codemode_execute`, use `$slant4d-codemode` instead. This skill is for
  the direct top-level Slant4D MCP tools and prompts.
- Treat competitor listings as prioritization evidence only. Do not copy
  competitor STLs/images, infer geometry truth from listings, or call geometry
  `PASS` without Slant4D review gates.
- Store scratch evidence in repo-local `.memory/`. Do not commit raw market
  dumps, broad catalog responses, generated output, virtualenvs, or caches.

## Product Boundary

The durable path is:

```text
market evidence -> upstream catalog product -> Slant4D catalog/image records
-> reviewed source part -> insert bundle -> public/admin/gallery lifecycle proof
```

Keep the upstream product-data system as a catalog/image source, not a Slant4D
runtime dependency or source-part service. Slant4D should own selected images,
generated artifacts, source-part review state, insert bundles, and gallery
promotion evidence.

## MCP Surface

Production endpoint:

```text
https://agents.slant4d.com/mcp
```

Local dev endpoint:

```text
http://localhost:5177/mcp
```

Current direct MCP tools:

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

Current direct MCP prompts:

- `audit-environment`
- `sync-corpus-case`
- `prove-lifecycle-case`

Prefer the prompt templates for the known audit, one-case sync, and lifecycle
proof workflows when the client supports MCP prompts. Otherwise run the same
sequence manually with the tools.

## Operator Workflow

- Start read-only: call `operator.health`, inspect inventory, validate the
  corpus, and diff before applying anything.
- Keep environment identity tied to the MCP endpoint/deployment. Do not add a
  separate request-level environment selector.
- Use small, explicit scopes: one case id, one MPN, one inventory kind, and
  bounded limits unless the user explicitly asks for a broad audit.
- Use `inventory.listRecords` with `kind="all"` and `mode="summary"` before
  requesting bounded `mode="records"` output for a specific kind.
- Use `corpus.diffManifest` with `mode="summary"` for broad audits, then
  `mode="cases"` with `caseIds` for focused evidence.
- Apply one corpus case at a time unless a broader write is explicitly
  requested.
- Leave provider/source generation off unless the user explicitly approves that
  spend. Catalog/image sync should not silently start expensive generation.
- Use `catalog.syncProducts` for repo-owned desired Milwaukee seed products.
- Use `catalog.pruneToSeed` only dry-run first. Production pruning requires the
  tool's confirmation string.

If full raw evidence is needed, capture it to `.memory/` with a filesystem-capable
local step and report the path plus a compact summary. Do not return huge raw
catalog, inventory, diff, or apply payloads directly into chat.

## Sync A Case

For one corpus case:

1. Validate the manifest/case against upstream catalog availability.
2. Diff the case against the current Slant4D target.
3. Report the diff and blockers before writing.
4. Apply only if the operation is idempotent and the user intent includes the
   write.
5. Re-diff after apply and report the highest truthful case state.

Name missing state directly: catalog row, image metadata, selected images,
source-part artifacts, template readiness, insert bundle, gallery publication, or
lifecycle evidence. Do not substitute another product or create placeholder
artifacts to make a case appear ready.

## Lifecycle Proof

Lifecycle proof should run only when the case is truthfully ready:

- source part exists with normalized STL, source render, review report, and
  validated layout proxy;
- target base template is approved and resolves to an engine template;
- insert generation produced a complete bundle and review evidence;
- public/admin/gallery states can be moved through the real lifecycle.

`proof.runLifecycleCase` prepares the repo command. Run that command from a local
Slant4D checkout so `.memory/` evidence is written locally. A tool response,
screenshot, or deployed page alone is not lifecycle proof.

## Verification

- Docs/data-only changes: run the repo's formatter/check command and
  `git diff --check`.
- Direct MCP changes: run the repo's operator worker verification and direct MCP
  smoke commands for tools and prompts.
- Source generation, insert generation, and lifecycle changes need targeted
  tests or proof scripts, then broader typecheck/test coverage when shared
  contracts changed.
