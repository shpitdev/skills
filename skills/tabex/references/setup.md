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
