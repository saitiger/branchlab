# interaction_mode_experiment

**Hypothesis.** People who can say anything often hesitate. Offering a few suggested replies beside voice and text will raise the share of interaction points that get a response.

| | Freeform, the control | Guided, variation key `guided` |
|---|---|---|
| Voice | On | On |
| Typed text | On | On |
| Suggested replies | Off | On, from the first paint of each question |
| Mock replies | Shared | Shared |
| Questions | The same three | The same three |

Flag: `interaction_mode`. Experiment: `interaction_mode_experiment`. Rollout: 100 percent, even split. The flag stays enabled. Every variation that can be exposed has a non-empty key.

## Metrics

The primary Flagsmith metric is the mean of `interaction_resolved`. Each reached point sends `1` or `0` once. Higher is better.

| Event | Aggregation | Direction | When |
|---|---|---|---|
| `interaction_resolved` | mean | up | Once per reached point. `1` after a latched answer and a successful mock. `0` on mock failure or when that point is abandoned unanswered. |
| `response_latency_ms` | mean | down | Only with a `1`. Milliseconds from the latch to the mock. |
| `story_completed` | occurrence | up | The third mock succeeded. |

Event names are case-sensitive. The local dashboard recomputes richer rates from domain events. Those cards are not the Flagsmith mean and they are not a win probability. While a variation has fewer than 50 identities, Flagsmith shows that it is still collecting data.

## What ends a play

The idle clock starts when a question is shown and pauses while speech recognition is active. It does not reset on an empty transcript. At 60 seconds with no latched answer, the play abandons and sends `0` for the open point if that send has not happened. A later visit abandons a non-terminal play whose tab marker is gone. Refresh keeps the tab marker and restores the beat. Hiding the page does not abandon. A failed mock ends the play on that beat without `story_completed`.

## Operator order

1. In Flagsmith Cloud, open Environment Settings, then Warehouse, and connect the managed warehouse. Send its test event. Wait until the connection says connected. The first event can take a few hours.
2. Run `flagsmith login`, then `flagsmith init` in this directory.
3. Use `skills/flagsmith-prove-experiment/` to create the enabled flag, the keyed variations, the three metrics, and the experiment. Do not start it until you mean to. Starting locks the flag.
4. Copy the experiment id into `experiment.json`.
5. Run the demo or `npm run cohort`.
6. `npm run results` refreshes official results at most once every five minutes.
7. When you name a winner, `npm run ship -- <value> confirm` ends the experiment and serves that value to everyone.

A missing control label, or a payload that did not come from the server, is unrecorded freeform. Measuring waits until an enrolled server payload arrives.

Simulated rows are produced by `cohort/model.ts`. They are labeled in the dashboard. Flagsmith still includes those identities in the official result, because client events cannot be filtered from this app.
