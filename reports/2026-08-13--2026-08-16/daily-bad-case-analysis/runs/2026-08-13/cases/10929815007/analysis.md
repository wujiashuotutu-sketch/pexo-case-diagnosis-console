# Bad Case Analysis: 10929815007

- Priority: P2
- Attribution: mixed (assembly, QA)
- Evidence source: production Postgres database 3; 1,233 chronological messages, 284 tool calls, 61 project assets

## Reconstructed Intent

Deliver a 9:16 YouTube Short with clear, consistently paced singing and a complete song ending, followed by a low-cost background blur adjustment.

## Evidence-Based Finding

Audio QA at sequence 248 explicitly states that the assembled song cuts off mid-phrase and that the full outro cannot be confirmed. Despite that result, the agent continued to render and deliver the same assembly branch. Later work through sequence 284 changed framing and background blur but did not establish a new full-length audio mix or verify the outro after the visual edits.

## Root Cause and Impact

A known audio-completeness failure was not treated as a delivery blocker. Subsequent iterations addressed presentation rather than returning to the audio clock and source duration. The result is an unfinished musical deliverable even if the requested vertical framing was eventually applied.

## Skill and Lineage Audit

The trace includes generation, assembly, audio, and motion-related reads. Read coverage was adequate, but there is no evidence that the audio QA result was converted into a blocking acceptance condition. Asset lineage is available in assets-with-prompts.json.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, silence/volume, black/freeze, and frame checks were unavailable. The audio finding is supported by the trace's own analysis at sequence 248 and the unchanged downstream audio branch. See tool-chain.json, project-assets.json, and qa-report.html.

## Limitations

Exact truncation duration and final loudness cannot be independently measured from a local proxy.

## Proposed Phase B (Confirmation Required)

Require a final audio-duration and ending-completeness check after every edit, including visual-only revisions. An explicit mid-phrase cutoff must block final delivery. Do not enter Phase C without user confirmation.
