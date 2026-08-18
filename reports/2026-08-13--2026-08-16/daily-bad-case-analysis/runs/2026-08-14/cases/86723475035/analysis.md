# Bad Case Analysis: 86723475035

- Priority: P2
- Attribution: none (revision-state context)
- Evidence source: production Postgres database 3; 437 chronological messages, 110 tool calls, 31 project assets

## Reconstructed Intent

The original brief requested a vertical recipe video with voiceover only at the opening and closing. After v1 was delivered, the user added a new requirement for spoken narration throughout all recipe steps.

## Evidence-Based Finding

V1 was delivered at 01:09 and matched the then-current brief's opening and closing voiceover structure. The expanded narration-throughout requirement arrived at 01:18:38, and the Bad feedback followed at 01:19. The agent delivered v2 at 01:22 with the newer requirement incorporated. The timing does not support treating v1's limited narration as evidence that the original locked brief was misunderstood.

## Root Cause and Impact

This is an obsolete-revision feedback gap: the user's expectation changed after the evaluated asset was delivered. It created short-lived dissatisfaction, but the trace does not prove a model or Skill execution defect for v1, and a new version followed promptly.

## Skill and Lineage Audit

The trace read script, generation, voice, assembly, motion, caption, visual-style, blueprint, and preflight references. The relevant issue is version-to-feedback attribution rather than missing or ineffective creative guidance. The delivery chronology is in `tool-chain.json`.

## Media and Delivery Evidence

The Bad v1 asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. The conclusion is limited to requirement and delivery timestamps. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

Without local media, the audit does not claim that v1 was free of unrelated defects. It only concludes that the reported narration mismatch was introduced by a later requirement and should not be back-applied to the prior version.

## Proposed Phase B (Confirmation Required)

Associate feedback with the requirement snapshot active when each asset was delivered and surface when a newer request supersedes an older final. No Phase C change is authorized.
