---
name: slant4d
description: Use when working with Slant4D, the catalog-backed organizer insert product at slant4d.com, including market-derived corpus triage, upstream Milwaukee catalog resolution, operator MCP/API sync, source-part readiness, insert bundle readiness, and lifecycle proof planning.
---

# Slant4D

Slant4D is a catalog-backed product for discovering, customizing, generating,
and reviewing printable organizer inserts. Use this skill when the work starts
from market insert evidence, upstream catalog products, Slant4D operator MCP/API
state, or public/admin/gallery lifecycle proof.

## Start

- In a Slant4D repo, read the local `AGENTS.md` first. Project rules can be
  stricter than this skill.
- Read the current Slant4D docs that govern the requested workflow before
  mutating anything. For market/corpus work, start with `docs/operator_mcp.md`,
  `docs/upstream_product_data_consumption.md`,
  `docs/market_insert_landscape.md`, and
  `assets/seeds/market_e2e_corpus.json`.
- For first-time agent connection, OAuth, or MCP setup problems, read
  [setup.md](references/setup.md).
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

## Operator Workflow

Prefer the Slant4D operator MCP/API over ad hoc database edits.

- Start read-only: inspect inventory, validate the corpus, and diff before
  applying anything.
- Keep environment identity tied to the operator endpoint/deployment. Do not add
  a separate request-level environment selector.
- Use small, explicit scopes: one case id, one MPN, one inventory kind, and
  bounded limits unless the user explicitly asks for a broad audit.
- Apply one corpus case at a time unless a broader write is explicitly
  requested.
- Leave provider/source generation off unless the user explicitly approves that
  spend. Catalog/image sync should not silently start expensive generation.

Useful operator surfaces, when present:

- `catalog.searchProducts`: read-only upstream catalog search.
- `catalog.getProduct`: read-only upstream product by MPN/canonical key.
- `catalog.listProductImages`: read-only upstream image metadata.
- `catalog.syncProducts`: idempotent sync for repo-owned desired MPNs.
- `inventory.listRecords`: current target inventory. Start with summary mode.
- `corpus.validateManifest`: validate selected corpus cases against upstream.
- `corpus.diffManifest`: read-only target diff.
- `corpus.applyManifest`: idempotent target write.
- `proof.runLifecycleCase`: prepare the local proof command; it is not the proof
  evidence by itself.

If full raw evidence is needed, capture it to `.memory/` with a filesystem-capable
local step and report the path plus a compact summary. Do not return huge raw
catalog, inventory, diff, or apply payloads directly into chat.

## Market And Corpus Triage

Use model numbers as primary identity. Seller names for PackOut hosts and tool
generations are inconsistent.

For the first lifecycle/corpus work, prefer current single-source launch cases
before broader market targets:

- M12 Fuel impact driver in `48-22-8435`: `3453-20`
- M12 Fuel hammer drill in `48-22-8435`: `3404-20`
- M12 oscillating multi-tool in compact/deep organizer signal: `2526-20`
- M12 Gen 2 drill in `48-22-8435`: `2504-20`

Capability-gated market signals should stay out of launch proof until Slant4D
has real support: multi-tool layouts, battery/charger arrays, Gridfinity bridges,
low-profile templates, drawers, ammo-can/toolbox formats, and split-for-print-bed
output.

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

Run the returned proof command from a local Slant4D checkout so `.memory/`
evidence is written locally. A tool response, screenshot, or deployed page alone
is not lifecycle proof.

## Verification

- Docs/data-only changes: run the repo's formatter/check command and
  `git diff --check`.
- Operator MCP/API changes: run the repo's operator worker verification and MCP
  smoke commands.
- Source generation, insert generation, and lifecycle changes need targeted
  tests or proof scripts, then broader typecheck/test coverage when shared
  contracts changed.
