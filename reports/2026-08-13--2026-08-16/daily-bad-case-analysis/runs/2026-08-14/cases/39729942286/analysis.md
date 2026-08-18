# Bad Case Analysis: 39729942286

- Priority: P2
- Attribution: skill
- Evidence source: production Postgres database 3; complete chronological messages, tool chain, and project assets

## Reconstructed Intent

Starting from v5, replace only `SEQ_05` with the corresponding v6 segment and preserve every other sequence and the existing timeline duration.

## Evidence-Based Finding

The modification branch at sequences 192-216 also replaced `SEQ_02` and `SEQ_04`, then shortened the timeline from 55.56 seconds to 52.36 seconds. This exceeded the requested edit scope. The agent subsequently reverted the unrelated replacements and delivered v5b, so a corrected final existed after the Bad asset.

## Root Cause and Impact

The revision workflow did not freeze untouched timeline regions or compare the post-edit composition against a one-sequence change set. The initial revision introduced collateral changes and duration drift, but the later rollback limited the ongoing impact.

## Skill and Lineage Audit

The trace's editing workflow had access to prior composition state but did not enforce a minimal-diff contract before the first revised delivery. The relevant version and asset transitions are recorded in `tool-chain.json`, `project-assets.json`, and `assets-with-prompts.json`.

## Media and Delivery Evidence

The Bad final asset had no retrievable cached media URL, so local ffprobe, black/freeze, audio, and nine-frame checks could not be repeated. Timeline mutation and repair are directly evidenced by the composition operations and final-delivery chain. See `media/UNAVAILABLE.txt` and `qa-report.html`.

## Limitations

The audit cannot independently compare rendered frames of the Bad and repaired versions. Scope expansion and duration change are established structurally from the trace.

## Proposed Phase B (Confirmation Required)

Represent each revision as an explicit allowed-change set, hash or compare untouched sequences, and block delivery on unexpected timeline or duration changes. Do not enter Phase C without user confirmation.
