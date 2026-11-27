# flagsmith-prove-experiment

An agent skill that takes a Flagsmith CLI through one experiment: warehouse, keyed multivariate flag, metric, unstarted experiment, instrumentation, start, check, and a winner only after a person names it.

The Flagsmith MCP server is not used to create or start experiments. Reads use `--json --jq` so the transcript stays small.

Install the Flagsmith CLI v2, then give this folder to an agent that loads Agent Skills. The instructions are `SKILL.md`.
