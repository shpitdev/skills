---
name: dspy-decide
description: Reshape a chat prompt or Jev request, review its questions and diagram, optimize with reviewed labeled examples, and integrate generated decide() code into a repository.
---

# dspy-decide

Use the MCP tools at `https://dspy-decide.vercel.app/mcp`. If they are missing,
read [setup](references/setup.md). Discover the live tools and follow the server
instructions; do not invent fields or copy tool schemas into the project.
Every task, run, example and result is public. Only upload material the user
can share publicly.

1. Before the first `create_task` or any upload (including new material sent
   through `update_task`), tell the user plainly: “Uploading makes your prompt,
   examples and task publicly readable immediately. All results are public as
   soon as they exist.” Confirm the material can be shared publicly and get
   explicit consent before uploading. Without consent, upload nothing. A request
   to optimize or approval of a proposal is not public consent.
2. Find the user's original prompt or Jev request and reviewed examples. Only
   after pre-upload consent, call `create_task`. For chat, use `create_task.source`
   as `{kind: "chat", prompt: originalPrompt, inputs: [...]}`.
   Declare the actual variables and JSON types from the app's call site, such as
   `{name: "text", type: "string"}` for `{{text}}`; don't invent inputs. Ask the user
   if the input contract is unclear. A bare prompt string is accepted but declares
   no typed inputs, so template variables can cause rejection. Keep the original
   prompt intact; raw Jev requests go in `source` unchanged. Don't invent a shaped
   spec instead of letting reshape inspect it. Examples and mapping are optional
   for preview. Alternatively supply a shaped TaskSpec or a completed `from_run_id`;
   don't combine either with `source`. Keep the returned `edit_token` private in
   agent context; never print, log, put it in a URL or save it in the repository.
3. Wait for reshape using `get_task`, at least 5 seconds between unchanged reads.
   A reshaping task has `spec: null` and an `engine_job` summary. Queued isn't done;
   missing execution configuration can leave it queued. Report failed/rejected
   states and reasons honestly, and never invent proposed questions. Cancel a task
   job with `update_task` and `cancel_job: true`, or retry a failed/cancelled current
   job with `retry_job: true`; both require `expected_revision` and a separate call.
   `cancel_run` is for runs, not reshape/label jobs.
4. Present the completed proposal's actual question text, rules, label mapping
   and Mermaid diagram in your reply before asking for approval. A task name,
   artifact link or approval menu alone isn't a review. Get explicit approval
   or plain-language feedback. Send `feedback` with
   `expected_revision: task.revision` separately from other edits, wait for the new
   reshape, then show its questions/diagram and get approval again. Feedback needs
   a completed proposal. Save structured edits first; record approval separately
   using `approve_revision` equal to the returned revision. Never approve stale
   data or infer user approval from `in_shape` or an already-approved task.
5. Inspect intake, not just the task ID: `validation.blocking` prevents running.
   Fix mapping or replace the complete examples dataset with `update_task`; read
   `validation_url` if details are truncated. Approval can queue a label job; wait
   for it, then show pending `label_review.suggestions` for review. The full pending
   count is `label_review_total`; `label_review_url` includes all suggestions and
   provenance. Correct labels through examples/mapping. Low-confidence suggestions
   remain unlabeled and block runs; don't silently accept them as ground truth.
   Null cost means unknown, not zero.
6. Below 50 labeled examples, refuse to start. Say they need at least 50, and
   offer realistic, varied examples covering edge cases and balanced across answers
   for review before uploading. Never pad near-duplicates. With 50–99, say:
   “100+ labeled examples is the threshold for good results unless the task is very
   simple.” Offer more first, but let the user proceed. At 100+, no count warning.
   Maximum 5,000; no score-only mode. Reshape preview is allowed at any count.
7. Before `optimize`, get a second explicit confirmation that the run will
   publish its results. This does not replace the first consent gate before
   `create_task` or any upload. Ask a separate public-consent question, not a
   combined approve-and-run choice. Diagram approval alone isn't public consent.
   Start only an approved task without active engine jobs or blocking intake, using
   `optimize` with `public_ok: true`, then show its public link. `MIN_EXAMPLES`
   (needed 50, got N) is a refusal with the example-generation offer above;
   `FEW_EXAMPLES` (recommended 100, got N) is a warning, not a refusal. `BUSY` means
   try again shortly, not success: the refused request creates no partial task/job
   or approval. Don't hammer retries; reread the task before retrying an update.
8. Use `get_run` with `wait_seconds: 30` as the waiting mechanism; don't add long
   shell sleeps between polls. Carry `next_sequence` into `after_sequence` and
   drain `has_more` with `wait_seconds: 0` before resuming the bounded wait. Continue to done, failed or
   cancelled; report failures and unknown state honestly. On success, fetch
   `get_result` and inspect scores, missed examples, requests, rules, diagram,
   costs and artifacts. Null result is unavailable, not success. If
   `result.selection.reason_code` is `as_given_at_ceiling`, tell the user the
   original request was kept unchanged (no demonstrated gain); never describe it
   as an improvement. Still integrate the retained request and generated `decide()`
   as below.
9. In a coding repository, save the request and generated Python or TypeScript
   `decide()` code, wire it into the intended call site and run relevant tests.
   In chat, return the request and artifacts.

Use `search_gallery` to find public runs and fork a completed result with new
examples. Reads are open and need no sign-in; changes require the edit token.
