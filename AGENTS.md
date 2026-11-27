# BranchLab agents

Read `skills/flagsmith-prove-experiment/SKILL.md` before creating, starting, checking, or shipping a Flagsmith experiment. Follow that file. Do not invent a second assignment path or a second host.

Synthetic traffic is `cohort/`. A dry run does not call Flagsmith. A real cohort run requires `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY` and uses Flagsmith to assign each new UUID.

`npm run results` reads metrics. `npm run ship -- guided` prints the plan and changes nothing. `npm run ship -- guided confirm` ships that variation.
