# Bad Case 14378442003

## Verdict

- Severity: **P1**
- Attribution: **mixed** (asset/sequence continuity plus a delivery-gate failure)
- Evidence confidence: high for the frame and tool-chain contradiction; medium for the final encoded pixels because the cached URL expired.

## User-reported symptom

The feedback context said the sync was getting worse. This is retained as the reported symptom only.

## Reconstructed intent

The project was a three-minute child-friendly solar-eclipse story with stable Leo, Buddy, and Milo character continuity. In the glasses beat, the picture needed to show Buddy handling the glasses while the narration/subtitles described that action.

## Evidence-based phenomenon

1. The agent explicitly investigated the sync issue and rendered targeted frames (sequences 258-270).
2. Those frame inspections repeatedly found no dog/Buddy and no glasses in the relevant scene, while the visible subtitle still said that Buddy grabbed or put on the glasses (sequences 263, 264, 268, 270).
3. `lint_composition` had earlier reported a 1.3 s visual gap at 104.5 s (sequence 220). The composition was edited and later linted as valid, but the targeted frame evidence still contradicted the narration/visual pairing.
4. The corrected-looking revision was rendered and shown as final (`submit_render` sequence 271; `show_final_video` sequence 277). The feedback asset itself is not downloadable now, so no independent ffprobe/black/freeze result is asserted for it.

## Root cause and impact

The visual timeline and narration/subtitle lineage were not re-validated as one semantic unit after revision. The agent had concrete frame evidence that the named subject was absent, yet the final delivery path proceeded. This is P1 because the core story action and its narration disagree at the exact user-reported beat.

## Tool-chain and read audit

| Audit | Result |
|---|---|
| Postgres source | Production database 3; 1,265 message rows, 332 expanded tool calls, 75 assets |
| Key calls | `video_generate` 18; `analyze_file_content` 69; `render_frame` 37; `media_probe` 28; `lint_composition` 11; `show_final_video` 5 |
| Relevant evidence | `tool-chain.json` sequences 220, 263-270, 271, 277; `audit-facts.json` |
| Skill/reference audit | 58 `read_file` events captured across brainstorm, script, generation, assembly, motion, and modification skills. Historical event export does not make a reliable line-level completeness calculation for every triggered reference; the report records this limitation rather than inferring it. |
| Coverage statement | Conversation, call chain, asset lineage, and targeted frame evidence: sufficient. Final feedback asset pixels: unavailable. |

## Phase B proposal (not executed)

Require a semantic A/V alignment receipt for each user-named subject/action: the frame window must contain the subject and action named by the subtitle/VO, otherwise delivery is blocked. Re-run the targeted frame check after every timeline edit. No production or Skill changes were made.

