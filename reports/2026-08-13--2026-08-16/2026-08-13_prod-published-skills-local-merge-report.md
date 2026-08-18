# Production Published Skills Local Merge Report

> The complete post-merge cleanup is documented in [2026-08-13_full-local-skills-cleanup-report.md](2026-08-13_full-local-skills-cleanup-report.md). This file preserves the original production merge evidence.

## Overall Result

- Source environment: `prod` (`https://admin.pexo.ai`), authenticated with the configured CLI API-key profile.
- Source release: Release `4`, published on `2026-08-06 20:40:04 +08:00`.
- Source snapshot: `.workspace/prod-published-20260813-67jrJ4/`.
- Published Skills inspected and merged: 9.
- Validation passed: 9.
- Validation failed: 0.
- Required issues: 0.
- Suggested issues: 15.
- Local set is preview-valid for the existing production Skill keys when the listed intentional shared-file updates use `overwrite` resolution.
- No production import, Workspace write, repo commit, release, rollback, or publication was performed. Production Workspace remained clean at commit `r1786019791386026811`.

## Merge Decisions

Production-only rules incorporated locally:

- AFC `analysis_receipt_v2`, explicit consumed-asset coverage, missing-role and full-video coverage fields, annotation/second-round receipt semantics, and receipt-success gates.
- Generation output and Subject intake consumption evidence, receipt/evidence id lineage, and read-before-generation hard gates.
- Motion Visual Map, rendered-frame, and final-MP4 consumption evidence.
- Modification round/revision/content-hash identity, exact comment-set coverage, active/superseded states, reusable full-current-video receipts, and verified-output-equals-delivered-output enforcement.
- URL-to-video Generation preflight requiring matching confirmed proposal ids, complete Script/Subject coverage, and `audio_intent`.

Local rules intentionally retained:

- Newer URL Capture / Website Asset Brief approval route and its existing Brainstorm -> Script -> Subject -> Generation ownership model.
- Newer voice-production contracts and the rule that Motion consumes locked speech instead of producing it.
- Local Motion height-based typography contract; production's short-edge sizing wording was not merged because it conflicts with the current local design references.
- Local product-knowledge corrections, including verified download paths, dynamic billing facts, and capability limits.
- No `Simple Direct Requests` exception was added because it conflicts with the local locked Script/Subject artifact gates.
- Existing local metadata versions and compatibility lists were preserved; published metadata versions were not used to downgrade local authoring state.

Shared runtime copies were normalized:

- `afc-multimodal-policy.md`: byte-identical across Generation, Image Production, Motion, and Subject.
- `video-generation-execution.md`: byte-identical across Generation and Script, using the current local contract without the superseded `summarize_url` route.

## assembly-skill

Token conclusion: SKILL body and frontmatter passed required limits. One reference is slightly above the suggested token target.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `references/design-audio-and-assembly.md` | whole file | `references.token-budget` | 5,070 tokens; suggested below 5,000 | production `validate-local` preview | Split only before further growth; no merge blocker. |

## brainstorm-skill

Token conclusion: no required or suggested issues returned. Frontmatter, body, references, and tools passed the production preview.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| none | - | - | - | No issues returned | production `validate-local` preview | None. |

## capability-discovery-skill

Token conclusion: body passed; frontmatter exceeds only the suggested target.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `SKILL.md` | frontmatter | `frontmatter.token-budget` | 293 tokens; suggested at most 200 | production `validate-local` preview | Shorten description during a dedicated cleanup, not this merge. |

## generation-skill

Token conclusion: body and frontmatter passed required limits. Two existing long references produced three suggestions.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `references/generation-handoff-contract.md` | whole file | `references.line-limit` | 341 lines | production `validate-local` preview | Split before substantial growth. |
| suggested | `references/video-generation-execution.md` | whole file | `references.token-budget` | 5,834 tokens; suggested below 5,000 | production `validate-local` preview | Plan a contract-preserving split. |
| suggested | `references/video-generation-execution.md` | whole file | `references.line-limit` | 350 lines | production `validate-local` preview | Same split as above. |

## modification-skill

Token conclusion: no required or suggested issues returned. The production round/comment verification contract and local voice workflow validate together.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| none | - | - | - | No issues returned | production `validate-local` preview | None. |

## motion-skill

Token conclusion: body passed. Frontmatter is two tokens above the suggested target; three references have existing length suggestions.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `SKILL.md` | frontmatter | `frontmatter.token-budget` | 202 tokens; suggested at most 200 | production `validate-local` preview | Shorten during dedicated cleanup. |
| suggested | `references/design-audio-and-assembly.md` | whole file | `references.token-budget` | 5,070 tokens | production `validate-local` preview | Split only before further growth. |
| suggested | `references/design-house-style.md` | whole file | `references.token-budget` | 7,721 tokens | production `validate-local` preview | Plan a design-reference split. |
| suggested | `references/design-house-style.md` | whole file | `references.line-limit` | 331 lines | production `validate-local` preview | Same split as above. |
| suggested | `references/tech-html.md` | whole file | `references.token-budget` | 5,006 tokens | production `validate-local` preview | Engineering-owned `tech-*`; record a cleanup requirement instead of editing directly. |

## pexo-product-knowledge-skill

Token conclusion: no required or suggested issues returned. Local factual-reference revisions remain preview-valid.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| none | - | - | - | No issues returned | production `validate-local` preview | None. |

## script-skill

Token conclusion: body and frontmatter passed required limits. Two existing long references produced four suggestions.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `references/script-handoff-contract.md` | whole file | `references.token-budget` | 8,011 tokens | production `validate-local` preview | Plan a schema-preserving split. |
| suggested | `references/script-handoff-contract.md` | whole file | `references.line-limit` | 645 lines | production `validate-local` preview | Same split as above. |
| suggested | `references/video-generation-execution.md` | whole file | `references.token-budget` | 5,834 tokens | production `validate-local` preview | Keep synchronized with Generation when splitting. |
| suggested | `references/video-generation-execution.md` | whole file | `references.line-limit` | 350 lines | production `validate-local` preview | Same split as above. |

## subject-asset-skill

Token conclusion: body and references passed; frontmatter is slightly above the suggested target.

| Level | File / Mount Path | Location | Rule | Message | Evidence | Recommended Follow-up |
|---|---|---|---|---|---|---|
| suggested | `SKILL.md` | frontmatter | `frontmatter.token-budget` | 213 tokens; suggested at most 200 | production `validate-local` preview | Shorten during dedicated cleanup. |

## Static Checks

- `python3 scripts/check-reference-cascade.py`: 0 errors across 11 local Skills.
- Two parser warnings remain for Motion's textual `Section Video-medium type sizing` citation; the target file exists and the warnings are from the checker's Roman-numeral token match, not missing content.
- `git diff --check -- pexo-skills`: passed.
- Conflict-marker scan: passed.
- Shared-copy SHA-256 checks: passed.

## Command Evidence

```bash
pexo-admin-cli --profile prod context --json
pexo-admin-cli --profile prod skills rules --json
pexo-admin-cli --profile prod skills list --json
pexo-admin-cli --profile prod skills release manifest-current --json
pexo-admin-cli --profile prod skills workspace status --json
pexo-admin-cli --profile prod skills pull-runtime --skill-key <each-of-9-keys> --source published --out .workspace/prod-published-20260813-67jrJ4/<skill-key> --force
pexo-admin-cli --profile prod skills validate-local pexo-skills/<skill-key> --skill-key <skill-key> [intentional shared-file overwrite resolutions] --json
python3 scripts/check-reference-cascade.py
git diff --check -- pexo-skills
```

The first aggregate `validate-local` attempt omitted existing `--skill-key` bindings and therefore reported expected false-positive "Skill Key already exists" issues. The authoritative results above come from the nine corrected, existing-Skill previews with explicit shared-file resolutions. No preview command modified remote state.
