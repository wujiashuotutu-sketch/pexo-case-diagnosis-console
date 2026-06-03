import { buildCaseFlow, safeCaseId, findCaseDir, countTraces } from "../../../lib/server-core.js";

export default function handler(req, res) {
  try {
    const caseId = req.query.id;
    const normalized = safeCaseId(caseId);
    const existingDir = findCaseDir(normalized);
    if (countTraces(existingDir) > 0) {
      return res.status(200).json(buildCaseFlow(normalized));
    }
    res.status(200).json({ error: "not_cached", message: "Case 未缓存。请先通过 Analyze 拉取数据。", nodes: [], edges: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
