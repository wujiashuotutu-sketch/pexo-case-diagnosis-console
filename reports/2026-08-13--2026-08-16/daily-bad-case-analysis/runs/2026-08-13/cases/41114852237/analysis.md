# Bad Case Analysis: 41114852237

- Priority: P1
- Attribution: mixed (model, skill, QA)
- Evidence source: production Postgres database 3; 286 chronological messages, 72 tool calls, 16 project assets

## Reconstructed Intent

Create a ten-second birthday fantasy with two reference-locked characters. Required beats included text appearing on an orb, a crystal gift-box handoff, the Princess opening the box, and crown placement.

## Evidence-Based Finding

The original prompt explicitly specifies those four beats. Final visual analyses at tool sequences 67 and 68 independently report that the orb has no required text and that the gift handoff and box-opening action are absent. The delivery QA at sequence 63 checked broad scene presence, text, and transitions, but did not verify the concrete narrative checklist before the final asset was shown.

## Root Cause and Impact

The generated sequence omitted multiple required actions, and the QA rubric was too coarse to block delivery. This is a model realization failure combined with a skill/QA planning gap: prompt requirements were not compiled into atomic, observable acceptance checks.

Impact is severe because the missing actions are the story's causal spine, not cosmetic details. The delivered video cannot communicate the requested birthday-gift event.

## Skill and Lineage Audit

The trace includes script, generation, and motion/assembly-related reads. They supported creation and rendering, but the read effectiveness was incomplete: the final verification did not preserve a requirement-to-shot checklist for the orb text, handoff, opening, and crown beat. Full prompt lineage is in assets-with-prompts.json.

## Media and Delivery Evidence

The final asset had no retrievable cached media URL during this audit, so ffprobe, black/freeze, audio, and nine-frame local checks could not be repeated. The finding is grounded in prompt lineage and the trace's own post-render visual analyses. See tool-chain.json, project-assets.json, and qa-report.html.

## Limitations

Without a local media proxy, this report does not independently characterize encoding or audio health. It only classifies the narrative omissions established by internal tool evidence.

## Proposed Phase B (Confirmation Required)

Compile every explicit story beat into an acceptance matrix and require a post-render visual check that cites each beat as present, absent, or unscorable. Missing core beats must block delivery. Do not enter Phase C without user confirmation.
