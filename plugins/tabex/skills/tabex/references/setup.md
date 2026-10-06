# Tabex Setup

Read this only when Tabex is missing, browser config is wrong, the Store
extension or native host needs attention, a browser source is offline, or the
user explicitly asks for setup.

## Install

The public install command from `https://tabex.dev` is:

```bash
brew tap shpitdev/tap && brew install shpitdev/tap/tabex
```

Install the released extension from the
[Chrome Web Store](https://chromewebstore.google.com/detail/bmfjindohmkokejlgpaemhlfenjajlmb).
Tabex does not stage or sideload its production extension. Then run:

```bash
tabex setup
tabex browser native-host install
tabex browser native-host status
tabex runtime status
tabex browser source list
tabex session list
```

Use `tabex setup --help` for current setup flags.

## Connection Recovery

Keep source connectivity and tab enablement separate:

- `tabex browser source list` reports whether the enrolled Store extension is
  connected. If the selected source is offline, ordinary `session attach` and
  shared `--open-url` creation flows stay reconnect-only and report that source
  plus retry or setup guidance.
- `tabex browser native-host status` verifies the installed exact-origin native
  host. After a CLI upgrade, or when the host is missing or stale, rerun
  `tabex browser native-host install` and reload the Store extension.
- The popup's **Retry connection** action asks the existing extension to
  reconnect and never launches a browser. Endpoint recovery uses the native
  host's canonical runtime state, with `http://127.0.0.1:7878` as the fallback.
- Enabling a tab controls whether Tabex may operate on that page. It does not
  start the runtime or repair an offline browser source.

A connected source without usable sessions is not necessarily an enablement
problem. Inspect JSON session state and current raw inventory:

```bash
tabex session list --json
tabex browser tab list --browser-id <id> --json
tabex session recover --session-id <existing-enabled-id> --timeout 15s --json
```

Use only the recovery command appropriate to the selected target. If inventory
reports `browser_inventory_unavailable`, the source has not published current
tabs. Pending extension observation with no current inventory, a missing
persistent binding, or a page-command disconnect is not fixed by enablement. Capture the exact error and
source/session IDs; after one bounded recovery and read-only probe fails, stop
browser dispatch. Do not keep asking for popup enablement or repeat tab creation.
Check runtime readiness and native-host status. Compare installed CLI and
extension versions; `tabex --help` shows the CLI build. Do not restart the user's
browser, replace its profile, reload the extension, or reinstall the host unless
that recovery is within the user's authorization and the browser owner's scope.

For a healthy connected source, choose an authorized existing tab with exact
current-generation `session claim`, or open an enabled inactive owned tab:

```bash
tabex session claim --help
tabex session attach --url https://example.com --browser-id <id> --wait --timeout 15s --json
```

Owned-tab creation needs no standing rule or manual popup click. Keep the
returned operation ID for same-operation recovery. Use temporary auto-attach
rules only when matching future tabs need enablement; scope to the intended
host/path and remove only the rules you created. `session wait` waits for an
out-of-band session and does not enable a tab.

Creation remains reconnect-only unless `--launch-browser` is explicit. Add
that flag only when the user wants a browser launch; it may foreground Chrome.
Neither creation nor enablement signs into a website. If the target redirects
to login, report the authentication prerequisite separately.

## Browser Profile

Check the saved browser profile with:

```bash
tabex browser config show
```

On macOS with normal Chrome, a common explicit config is:

```bash
tabex browser config set \
  --browser-bin "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir "$HOME/Library/Application Support/Google/Chrome" \
  --profile-directory Default
```

Use the Chrome profile where the user has loaded the Tabex extension. Compare
source-specific `configuredLaunchProfile` as well as the global saved config;
a global launch-profile mismatch alone does not prove the connected source is
wrong. Do not overwrite a profile configuration merely to remove a diagnostic.
