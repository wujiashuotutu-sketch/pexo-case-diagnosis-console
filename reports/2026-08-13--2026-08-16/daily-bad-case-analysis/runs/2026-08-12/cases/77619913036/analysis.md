# Bad Case 77619913036

## Verdict

- Severity: **P2**
- Attribution: **mixed** (generation continuity plus assembly/runtime acceptance)
- Evidence confidence: medium; the final feedback asset URL is expired, but the production chain contains repeated independent findings.

## User-reported symptom

The feedback row reported an unfinished result, an audio issue, inconsistent subject/reference, and a misunderstood request. These labels describe the user's context only.

## Reconstructed intent

The user requested a multi-shot George/Martha advertisement and then narrowed the continuity requirement: George must keep his shirt on and the sequence should be assembled from what was available.

## Evidence-based phenomenon

1. Repeated `lint_composition` checks reported same-role audio overlap of 0.35 s (sequence 196 and later repeats). The render was submitted with the overlap findings acknowledged (sequence 197).
2. A later visual inspection found George's shirt open with exposed stomach, directly contradicting the locked continuity requirement (sequences 330-331).
3. The agent generated a replacement clip and edited the composition (sequences 332-334), then rendered and delivered the final revision (sequence 340). The prior contradiction and audio overlap were not converted into a durable blocking receipt.
4. No current final feedback media URL remained for independent ffprobe and nine-frame verification; the report does not invent final-pixel measurements.

## Root cause and impact

Reference/character continuity was not enforced across generated shots, and the assembly path accepted acknowledged audio-overlap findings. The result is a materially degraded ad with continuity and mix risks, but the final encoded media is unavailable for a P1-level technical defect claim; therefore P2.

## Tool-chain and read audit

| Audit | Result |
|---|---|
| Postgres source | Production database 3; 1,327 message rows, 340 expanded tool calls, 78 assets |
| Key calls | `video_generate` 57; `analyze_file_content` 72; `read_file` 53; `edit_file` 46; `lint_composition` 8; `submit_render` 7; `show_final_video` 4 |
| Relevant evidence | `tool-chain.json` sequences 138-142, 196-197, 330-340; `audit-facts.json` |
| Skill/reference audit | Read events cover brainstorm, script, subject-asset, generation, assembly, motion, and modification paths, including AFC and continuity references. The raw event export does not support a trustworthy line-level completeness score for every triggered reference. |

## Phase B proposal (not executed)

Make same-role audio overlap and unresolved character-continuity assertions blocking unless the user explicitly accepts them. Store a per-shot continuity checklist tied to the final render receipt. No production or Skill changes were made.

