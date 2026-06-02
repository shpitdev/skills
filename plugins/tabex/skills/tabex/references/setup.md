# Tabex Setup

Read this only when Tabex is missing, browser config is wrong, the extension
needs to be installed or loaded, or the user explicitly asks for setup.

## Install

The public install command from `https://tabex.dev` is:

```bash
brew tap shpitdev/tap && brew install shpitdev/tap/tabex
```

After install, run:

```bash
tabex setup
tabex runtime status
tabex session list
```

Use `tabex setup --help` for current setup flags.

## Chrome Extension

Tabex installs the released Chrome extension into a managed local directory.
The stable folder to load into Chrome is:

```text
$HOME/.local/share/tabex/extensions/chrome/current
```

Recommended manual load flow:

1. Run `tabex extension install` or `tabex setup`.
2. Open the folder:

   ```bash
   open "$HOME/.local/share/tabex/extensions/chrome/current"
   ```

3. Open `chrome://extensions` in the Chrome profile Tabex is configured to use.
4. Enable Developer Mode.
5. Click "Load unpacked" and select the `current` folder, or drag the `current`
   folder from Finder into the Chrome extensions page.
6. If Tabex was already loaded, click Refresh on the existing Tabex extension.

`tabex --help` may show `setup: configured` and an extension version even when
Chrome has not loaded the unpacked extension. The decisive checks are:

```bash
tabex runtime status
tabex session list
```

If they show `Source Connected: no`, `Connected: no`, or `Count: 0`, Tabex is not
ready for browser interaction yet. Load or refresh the extension in the exact
Chrome profile from `tabex browser config show`, then enable a tab from the
extension popup or create a narrow auto-attach rule for the target host. Ask the
user before changing browser extension state.

For temporary smoke tests:

```bash
tabex auto-attach rule add --host example.com --include-subdomains
tabex element click --open-url https://example.com --wait-timeout 15s --text "More information"
tabex auto-attach rule list
tabex auto-attach rule remove --rule-id <id>
```

`tabex session attach --wait` does not bypass that consent path; it only opens a
tab and waits until the extension popup or an auto-attach rule enables it.

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
