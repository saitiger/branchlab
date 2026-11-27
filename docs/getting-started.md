# Getting started

Install Node 20 or newer, then:

```
npm install
npm run dev
```

Copy `.env.example` to `.env` first.

Put the Flagsmith client-side environment key in `.env` as `FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY`. Leave it empty to play an unrecorded freeform story.

The demo offers four doors:

- **Start the live story.** After you choose it, BranchLab identifies a stored anonymous id and asks Flagsmith for the experiment flag. The screen says whether you are enrolled.
- **Preview freeform or guided.** Same three beats, no Flagsmith client, no event log.
- **View results.** This browser's live log, and `demo/public/simulated.json` if a cohort run wrote one.

Speech uses the browser's speech service when that API exists. BranchLab does not store the words. Typing works either way. Hold the talk control, or send a typed reply. In the guided version, three suggestions sit beside those controls.

A synthetic cohort is documented in `cohort/README.md`. Official experiment setup is documented in `docs/experiments.md`.
