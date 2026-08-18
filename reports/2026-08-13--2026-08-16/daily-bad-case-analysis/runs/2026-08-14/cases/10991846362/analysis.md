# Bad Case Analysis: 10991846362

- Priority: P1
- Attribution: mixed (model, skill)
- Evidence source: production Postgres database 3; 142 chronological messages, 23 tool calls, 8 project assets

## Reconstructed Intent

Create a vertical hospital-corridor video using the supplied man as the identity reference, speaking the user's exact Persian script with synchronized lips. After the first failure, the user explicitly requested a voice-first workflow before regenerating the video.

## Evidence-Based Finding

The initial generation at sequence 8 used the face reference and requested generic Persian-looking speech, but it did not bind the supplied script or a generated speech asset. Sequence 9 visually confirmed mouth motion while its audio analysis could only identify speech in an unrecognized language; it did not verify the Persian wording or synchronization. The agent nevertheless delivered that asset at sequence 11. Exact Persian TTS was only created later at sequences 17 and 21, while the corresponding voice-first repair generations at sequences 19 and 23 remained `pending_confirmation`; no corrected final was delivered.

## Root Cause and Impact

The workflow treated visual mouth movement as proof of dialogue fidelity. It generated the video before establishing the authoritative audio track and omitted an atomic check for language, exact wording, and audio-to-lip synchronization. The final therefore missed the central spoken-content contract and consumed generation effort without a completed repair.

## Skill and Lineage Audit

The trace read the generation Skill, model-routing reference, assembly Skill, and voice-production reference. Those reads did not become an effective voice-first execution gate: the relevant audio was produced only after delivery, and the later video calls were not completed. Prompt and asset lineage are recorded in `assets-with-prompts.json`; the complete call sequence is in `tool-chain.json`.

## Media and Delivery Evidence

Local media inspection found a structurally healthy 15.093-second 720x1280 H.264 video with AAC audio, no black segment, no freeze, no detected silence, and mean volume -19.3 dB. Nine distributed frames confirm stable portrait framing and identity, but structural health does not establish exact Persian speech. See `media/final-proxy.mp4`, `media/contact-sheet.jpg`, the detector outputs, and `qa-report.html`.

## Limitations

No local Persian speech recognition or phoneme-level lip-sync metric was available. The content failure is established by the generation arguments and the trace's own inability to recognize the spoken language, not by feedback alone.

## Proposed Phase B (Confirmation Required)

Make the approved script and speech asset authoritative before video generation; require explicit audio binding and block delivery until language, wording, duration, and lip synchronization are verified. Do not enter Phase C without user confirmation.
