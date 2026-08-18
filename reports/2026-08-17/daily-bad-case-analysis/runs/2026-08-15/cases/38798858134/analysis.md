# Case 38798858134

Priority: P1
Attribution: mixed (reference/intent fidelity failure with insufficient final acceptance)
Evidence source: production Postgres database 3; completeness gate passed (1489 message rows, 369 tool calls, 112 assets).

## Reconstructed intent
The user requested a 1980 Renault 5 Turbo drawing sequence, including a coherent drawing-sheet reveal and a visible marker-off/final-beat ending. Vehicle identity and hand continuity were material requirements.

## Evidence-based finding
QA for the Bad LIGNE5_v1 explicitly states that the depicted vehicle was not a Renault 5 Turbo. A later QA entry states that the complete drawing sheet was not shown and the marker was not put down. The trace also records inconsistent hand/vehicle continuity in the delivered sequence. The later v2 improved some elements, but the Bad delivery itself remained noncompliant.

## Root cause and impact
The workflow generated many candidate assets and revisions but did not enforce a reference-identity gate for the car or a final-beat checklist for the drawing reveal. Known visual mismatches remained in the shipped version. Impact: the video fails the core subject request and cannot serve as the requested automotive drawing demonstration.

## Skill and lineage audit
Generation, motion, image analysis, media probing, lint, render, and final-video tools were used, and the relevant generation/motion references were read. The gap is acceptance discipline: the trace shows extensive iteration without a hard block tied to the exact model identity and ending beats.

## Media and delivery evidence
The Bad asset was presented through show_final_video, but its cached download URL is no longer available. This prevents repeat ffprobe, black/freeze, audio, and nine-frame pixel checks. The P1 conclusion is supported by explicit chronological QA findings and asset lineage, not by feedback labels alone. See qa-report.html.

## Limitations
The original Bad binary cannot be re-downloaded from the expired cache. No signed URL or private identifier is stored.

## Proposed Phase B
Add a reference-identity and final-beat release gate: verify the requested vehicle against the supplied reference, require full-sheet and marker-off evidence, and block delivery when hand/object continuity fails. Await user approval before implementation.
