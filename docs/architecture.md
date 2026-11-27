# Architecture

BranchLab is one library with two callers: the browser demo and the Node cohort. Both use the same session rules and the same Flagsmith adapter. The demo's preview path does not import the SDK.

A live play reads or mints `branchlab.participant` in localStorage. That UUID is the Flagsmith identity. It is not an email or a guessable counter. A play has its own session id. Play again keeps the participant and starts a new session.

After Start, the adapter identifies, then calls `getExperimentFlag("interaction_mode")`. Exposure is recorded only when the SDK loaded the flag from the server, the flag is enabled, and the identity is in the experiment. The story paints guided only when the variation key is `guided`. Every other enrolled key is freeform and still records. A disabled flag, a cache-only payload, a missing key, or a failed request plays freeform and writes nothing.

Each reached point can latch once: a suggestion click, a non-empty speech result, or a non-empty typed submit. The mock reply is local and shared by both versions. A success sends `interaction_resolved` 1 and, with it, `response_latency_ms`. The third success also sends `story_completed`. A failed mock or an abandoned point sends `interaction_resolved` 0. The ledger is one send per metric, session, and point. Hiding the page flushes the Flagsmith buffer and does not abandon the play. Sixty idle seconds with no answer, or a later load whose tab marker is gone, abandons once.

Domain events stay in this browser. The dashboard computes rates from that log and, separately, from the simulated file. It does not query Flagsmith. `npm run results` and `npm run ship` are the operator path for the official result and for rolling a named variation out to everyone.

The agent skill in `skills/flagsmith-prove-experiment/` creates the Flagsmith resources with the CLI. It does not use a second assignment method.
