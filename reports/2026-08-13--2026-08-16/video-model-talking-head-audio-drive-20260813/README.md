# Video Model Talking-Head Audio-Drive Test

Test date: 2026-08-13

## Fixed Input Contract

- Scenario: one visible presenter delivers one Mandarin sentence to camera.
- Duration target: 6 seconds.
- Canvas: 16:9.
- Resolution: 720p.
- Camera: fixed medium close-up; no cuts and no camera movement.
- Visual input: purpose-built synthetic character reference, front-facing medium close-up.
- Speech input: one clean Mandarin voice, no music, effects, ambience, or reverb.
- Test sentence: `大家好，今天我们用同一段声音，测试四个视频模型的口型同步和人物稳定性。`

## Evaluation Contract

Provider request success is not sufficient. A model passes the scenario only when:

1. The output contains the supplied speech without replacement or extra speech.
2. Visible mouth motion follows the supplied phoneme timing throughout the spoken interval.
3. The presenter remains the same person without material face, hair, clothing, or body drift.
4. The face and mouth remain anatomically plausible.
5. The output has no unexpected music, duplicated voice, cuts, or camera movement.
6. Duration and output specification match the request within the documented provider tolerance.

## Source

- File: `synthetic-presenter-input.png`
- Source file: `analysis/langfuse-data/compile-format-pretest/references/p1_image1_woman_front_ref.png`
- Transformation: deterministic center crop removing the test label, then scale to 1280x720.
- Identity class: synthetic illustration; no real-person likeness is used in the model-quality run.

The Pexels presenter still remains outside this run. It may be used later for a separate
real-person content-review and authorized-portrait test, but it is not mixed into the
lip-sync quality comparison.
