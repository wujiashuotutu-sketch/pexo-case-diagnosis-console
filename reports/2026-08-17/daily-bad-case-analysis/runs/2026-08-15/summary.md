# Daily Online Bad Case Analysis - 2026-08-15

This report covers the user-feedback Bad cohort only. It is not a fleet-wide quality score and must not be generalized to all production projects.

## Cohort

- Asia/Shanghai analysis date: 2026-08-15
- Exact UTC window: 2026-08-14T16:00:00Z inclusive to 2026-08-15T16:00:00Z exclusive
- Bad feedback rows: 4
- Distinct projects: 4
- Evidence source: production Postgres database 3 for all four cases
- Completeness: all cases passed the case-analyzer completeness gate; database 5 and Langfuse were not used

Issue distribution from user-reported context: Inconsistent subject/reference 2; Wrong visual style 2; Bad pacing 1; Request misunderstood 1; Feels unfinished 1; Other 1. These labels describe symptoms only and were not used alone as root-cause evidence.

## P1 findings

- 07491535358: final QA found only one visible pebble throw instead of the requested three-throw sequence, plus unresolved title/checklist conflicts. Attribution: mixed execution/QA gate.
- 47160372389: source logo fidelity was not preserved; QA found a missing MANAZI wordmark and a non-clean lemniscate, yet the altered mark was delivered. Attribution: mixed reference-fidelity acceptance failure.
- 38798858134: LIGNE5_v1 was explicitly judged not to depict a Renault 5 Turbo and omitted the complete drawing-sheet/marker-off ending. Attribution: mixed reference/intent fidelity failure.

## P2 findings

- 15588677277: royalty_diamond_reveal_v3 lacked required portraits/book-landing content and had lint defects, but later v9 QA documents a repair. Attribution: mixed intermediate delivery defect with later execution repair.

## Repeated trends

Three cases show the same release-control pattern: the trace already contained concrete QA evidence of a missing required beat, brand element, or subject identity, but final delivery was not blocked. The P2 case shows an intermediate version was deliverable before later acceptance work completed. Recommended Phase B direction is to convert explicit user constraints and QA findings into hard, version-specific delivery gates; no change is made by this audit.

## Evidence limitations

Cached media URLs for the selected Bad binaries were unavailable at audit time. Exact-binary ffprobe, blackdetect, freezedetect, audio, and nine-frame pixel checks could not be repeated. Each case records this limitation in media/UNAVAILABLE.txt. Conclusions use chronological messages, tool results, QA observations, and asset/prompt lineage; evidence insufficiency is not filled by guessing.

## Reports

- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/07491535358/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/47160372389/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/15588677277/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/38798858134/analysis.md

P1 follow-up uses one date-level aggregate task with idempotency key 2026-08-15:p1. Its status is stored in p1-subtask.json.
