---
name: tabex
description: Use when working with Tabex, the browser workbench CLI at tabex.dev for inspecting live browser sessions, running page actions or JavaScript, and preserving browser evidence.
---

# Tabex

Tabex is a browser workbench CLI at `https://tabex.dev`. It helps agents and
developers inspect live browser sessions, select pages and elements, run browser
actions, execute JavaScript, and preserve network or page evidence.

## Start

- First check whether `tabex` is installed with `command -v tabex`.
- If Tabex is missing, setup is broken, or the Chrome extension must be loaded,
  read [setup.md](references/setup.md).
- Once installed, treat `tabex --help` and subcommand `--help` output as the
  command contract. Do not invent flags from memory.

## Operating Model

- Prefer Tabex primitives for sessions, pages, elements, network, runs, and
  JavaScript orchestration before writing bespoke browser automation.
- Use JavaScript execution deliberately. Prefer host-side orchestration for
  repeatable work; use page-context JavaScript only when the browser page itself
  needs to evaluate something.
- Preserve raw browser evidence. If a task needs summaries or projections,
  create them as derived output rather than silently dropping original capture
  data.
- Prefer real browser targets for meaningful validation. Toy pages are fine for
  smoke checks, but they are weak proof for product behavior.

## Verification

End with evidence the user can trust: the selected session or page, the command
that was run, the relevant output or captured artifact, and any remaining
uncertainty. If Tabex is not installed, stop at install guidance rather than
pretending browser inspection happened.
