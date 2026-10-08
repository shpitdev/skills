---
name: meshix
description: Use when helping someone find, create, revise, or review 3D CAD with Meshix at meshix.app, including Community History, Gridfinity, Multiboard, explicit Assembly beta requests, clarification recovery, and artifacts.
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

- Use `prepare_cad_request` when routing or physical-fit inputs are unclear.
  It does not start generation. Read its missing fields and recommended tool,
  ask only for the information needed, and use its argument skeleton.
- Use `create_3d_cad` for general prompt-driven CAD.
- Use `create_3d_cad_gridfinity` only with known `length_u`, `width_u`, and
  `height_u`. One footprint U is 42 mm; one height U is 7 mm. Do not guess fit.
- Use `create_3d_cad_multiboard` only with known install orientation, mount side,
  access side, connector layout, security, and pad mode. Ask before choosing a
  side or retention strategy.
- Assembly beta requires explicit user opt-in. Only then pass
  `template_id="assembly"` to `prepare_cad_request` or `create_3d_cad`. Describe
  the components, interfaces, relative placement, and separate component outputs.
  Multi-part prose alone is not beta opt-in. Omit `template_id` for normal
  auto-routing; typed Gridfinity and Multiboard tools do not accept it.
- Omit model overrides unless the user requests one. Follow the live model
  schema; CLIProxy generation uses CLIProxy grading, so leave `grading_model`
  unset for a CLIProxy generation model.

## Discovery Requests

When the user asks to find, list, search, open, inspect, or identify a Meshix
design, design version, Community History entry, public gallery item, or prior
run, treat that as a Meshix MCP discovery task.

- Use Meshix MCP before web search or general STL sites.
- For signed-out Studio History → Community, use `list_public_history`, then
  `get_public_history` with a returned `design_id`. These read public prompts
  and latest run progress or failure, including active and needs-attention runs
  with no selected version. Community uses recent public-design visibility
  windows; private designs and private history are excluded.
- Use Community's `type` and `status` filters from the live schema, including
  `in_progress` and `needs_attention`. Multiboard's history type is `multiboard`,
  not the gallery's `board_mount`. Pass `next_cursor` unchanged with the same
  filters; continue after short or empty pages until `next_cursor` is null.
- For owned designs or gallery discovery, use `list_designs` with `scope="mine"`
  first. Unless the user asked for private-only results, also check
  `scope="public"` when owned results are empty or too few are relevant, and
  report which scopes you checked. The published gallery is a subset of
  historical work, but can include designs published by other users outside
  recent Community or your owned History.
- Use `get_design` for an owned design and `get_design_history` for owned
  version/run history. `get_public_design` reads only a public selected or
  published version; use `get_public_history` for Community runs without one.
  History reads do not return signed download URLs. Carry returned opaque IDs
  into later calls; a display label such as v2 is not a `version_id`.
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
3. Prepare and create through the route above. Keep the returned `design_id`,
   `run_id`, and `studio_url` and follow the run without another user prompt.
4. Poll `get_design` on the returned cadence, normally every 30-60 seconds,
   until the run completes, errors, or requires action. Treat iterations and
   progress labels as normal progress. Use the host's supported wait or monitor
   if direct sleep is unavailable. Report active progress briefly.
5. In a host with MCP Apps UI, `render_design_progress` can show an inline
   widget. Pass `design_id` and optionally `version_id`, never `run_id`. Only
   visible host confirmation proves it mounted. Leave a mounted widget visible
   to auto-refresh; otherwise follow the returned polling guidance with
   `get_design`.
6. If the run needs clarification, follow the checkpoint workflow below.
   Report an error or Studio-only action with its returned reason and link.
7. On completion, use `get_design_assets` for fresh download URLs and inspect
   the renders and relevant CAD artifacts for fit, thickness, orientation,
   access, and printability. Asset readiness is separate from run completion;
   report missing outputs rather than claiming they exist.
8. Return the Studio design/run URL and the reviewed result. Use `version_id`
   when inspecting or downloading an exact historical result.

## Clarification and Revisions

- For an owned run requiring clarification, call `get_clarification_checkpoint`
  with its exact `design_id` and `run_id`. Present the saved questions and use
  the returned `checkpoint_id` unchanged.
- Call `continue_clarification_checkpoint` with the current required action:
  `answer_questions` needs a complete answer for each saved question;
  `retry_review` retries a failed review; `start_run` activates the prepared run.
  Follow each returned `next_action`. Do not replace the design or run to bypass
  a checkpoint, and do not invent answers.
- For `legacy_recovery` or `restart_typed_setup`, use the returned Studio link.
- Use `revise_design` for a completed owned result. Revisions preserve its
  generation family; create a new design when the family must change. Omitted
  model overrides retain the parent's model and effort.
- Use `fork_public_design` when the user asks to revise a public selected
  version into their own design. Pass its exact public `version_id`; the source
  stays unchanged and Assembly is inherited only from an Assembly parent.
- Follow queued revisions and forks through the same progress and artifact
  workflow. If the user asks to cancel, `cancel_job` supports active owned
  Assembly jobs only; use the returned `job_id`.

## Artifact Saving

- Use the host's native artifact or image display when available. When saving
  downloads is supported, fetch fresh URLs through `get_design_assets` and save
  the actual bytes. Signed URLs expire; do not treat them as permanent files.
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
- For Assembly, include the available composed outputs and separate component
  artifacts the user needs, including 3MF and intent/manifest evidence. Keep
  returned version, part, and attempt identifiers with saved files so different
  results are not confused. Public downloads cover the public selected version;
  use `scope="public"` and its exact `version_id`.
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
