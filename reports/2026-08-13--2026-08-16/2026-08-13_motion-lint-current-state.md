# Motion Lint Current State - 2026-08-13

## Overall conclusion

- Scope checked: local `motion-skill` Runtime View plus the currently exposed `lint_composition` / `submit_render` contracts.
- Skill package validation: 1 Skill checked, 1 passed, 0 failed, 0 required issues, 1 suggested issue.
- Content is preview-importable after explicitly resolving four shared-file checksum conflicts as `overwrite`. No import or remote write was performed.
- Composition lint and Skill-package validation are different systems. The former checks authored video HTML; the latter checks the Runtime View package.
- The platform does not expose a complete composition-lint rule registry through Tool Catalog. The rule list below is the verified current contract plus codes observed in recent runtime evidence; it is not claimed to be an exhaustive internal registry.

## `motion-skill` package validation

Token conclusion:

- `SKILL.md` body: no line-limit or required token-budget issue returned; exact token count was not returned.
- Frontmatter: no required or suggested issue returned; exact token count was not returned.
- References: `references/tech-html.md` is 5,006 tokens, six tokens above the suggested threshold. No other reference token issue was returned.
- Token counter: available, because the backend returned the exact 5,006-token count.

| Level | File / mount path | Line / position | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| suggested | `references/tech-html.md` | Whole file | `references.token-budget` | Reference should stay below 5,000 tokens; current count is 5,006. | Prod `validate-local` returned 5,006 tokens after shared-file resolutions were supplied. | Engineering-owned `tech-*` contract: do not trim as a strategy-only cleanup. Engineering may remove at least seven tokens without changing the contract. |

Raw preview without resolutions also returned four required shared-file conflicts for `design-audio-and-assembly.md`, `design-captions.md`, `design-house-style.md`, and `design-typography.md`. These are import-planning conflicts, not Motion content-lint failures. Supplying explicit preview-only `overwrite` resolutions reduced the result to 0 required / 1 suggested.

The separate remote Workspace validation currently reports 0 required / 5 suggested:

- `SKILL.md` frontmatter: 202 tokens, above the 200-token suggestion threshold.
- `references/design-audio-and-assembly.md`: 5,070 tokens.
- `references/design-house-style.md`: 7,858 tokens and 336 lines.
- `references/tech-html.md`: 5,006 tokens.

This is a current Workspace audit result, not a new composition-lint error.

One registry drift is worth tracking: the local frontmatter no longer declares `audio_produce` or `music_generate`, and the current body says Motion must not produce audio. However, the backend preview candidate still reports both tools in `compatibilityTools`, because those names remain in audio reference prose/code spans. The validator does not flag this contradiction. It should be cleaned at the authoring/Tool Catalog extraction layer or the references should stop presenting those names as callable Motion tools.

## Composition lint behavior

- `lint_composition` requires `html_file`; `fps` is 24, 30, or 60 and defaults to 30.
- `submit_render` runs the same lint synchronously before queueing.
- Findings are grouped by `code`, with a count and up to five selectors per code.
- `error` findings block rendering.
- `question` findings require user confirmation and can be passed to `submit_render.acknowledged_findings`; acknowledgement does not bypass errors.
- `tech-html.md` says simple compositions may rely on submit-time lint; explicit `lint_composition` is for novel/risky HTML or post-failure verification. The current `SKILL.md` still says to always run it, but also declares `tech-html.md` authoritative when they disagree.

## Verified rule families

| Family | What lint currently covers | Representative observed codes |
|---|---|---|
| Root and runtime | Composition id/dimensions, timeline registration, valid runtime shape | `ROOT_MISSING_COMPOSITION_ID`, `ROOT_MISSING_DIMENSIONS`, `MOTION_CONTRACT_GSAP_TIMELINE_NOT_REGISTERED` |
| Data attributes | Unknown attributes, invalid values, incompatible timing fields, sequence-child shape | `MOTION_CONTRACT_UNKNOWN_DATA_ATTR`, `MOTION_CONTRACT_DATA_ATTR_VALUE`, `MOTION_CONTRACT_SEQUENCE_CHILD_LAYOUT` |
| Timing and tracks | Timed media starts/durations/ids, clip visibility class, nested timed media, same-track overlap | `MEDIA_MISSING_DATA_START`, `MEDIA_MISSING_ID`, `MOTION_CONTRACT_TIMED_ELEMENT_MISSING_CLIP`, `VIDEO_NESTED_IN_TIMED_ELEMENT`, `OVERLAPPING_CLIPS_SAME_TRACK` |
| Media ownership | Video mute/audio declaration conflicts, stable audio ids/durations, source playable-frame bounds | `VIDEO_MISSING_MUTED`, `VIDEO_MUTED_WITH_DECLARED_AUDIO`, `MOTION_CONTRACT_AUDIO_ID`, `MOTION_CONTRACT_AUDIO_MISSING_DURATION`, `MOTION_CONTRACT_VIDEO_FRAMES_INSUFFICIENT` |
| Coverage math | Empty DOM timelines, visual gaps/tail gaps, audio gaps/overlaps, undeclared silence | `MOTION_CONTRACT_COVERAGE_DOM_EMPTY`, `MOTION_CONTRACT_COVERAGE_VISUAL_GAP`, `MOTION_CONTRACT_COVERAGE_TAIL_VISUAL_GAP`, `MOTION_CONTRACT_COVERAGE_AUDIO_GAP`, `MOTION_CONTRACT_COVERAGE_AUDIO_OVERLAP`, `MOTION_CONTRACT_COVERAGE_NO_AUDIO` |
| Fonts and subtitles | Catalog-backed fonts, generic/unresolved fonts, subtitle format/shape, subtitle minimum size | `MOTION_CONTRACT_FONT_FAMILY_NOT_DECLARED`, `MOTION_CONTRACT_FONT_FAMILY_UNRESOLVED`, `MOTION_CONTRACT_FONT_PRIMARY_GENERIC`, `MOTION_CONTRACT_SUBTITLE_FONT_BELOW_FLOOR` |
| GSAP determinism | Registered paused timeline, unsafe callbacks/nested tweens, clip visibility ownership, exit cleanup, conflicting/no-op tweens | `MOTION_CONTRACT_NESTED_TWEEN_IN_TL_CALL`, `GSAP_ANIMATES_CLIP_ELEMENT`, `GSAP_EXIT_MISSING_HARD_KILL`, `GSAP_CSS_TRANSFORM_CONFLICT`, `GSAP_FROM_OPACITY_NOOP`, `OVERLAPPING_GSAP_TWEENS` |

Important current-version correction: `root data-start` now defaults to 0, so the historical `ROOT_COMPOSITION_MISSING_DATA_START` warning should not be treated as a current authoring requirement.

## Explicit blind spots

Current Motion guidance explicitly says lint has no geometry rules. It does not reliably prove:

- card/text/logo collision with faces or must-show content;
- safe-area fit, crop quality, or whether visual hierarchy looks balanced;
- WCAG contrast against the actual moving background;
- duplicate-id blank rendering, collapsed ancestor height, root-background loss, or transform-origin drift;
- semantic correctness, exact brand fidelity, meaningful motion, source-video black/freeze content, or final audiovisual quality.

Those remain `render_frame` plus multimodal frame/final-MP4 QA responsibilities. A clean lint result is structural acceptance, not final-video acceptance.

## Command evidence

```bash
pexo-admin-cli --profile prod context --json
pexo-admin-cli --profile prod skills rules --json
pexo-admin-cli --profile test2 skills tools --query lint --all --json
pexo-admin-cli --profile prod skills validate-local pexo-skills/motion-skill --skill-key motion-skill --json
pexo-admin-cli --profile prod skills validate-local pexo-skills/motion-skill --skill-key motion-skill \
  --resolution references/design-audio-and-assembly.md=overwrite \
  --resolution references/design-captions.md=overwrite \
  --resolution references/design-house-style.md=overwrite \
  --resolution references/design-typography.md=overwrite \
  --json
pexo-admin-cli --profile prod skills validate --skill-key motion-skill
```

Prod Tool Catalog lookup was blocked by API-key scope (`403 FORBIDDEN`), so the active tool schema was read from test2, where `motion/mcp` is active, visible for Skill authoring, and available in runtime. Prod package validation itself completed successfully.
