# Bad Case Analysis: 15585660442

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; 110 chronological messages, 24 tool calls, 5 project assets

## Reconstructed Intent

Create a 10-second, two-scene cinematic music video featuring the five distinct members shown in the supplied group reference, preserving their identities and dark styling across a surveillance room and a moving truck.

## Evidence-Based Finding

Sequence 4 analyzed the supplied five-member reference in detail. The initial generation calls at sequences 8-10 then described generic young Asian idols and omitted `image_list`, so the model had no visual identity input. Sequence 11 confirmed only five similarly styled men in black leather, not reference-member identity. The result was assembled and delivered at sequence 16. Later calls at sequences 23-24 attempted reference-based repair but remained `pending_confirmation`, leaving no corrected final.

## Root Cause and Impact

The analyzed reference was not propagated into the actual generation calls, and QA checked count and wardrobe rather than a five-member identity matrix. The final replaced a diverse, individually defined group with generic lookalikes, failing the core reference-fidelity requirement across the whole delivery.

## Skill and Lineage Audit

The trace read generation, brainstorm, routing, execution, modification, and image-generation guidance. Despite those reads, the first three scene calls omitted the available reference attachment and no per-member acceptance checklist was applied. The lineage gap is visible in `assets-with-prompts.json` and exact tool arguments in `tool-chain.json`.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The delivery and later pending repair are independently established by the chronological tool chain. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

Without local media, encoding and frame-level defects beyond the trace's own QA cannot be independently measured. The missing-reference root cause is directly evidenced by tool arguments and does not rely on the feedback label.

## Proposed Phase B (Confirmation Required)

Require every identity-critical generation call to carry the approved reference set, maintain a five-member identity ledger, and block assembly when QA verifies only generic count or styling. Do not enter Phase C without user confirmation.
