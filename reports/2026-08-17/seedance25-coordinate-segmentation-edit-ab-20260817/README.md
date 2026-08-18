# Seedance 2.5 Coordinate + Segmentation Edit A/B

## Question

Do an explicit coordinate guide and an isolated target element improve a video
model's ability to modify the intended object while preserving the rest of the
scene?

## Controlled Setup

- Model: `doubao-seedance-2-5-260628`
- Task: reference-to-video with a localized appearance edit
- Duration: 4 seconds
- Resolution: 720p
- Audio: off
- Scene: two identical red mugs on one table
- Instruction: only the viewer-left mug changes from red to matte cobalt blue;
  the right mug and scene stay fixed

## Conditions

| Arm | Inputs after the common primary source | Tests |
|---|---|---|
| A | none | prompt-only baseline |
| B | coordinate guide | target localization |
| C | isolated transparent mug | element identity preservation |
| D | coordinate guide + isolated mug | combined reference package |

All arms use the same core instruction. Reference-role sentences differ only
to bind the images actually present in that arm.

Seedance 2.5 rejects requests that mix `first_frame` with ordinary reference
media. The comparable experiment therefore passes the source scene as
`reference_image` in all four arms. A separately submitted first-frame probe is
kept only as a diagnostic and is excluded from the A/B result.

## Primary Metrics

1. Target hit: the viewer-left mug is the moving object.
2. Non-target preservation: the right mug does not move, duplicate, disappear,
   or change appearance.
3. Element fidelity: the moving mug remains the same red ceramic mug.
4. Guide leakage: no red box, arrow, marker, split screen, or transparent-card
   artifact appears in the video.
5. Scene preservation: table, sofa, room, framing, and lighting remain stable.

One sample per arm is only a smoke test. If the result is directionally useful,
repeat each arm three times before making a routing decision.

## Commands

Prepare inputs with the bundled image runtime:

```bash
/Users/wellswu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  prepare_inputs.py
```

Submit, poll, and download:

```bash
python3 run_experiment.py --all
```
