# Bad Case Analysis: 75341219240

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; complete chronological trace with 743 tool calls represented in the case evidence package

## Reconstructed Intent

Deliver the complete scripted cinematic sequence with recognizable recurring characters, correct tavern signage, full duration, and convincing synchronized lip movement for every speaking character.

## Evidence-Based Finding

Three Bad finals were delivered at sequences 319, 435, and 589. The 115-second sequence-589 version was delivered before a dedicated lip-sync review. Sequence 593 then identified long sections with closed or still mouths during dialogue, including 12.0-19.0 seconds and other character exchanges, while its parallel audio assessment could not establish synchronization. Multiple repair deliveries followed at sequences 694, 713, and 743, showing that the defect required repeated post-delivery correction rather than being caught at the acceptance gate.

## Root Cause and Impact

The final-delivery gate did not require scene-by-scene audio/mouth synchronization evidence before release. Broad visual assembly completion was treated as sufficient for a dialogue-heavy film. Users received multiple incomplete or severely unsynchronized versions, incurring repeated generation and review cost.

## Skill and Lineage Audit

The project used a large multi-stage generation and assembly workflow, but lip-sync acceptance was performed only after the third Bad delivery. The trace lacked a locked dialogue-to-shot verification ledger that would block final delivery on closed-mouth speech intervals. Full call and asset lineage are preserved in `tool-chain.json` and `assets-with-prompts.json`.

## Media and Delivery Evidence

The Bad assets had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The tool's own combined QA at sequence 593 supplies timestamped visual evidence of the lip-motion gaps. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

The available QA separated visual and audio analysis and could not calculate objective audiovisual offset. The severity finding is based on repeated delivery history and explicit closed-mouth intervals, not on the feedback label alone.

## Proposed Phase B (Confirmation Required)

Require dialogue-shot mapping and pre-delivery audiovisual QA for every speaking interval; block final delivery when speech occurs without verified mouth motion or when the analyzer cannot establish synchronization. Do not enter Phase C without user confirmation.
