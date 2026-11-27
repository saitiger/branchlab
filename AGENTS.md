# BranchLab agents

Read `skills/flagsmith-prove-experiment/SKILL.md` before creating, starting, checking, or shipping a Flagsmith experiment. Follow that file. Do not invent a second assignment path or a second host.

Synthetic reply traffic is `cohort/`. A dry run does not call Flagsmith. A real cohort run requires `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY` and uses Flagsmith to assign each new UUID.

`copy/` is the sentence test. `npm run copy:dry` does not call Flagsmith. Do not start `kahani_shelf_copy_experiment` unless the user says to.

`npm run results` reads metrics. `npm run ship -- guided` prints the plan and changes nothing. `npm run ship -- guided confirm` ships that variation.
