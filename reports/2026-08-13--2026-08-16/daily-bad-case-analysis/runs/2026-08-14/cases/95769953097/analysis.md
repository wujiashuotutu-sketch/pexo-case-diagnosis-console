# Bad Case Analysis: 95769953097

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; 2,893 chronological messages, 640 tool calls, 159 project assets

## Reconstructed Intent

For segment 2, preserve the detailed holographic-city opening and zoom quickly into the exact building marked by the user's yellow circle. Segment 3 was not approved or locked and was not to be executed.

## Evidence-Based Finding

The Bad v4 delivery at sequence 269 was checked for smooth camera motion, but the acceptance query did not prove the yellow-circle target. The workflow then produced many revisions. Sequence 619 explicitly records that v15 still reached the wrong area, matching the user's later statement that the zoom remained on the wrong side. At sequences 637-640 the trace finally localized the circle and discovered that an earlier crop interpretation was wrong: the exact center resolved to a tall building facade rather than the low-rise cluster previously targeted. The conversation also records execution of segment 3 without user approval.

## Root Cause and Impact

The target was represented semantically and reinterpreted across revisions instead of being locked to authoritative coordinates and validated against the marked source image. Smoothness QA repeatedly substituted for target-correctness QA. This caused extensive retry cost without satisfying the requested zoom and crossed an approval boundary on segment 3.

## Skill and Lineage Audit

The long trace read generation and motion Skills plus camera, transition, typography, visual-style, and technical references. The relevant instructions did not become a stable target-state contract: crops and endpoint descriptions changed, and approval state was not enforced. Detailed lineage and call history are in `assets-with-prompts.json` and `tool-chain.json`.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The wrong-target finding is independently supported by tool QA and crop analysis, not by feedback alone. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

The exact Bad v4 pixels could not be reinspected locally. Later trace evidence proves the target-state confusion and repeated failure, but it does not quantify every intermediate revision's visual distance from the marked point.

## Proposed Phase B (Confirmation Required)

Lock annotated targets as immutable coordinates plus a verified endpoint crop; require endpoint overlap/identity checks in addition to motion smoothness, and enforce explicit approval before executing unlocked segments. Do not enter Phase C without user confirmation.
