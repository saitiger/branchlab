---
name: flagsmith-prove-experiment
description: >-
  Sets up, checks, and finishes one Flagsmith experiment with the Flagsmith CLI,
  including Kahani shelf copy and setting up the next experiment after one exists.
  Use when the user asks to prove a variant, run an A/B test, create a Flagsmith
  experiment, wire exposure and conversion events, read experiment results, or
  roll a winning variant out to everyone.
---

# Prove a Flagsmith experiment

One experiment, from a hypothesis to a running test, then a winner only after the user names it. Use the Flagsmith CLI v2. Call the API through `flagsmith api` when no command exists. Do not use the Flagsmith MCP server to create or start experiments.

Read [reference.md](reference.md) only when creating the metric or experiment. Read [examples.md](examples.md) for the Kahani shelf copy or freeform-vs-guided. A further experiment uses the same nine steps with new names. Do not reuse `interaction_mode` or `kahani_shelf_copy` for a third question.

## Rules

- Stop on the first CLI or API error. Show that error. Do not invent a second assignment method, a second host, or a guessed endpoint.
- Every read uses `--json --jq` and prints one short line. Do not paste full JSON into the chat.
- Never print an admin key, a server-side environment key, or the output of `flagsmith auth token`. Never commit `flagsmith.env`, `.env`, or `flagsmith.json` secrets.
- Two gates need an explicit yes: starting the experiment, and shipping the winner. Creating the flag, metric, and unstarted experiment may proceed after the user has answered the questions in step 1.
- The flag stays enabled. Every variation that can be exposed has a non-empty key. The conversion event name matches the metric, including case.
- Ordinary multivariate evaluation is not an experiment. The experiment must be started, and the app must call the experiment-flag API where the variation is shown.

## Workflow

Copy this list and keep it current:

```
- [ ] 1 Ask
- [ ] 2 Bind the CLI
- [ ] 3 Warehouse
- [ ] 4 Flag
- [ ] 5 Metric
- [ ] 6 Draft experiment
- [ ] 7 Code, then start
- [ ] 8 Check
- [ ] 9 Results and winner
```

### 1 Ask

Skip any item the user already answered. Otherwise ask, then wait.

- Hypothesis, one sentence.
- Control value and its variation key. Treatment value and its variation key.
- Success event name, aggregation (`occurrence`, `count`, `sum`, or `mean`), and direction (`up` or `down`).
- Rollout percent. Default 100. Control receives the percent the treatments do not.
- Flagsmith Cloud, or a local API at `http://localhost:8000`.

If the repo has no app to instrument, say so and offer a tiny demo script. Do not start one until the user agrees.

### 2 Bind the CLI

`flagsmith --version` must be v2 or newer. If it is missing, install with the Windows script `irm https://raw.githubusercontent.com/Flagsmith/flagsmith-cli/main/install.ps1 | iex`, or `brew install Flagsmith/tap/flagsmith`, or `curl -fsSL https://get.flagsmith.com | sh`. Use `npm install -g @flagsmith/cli` only if those fail.

Cloud: the user runs `flagsmith login`. Local: they source the `flagsmith.env` from their setup. Do not copy that file into the repo.

Pick the project and environment with `flagsmith project list --json --jq` and `flagsmith environment list --json --jq`, showing only id and name. Bind with `flagsmith init --project <id> --environment <key>`.

Store the environment API key in a shell variable from `flagsmith environment get --json`. Do not echo it.

### 3 Warehouse

`GET api/v1/environments/$ENV/warehouse-connections/` via `flagsmith api`. If the list is empty, send the user to https://docs.flagsmith.com/experimentation/connect-a-warehouse and stop. On Cloud, the managed warehouse must show connected before an experiment can be created.

### 4 Flag

Create an enabled feature whose value is the control. Add each treatment with `flagsmith feature variant add <feature> --value <value> --key <key> --weight 0`. Do not pass `--variants` on create. That path cannot set keys.

Check with `flagsmith feature get <feature> --json --jq` for `enabled` and each variant `key`. Stop if the flag is disabled or any variant key is empty. A missing key records no exposures.

### 5 Metric

POST the body in [reference.md](reference.md). Print only the metric id and event name.

### 6 Draft experiment

POST the experiment body in [reference.md](reference.md). Do not call `start`. Print only id, name, status, and rollout percent.

Show the user a short plan: flag, keys, metric event, rollout, and the files that will record exposure and the conversion. Stop until they say to start.

### 7 Code, then start

After they say yes, read https://docs.flagsmith.com/experimentation/run-an-experiment for this app's language and edit the app.

- Identify with a stable anonymous id before the experiment flag is read.
- Record exposure only where the variation is shown, and only from a server flag payload.
- Branch on the treatment variation key. Any other enrolled key is the control behaviour.
- Send the metric event with the same identity. For `sum` or `mean`, include a numeric value.
- Flush events before exit.
- Keep the client environment key in the app's existing env mechanism.

Then POST `.../experiments/<id>/start/` with `{}`. Print status. It must be `running`. Starting locks the flag.

### 8 Check

Run `flagsmith evaluate <feature> --identity <probe-id> --json --jq` for the enabled state and variant. Report pass or the first failed line:

- Flag enabled.
- Variation keys present.
- Experiment status `running`.
- Metric event equals the event name in code.
- Identity is shared by exposure and conversion.

### 9 Results and winner

Only when the user asks. POST `.../results/refresh/` at most once every 5 minutes, then GET `.../results/` and print the win summary only.

Shipping the winner is a separate yes. The user must name the variation. POST `.../complete/`, then `flagsmith flag update <feature> --value <winner> --type string --enable`. Do not delete the flag in this skill.

## Close every run

```
Commands: <n>
Stdout bytes: <n>
Approx tokens: <bytes / 4>
Stopped at: <step or done>
```

Count only Flagsmith CLI stdout that you kept, not file diffs.
