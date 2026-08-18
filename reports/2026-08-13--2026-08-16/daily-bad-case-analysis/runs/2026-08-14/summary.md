# Daily Bad Case Analysis - 2026-08-14

This is a user-feedback Bad cohort, not a measure of all online project quality.

## Selection

- Analysis date: 2026-08-14 (previous Asia/Shanghai natural day)
- Exact UTC window: 2026-08-13T16:00:00Z to 2026-08-14T16:00:00Z
- Metabase source: BigQuery database 2, `selection.sql`
- Bad feedback rows: 11
- Distinct projects: 9
- Issue distribution: Request misunderstood 8; Audio issue 4; Feels unfinished 4; Other 4; Inconsistent subject/reference 3; Wrong visual style 3; Bad pacing 3; Revision made it worse 2; Text/logo issue 2

## Findings

### P1 (6)

- 75341219240: three Bad deliveries were incomplete or severely lip-sync deficient. A 115-second version was delivered before dedicated lip-sync QA, which later found long closed-mouth intervals during dialogue; multiple repairs followed. Attribution: mixed model/skill.
- 15585660442: the supplied five-member identity reference was analyzed but omitted from the first scene generations; QA confirmed only generic matching black styling, and later reference-based repair remained pending. Attribution: mixed model/skill.
- 10991846362: the delivered hospital clip omitted binding to the exact Persian script/audio. QA confirmed mouth motion but could not recognize the spoken language; voice-first repair calls remained pending. Attribution: mixed model/skill.
- 95769953097: repeated revisions targeted the wrong building because the yellow-circle endpoint was not locked to authoritative coordinates. Smooth motion was accepted without target correctness, and an unapproved segment was also executed. Attribution: mixed model/skill.
- 80395392455: all four generation prompts omitted the exact dialogue, while QA checked broad actions only; nine-frame inspection also shows character/role identity drift across segments. Attribution: mixed model/skill.
- 38798858134: four independent text-to-video calls lacked continuity references; tool QA recorded changing container and character appearance and could not confirm exact vehicle models. Attribution: mixed model/skill.

### P2 (3)

- 39729942286: a request to replace only `SEQ_05` also changed `SEQ_02` and `SEQ_04` and shortened the timeline; a later v5b reverted those collateral edits. Attribution: skill.
- 14827547682: a request to remove one text bubble from liked v4 instead replaced the opening scene; the agent later restored it and delivered v4b. Attribution: skill.
- 86723475035: v1 matched the original opening/closing voiceover brief. Narration throughout was requested after v1 delivery and just before feedback; v2 followed three minutes later. This is revision-state context, not proven model failure. Attribution: none.

## Repeated Trends

1. Identity, dialogue, lip-sync, and exact-target requirements were not converted into atomic, blocking acceptance checks.
2. Reference assets were analyzed but did not always propagate into generation arguments, breaking prompt-to-asset lineage.
3. QA often verified broad appearance or smooth motion while omitting exact wording, speaker, identity, target coordinates, or approval state.
4. Revision workflows lacked protected-region/minimal-diff controls, allowing collateral scene changes and avoidable repair cycles.
5. Feedback-to-version attribution matters: one case's Bad label followed a requirement added after the evaluated asset was delivered.

These are audit trends and Phase B proposals only. No production data, project, asset, feedback, Skill, `tech-*` reference, Admin configuration, or Release was modified.

## Evidence Limits

All nine projects passed the production Postgres database 3 completeness gate; database 5 and Langfuse were not needed. Local final-media checks were available for 10991846362 and 80395392455. The remaining seven Bad assets had no retrievable cached media URL, so their encoding, black/freeze, audio, and nine-frame checks could not be repeated locally; their findings rely on complete tool, message, asset-lineage, and internal QA evidence. Feedback labels/issues were used only as reported symptoms and not as standalone root-cause proof.

## Reports and Evidence

- 75341219240 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/75341219240/analysis.md
- 75341219240 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/75341219240/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/75341219240/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/75341219240/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/75341219240/assets-with-prompts.json
- 15585660442 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/15585660442/analysis.md
- 15585660442 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/15585660442/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/15585660442/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/15585660442/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/15585660442/assets-with-prompts.json
- 10991846362 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/10991846362/analysis.md
- 10991846362 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/10991846362/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/10991846362/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/10991846362/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/10991846362/assets-with-prompts.json
- 95769953097 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/95769953097/analysis.md
- 95769953097 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/95769953097/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/95769953097/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/95769953097/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/95769953097/assets-with-prompts.json
- 80395392455 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/80395392455/analysis.md
- 80395392455 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/80395392455/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/80395392455/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/80395392455/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/80395392455/assets-with-prompts.json
- 38798858134 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/38798858134/analysis.md
- 38798858134 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/38798858134/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/38798858134/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/38798858134/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/38798858134/assets-with-prompts.json
- 39729942286 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/39729942286/analysis.md
- 39729942286 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/39729942286/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/39729942286/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/39729942286/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/39729942286/assets-with-prompts.json
- 14827547682 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/14827547682/analysis.md
- 14827547682 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/14827547682/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/14827547682/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/14827547682/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/14827547682/assets-with-prompts.json
- 86723475035 report: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/86723475035/analysis.md
- 86723475035 evidence: /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/86723475035/qa-report.html; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/86723475035/tool-chain.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/86723475035/project-assets.json; /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/cases/86723475035/assets-with-prompts.json

## P1 Aggregate Task

The date-level manifest is /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-14/p1-subtask.json. It contains one aggregate task for all six P1 projects and must not be split by project. Thread creation timed out without returning a formal `threadId` or `clientThreadId`; the manifest is marked `failed`, and no retry was attempted to avoid duplicate creation.
