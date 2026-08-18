# Daily Bad Case Analysis - 2026-08-13

This is a user-feedback Bad cohort, not a measure of all online project quality.

## Selection

- Analysis date: 2026-08-13 (previous Asia/Shanghai natural day)
- Exact UTC window: 2026-08-12T16:00:00Z to 2026-08-13T16:00:00Z
- Metabase source: BigQuery database 2, selection.sql
- Bad feedback rows: 13
- Distinct projects: 9
- Issue distribution: Other 5; Feels unfinished 4; Wrong visual style 3; Bad pacing 3; Request misunderstood 2; Audio issue 2; Inconsistent subject/reference 1

## Findings

### P1 (3)

- 71261433794: the first Bad delivery froze for 123.322 seconds, about 76.5% of its local proxy. A later delivery fixed playback but the trace's own QA still found lead-character identity drift after about 30 seconds. Attribution: mixed runtime/model/QA.
- 41114852237: the final omitted required orb text, gift handoff, box opening, and crown-placement beats. Broad delivery QA missed the explicit narrative checklist. Attribution: mixed model/skill/QA.
- 79604626571: an invented older bald character and later an invented orange-fire muscular character entered scene and final deliveries despite negative QA; repair calls remained pending_confirmation and no corrected final was delivered. Attribution: mixed model/skill/QA.

### P2 (6)

- 10929815007: audio QA documented a mid-phrase cutoff and unconfirmed outro, but the same branch was delivered and later only reframed/blurred. Attribution: assembly/QA.
- 21548518729: the source line was confirmed before mixing, while final-mix QA only confirmed crowd booing; the required dialogue was claimed without post-mix verification. Attribution: assembly/QA.
- 38798858134: v1 used incorrect Mercedes gullwing and Koenigsegg helix behavior; targeted repaired versions were validated and delivered later. Attribution: model/QA.
- 39729942286: structurally healthy media contained impossible wired-earbud topology and continuity/composition misses identified immediately after Bad v3 delivery. Attribution: model/QA.
- 82503243139: source clips retained native speech while separate TTS for the same lines was overlaid, proving duplicate voice-source mixing. Attribution: assembly/skill.
- 95680605000: the required FANDA logo appeared as SANDA in tool QA, but the result was accepted and delivered. Media was otherwise structurally healthy. Attribution: model/QA.

## Repeated Trends

1. Known negative QA findings were treated as advisory and followed by final delivery in six cases.
2. Requirement verification was often broad rather than atomic: story beats, exact dialogue, logo text, prop topology, and vehicle mechanisms lacked one-to-one acceptance checks.
3. Assembly lacked authoritative state ledgers for audio ownership, dialogue preservation, prop continuity, and scene validity.
4. Repair workflows sometimes fixed one layer while leaving another unresolved, especially structural playback versus subject identity.

These are audit trends and Phase B proposals only. No production data, project, asset, feedback, Skill, tech reference, Admin configuration, or Release was modified.

## Evidence Limits

All nine projects passed the production Postgres database 3 completeness gate; database 5 and Langfuse were not needed. Local final-media checks were available for 71261433794, 39729942286, and 95680605000. The remaining six Bad assets had no retrievable cached media URL, so their encoding, black/freeze, audio, and nine-frame checks could not be repeated locally; their findings rely on complete tool, message, asset-lineage, and internal QA evidence. Feedback labels/issues were used only as reported symptoms and not as standalone root-cause proof.

## Reports and Evidence

- 71261433794 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/71261433794/analysis.md
- 71261433794 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/71261433794/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/71261433794/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/71261433794/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/71261433794/assets-with-prompts.json
- 41114852237 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/41114852237/analysis.md
- 41114852237 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/41114852237/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/41114852237/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/41114852237/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/41114852237/assets-with-prompts.json
- 79604626571 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/79604626571/analysis.md
- 79604626571 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/79604626571/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/79604626571/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/79604626571/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/79604626571/assets-with-prompts.json
- 10929815007 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/10929815007/analysis.md
- 10929815007 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/10929815007/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/10929815007/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/10929815007/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/10929815007/assets-with-prompts.json
- 21548518729 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/21548518729/analysis.md
- 21548518729 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/21548518729/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/21548518729/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/21548518729/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/21548518729/assets-with-prompts.json
- 38798858134 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/38798858134/analysis.md
- 38798858134 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/38798858134/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/38798858134/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/38798858134/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/38798858134/assets-with-prompts.json
- 39729942286 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/39729942286/analysis.md
- 39729942286 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/39729942286/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/39729942286/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/39729942286/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/39729942286/assets-with-prompts.json
- 82503243139 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/82503243139/analysis.md
- 82503243139 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/82503243139/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/82503243139/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/82503243139/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/82503243139/assets-with-prompts.json
- 95680605000 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/95680605000/analysis.md
- 95680605000 dashboard/evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/95680605000/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/95680605000/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/95680605000/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/cases/95680605000/assets-with-prompts.json

## P1 Aggregate Task

The date-level manifest is /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-13/p1-subtask.json. It contains one aggregate task for all three P1 projects and must not be split by project.
