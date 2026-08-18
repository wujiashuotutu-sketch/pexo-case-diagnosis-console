# Bad Case Analysis: 38798858134

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; 1,147 chronological messages, 286 tool calls, 85 project assets

## Reconstructed Intent

Create a 14-second seized-car/container story preserving exact vehicle models, container orientation and seal, and the same lead character and clothing throughout.

## Evidence-Based Finding

The four component generations at sequences 266-286 were independent text-to-video calls with no continuity image passed between shots. Their internal QA records changing container appearance, a woman becoming a wide-brimmed figure, and inability to confirm the exact requested vehicle models. Those clips were nevertheless assembled and delivered as one final.

## Root Cause and Impact

Continuity-critical constraints were expressed only in text and were not carried as reference assets or protected state across generations. QA acknowledged indeterminate or inconsistent identity, vehicle, seal, and orientation details but did not block assembly. The complete delivery therefore failed multiple core fidelity requirements at once.

## Skill and Lineage Audit

The trace read brainstorm, script, generation, routing, execution, motion, visual-style, and technical references. Those reads did not result in an authoritative continuity ledger or image-conditioned shot handoff for this branch. The independent prompt lineage is visible in `assets-with-prompts.json`.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The continuity failures are independently supported by generation arguments and tool QA. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

Without the local final, the audit cannot measure encoding defects or inspect additional unreported frames. Exact visual-model mismatches are limited to what the trace QA could and could not confirm.

## Proposed Phase B (Confirmation Required)

Use approved first/last-frame references across adjacent shots, maintain locked identity/wardrobe/vehicle/container/seal fields, and treat indeterminate exact-model QA as a delivery blocker. Do not enter Phase C without user confirmation.
