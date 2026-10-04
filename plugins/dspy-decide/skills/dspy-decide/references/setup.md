# Connect dspy-decide

MCP endpoint: `https://dspy-decide.vercel.app/mcp` (Streamable HTTP).
No sign-in, API key or OAuth is required. Do not use the edit token as an HTTP
credential; it belongs only in the relevant tool arguments.

## Codex

```sh
codex plugin marketplace add shpitdev/skills
codex plugin add dspy-decide@shpitdev-skills
```

For MCP-only setup instead of installing the skill:

```sh
codex mcp add dspy_decide --url https://dspy-decide.vercel.app/mcp
codex mcp list
```

## Claude Code

```sh
claude plugin marketplace add shpitdev/skills
claude plugin install dspy-decide@shpitdev-skills
```

For MCP-only setup:

```sh
claude mcp add --transport http dspy_decide https://dspy-decide.vercel.app/mcp
claude mcp list
```

Restart the agent after plugin installation. Use either the plugin registration
or the MCP-only registration, not both.

## Pi

Pi 1.0+ has native MCP support. Install the marketplace's Pi package:

```sh
pi install https://github.com/shpitdev/skills
```

To load only dspy-decide from that package, merge this package entry into
`~/.pi/agent/settings.json` (or trusted project `.pi/settings.json`):

```json
{
  "packages": [
    {
      "source": "https://github.com/shpitdev/skills",
      "extensions": ["extensions/dspy-decide/index.js"],
      "skills": ["skills/dspy-decide"]
    }
  ]
}
```

The package extension registers `dspy_decide` with Pi's native MCP client.
Use `/mcp` in the next Pi session to verify it has eight tools. In a checkout,
try the standalone bundle without installing it:

```sh
pi -e ./plugins/dspy-decide
```

MCP-only setup (no skill) is also available:

```sh
pi mcp add dspy_decide --url https://dspy-decide.vercel.app/mcp --exposure direct
pi mcp list
```

## Other clients

- OpenCode: merge `{"mcp":{"dspy_decide":{"type":"remote","url":"https://dspy-decide.vercel.app/mcp","enabled":true}}}` into `opencode.json`.
- Claude: add a custom connector named dspy-decide with the MCP endpoint and no sign-in.
- ChatGPT: with custom MCP apps enabled for your account/workspace, create an app using the endpoint, choose no authentication, scan tools and enable the app in a chat.

Use the server's workflow: reviewed labels → proposed questions/diagram approval
→ separate public consent → start → status → result. Do not upload confidential
examples. Verify discovery shows eight tools, then read a public task or browse
the gallery before starting a run. Report connection errors rather than claiming
an installation or completed optimization succeeded.

References: [OpenCode MCP](https://opencode.ai/docs/mcp-servers/),
[Claude connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[ChatGPT MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).
