# Bad Case 90403761155

## Verdict

- Severity: **P2**
- Attribution: **mixed** (reference/asset fidelity plus acceptance workflow)
- Evidence confidence: medium; the final feedback asset URL is expired, but the tool chain contains direct QA findings and repeated lint warnings.

## User-reported symptom

The feedback row reported that the request was misunderstood. The conversation repeatedly specified the real brand logo, no subtitles, small human-scale surgical guides, no fake teeth, and plain staff tunics where requested.

## Reconstructed intent

The final dental campaign needed brand-faithful Quoris3D identity and clinically plausible guide scale, with the delivery edits reflecting the user's latest corrections rather than earlier placeholder visuals.

## Evidence-based phenomenon

1. The timeline repeatedly produced a tail visual-gap warning (`MOTION_CONTRACT_COVERAGE_TAIL_VISUAL_GAP`) and submitted renders while acknowledging it (sequences 182-183, 245-247, 268-269).
2. Earlier lint passes reported `GSAP_EXIT_MISSING_HARD_KILL` for the logo overlay (sequences 233-242), indicating a stale-visibility risk during non-linear seeking.
3. Frame/content inspections recorded plain tunics with no visible logos and could not verify the requested clinical details (sequence 263 and surrounding analyses). The tool chain then regenerated S07/S09 and delivered v4 (`show_final_video`, sequence 274), but the cached final media is unavailable for independent nine-frame verification.

## Root cause and impact

The workflow mixed evolving brand/clinical requirements with generative replacements, while known tail-gap and overlay-state findings were treated as acknowledgements rather than delivery blockers. This leaves a material risk of wrong logo/scale/text treatment, but the final encoded pixels cannot be rechecked now; P2 is the evidence-bounded classification.

## Tool-chain and read audit

| Audit | Result |
|---|---|
| Postgres source | Production database 3; 1,156 message rows, 274 expanded tool calls, 71 assets |
| Key calls | `video_generate` 39; `image_generate` 9; `analyze_file_content` 49; `media_probe` 24; `lint_composition` 12; `submit_render` 4; `show_final_video` 4 |
| Relevant evidence | `tool-chain.json` sequences 182-183, 233-247, 263-274; `audit-facts.json` |
| Skill/reference audit | 44 `read_file` events captured brainstorm, script, generation, assembly, Motion, audio, typography, and product-knowledge paths. Historical event export does not support a reliable line-level completeness score for every triggered reference. |

## Phase B proposal (not executed)

Separate immutable brand/clinical acceptance criteria from generative shot prompts. Block delivery on unresolved tail visual gaps and GSAP exit-state errors, and require a final frame receipt for logo presence, subtitle absence, and guide scale. No production or Skill changes were made.

