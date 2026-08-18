# Bad Case Analysis: 95680605000

- Priority: P2
- Attribution: mixed (model, QA)
- Evidence source: production Postgres database 3; 57 chronological messages, 12 tool calls, 3 project assets

## Reconstructed Intent

Animate the supplied panda in Arabic clothing and dance while preserving the FANDA logo on the outfit.

## Evidence-Based Finding

The generation prompt explicitly requires the FANDA wordmark. Tool visual QA at sequence 9 states that the visible logo appears as SANDA, but the agent accepted the result and delivered it at sequence 12. The final media is otherwise structurally healthy: 6.046 seconds, 720x1280 H.264 with AAC audio, no black segment, no freeze, no detected silence, and mean volume -13.4 dB.

## Root Cause and Impact

The video model altered brand text, and the known fidelity defect was not treated as blocking. The delivered asset fails the central brand-preservation requirement even though playback quality is sound.

## Skill and Lineage Audit

Only the generation Skill was read in this short trace. The workflow did not load or apply a dedicated logo/brand-preservation verification reference, and it proceeded despite explicit negative QA. Prompt and generated-asset lineage are in assets-with-prompts.json.

## Media and Delivery Evidence

See media/final-proxy.mp4, media/contact-sheet.jpg, media/ffprobe.json, media/blackdetect.txt, media/freezedetect.txt, media/silencedetect.txt, media/volumedetect.txt, and qa-report.html.

## Limitations

Automated text recognition was not run locally; the lettering conclusion relies on the trace's own visual QA at sequence 9 and the contact-sheet review.

## Proposed Phase B (Confirmation Required)

Treat exact brand text as a protected region, verify it after image generation and again after animation, and block delivery when QA reports altered lettering. Do not enter Phase C without user confirmation.
