---
name: slant4d-codemode
description: Use when working with Slant4D through the Cloudflare Code Mode portal or JSON operator API, including catalog sync, corpus triage, inventory audit, and lifecycle proof planning.
---

# Slant4D API/Code Mode

Slant4D is a catalog-backed product for discovering, customizing, generating,
and reviewing printable organizer inserts. Use this skill when the Slant4D work
should run through the Cloudflare Code Mode portal or the JSON operator API.

## Start

- In a Slant4D repo, read the local `AGENTS.md` first. Project rules can be
  stricter than this skill.
- Read the current Slant4D docs that govern the requested workflow before
  mutating anything. For operator work, start with `docs/operator_mcp.md`,
  `docs/upstream_product_data_consumption.md`,
  `docs/market_insert_landscape.md`, and
  `assets/seeds/market_e2e_corpus.json`.
- For first-time portal connection, OAuth, or setup problems, read
  [setup.md](references/setup.md).
- Use the Cloudflare MCP Portal URL, not the direct Worker MCP URL:
  `https://agents-portal.slant4d.com/mcp?codemode=search_and_execute`.
- Code Mode exposes portal search/execute tools. Slant4D operations are
  JavaScript-callable functions inside `portal_codemode_execute`, not top-level
  MCP tools in the client.
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

## Code Mode Surface

The portal should show only Code Mode management/search/execute tools, typically:

- `portal_codemode_search`
- `portal_codemode_execute`

Use search first to inspect current upstream functions and schemas. Current
Slant4D production functions should include:

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

Inside execute, call the JavaScript-safe function names returned by search, such
as `codemode.slant4d_agents_prod_operator_health(...)`. Do not assume names from
memory when search can return the live catalog.

Code Mode is the right surface for broad reads because JavaScript can filter,
count, map, and summarize before returning data to chat. Do not return raw broad
catalog, inventory, manifest, diff, or apply payloads unless the user explicitly
asked for that exact raw evidence.

## JSON Operator API

Use the JSON API only when the agent or script already has authorized Cloudflare
Access credentials. Do not ask the user to paste service tokens into chat.

Live production routes:

```text
GET  /api/operator/health
POST /api/operator/catalog/sync-products
GET  /api/operator/catalog/products
GET  /api/operator/catalog/products/:canonicalProductKey
GET  /api/operator/catalog/products/:canonicalProductKey/images
POST /api/operator/catalog/prune-to-seed
GET  /api/operator/inventory/catalog-products
GET  /api/operator/inventory/source-parts
GET  /api/operator/inventory/base-templates
GET  /api/operator/inventory/insert-runs
GET  /api/operator/inventory/curated-inserts
GET  /api/operator/corpus/manifest
POST /api/operator/corpus/validate
POST /api/operator/corpus/diff
POST /api/operator/corpus/apply
POST /api/operator/proof/lifecycle
```

Start reads with `GET /api/operator/health`, inventory summaries, corpus
validation, and corpus diff. Treat `diff` as read-only. Treat `apply`, catalog
sync, catalog prune, and lifecycle proof mutation as explicit writes.

## Operator Workflow

- Start read-only: inspect health, inventory, corpus validation, and diff before
  applying anything.
- Keep environment identity tied to the operator endpoint/deployment. Do not add
  a separate request-level environment selector.
- Use small, explicit scopes: one case id, one MPN, one inventory kind, and
  bounded limits unless the user explicitly asks for a broad audit.
- Apply one corpus case at a time unless a broader write is explicitly
  requested.
- Leave provider/source generation off unless the user explicitly approves that
  spend. Catalog/image sync should not silently start expensive generation.
- Use `catalog.syncProducts` for repo-owned desired Milwaukee seed products.
- Use `catalog.pruneToSeed` only dry-run first. Production pruning requires the
  tool's confirmation string.

If full raw evidence is needed, capture it to `.memory/` with a filesystem-capable
local step and report the path plus a compact summary. Code Mode cannot write
local files by itself.

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
- Operator API/Code Mode changes: run the repo's operator worker verification,
  JSON route smoke, and Code Mode portal smoke commands.
- Source generation, insert generation, and lifecycle changes need targeted
  tests or proof scripts, then broader typecheck/test coverage when shared
  contracts changed.
