# Case 15588677277

Priority: P2
Attribution: mixed (intermediate delivery defect with later execution repair)
Evidence source: production Postgres database 3; completeness gate passed (1760 message rows, 411 tool calls, 150 assets).

## Reconstructed intent
The project required a diamond-reveal sequence with consistent reference portraits and a clear crown, Bible/book landing, shatter, and title-card progression.

## Evidence-based finding
The Bad asset was royalty_diamond_reveal_v3. QA for that version found early frames without the required portraits and a book-landing frame containing only the diamond; v3 also had lint findings for audio overlap/tail visual gap. Subsequent versions v4 through v9 were generated, and v9 QA confirmed portraits, crown, book landing, shatter, and title card. The Bad delivery was therefore defective, but the later trace contains a documented repair, so this case is P2 rather than P1.

## Root cause and impact
The intermediate version was surfaced to the user before the acceptance loop had resolved content-presence and timeline/lint defects. The later repair demonstrates recoverability but does not erase the quality failure of the submitted Bad version. Impact: the user could receive an incomplete reveal and must wait for rework.

## Skill and lineage audit
The trace read generation, motion, design, preflight, and execution references and used repeated probes, renders, lint, and final-video calls. The weakness is release gating for an intermediate render: a known incomplete version remained deliverable while later versions were still being produced.

## Media and delivery evidence
The Bad v3 binary is not available from the cached media URL, so ffprobe, black/freeze, audio, and nine-frame checks cannot be repeated. Findings use the chronological QA evidence for v3 and the later v9 verification. See qa-report.html.

## Limitations
The exact v3 binary is unavailable for independent re-probing. Later v9 evidence should not be used to relabel the original Bad asset as good.

## Proposed Phase B
Require release status to point only to the latest render that passes content-presence, lint, and final-media checks; mark intermediate renders non-deliverable until the acceptance checklist passes. Await approval before implementation.
