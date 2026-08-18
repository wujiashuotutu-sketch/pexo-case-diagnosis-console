# Bad Case 05641376364

## Verdict

- Severity: **P2**
- Attribution: **model/skill**
- Evidence confidence: medium; final feedback media URL is expired, while the prompt and visual-analysis lineage are available.

## User-reported symptom

The feedback row reported the visual style as wrong. The user had asked to preserve the source neon lettering format.

## Reconstructed intent

The requested animation was a neon sign where TACOS, TALK, and “with Stevie” retained the source image's exact letterforms while the sign flickered on and the underline drew in.

## Evidence-based phenomenon

1. The agent chose an image-to-image recreation route and repeatedly instructed the image model to “keep the exact letterforms” (generation calls 263-273 in `tool-chain.json`).
2. The agent's own visual inspections then found that TACOS/TALK did not match the requested tall condensed/hollow source treatment; the TALK treatment was specifically judged solid rather than hollow (sequences 267-268).
3. The composition was rendered and delivered after the regenerated assets, while the original format-fidelity failure was not escalated into a hard acceptance gate. Earlier lint results also repeatedly acknowledged a no-audio question, but the primary issue here is visual fidelity.
4. The feedback asset has no current cached media URL, so final encoded-pixel measurements are unavailable.

## Root cause and impact

The workflow treated a generative redraw as sufficient for a user requirement that was explicitly about exact typography/letterform preservation. Model output did not meet the reference, and the Skill path lacked a deterministic “reference lettering must be preserved or declared approximate” gate. This is P2 because the visual contract is materially missed, but no final-media technical failure can be independently measured.

## Tool-chain and read audit

| Audit | Result |
|---|---|
| Postgres source | Production database 3; 968 message rows, 278 expanded tool calls, 83 assets |
| Key calls | `image_generate` 8; `analyze_file_content` 72; `render_frame` 50; `edit_file` 40; `lint_composition` 14; `show_final_video` 1 |
| Relevant evidence | `tool-chain.json` sequences 263-278, `audit-facts.json`, `assets-with-prompts.json` |
| Skill/reference audit | 23 `read_file` events captured capability-discovery and Motion references including visual style, motion, and tech HTML. Historical event export is insufficient to assert complete line-level coverage of every triggered reference. |

## Phase B proposal (not executed)

For exact lettering/logo/brand requests, require a source-pixel or vector-preservation path. If the route is generative, label it approximate and block “exact match” claims until a human-readable glyph/shape comparison passes. No production or Skill changes were made.

