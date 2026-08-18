# Bad Case Analysis: 80395392455

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; 119 chronological messages, 28 tool calls, 12 project assets

## Reconstructed Intent

Use the seven supplied character, outfit, and background references to create a 28-second talk-show scene with three fixed seating positions, the user's exact dialogue, audience reactions, and the specified kiss beat while preserving each person's identity.

## Evidence-Based Finding

The four scene generations at sequences 17-24 received visual references, but none of their prompts contained the user's exact dialogue. Their QA checks at sequences 18, 20, 22, and 24 assessed broad actions and scene composition rather than spoken wording or speaker attribution. The scenes were concatenated and delivered at sequence 28. Independent review of nine distributed frames shows role and identity drift between segments even though the file is structurally playable.

## Root Cause and Impact

The workflow reduced a dialogue-led, identity-critical scene to broad action prompts. It lacked an authoritative speaker/dialogue ledger and cross-segment identity acceptance gate. The final could not faithfully deliver the specified conversation and visibly changed character identity across shots.

## Skill and Lineage Audit

The trace read brainstorm, script, generation, model-routing, blueprint, and execution references. Those reads did not produce a scene-level contract connecting each exact line to a speaker, time range, reference asset, and QA assertion. Prompt and reference lineage is documented in `assets-with-prompts.json`.

## Media and Delivery Evidence

Local inspection found a 28.402-second 1280x720 H.264 video with AAC audio, no black segment, no freeze, no detected silence, and mean volume -25.8 dB. The nine-frame contact sheet shows inconsistent faces/roles across generated segments. See `media/final-proxy.mp4`, `media/contact-sheet.jpg`, detector outputs, and `qa-report.html`.

## Limitations

No local speech transcription was used, so exact spoken output is not inferred from the soundtrack. The omission of exact dialogue from every generation prompt and the visible cross-segment drift are independently evidenced.

## Proposed Phase B (Confirmation Required)

Create a locked per-scene ledger for speaker, exact line, timing, seat, action, and reference images; require post-generation checks against every field before assembly and delivery. Do not enter Phase C without user confirmation.
