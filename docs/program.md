# Five experiments

Flagsmith holds the flags and the official results. This repository names the flags, the variation keys, and the event names. The story client that shows a question stays in a private repository. It sends these event names. It does not live here.

Synthetic checks are allowed only where a persona cannot pretend to be a child. `npm run board` prints them. A passing gate is not a result about children.

| Experiment | Flag | Control | Treatment | Event | Who can produce the number |
|---|---|---|---|---|---|
| A character with a want | `character_want` | `obey` | `want` | `unprompted_reply` occurrence, up | Synthetic gate, 24 paired plays. Children only after that gate passes. |
| A situation, then an opening | `situation_opening` | `bare` | `concrete` | `usable_first_answer` mean, up | Synthetic check of the question text. Children decide the answer rate. |
| Guide the hero, or be the hero | `hero_address` | `guide` | `be` | `first_person` mean, up | Not this round. A simulated reply copies the pronoun. |
| Freeform vs guided | `interaction_mode` | `control` (`freeform`) | `guided` | `chip_exact` mean, up | Children. Also send `usable_answer` when the replies are hidden. |
| Copy | `kahani_shelf_copy` | `listen` | `next` | `play_started` mean, up | Visitors who see the shelf. Synthetic users do not. |

`chip_exact` is 1 when the answer text is exactly a reply that was on screen. `usable_answer` is 1 when the answer is a real reply and the replies were hidden. `play_started` is 1 on the Play click and 0 when the visitor leaves without clicking.

Create each flag enabled, with a non-empty key on every variation, and do not start it until the warehouse is connected and you mean to lock the flag. The skill in `skills/flagsmith-prove-experiment/` is the procedure for one experiment. Repeat it with the names in this table. Official results are the Flagsmith means. Refresh at most once every five minutes.
