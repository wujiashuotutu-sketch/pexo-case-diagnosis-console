# Bad Case Analysis: 71261433794

- Priority: P1
- Attribution: mixed (runtime, model, QA)
- Evidence source: production Postgres database 3; 370 chronological messages, 94 tool calls, 26 project assets

## Reconstructed Intent

Produce a 1939 martial-arts-school siege sequence while preserving the identities of the two referenced lead characters across the full delivery. The final video needed to remain playable and visually continuous, including the latter half of the scene.

## Evidence-Based Finding

The first Bad delivery at tool sequence 65 was structurally defective: the preserved local proxy runs 161.185 seconds and first-bad-freezedetect.txt records 123.322 seconds of freeze, approximately 76.5% of the asset. This directly explains the prolonged repeated image independently of feedback.

A later delivery at sequence 94 repaired the container/runtime failure. Its media checks show 76.743 seconds, 1280x720 H.264 with AAC audio, no black segment, no freeze, 14.863 seconds total silence, and mean volume -26.6 dB. However, tool QA at sequence 84 independently found that character identity drifted after about 30 seconds. The repair therefore fixed playback but did not close the reference-fidelity defect.

## Root Cause and Impact

The first failure is a runtime/assembly validation miss because an asset dominated by a frozen frame reached final delivery. The remaining failure is a model/reference-fidelity issue compounded by QA: the repair flow verified structural health but did not enforce a per-segment identity gate before the second delivery.

Impact is severe: most of the first delivery was unusable, and the replacement still failed the core subject-consistency requirement.

## Skill and Lineage Audit

The trace includes the generation, subject-asset, and modification Skills plus complaint-triage references. Those reads were relevant, but their instructions were not converted into a blocking identity comparison across the repaired timeline. Asset and prompt lineage are preserved in assets-with-prompts.json; the complete tool sequence is in tool-chain.json.

## Media and Delivery Evidence

- First Bad media: media/first-bad-proxy.mp4, media/first-bad-contact-sheet.jpg, media/first-bad-ffprobe.json, media/first-bad-freezedetect.txt
- Latest Bad media: media/final-proxy.mp4, media/contact-sheet.jpg, media/ffprobe.json, media/blackdetect.txt, media/freezedetect.txt, media/silencedetect.txt, media/volumedetect.txt
- Dashboard: qa-report.html

## Limitations

The later asset is structurally inspectable, but automated media checks cannot establish facial identity by themselves. The identity conclusion relies on the trace's own visual QA at sequence 84 and the supplied reference lineage.

## Proposed Phase B (Confirmation Required)

Require a two-part repair gate for this class of case: structural media checks on the exact candidate to be delivered, followed by distributed reference-identity checks after the reported failure timestamp. Do not enter Phase C without user confirmation.
