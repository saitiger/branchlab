# Worked test: freeform against guided

Use this when the user is comparing an open reply with suggested replies. Do not add a second experiment in the same run.

| Piece | Value |
|---|---|
| Flag | `interaction_mode` |
| Experiment | `interaction_mode_experiment` |
| Control value | `freeform` |
| Treatment key and value | `guided` |
| Hypothesis | Suggested replies beside voice and text raise the share of interaction points that get a response. |
| Primary event | `interaction_resolved` |
| Aggregation | `mean` |
| Direction | `up` |
| Value | `1` when the point gets a successful response, `0` when it does not |
| Rollout | 100, even split |

Suggested replies render only when the variation key is `guided`. Every other enrolled key behaves as freeform.

Send `interaction_resolved` once per reached point. A second send changes the mean. Preview and any path that does not show the assigned variation must not identify, expose, or track.

The public demo of the library can run without the product. People in the experiment are whoever the user said lands on the deployed page.

In this repo the synthetic cohort for the same test is `cohort/model.ts`. Guided and freeform frequencies live there. `npm run cohort:dry` previews the model locally. `npm run cohort` plays it through Flagsmith.
