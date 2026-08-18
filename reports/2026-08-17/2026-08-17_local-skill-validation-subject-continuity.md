# Local Skill Validation Report

## Overall Conclusion

- Checked Skills: `script-skill`, `subject-asset-skill`, `generation-skill`, `motion-skill`, `image-production-skill`
- Validation status: **Validation Not Completed**
- Required/Suggested issue counts: unavailable because the local admin API key is missing
- Import readiness: not assessed
- Command evidence: `pexo-admin-cli --profile local skills validate-local pexo-skills/script-skill pexo-skills/subject-asset-skill pexo-skills/generation-skill pexo-skills/motion-skill pexo-skills/image-production-skill --json`
- Failure: `Missing admin API key for profile "local"`
- A second validation attempt after the compact rewrite returned the same missing-key failure.

The local edits were checked with `git diff --check`; no whitespace errors were reported. No `tech-*` file was intentionally edited for this change.

## script-skill

Token conclusion: backend token counting was not available. The description now routes concrete or recurring subjects to Subject and blocks production asset creation in Script. The handoff contract now carries `required_next_skill`, `subject_required`, `subject_reason_codes`, and continuity scopes.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| pending | `SKILL.md` frontmatter and hard gates | local validation | Backend validation not completed | API key missing | Re-run `validate-local` after configuring the local profile |

## subject-asset-skill

Token conclusion: backend token counting was not available. The description and activation gate now cover generated recurring environments without uploads. The manifest contract adds immutable `continuity_anchors` and exact sequence binding requirements.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| pending | `SKILL.md`, `references/asset-handoff-contract.md` | local validation | Backend validation not completed | API key missing | Re-run `validate-local` after configuring the local profile |

## generation-skill

Token conclusion: backend token counting was not available. Generation now requires Subject when Script marks it, requires actual continuity anchor labels in payloads, and records an approved visual baseline plus revision-bound comparison evidence.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| pending | `SKILL.md`, `references/generation-preflight-gates.md`, `references/generation-handoff-*` | local validation | Backend validation not completed | API key missing | Re-run `validate-local` after configuring the local profile |

## motion-skill

Token conclusion: backend token counting was not available. Motion now reads Subject/Generation continuity lineage and blocks final rendering when adjacent-cut background, palette, lighting, or framing checks fail.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| pending | `SKILL.md` | local validation | Backend validation not completed | API key missing | Re-run `validate-local` after configuring the local profile |

## image-production-skill

Token conclusion: backend token counting was not available. The description now keeps video-pipeline supplementary references with Subject and declared video keyframes with Generation; only standalone still-image work routes here.

| Level | File / location | Rule / source | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| pending | `SKILL.md` frontmatter | local validation | Backend validation not completed | API key missing | Re-run `validate-local` after configuring the local profile |
