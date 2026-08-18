# Case 07491535358

Priority: P1
Attribution: mixed (execution/QA gate; model output evidence is downstream)
Evidence source: production Postgres database 3; completeness gate passed (421 message rows, 113 tool calls, 21 assets).

## Reconstructed intent
The user requested a five-second 16:9 channel intro with a tiny fairy landing on a pebble, throwing three pebbles in sequence, then throwing a fourth pebble into camera, followed by a title/end beat. The request also specified reference-faithful character and a tightly timed beat sheet.

## Evidence-based finding
The internal final QA recorded only one visible pebble throw in the delivered cut even though the requested beat requires three throws before the final camera throw. The QA notes also identify conflicting title/checklist evidence, so the delivered result was not reliably checked against the locked beat sheet before finalization. This is a material request-compliance failure, not only a subjective pacing complaint.

## Root cause and impact
The workflow generated and rendered media, but the final acceptance loop did not enforce a beat-by-beat count against the user's explicit sequence. Existing QA observations surfaced the discrepancy yet the final delivery path still completed. Impact: the five-second intro cannot be relied on to communicate the requested action sequence and requires rework.

## Skill and lineage audit
The trace shows generation, assembly, motion, media_probe, lint, frame renders, and final-video presentation. Relevant generation and motion references were read. The gap is execution of the acceptance criteria: evidence was collected, but a hard gate did not block delivery when the action count and title evidence disagreed. Prompt lineage is available in assets-with-prompts.json.

## Media and delivery evidence
The final asset was presented through show_final_video and has a local asset identity in the audit facts. The cached download URL for the Bad asset is no longer available, so this run cannot repeat ffprobe, blackdetect, freezedetect, audio, or nine-frame pixel checks. The finding above is based on the chronological QA/tool evidence, not the feedback label alone. See qa-report.html for the self-contained dashboard.

## Limitations
The expired cached media prevents independent re-probing of the exact Bad binary. No user identity or signed URL is persisted.

## Proposed Phase B
Add a delivery gate that maps every explicit timed beat and numeric action to a checkable acceptance item, blocks finalization on unresolved count/title conflicts, and requires a fresh final-media review after any composition edit. Do not implement until the user approves the Phase B plan.
