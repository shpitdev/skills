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
- Use `tabex getting-started` for current flow recipes, then verify the
  preconditions before running the listed commands.
- Before browser interaction, run `tabex runtime status --json`,
  `tabex browser source list --json`, and `tabex session list --json`.
  Installed, connected, enabled, and command-ready are different states.

## Select or Recover a Tab

- If the selected source is offline, use the connection diagnostics in
  [setup.md](references/setup.md). Tab enablement does not repair an offline source.
- Reuse an authorized session that is attached and command-eligible. A nonzero
  session count can include stale or reconnecting records; inspect their fields.
- For an enabled but unattached/reconnecting target, try
  `tabex session recover --session-id <id> --timeout 15s --json` once, then
  recheck inventory and make one read-only page probe. Recovery output alone
  does not prove page commands work. Honor another agent's browser ownership.
- For an existing user tab within the requested browser scope, use
  `tabex browser tab list --browser-id <id> --json`, then `session claim` with
  that exact current browser ID, connection generation, and tab ID. Read its
  `--help` first. Claim does not focus the tab; do not select unrelated tabs.
- When a new tab fits the task, `session attach --url <url>` or a command's
  `--open-url` creates an inactive, enabled Tabex-owned tab. Do not require a
  manual popup click or a standing auto-attach rule for that creation path.
  Keep its operation ID; use it to resume the same creation after uncertainty
  rather than opening duplicates. Read `session creation --help` for recovery.
- If inventory is unavailable, recovery has no current persistent binding, or
  the page probe disconnects, diagnose transport using [setup.md](references/setup.md).
  Do not ask the user to enable an already-enabled tab, add rules, or repeatedly
  create tabs to repair transport. Stop after the bounded recovery fails and
  report the exact error and source/session state.
- Ask for a popup enablement action only when an appropriate existing tab
  cannot be claimed with the installed CLI or the user's scope requires manual
  selection. A login page is a separate authentication prerequisite, not an
  enablement failure. Ask the user to sign in without collecting credentials.

## Operating Model

- Prefer Tabex primitives for sessions, pages, elements, network, runs, and
  JavaScript orchestration before writing bespoke browser automation.
- Prefer page, element, and run-js selection flags for routine actions.
  `session wait` is only a barrier for an expected out-of-band session; it
  does not enable a tab or repair transport.
- Session creation is reconnect-only by default. `session attach` and commands
  that create through `--open-url` report the selected offline source and retry
  or setup guidance; they do not implicitly launch Chrome or a configured
  profile. Add `--launch-browser` only when the user explicitly wants that
  creation action to launch the configured browser.
- Use narrowly scoped auto-attach rules only when the workflow needs standing
  enablement for matching tabs. Remove rules you created temporarily; preserve
  pre-existing rules. Do not broaden browser access to fix a connection error.
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
uncertainty. If Tabex is missing, stop at install guidance. If Tabex is
installed but `tabex browser source list` reports the selected source offline,
report that state separately from an empty `tabex session list` rather than
pretending browser inspection happened.
