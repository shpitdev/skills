---
name: dspy-decide
description: Optimize a decision-model prompt or Jev request using reviewed labeled examples, inspect public runs and scored results, and integrate generated decide() code into a repository.
---

# dspy-decide

Use the MCP tools at `https://dspy-decide.vercel.app/mcp`. If they are missing,
read [setup](references/setup.md). Discover the live tools and follow the server
instructions; do not invent fields or copy tool schemas into the project.

1. Find the user's request and examples with correct answers. `create_task`
   currently accepts a shaped TaskSpec or a completed `from_run_id`, plus new
   examples and optional column mapping. Do not pass a raw prompt as a spec.
2. Create the task. Keep its `edit_token` private in agent context for edits,
   starts and cancellation; never print it, log it, put it in a URL or save it
   in the repository. Inspect the intake report, not just the task ID. A saved
   task with `validation.blocking` is not runnable. Use `update_task` to fix
   mapping or replace examples; if details are truncated, read `validation_url`.
3. Show the questions, rules, label mapping and Mermaid diagram. Get an explicit
   yes before `optimize`, and again after structural edits. Separately explain
   that every task, run, example and result is public and obtain public consent.
4. Below 50 labeled examples, refuse to start. Say they need at least 50, and
   offer to generate realistic, varied examples covering edge cases and balanced
   across answers for their review before uploading. Never pad near-duplicates.
   With 50–99, say: “100+ labeled examples is the threshold for good results unless
   the task is very simple.” Offer more examples first, but let the user proceed.
   At 100+, no count warning. Maximum 5,000; no score-only mode. Reshape preview
   remains allowed at any count.
5. Start the approved run with `public_ok: true`, then show its public link.
   Use `get_run` with `wait_seconds` up to 30 and carry `next_sequence` into
   `after_sequence`. Drain `has_more` without waiting. Continue to done, failed
   or cancelled; report failures and unknown state honestly.
6. On success, fetch `get_result`. Compare scores and inspect missed examples,
   optimized requests, rules, diagram, costs and artifacts. A null result is
   unavailable, not success. In a coding repository, save the request and
   generated Python or TypeScript `decide()` code, wire it into the intended
   call site and run relevant tests. In chat, return the request and artifacts.

Use `search_gallery` to find public runs and fork a completed result with new
examples. Reads are open and need no sign-in; mutations require the edit token.
