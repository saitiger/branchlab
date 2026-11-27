# Kahani shelf copy

This is a second experiment. It is not `interaction_mode`, and it does not change the story. It only compares the sentence on the Kahani shelf.

The hypothesis: a concrete line about the child speaking gets more people to start a Kahani story than the poetic tagline.

| Role | Key | Line |
|---|---|---|
| Control | `listen` | Stories that listen to you. |
| Treatment | `next` | Your child says what happens next. |

The flag is `kahani_shelf_copy`. The experiment name is `kahani_shelf_copy_experiment`. The definition lives in `copy/experiment.json`. Status there is "not created in Flagsmith".

The primary metric is `play_started`, aggregated as a mean, direction up. The value is 1 if the visitor starts Kahani and 0 if they leave without starting.

A preview query, `?copy=listen` or `?copy=next`, shows that line and sends nothing. It does not identify anyone, record an exposure, or send `play_started`.

The local model in `copy/model.ts` assumes a 22% click rate for `listen` and 34% for `next`. Those numbers are labels on synthetic visitors. They are not measurements of parents or children.

```
npm run copy:dry
```

That draws 200 pretend visitors per line with seed 11 and writes `copy/last-dry-run.json`. It does not call Flagsmith. The click counts only check that the planted gap shows up in the math. They are not evidence about families.

Going live is a separate decision:

1. Connect the warehouse and wait until it says connected.
2. Ask an agent that follows `skills/flagsmith-prove-experiment/SKILL.md` to create the flag, the metric, and an unstarted experiment. The skill stops before start.
3. A public client-side environment key is needed only when a real visitor is enrolled.
4. A person names the winner. The skill does not ship one on its own.

Do not start `kahani_shelf_copy_experiment` unless someone asks to start it.
