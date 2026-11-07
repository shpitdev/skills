---
name: frontierclimb
description: Use when designing, running, or reading graded evals for an agent-facing product (a CLI, an MCP or Code Mode server, or an HTTP API), or when tuning prompts, tools, or routing against eval results without overfitting.
---

# Frontierclimb

Frontierclimb grades agent-facing products on real tasks: an agent working
through a CLI or MCP server, or a hosted generator behind an API. A change is
an improvement when the graded results and the cost per task both say so.

## Start

- If the `fc` CLI is installed, treat `fc --help` and each subcommand's
  `--help` as the command contract. Don't invent flags.
- Before changing anything, find the catalog for the surface you're changing
  and its latest production baseline. Measure against that, not an old run.

## Cases and grading

- Write cases as requests a real user would send. Include vague ones, ones that
  never name what they want, and ones where the right answer is to refuse, only
  read, or say nothing fits.
- Grade what the user receives: the final artifact, end state, or answer.
  Intermediate tool calls are evidence, not the result.
- Use deterministic checks for anything code can settle: the right kind of
  output, required elements, counts, order, nothing invented. Use a judge with a
  written rubric for what code can't, such as whether the result reads
  correctly for the request.
- Record cost next to quality on every sample: tokens, model calls, repairs,
  wall time, dollars. A pass after three repairs is worse than one after a
  single call.
- When a case's expected answer is wrong, fix the label and state the reason as
  a general rule ("a dated plan of phases is a Gantt chart"). Apply the rule to
  every case, not only the one that failed.

## Tuning without overfitting

- Keep a tuning split and a holdout split. Iterate on tuning and read its
  failures freely. Run holdout only when a change is final and look at totals
  only; if you are the one tuning, have someone else run it.
- Change general rules, never wording shaped to one case. Warning signs: a new
  clause per failing case, criteria that name test items, thresholds fitted to a
  handful of samples.
- Compare like with like: same split, sample count, concurrency, model, and
  time window. Run both arms together or interleaved; provider latency and
  error rates change with the time of day.
- Use at least three samples per case. Treat a difference of one or two samples
  as noise unless it repeats.
- Change one thing per measured step. Keep what the results reward; revert what
  they don't.

## Products that write

- Never grade write actions against real accounts or production data. Use an
  emulator, a sandbox tenant, or seeded fixtures reset for every sample.
- Grade the state after the action, read back independently, not the agent's
  report that it acted.
- Count side effects as failures: duplicate writes on retry, changes outside
  the requested scope, any write when the request asked only to read or draft.
- Include read-only requests that tempt a write, such as "summarize these,
  don't send anything".
- Have tools return what they did (records touched, IDs, timings) so a grader
  or a person can audit any sample.

## Reading results

- Read individual failing samples, not only totals.
- Separate infrastructure failures (unreachable target, timeouts, rate limits)
  from quality failures. Rerun the infrastructure ones; count neither way.
- Name the metric you report. A sample can pass the judge and fail a
  deterministic check, so use the same metric for every arm.
- Don't run graded evals while the target is deploying or shared model capacity
  is under maintenance.
- Report each change as: pass rate by group against the baseline, holdout
  totals, tokens, calls and latency per request, and the change in cost.

## Budget

- A graded run pays for the target's model calls and the judges'. Agree on a
  budget before large runs.
- Don't run two of your own evals at once against the same capacity. Within a
  run, use full concurrency and back off on rate limits instead of spacing
  requests ahead of time.
