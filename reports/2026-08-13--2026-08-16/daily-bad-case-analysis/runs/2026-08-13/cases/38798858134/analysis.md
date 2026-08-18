# Bad Case Analysis: 38798858134

- Priority: P2
- Attribution: mixed (model, QA)
- Evidence source: production Postgres database 3; 1,036 chronological messages, 260 tool calls, 80 project assets

## Reconstructed Intent

Create two connected showroom films in which each named vehicle exhibits its correct door mechanism, including Mercedes gullwing and Koenigsegg dihedral synchro-helix behavior.

## Evidence-Based Finding

Bad v1 films were delivered at sequences 239 and 240. The trace then performed targeted repairs for incorrect Mercedes gullwing and Koenigsegg helix shots. Corrected replacements were visually validated at sequences 246 and 247 and delivered at sequences 259 and 260. Earlier lint also acknowledged tail visual gaps in v1.

## Root Cause and Impact

The first generation did not faithfully realize vehicle-specific mechanisms, and pre-delivery QA failed to block those inaccuracies. The later repair demonstrates that the issue was localized and recoverable, but the original Bad assets remained defective at the time of feedback.

## Skill and Lineage Audit

The trace includes generation, motion, assembly, and model-routing reads. The workflow eventually used targeted visual validation effectively, but only after Bad delivery. Asset prompts and repair lineage are preserved in assets-with-prompts.json.

## Media and Delivery Evidence

No retrievable cached media URL was available for the Bad v1 assets, so local structural and frame checks could not be repeated. The correction chain and validation results are recorded in tool-chain.json; see also project-assets.json and qa-report.html.

## Limitations

The report cannot quantify v1 encoding or audio health, and it does not classify the corrected versions as Bad.

## Proposed Phase B (Confirmation Required)

For named mechanical behaviors, create one shot-level acceptance check per mechanism and require it before the first delivery, using the same targeted validation that succeeded during repair. Do not enter Phase C without user confirmation.
