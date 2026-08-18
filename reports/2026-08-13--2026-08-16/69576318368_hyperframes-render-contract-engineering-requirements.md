# 69576318368 HyperFrames render-contract engineering requirements

## Status

Engineering requirement derived from production case `69576318368`. This document does not modify any `tech-*` contract.

## Problem statement

A 12 s local H.264/AAC video was authored as the only child of `data-hf-sequence` while also carrying `data-track-index="0"`. The render API accepted the HTML, returned `done`, and produced a 24.000 s final with constant black video frames and valid audio. Removing the sequence wrapper and giving the same video explicit `data-start="0" data-duration="12"` produced a correct 12.011 s animated final.

Documentation alone did not prevent the failure: the agent had read the full Motion Skill, `tech-html.md`, `tech-data-attributes.md`, and AFC policy.

## Required gates

### Pre-submit structural validation

Reject render submission when any condition is true:

1. A `data-hf-sequence` has fewer than two children unless the runtime explicitly supports and normalizes the one-child case.
2. A sequence child declares `data-track-index` while the sequence owns lane/timing assignment.
3. A video-mode composition has no resolved visible picture surface covering the declared root interval.
4. Resolved child intervals exceed or duplicate the root interval outside one-frame tolerance.
5. Root duration, resolved timeline duration, and expected output duration disagree.

Return structured codes such as:

- `HF_SEQUENCE_ARITY_INVALID`
- `HF_SEQUENCE_CHILD_LANE_CONFLICT`
- `HF_VISUAL_COVERAGE_GAP`
- `HF_TIMELINE_DURATION_MISMATCH`

### Post-render acceptance receipt

A `done` render must expose a receipt containing:

- declared root duration;
- encoded output duration;
- video and audio stream presence;
- sampled timestamps;
- black/constant-frame signals;
- picture-surface decode status;
- source asset ids/revisions consumed.

A final video is not deliverable when:

- encoded duration differs from declared duration by more than max(1 frame, configured tolerance);
- all sampled frames are constant or effectively black;
- expected motion is replaced by a static output;
- a declared visible source produced no pixels.

### Delivery binding

`show_final_video` must require a receipt bound to the exact final asset revision/path. A receipt for the source clip, a pre-render PNG, or an earlier final revision must not satisfy delivery.

## Regression fixtures

1. One local MP4 outside a sequence: 12 s in, 12 s out, moving pixels.
2. One MP4 in a one-child sequence: either normalized deterministically or rejected.
3. Sequence child with `data-track-index`: rejected if illegal.
4. Two-child legal sequence with transition: duration resolves correctly.
5. Valid audio plus black video: render or delivery fails.
6. Root 12 s, output 24 s: `HF_TIMELINE_DURATION_MISMATCH`.
7. Dark night scene with local contrast/motion: passes black-frame gate.
8. Same source with repaired DOM from case `69576318368`: passes.

