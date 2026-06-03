import { buildSkillsTree, fetchFromLangfuse, safeCaseId, findCaseDir, countTraces } from "../../../lib/server-core.js";

export default async function handler(req, res) {
  try {
    const caseId = req.query.id;
    const normalized = safeCaseId(caseId);
    let existingDir = findCaseDir(normalized);
    if (countTraces(existingDir) === 0) {
      try {
        await fetchFromLangfuse(normalized);
      } catch (fetchErr) {
        return res.status(404).json({ error: fetchErr.message || "Case not found" });
      }
    }
    const tree = buildSkillsTree(normalized);
    res.status(200).json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
