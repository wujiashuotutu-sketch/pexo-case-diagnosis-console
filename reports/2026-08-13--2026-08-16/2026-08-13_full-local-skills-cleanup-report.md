# Full Local Skills Cleanup Report

## Overall Result

- Scope: all 11 local Runtime View packages under `pexo-skills/`.
- Validation environment: `prod` (`https://admin.pexo.ai`), rules queried immediately before validation.
- Production release checked: Release `4`, published `2026-08-06 20:40:04 +08:00`.
- Final production preview: 11/11 packages with `required=0`; 1 suggested issue remains.
- Suggested issue: Motion `references/tech-html.md` at 5,006 tokens, six above the 5,000-token suggestion threshold. This is an engineering-owned `tech-*` contract and was intentionally not edited.
- Remote production Workspace: unchanged. `headCommitKey=baseCommitKey=r1786019791386026811`, `baseDrift=false`, no changed files or links.
- No `import-local`, workspace resolve, commit, release, rollback, or publication was performed.

## Cleanup Actions

- Shortened the remaining overlong frontmatter descriptions for capability discovery, Motion, and Subject Asset.
- Fixed the Motion citation false positive by naming the exact typography heading.
- Split Generation handoff schema into `references/generation-handoff-schema.md`; semantic validation remains in `generation-handoff-contract.md`.
- Split shared Generation/Script strategy validators into `references/video-generation-strategy-genes.md` and kept the execution contract byte-identical.
- Split Motion Visual Map into `references/design-visual-map.md`; House Style now owns the zone model and rendered Overlay QC.
- Split Script contract responsibilities into `script-visual-routing-contract.md`, `script-audio-contract.md`, and `script-production-contract.md`; the core handoff remains the schema/artifact/hard-block authority.
- Unified the active Script Handoff schema marker from `script_handoff_v2` to `script_handoff` across the Skill body, canonical contract, QA schema registry, and persistence regression specification. The field structure is unchanged; historical snapshots and existing artifacts were intentionally left untouched.
- Compressed repeated opening text in shared `design-audio-and-assembly.md`; Assembly and Motion copies remain byte-identical.
- Normalized all same-basename shared copies and verified their SHA-256 equality.

## Per-Skill Validation

| Skill | Required | Suggested | Result |
|---|---:|---:|---|
| assembly-skill | 0 | 0 | pass |
| brainstorm-skill | 0 | 0 | pass |
| capability-discovery-skill | 0 | 0 | pass |
| generation-skill | 0 | 0 | pass |
| image-production-skill | 0 | 0 | pass |
| modification-skill | 0 | 0 | pass |
| motion-skill | 0 | 1 | pass; engineering-owned `tech-html.md` suggestion |
| pexo-product-knowledge-skill | 0 | 0 | pass |
| publishing-skill | 0 | 0 | pass |
| script-skill | 0 | 0 | pass |
| subject-asset-skill | 0 | 0 | pass |

Each result is a `validate-local` preview. Existing production keys used `--skill-key`; local-only image-production and publishing packages used `--new`. Intentional same-key local updates were previewed with explicit `overwrite` resolutions; preview resolution does not write the remote Workspace.

## Static Checks

- `python3 scripts/check-reference-cascade.py`: 0 errors, 0 warnings across 11 Skills.
- `git diff --check -- pexo-skills`: passed.
- Conflict-marker scan over `pexo-skills/`: passed.
- Shared-reference SHA-256 audit: passed; same-basename copies are byte-identical.
- Active-source scan for `script_handoff_v2`, excluding historical and generated directories: no matches.
- Script Handoff YAML parser check: the canonical `yaml script_handoff` block parses successfully and remains exactly one block.
- `validate_production_artifact_v2_contracts.py`: the Script Handoff schema check passes after the rename. The full legacy suite still reports 15 pre-existing failures because its exact-text assertions and Generation schema location have not been updated for the broader cleanup; it is not recorded as an end-to-end pass.
- Final prod `validate-local` preview for `script-skill` after the marker migration: `required=0`, `suggested=0`.

## Command Evidence

```bash
pexo-admin-cli --profile prod context --json
pexo-admin-cli --profile prod skills rules --json
pexo-admin-cli --profile prod skills validate-local <runtime-skill> ... --json
pexo-admin-cli --profile prod skills workspace status --json
pexo-admin-cli --profile prod skills release manifest-current --json
python3 scripts/check-reference-cascade.py
python3 test-suite/pexo-skill-qa/validate_production_artifact_v2_contracts.py
git diff --check -- pexo-skills
rg -n --glob '!analysis/**' --glob '!.workspace/**' --glob '!.backups/**' --glob '!tmp/**' --glob '!node_modules/**' --glob '!.git/**' '\bscript_handoff_v2\b|yaml script_handoff_v2' .
```

## Follow-Up Requirement

Engineering should decide whether to trim `motion-skill/references/tech-html.md` below the suggested 5,000-token threshold. Per workspace rules, this cleanup did not modify that `tech-*` contract; any required behavioral change belongs in an engineering requirements document under `analysis/`.
