---
name: meshix
description: Use when helping someone create, inspect, or iterate on 3D CAD with Meshix at meshix.app, including Meshix Studio, Meshix MCP, Gridfinity, Multiboard, and artifact review.
---

# Meshix

Meshix is an AI-assisted 3D CAD product at `https://meshix.app`. Use this skill
when the user wants to make, revise, understand, or review a physical part or a
Meshix-generated design.

## Start

- For browser use, send the user to `https://meshix.app` or Meshix Studio.
- For agent use, use the live Meshix MCP server first. The public endpoint is
  `https://meshix.app/mcp`.
- Before the first generation call in an MCP session, call `get_account_status`
  when present to confirm sign-in and backend health.
- If the MCP server is available, use its current tool schemas as the contract.
  Do not rely on remembered or copied schemas when the live tool metadata is
  present.
- For first-time agent connection, OAuth, or MCP setup problems, read
  [setup.md](references/setup.md).
- If the user provides an image or sketch as a CAD reference, read
  [image-to-cad.md](references/image-to-cad.md). Meshix MCP currently accepts
  text CAD briefs, so translate the image into physical geometry first.

## Routing

- Use the general CAD path for open-ended parts: brackets, fixtures, enclosures,
  adapters, gears, threads, trays, and one-off mechanical ideas.
- Use Gridfinity only when the user gives the footprint units and height units,
  or when they can confirm them. Gridfinity fit is physical fit; do not guess.
- Use Multiboard only when the mount orientation, mount side, access side, and
  connector expectations are clear. Ask before choosing a side or retention
  strategy.

## Discovery Requests

When the user asks to find, list, search, open, inspect, or identify a Meshix
design, design version, public gallery item, or prior run, treat that as a
Meshix MCP discovery task.

- Use Meshix MCP before web search or general STL sites.
- Start with `get_account_status` when present, then use discovery tools such
  as `list_designs` and `get_design` according to the live tool schemas.
- Search the signed-in user's designs first when the wording suggests "my" or a
  previous conversation. Search public Meshix designs when the wording suggests
  a public/shared design or when private results are empty.
- If the exact query has no MCP match, report the MCP-backed misses and the
  closest MCP-backed candidates. Do not silently substitute a Thingiverse,
  STLFinder, Printables, or other web result.
- Use web search only when the user explicitly asks for non-Meshix web results,
  or after saying Meshix MCP is unavailable and labeling the fallback as not
  MCP-backed.

## Workflow

1. Capture the physical intent: what the part does, what it attaches to, and
   what must fit.
2. Ask for dimensions, clearances, material or printer constraints, and mounting
   context when those affect the result.
3. Use the narrowest Meshix surface that fits the request. If the request is
   under-specified, make one short clarification pass before generating.
4. Expect generation to take a few minutes. Poll the design status every 30-60
   seconds, and stop on the top-level design state: `ready`,
   `needs_attention`, or a reported error. Treat run-level state changes,
   iterations, and progress labels as normal progress signals. If the agent
   blocks direct sleep commands, use its supported wait, monitor, or background
   task pattern instead of giving up.
5. After generation, review the resulting artifacts for obvious fit,
   orientation, thickness, access, and printability issues.
6. Return the Studio design/run URL, not just the design id, so the user can
   inspect and continue the model interactively.

## Artifact Saving

- When reviewing render images, download the actual PNG bytes to disk before
  replying. Do not only return signed or temporary image URLs.
- Save useful PNGs under `<cwd>/.memory/meshix/<design-id>/` using filenames
  that include the view, such as `isometric.png`, `top.png`, and `bottom.png`.
  Use a temp directory only when there is no useful working directory.
- Show saved renders inline with Markdown image syntax and absolute paths, such
  as `![Meshix isometric render](/absolute/path/.memory/meshix/<design-id>/isometric.png)`.
- If the agent can download STEP, STL, or plan files and the harness has
  persistent memory or preferences, ask once where the user likes Meshix CAD
  artifacts saved. Remember that preference when the harness supports memory.
- If no preference exists, save STEP, STL, plan, and render downloads under
  `<cwd>/.memory/meshix/<design-id>/`. Report the saved file paths with the
  Studio URL.
- Do not store OAuth tokens, signed URL caches, or credentials in the repo.

## Review Standard

Meshix outputs are design artifacts, not guarantees. Do not imply a generated
part is load-rated, electrically safe, food safe, printer-tuned, or physically
verified unless the user supplies separate evidence. Be especially careful with
parts that carry weight, touch heat, involve batteries, or must mate tightly with
real hardware.

Render previews are CAD inspection views, not product photography. Isometric,
top, and bottom renders may show the model from different sides; apparent text
direction or orientation issues should be checked against the Studio run link or
alternate views before calling them defects.
