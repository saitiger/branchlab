# Synthetic users

A synthetic user is a fresh UUID played through the same session rules as the demo. The behavior model is `model.ts`.

Guided, at each point: a suggestion 7 times in 10, speech 2 times in 10, unanswered 1 time in 10. Freeform: speech 5 in 10, typing 3 in 10, unanswered 2 in 10. A suggestion is faster than speech. Unanswered points wait out the 60 second idle rule and record a zero.

```
npm run cohort:dry
```

Dry run writes `demo/public/simulated.json` and does not call Flagsmith. The dashboard labels it as a dry run.

```
npm run cohort
```

The real command requires `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY`. Flagsmith assigns the variant. The script flushes before it exits. It never reads the browser's participant id, and it never accepts a server-side key or an admin key.

An unanswered point abandons the rest of that play, the same way the demo does. Rows are marked simulated. Flagsmith cannot tell them apart from browser events, so a demo that includes this cohort has to say so.
