# Flagsmith setup, and what the skill does

BranchLab uses Flagsmith Cloud for assignment and for the official result. The agent skill in `skills/flagsmith-prove-experiment/` is the procedure that creates one experiment. This page is the human setup around that skill, and what the skill will and will not do.

The demo can run with no key. Preview does not call Flagsmith. A live story, a live cohort, and an official result all need the setup below.

## What you need

- A Flagsmith Cloud account, with one project and one environment for this work.
- The Flagsmith CLI, version 2 or newer. Check with `flagsmith --version`.
- Node 20 or newer, for the demo and the operator scripts in this repo.
- A warehouse connection on that environment. Flagsmith computes experiment metrics from the warehouse. On Cloud, use the managed warehouse. Environment Settings, then Warehouse. Send the test event and wait until the connection says connected. The first event can take a few hours. If `GET api/v1/environments/$ENV/warehouse-connections/` is empty, stop. An experiment created before the warehouse is connected has nothing to count.

Install the CLI with one of these, in order. Use the npm package only if the others fail.

```
brew install Flagsmith/tap/flagsmith
curl -fsSL https://get.flagsmith.com | sh
npm install -g @flagsmith/cli
```

On Windows: `irm https://raw.githubusercontent.com/Flagsmith/flagsmith-cli/main/install.ps1 | iex`.

## Keys

Two different keys exist. Only one belongs in this app.

| Key | Where it lives | What it can do |
|---|---|---|
| Client-side environment key | `.env` as `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY` | Public by design. The browser uses it to read the flag and write events. Official results are not tamper-evident. |
| Server-side environment key, admin API key | The Flagsmith CLI login, never this repo | Create flags, metrics, and experiments. Start them. Read results. Ship a value. |

Copy `.env.example` to `.env`. Leave the client key empty to play an unrecorded freeform story. Fill it only when a real visitor or a live cohort should be enrolled.

Do not commit `.env`, `flagsmith.env`, or `flagsmith.json`. Do not print `flagsmith auth token`, an admin key, or a server-side environment key.

Log the CLI into Cloud yourself: `flagsmith login`. For a local Flagsmith at `http://localhost:8000`, source the `flagsmith.env` from that setup. Do not copy that file into the repo.

## What the skill does

`skills/flagsmith-prove-experiment/SKILL.md` is an agent skill. Give that folder to an agent that loads Agent Skills. The agent then walks one experiment, and only one, from a hypothesis to a draft in Flagsmith.

It uses the Flagsmith CLI. It does not use the Flagsmith MCP server to create or start experiments. When a command does not exist, it calls the API with `flagsmith api`. Reads use `--json --jq` and come back as one short line, so a transcript does not fill up with payloads.

It asks, then waits, for anything you have not already said:

- The hypothesis, in one sentence.
- The control value and its variation key, and the treatment value and its variation key.
- The success event name, the aggregation (`occurrence`, `count`, `sum`, or `mean`), and the direction (`up` or `down`).
- The rollout percent. The default is 100. Control receives whatever percent the treatments do not take.
- Flagsmith Cloud, or a local API.

Then it does this, and stops on the first CLI or API error instead of inventing another host or another way to assign people:

1. Bind the CLI to a project and an environment. `flagsmith init --project <id> --environment <key>`. The environment key stays in a shell variable. It is not echoed.
2. Check the warehouse. Empty list, and it sends you to the warehouse docs and stops.
3. Create an enabled flag whose value is the control. Add each treatment with `flagsmith feature variant add`, including a non-empty `--key` and `--weight 0`. It does not pass `--variants` on create, because that path cannot set keys. A missing key records no exposures. A disabled flag is a stop.
4. Create the metric. The event name is case-sensitive and must match the name in the app.
5. Create the experiment and do not start it. It prints the id, the name, the status, and the rollout, then a short plan of the flag, the keys, the metric, and the files that will record exposure and the conversion. It waits.

Two later steps need you to say yes in so many words.

Starting. After you say yes, the skill wires the app: a stable anonymous id before the flag is read, an exposure only where that variation is actually shown and only from a server flag payload, a branch on the treatment key, and the metric event on the same identity. `sum` and `mean` include a numeric value. Events are flushed before exit. Then it starts the experiment. Status must come back `running`. Starting locks the flag.

Shipping. Only when you ask, and only after you name the variation. It refreshes results at most once every five minutes and prints the win summary. Completing the experiment and setting the flag to the named value is a second yes. The flag is not deleted.

At the end of a run it reports how many CLI commands it kept, roughly how much stdout that was, and which step it stopped on.

Ordinary multivariate evaluation is not an experiment. The experiment has to be started, and the app has to call the experiment-flag API at the moment the variation is shown.

Worked names for the two tests already defined in this repo are in `skills/flagsmith-prove-experiment/examples.md`. A later experiment uses the same nine steps with new names. Do not reuse `interaction_mode` or `kahani_shelf_copy` for a third question. The six named experiments and who is allowed to produce each number are in `docs/program.md`.

## The two experiments the skill already knows

Freeform against guided. Flag `interaction_mode`. Control `freeform`. Treatment key `guided`. People can talk or type in both. Suggested replies are on screen from the first question only for `guided`. The primary metric is the mean of `interaction_resolved`: `1` when that point gets a latched answer and the mock succeeds, `0` when it does not. `response_latency_ms` and `story_completed` are the other metrics. Put the numeric experiment id in `experiment.json` after the skill creates it. `experimentId` starts as null.

Kahani shelf copy. Flag `kahani_shelf_copy`. Control key `listen`, the line "Stories that listen to you." Treatment key `next`, the line "Your child says what happens next." The story does not change. The primary metric is the mean of `play_started`: `1` if the visitor starts, `0` if they leave without starting. The definition in `copy/experiment.json` stays "not created in Flagsmith" until the skill creates it. Do not start `kahani_shelf_copy_experiment` unless someone asks to start it.

Preview is outside both tests. The demo's preview doors, and `?copy=listen` or `?copy=next`, show a version and send nothing: no identity, no exposure, no conversion.

## After the skill has created the draft

1. Read the plan it printed. Start only when you mean to lock the flag.
2. Copy the experiment id into `experiment.json` for `interaction_mode`.
3. Open the live demo, or send a labeled cohort.

```
npm run cohort:dry
npm run cohort
```

`cohort:dry` writes a dashboard file and does not call Flagsmith. `cohort` asks Flagsmith to assign 20 users. Say so anywhere those rows are shown. Flagsmith cannot filter them out of the official result. A custom size is `npx tsx cohort/run.ts dry-run 6 1` or `npx tsx cohort/run.ts live 40 2`.

`npm run copy:dry` is the same kind of check for the shelf sentences. It does not call Flagsmith. The planted click rates in `copy/model.ts` are not measurements of families.

`npm run results` prints the latest simulated file, then refreshes Flagsmith at most once every five minutes and prints the win summary. The cards inside the demo are this browser's log. They are not the Flagsmith mean and they do not show a win probability. While a variation has fewer than 50 identities, Flagsmith shows that it is still collecting data.

## Shipping without the skill

The repo can finish `interaction_mode` from the command line. Naming the variation prints the plan and changes nothing. `confirm` is the yes.

```
npm run ship -- guided
npm run ship -- guided confirm
```

`confirm` ends the experiment id in `experiment.json` and sets `interaction_mode` to that value, still enabled. If the experiment has already ended and the flag update fails, the flag is left in place. It is not deleted.

The skill's shipping step is the same pair of calls: complete the experiment, then update the flag to the value you named. Use one path. Do not complete the experiment twice.
