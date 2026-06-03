import { buildSkillsTree, safeCaseId, findCaseDir, countTraces } from "../../../lib/server-core.js";

export default async function handler(req, res) {
  try {
    const caseId = req.query.id;
    const normalized = safeCaseId(caseId);
    const existingDir = findCaseDir(normalized);
    if (countTraces(existingDir) === 0) {
      return res.status(404).json({ error: "Case not found" });
    }
    const reqToken = req.query.token
      || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim()
      || "";
    const tree = await buildSkillsTree(normalized, reqToken);
    res.status(200).json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
