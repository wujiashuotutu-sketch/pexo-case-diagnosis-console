# Bad Case 21144260283

## Verdict

- Severity: **P1**
- Attribution: **mixed** (generation/model fidelity plus a delivery-gate failure)
- Evidence confidence: high for the intent/tool-chain finding; medium for final-pixel fidelity because the persisted final asset has no cached URL.

## User-reported symptom

The feedback row reported inconsistent subject/reference, misunderstood request, and revision made it worse. The durable report treats these as the user's observed symptoms, not as root-cause proof.

## Reconstructed intent

The last locked request required the raven to remain planted and motionless while only the fingers perform a beckoning gesture, followed by the requested pointing motion. The user explicitly rejected whole-body, head, and arm movement.

## Evidence-based phenomenon

1. The agent generated a fluid revision and inspected it with `analyze_file_content` (tool-chain sequence 334). That inspection already recorded that the head and torso shifted during the arm wave.
2. A later inspection of the delivered revision recorded the same contradiction more directly: body/head/torso were not completely frozen and moved in addition to the hand (sequence 336).
3. The same revision was then shown as final (`show_final_video`, sequence 337). Earlier render submissions also acknowledged `MOTION_CONTRACT_COVERAGE_AUDIO_GAP` and `MOTION_CONTRACT_COVERAGE_NO_AUDIO`, while the final media proxy is silent.
4. Independent media proxy checks found a playable 10.04 s, 1280x720 H.264 video with no black or freeze segments and no audio. Nine-frame contact-sheet evidence is preserved under `media/contact-sheet.jpg`.

## Root cause and impact

The final acceptance decision did not convert a known failed motion assertion into a blocking state. The model/generation path failed the narrow “only fingers move” constraint, and the runtime/workflow allowed `show_final_video` after that failure. This is a P1 because the primary requested edit was contradicted and the known contradiction was delivered as final.

## Tool-chain and read audit

| Audit | Result |
|---|---|
| Postgres source | Production database 3; 1,728 message rows, 399 expanded tool calls, 101 assets |
| Key calls | `video_generate` 10; `analyze_file_content` 100; `render_frame` 51; `lint_composition` 20; `submit_render` 13; `show_final_video` 13 |
| Relevant evidence | `tool-chain.json` sequences 334, 336, 337; `audit-facts.json`; `media/contact-sheet.jpg` |
| Skill/reference audit | 37 `read_file` events captured. Generation and Motion skills plus routing, execution, visual-style, motion, typography, and tech HTML references were read repeatedly. Exact historical line-level completeness is limited by the exported event payload; no claim of full application coverage is made. |
| Coverage statement | Conversation/tool chain/assets: complete enough for diagnosis. Final media pixels: partial because the feedback asset URL expired. |

## Phase B proposal (not executed)

Add a hard post-render assertion for user-scoped motion constraints: if the final QA conclusion says any non-owned body region moved, block delivery and require a targeted frame-difference review. Treat acknowledged audio-gap/no-audio findings as a separate explicit receipt, not an implicit pass. No Skill, production data, or Release was changed in this audit.

