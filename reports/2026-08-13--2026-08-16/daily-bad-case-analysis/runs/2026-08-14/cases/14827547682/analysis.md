# Bad Case Analysis: 14827547682

- Priority: P2
- Attribution: skill
- Evidence source: production Postgres database 3; 1,311 chronological messages, 328 tool calls, 84 project assets

## Reconstructed Intent

Keep the liked v4 unchanged except for removing one specifically highlighted text bubble.

## Evidence-Based Finding

The v5 branch at sequences 288-309 replaced the opening `S01` scene rather than applying only the requested bubble removal. After the user clarified the intended scope, sequences 310-328 restored `S01` and delivered v4b. The Bad delivery therefore reflects a revision-targeting failure that was subsequently repaired.

## Root Cause and Impact

The edit request was not converted into an immutable target plus protected-region contract. The agent modified an unrelated opening scene, forcing another correction cycle, but a restored version was delivered later.

## Skill and Lineage Audit

The trace read the relevant creative, script, motion, typography, caption, audio, transition, and technical references. The failure was not missing documentation; it was ineffective application of scope control and baseline preservation during the revision. Version history is explicit in `tool-chain.json` and `project-assets.json`.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The wrong-scene replacement and later restoration are evidenced by the edit and delivery chain. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

No local pixel comparison between v4, v5, and v4b was possible. The structural edit history is complete enough to establish the out-of-scope change.

## Proposed Phase B (Confirmation Required)

Anchor visual edit requests to the selected element and baseline version, preserve all non-target regions, and require a pre-delivery diff showing only approved changes. Do not enter Phase C without user confirmation.
