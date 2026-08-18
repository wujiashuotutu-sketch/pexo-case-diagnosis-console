# Current Skills Validation Report

## Overall Conclusion

- Reviewed Skills: `script-skill`, `subject-asset-skill`, `generation-skill`, `motion-skill`, `image-production-skill`
- Static checks: **5 passed, 0 failed**
- Resolved findings: **4 P1, 5 P2**
- Open static findings: **0**
- Backend validation: **Validation Not Completed**
- Platform pass/fail, required/suggested, and token counts: unavailable
- Importable: **Not confirmed** until backend set validation succeeds
- Admin endpoint: unresolved because the `local` profile is absent from CLI configuration
- `git diff --check`, frontmatter parsing, and direct reference-path checks: passed

## Resolved Findings

| Priority | Location | Resolution |
|---|---|---|
| P1 | `subject-asset-skill/SKILL.md` | Restored `read_file` and `write_file` compatibility required for artifact intake and manifest write/read-back. |
| P1 | `generation-handoff-contract.md` | Corrected the trigger to `consistency_strategy.strict_visual_continuity.required`. |
| P1 | `motion-skill/SKILL.md` | Standard Motion path now reads Assembly first and resolves Script/Subject/Generation through Assembly `_sources`; direct paths are bypass-only. |
| P1 | `motion-skill/references/visual-continuity-qc.md` | Added a revision-bound final QC artifact with complete adjacent-boundary coverage, evidence ids, verdicts, blocking state, and final status. |
| P2 | `script-skill/SKILL.md` | Narrowed Subject activation to concrete paths, specific/recurring identities, persistent states, visible speakers, required references/cutouts, or strict/shared anchors. |
| P2 | `generation-preflight-gates.md` | Matched Generation intake to Script's `subject_required` flag and the exact Subject activation conditions. |
| P2 | `image-production-skill/SKILL.md` | Removed `video_generate` compatibility and routed explicit video deliverables to the video pipeline. |
| P2 | Five `SKILL.md` files | Removed locally added `metadata.version`; release remains the version owner. |
| P2 | `test-suite/pexo-skill-qa/segmented-background-continuity-regression.md` | Added pass/fail coverage for shared anchors, missing payload anchors, baseline revision changes, final cut QC, and `description_only` skip. |

## Description Review

All five descriptions are now concise and ownership-aligned. Script names the exact Subject categories, Generation makes Subject conditional, Motion refers to applicable upstream artifacts, and Image Production keeps a strict standalone-still boundary.

## script-skill

Token conclusion: body/frontmatter/references passed static checks; platform token count unavailable.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| resolved | `SKILL.md:3`, workflow routing | activation consistency | Prior Subject routing was too broad | Exact activation list now preserves one-off `description_only` work | None |
| pending | package | backend validation | Platform validation not completed | Missing local API key | Configure `local` and rerun set validation |

## subject-asset-skill

Token conclusion: body/frontmatter/references passed static checks; platform token count unavailable.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| resolved | `SKILL.md:4` | tool compatibility | Artifact read/write tools were missing | Both tools restored | Confirm Tool Catalog visibility through backend validation |
| pending | package | backend validation | Platform validation not completed | Missing local API key | Configure `local` and rerun set validation |

## generation-skill

Token conclusion: body/frontmatter/references passed static checks; platform token count unavailable.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| resolved | `references/generation-handoff-contract.md` | cross-Skill field consistency | Strict-continuity path was incomplete | Fully qualified Script path now used | None |
| resolved | `references/generation-preflight-gates.md` | activation consistency | Subject activation was too broad | Exact Script/Subject conditions now used | None |
| pending | package | backend validation | Platform validation not completed | Missing local API key | Configure `local` and rerun set validation |

## motion-skill

Token conclusion: body/frontmatter/references passed static checks; platform token count unavailable.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| resolved | `SKILL.md`, upstream intake | source contract | Standard path could not reliably find Subject/Generation | Assembly `_sources` is now authoritative | None |
| resolved | `references/visual-continuity-qc.md` | final QA contract | Adjacent-cut gate lacked a persisted receipt | Final revision-bound schema and blocking status added | None |
| pending | package | backend validation | Platform validation not completed | Missing local API key | Configure `local` and rerun set validation |

## image-production-skill

Token conclusion: body/frontmatter/references passed static checks; platform token count unavailable.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| resolved | `SKILL.md:3-4` | scope/tool consistency | Standalone-image Skill exposed video generation | Compatibility and description now agree | None |
| resolved | regression suite | reference consistency | Test referenced a deleted image guide | Assertions now use AFC and current image-generation guide | None |
| pending | package | backend validation | Platform validation not completed | Missing local API key | Configure `local` and rerun set validation |

## Command Evidence

```bash
pexo-admin-cli --profile local skills rules --json
pexo-admin-cli --profile local skills tools --all --json
pexo-admin-cli --profile local skills validate-local pexo-skills/script-skill pexo-skills/subject-asset-skill pexo-skills/generation-skill pexo-skills/motion-skill pexo-skills/image-production-skill --json
git diff --check
```

All three admin commands failed with `Missing admin API key for profile "local"`. No endpoint could be resolved because the profile is absent.

## Test Environment Sync Attempt

- Target: `test` (`https://test-admin.pexo.ai`)
- Test context succeeded; the configured API key authenticated as the test user.
- Existing-skill previews completed with no required issues after intended resolutions:
  - `script-skill`: 0 required, overwrite `dialogue-monologue-design-kb.md`, `script-handoff-contract.md`, `video-generation-execution.md`
  - `subject-asset-skill`: 0 required, overwrite `asset-handoff-contract.md`
  - `generation-skill`: 0 required, overwrite `generation-blueprint-design.md`, `generation-handoff-contract.md`, `generation-preflight-gates.md`, `video-generation-execution.md`
  - `motion-skill`: 0 required, 1 suggested, reuse test `tech-*` files and overwrite only design conflicts
  - `image-production-skill`: 0 required
- Import was not applied. `import-local` returned `409 REPO_PATH_CONFLICT` because the test Workspace base `r1786324863231912087` is behind repo head `r1786516774285648608`; the reported path was `shared/script-handoff-contract.md`.
- Refreshing the unchanged Workspace to the current head was attempted and returned `403 FORBIDDEN`; Tool Catalog access also returns `403` for this test API key.
- Post-failure Workspace status remains `changed files: 0`, `changed links: 0`, `conflicts: 0`; no partial test update was left behind.

Required next step: use a test API key with Workspace refresh/import, Tool Catalog, repo commit, and release-preview/apply permissions, then rerun the approved previews and import set.
