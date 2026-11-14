---
name: evalclimb
description: Use when optimizing an app's decision prompt (yes/no, multiple-choice or Jev Box answers over text, images or PDFs) against reviewed labeled examples with EvalClimb, then wiring the generated decide() caller into the code. Every upload and result is public.
---

# EvalClimb

[EvalClimb](https://www.evalclimb.com) turns an app's decision prompt and
reviewed labeled examples into decision questions, optimizes them, scores the
result on held-out examples and returns a generated `decide()` caller. The MCP
server is `https://www.evalclimb.com/mcp`. There is no sign-in or API key, and
every upload, task and result is public.

## Start

- Use the `evalclimb` MCP tools. If they are missing, connect the server with
  the steps at <https://www.evalclimb.com/connect>.
- The server's instructions, tool schemas and each response's `next` field are
  the contract. Copy their examples instead of inventing fields.
- Start from the app's real call site: the original prompt, its typed inputs
  and the labels the code expects. Upload the prompt unchanged.
- To reuse public work, `search_gallery` and fork a completed run with
  `from_run_id`.

## What it supports

| Model                               | Inputs              | Answers                  |
| ----------------------------------- | ------------------- | ------------------------ |
| `typesafe/jev-1.13` (default)       | Text, PNG/JPEG      | Noul (yes/no), Choice    |
| `typesafe/jev-1.14`                 | Text, PNG/JPEG      | Noul, Choice, Box        |
| `google/gemini-decision-1-20261111` | Text, PNG/JPEG, PDF | Noul, Choice             |
| `openai/gpt-6-luna-decisions`       | Text, PNG/JPEG      | Noul, Choice             |

- A chat prompt with text inputs converts directly.
- Image inputs need a native spec or a raw Jev request.
- PDF inputs need a native spec with the Gemini model.
- Raw Jev requests stay unchanged, with their bindings. Box answers need IoU
  scoring and, when a box can be absent, a gate on a companion question.
- GEPA rewrites instructions using only the learn split. A raw Jev request can
  instead keep its wording and tune only decoding weights and thresholds.
- Not supported: score answers, video, audio, and PDFs on other models.
- Each public run keeps its source files, including PDFs, its scores and
  generated callers, plus any optimization audit the run produced.

## Consent and approval

Ask each as its own question, and wait for an explicit answer:

1. **Upload:** before the first upload and before adding new material, confirm
   the prompt, examples and files may become publicly readable immediately. A
   request to optimize is not consent.
2. **Proposal:** show the completed proposal's actual questions, rules, label
   mapping and Mermaid diagram, then approve that revision.
3. **Run:** separately confirm that the run and its results may be published
   before calling `optimize`. Approving the proposal does not count.

Keep the private `edit_token` out of output, logs, commits and URLs.

## Examples

- A run needs at least 50 labeled examples; 100+ is recommended, 5,000 is the
  maximum. Above 500, pass a public HTTPS JSONL/CSV URL or an uploaded file.
- Show pending label suggestions for review; never accept low-confidence labels
  silently.
- Offer to draft varied, answer-balanced cases and edge cases for the user to
  review. Never pad with near-duplicates.

## Integrate and report

- Report actual before/after held-out scores and missed cases. A null score or
  cost is unknown, not zero. `as_given_at_ceiling` means the original prompt was
  kept with no demonstrated gain.
- In a repo, download the exported `decide.py` or `decide.ts` with
  `bundle.json`, import that runner instead of writing your own `decide()`,
  replace the existing call site while keeping its input shape, set the API key
  the bundle names, and run the tests, even when the original prompt was kept.
- In chat, return the artifacts and the public run URL.
