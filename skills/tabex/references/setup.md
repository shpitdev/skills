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

Once the source is connected, enable the target tab from the extension popup or
create a narrow auto-attach rule for the target host. For a temporary smoke test:

```bash
tabex auto-attach rule add --host example.com --include-subdomains
tabex element click --open-url https://example.com --wait-timeout 15s --text "More information"
tabex auto-attach rule list
tabex auto-attach rule remove --rule-id <id>
```

`tabex session wait` and `tabex session attach --wait` do not bypass that consent
path and do not launch the browser. For an explicitly requested browser launch,
use `--launch-browser` on the creation action:

```bash
tabex session attach --url https://example.com --launch-browser --wait --timeout 15s
tabex element click --open-url https://example.com --launch-browser --wait-timeout 15s --text "More information"
```

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

Use the Chrome profile where the user has loaded the Tabex extension.
