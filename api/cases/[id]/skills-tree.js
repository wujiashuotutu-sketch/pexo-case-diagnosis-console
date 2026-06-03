import { buildSkillsTree, safeCaseId, findCaseDir, countTraces } from "../../../lib/server-core.js";

export default function handler(req, res) {
  try {
    const caseId = req.query.id;
    const normalized = safeCaseId(caseId);
    const existingDir = findCaseDir(normalized);
    if (countTraces(existingDir) === 0) {
      return res.status(404).json({ error: "Case not found" });
    }
    const tree = buildSkillsTree(normalized);
    res.status(200).json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
