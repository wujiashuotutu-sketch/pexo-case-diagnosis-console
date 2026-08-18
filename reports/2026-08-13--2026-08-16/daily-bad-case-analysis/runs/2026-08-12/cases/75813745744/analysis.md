# Bad Case 75813745744

## Verdict

- Status: **unscored / evidence insufficient**
- Severity: not assigned
- Attribution: none assigned

## User-reported symptom

The feedback row reported an inconsistent subject/reference and the note that the subject appeared to have three legs. This remains unverified context.

## Evidence gate

The project was absent from production Postgres database 3 and test Postgres database 5. No chronological messages, tool calls, project assets, final asset lineage, or downloadable media were available from either database. The only durable evidence is the BigQuery selection row.

## Why no root cause or score is given

Without the message/tool chain and final asset, it is impossible to distinguish generation error, reference mismatch, runtime behavior, or a feedback-only interpretation. Guessing would violate the completeness gate. The case is therefore explicitly unscored and excluded from P1/P2 counts.

## Evidence paths

- `audit-facts.json` records the database-3/database-5 probe failure and reason.
- `project-assets.json`, `tool-chain.json`, and `assets-with-prompts.json` contain no production case evidence.

