# Bad Case Analysis: 82503243139

- Priority: P2
- Attribution: mixed (assembly, skill)
- Evidence source: production Postgres database 3; 587 chronological messages, 146 tool calls, 39 project assets

## Reconstructed Intent

Assemble a short comedic episode with clean, single-voice dialogue for the source character lines and synchronized sound effects.

## Evidence-Based Finding

The Bad v1 was delivered at sequence 88. Source clips already contained native spoken lines, while the composition also overlaid separately generated TTS for the same dialogue. The composition metadata preserved source audio with data-has-audio="true". This establishes two simultaneous voice sources independently of the feedback label.

## Root Cause and Impact

Assembly did not resolve audio ownership before adding TTS. Keeping both native dialogue and replacement dialogue created duplicate or second-voice playback, reducing intelligibility and character consistency.

## Skill and Lineage Audit

The trace read generation audio guidance, motion audio/assembly guidance, and the relevant composition technical references. Read coverage was present, but the handoff did not produce an authoritative dialogue-source ledger or a mutual-exclusion check between native speech and TTS. See assets-with-prompts.json and tool-chain.json.

## Media and Delivery Evidence

The Bad v1 had no retrievable cached media URL, so the duplicated waveforms could not be locally measured. The root cause is nevertheless evidenced by source-clip properties, generated TTS assets, and composition audio flags. See project-assets.json and qa-report.html.

## Limitations

This report does not quantify overlap duration or loudness because no local Bad v1 proxy was available.

## Proposed Phase B (Confirmation Required)

Require an audio-source ledger per spoken line and block assembly when native dialogue and TTS are both enabled for the same semantic line unless an explicit replacement/mix decision exists. Do not enter Phase C without user confirmation.
