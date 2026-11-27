# Worked tests

## Kahani shelf copy

Use this when the user is comparing the two sentences on the Kahani shelf. Do not add a second experiment in the same run. Do not reuse `interaction_mode` for this question.

| Piece | Value |
|---|---|
| Flag | `kahani_shelf_copy` |
| Experiment | `kahani_shelf_copy_experiment` |
| Control key and value | `listen` |
| Control line | Stories that listen to you. |
| Treatment key and value | `next` |
| Treatment line | Your child says what happens next. |
| Hypothesis | A concrete line about the child speaking gets more people to start a Kahani story than the poetic tagline. |
| Primary event | `play_started` |
| Aggregation | `mean` |
| Direction | `up` |
| Value | `1` if the visitor starts Kahani, `0` if they leave without starting |
| Rollout | 100, even split |

The story does not change. Preview with `?copy=listen` or `?copy=next` sends nothing: no identity, no exposure, no `play_started`.

In this repo the synthetic visitors are `copy/model.ts`. `npm run copy:dry` checks the gap locally and does not call Flagsmith. Do not start `kahani_shelf_copy_experiment` unless the user says to.

## Freeform against guided

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
