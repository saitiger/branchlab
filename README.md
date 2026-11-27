# BranchLab

BranchLab compares two ways of answering a real-time character: saying anything, or saying anything with suggested replies beside it. Flagsmith assigns each person, records exposures and conversions, and computes the official result. This repository is the library, the demo, the agent skill that sets the experiment up, and the synthetic cohort.

The demo is a three-beat conversation with Ivo, a night clerk in a map room. It does not need another product, a model API, or a private story.

## Try it

```
npm install
npm test
npm run dev
```

Open the demo. Preview either version and nothing is recorded. Start the live story only after `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY` is in `.env` (see `.env.example`). That key is public by design and can write events. Official results are not tamper-evident. A server-side key and an admin key never go in this repo.

## Run an experiment

1. Install the Flagsmith CLI v2 and run `flagsmith login`.
2. Connect the managed warehouse and wait until it says connected. See [docs/experiments.md](docs/experiments.md).
3. Ask an agent that loads [skills/flagsmith-prove-experiment/SKILL.md](skills/flagsmith-prove-experiment/SKILL.md) to create the flag, the metrics, and an unstarted experiment. The skill stops before start, and again before a winner is shipped.
4. Put the numeric experiment id in `experiment.json`.
5. Play the live demo, or send a labeled cohort:

```
npm run cohort:dry
npm run cohort
```

`cohort:dry` writes a dashboard file and does not call Flagsmith. `cohort` uses Flagsmith assignment for 20 users. Say so anywhere those rows are shown. Flagsmith cannot filter them out of the official result. A custom size is `npx tsx cohort/run.ts dry-run 6 1` or `npx tsx cohort/run.ts live 40 2`.

## Kahani shelf copy

A separate test compares two sentences on the Kahani shelf. The lines, the metric, and the local dry run are in [docs/kahani-copy.md](docs/kahani-copy.md). The same skill, [skills/flagsmith-prove-experiment/SKILL.md](skills/flagsmith-prove-experiment/SKILL.md), can set that test up or a later experiment with new names.

## Read the metrics

`npm run results` prints the latest simulated file, then refreshes Flagsmith at most once every five minutes and prints the win summary. The in-app cards are local. They are not the Flagsmith mean and they do not show win probability.

## Ship a winner

Name the variation. Nothing changes until `--yes` is present.

```
npm run ship -- guided
npm run ship -- guided confirm
```

That ends the experiment and sets `interaction_mode` to the winning value, enabled. The flag is not deleted.

## Layout

| Path | What it is |
|---|---|
| `src/` | Identity, session rules, metrics, Flagsmith adapter |
| `demo/` | Live story, preview, this-browser dashboard |
| `cohort/` | Synthetic users and the published behavior model |
| `skills/flagsmith-prove-experiment/` | Agent skill for one Flagsmith experiment |
| `operator/` | Read results and ship a named winner |
| `docs/` | Setup, architecture, and the experiment definition |

[docs/getting-started.md](docs/getting-started.md) · [docs/architecture.md](docs/architecture.md) · [docs/experiments.md](docs/experiments.md)
