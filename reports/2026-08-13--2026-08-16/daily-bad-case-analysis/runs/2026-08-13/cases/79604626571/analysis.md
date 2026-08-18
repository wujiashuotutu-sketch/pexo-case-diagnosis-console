# Bad Case Analysis: 79604626571

- Priority: P1
- Attribution: mixed (model, skill, QA)
- Evidence source: production Postgres database 3; 11,262 chronological messages, 2,516 tool calls, 1,129 project assets

## Reconstructed Intent

Assemble the twelve already-created episode scenes without inventing characters or changing established identities and staging. The user later requested correction without another unresolved delivery.

## Evidence-Based Finding

Scene 2 QA at sequence 2162 found an invented older bald character and incorrect staging. Sequence 2178 again confirmed the older bald character, yet Bad scene versions were delivered at sequences 2188 and 2212. The assembled Bad final was delivered at sequence 2502. Sequence 2507 shows seven characters at 152 seconds; later annotation analysis and reference reads establish wrong identities, including an invented muscular character with orange-fire effects. The prompt lineage itself contains generation instructions for that unrequested character.

Repair calls at sequences 2514 and 2516 remained pending_confirmation, and no corrected final asset was delivered in the audited chain.

## Root Cause and Impact

The generation branch introduced a new subject rather than preserving the established cast. QA detected the defect before delivery but was treated as advisory. Assembly then propagated the invalid scene into the episode-level final, while the repair flow stopped before a replacement was delivered.

Impact is severe: identity continuity and story staging are broken in both scene and final deliverables, and the user consumed repeated review cycles without a closed repair.

## Skill and Lineage Audit

The trace contains extensive reads across brainstorm, script, generation, subject/assembly guidance, project references, and 127 total file reads. Read coverage was high, but effectiveness was low at the decisive gate: reference evidence and negative QA were not made blocking, and an invented-character prompt entered the asset lineage. See assets-with-prompts.json and tool-chain.json.

## Media and Delivery Evidence

The final Bad asset had no retrievable cached media URL during this audit, so local ffprobe, black/freeze, audio, and nine-frame checks were unavailable. The identity finding is instead supported by the complete tool chain, visual analyses, reference reads, delivery sequences, and prompt lineage. Dashboard: qa-report.html.

## Limitations

The precise encoding health of the final Bad asset is unscored. The P1 classification is based on independently documented identity/staging failure and failure to deliver a completed correction.

## Proposed Phase B (Confirmation Required)

Make detected wrong-subject findings delivery-blocking, require cast membership validation for every generated scene, and prevent episode assembly from consuming an asset with unresolved identity QA. Do not enter Phase C without user confirmation.
