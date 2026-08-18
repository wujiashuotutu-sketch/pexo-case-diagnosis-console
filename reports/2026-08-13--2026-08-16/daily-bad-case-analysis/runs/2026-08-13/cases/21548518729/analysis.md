# Bad Case Analysis: 21548518729

- Priority: P2
- Attribution: mixed (assembly, QA)
- Evidence source: production Postgres database 3; 390 chronological messages, 64 tool calls, 8 project assets

## Reconstructed Intent

Preserve a specific spoken sentence from the source scene while adding crowd booing and other visual modifications.

## Evidence-Based Finding

Source-clip QA at sequence 14 confirmed the required spoken line. Final-mix QA at sequence 47 detected crowd booing but did not confirm the speech. The agent nevertheless repeatedly represented the sentence as present and delivered the mixed asset without a post-mix transcription or speech-content check.

## Root Cause and Impact

The mix pipeline validated the added ambience but not preservation of the required dialogue. The agent inferred that a source property survived assembly instead of re-verifying the delivered artifact. The primary requested line was therefore not evidenced in the final mix.

## Skill and Lineage Audit

The trace includes script, generation, motion/assembly, and audio-related reads. Their guidance did not result in a final dialogue-preservation gate. Source and derived asset lineage is available in assets-with-prompts.json.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, preventing an independent local transcription, ffprobe, volume/silence, black/freeze, and nine-frame review. The finding is limited to the trace's own source and final-mix analyses. See tool-chain.json, project-assets.json, and qa-report.html.

## Limitations

This report does not assert that speech is completely absent; it asserts that the final delivery lacked evidence confirming the required sentence after mixing.

## Proposed Phase B (Confirmation Required)

Add post-mix ASR or semantic speech verification for every exact dialogue requirement, and compare it against the locked line before delivery. Do not enter Phase C without user confirmation.
