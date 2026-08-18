# Daily Bad Case Analysis — 2026-08-12

This is a **user-feedback Bad cohort**, not a measure of all online project quality.

## Selection

- Analysis date: `2026-08-12` (previous Asia/Shanghai natural day)
- Exact UTC window: `2026-08-11T16:00:00Z` to `2026-08-12T16:00:00Z`
- Metabase source: BigQuery database 2, `selection.sql`
- Bad feedback rows: **7**
- Distinct projects: **7**
- Issue distribution: Inconsistent subject/reference 3; Request misunderstood 3; Other 2; Feels unfinished 2; Revision made it worse 1; Audio issue 1; Wrong visual style 1

## Findings

### P1 (2)

- `21144260283`: known QA evidence confirmed head/torso/body movement despite the “only fingers move” requirement; the revision was still shown as final. Attribution: mixed.
- `14378442003`: targeted frames repeatedly showed no Buddy/dog or glasses while subtitles/VO described Buddy handling glasses; the revision was still rendered and delivered. Attribution: mixed.

### P2 (3)

- `77619913036`: character/shirt continuity drift plus repeated same-role audio-overlap findings acknowledged before render. Attribution: mixed.
- `05641376364`: generated redraws did not preserve the requested source letterforms; exact-format intent was treated as approximate generation. Attribution: model/skill.
- `90403761155`: brand/logo/clinical-scale requirements remained exposed to repeated tail-gap and overlay-state warnings; final pixels are unavailable for recheck. Attribution: mixed.

### P3 / no confirmed P2 (1)

- `58336979384`: final proxy is technically healthy (2160x3840, H.264 + AAC, no black/freeze/silence, mean volume about -15.2 dB). “Feels unfinished” is not independently substantiated.

### Unscored (1)

- `75813745744`: absent from production database 3 and test database 5; no messages, tools, assets, or final media. No score or root cause is assigned.

## Repeated trends

1. Known lint/QA findings were often acknowledged and followed by `submit_render`/`show_final_video` instead of becoming hard delivery blockers.
2. Semantic checks were not consistently joined across picture, narration/subtitles, and the user's named subject/action.
3. Generative replacement was used for exact reference fidelity (letterforms, logos, clinical props) without an explicit approximate-versus-exact gate.

These are audit trends and Phase B proposals only. No production data, project, asset, feedback, Skill, Admin, or Release was modified.

## Evidence limits

Six projects had complete enough Postgres 3 message/tool/asset evidence. Five of their feedback final URLs were expired; only `21144260283` and `58336979384` had locally downloadable final proxies for independent media checks. `75813745744` had no Postgres record in either database. Feedback labels/issues were used only to describe symptoms and were not used alone as root-cause proof.

## Reports and evidence

- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/21144260283/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/14378442003/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/75813745744/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/77619913036/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/05641376364/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/58336979384/analysis.md`
- `/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/90403761155/analysis.md`
- Dashboard/evidence files are alongside each report: `qa-report.html`, `tool-chain.json`, `project-assets.json`, `assets-with-prompts.json`, and `audit-facts.json`.

## P1 aggregate task

The date-level manifest is `p1-subtask.json`. It contains one aggregate task for both P1 projects and must not be split by project.

