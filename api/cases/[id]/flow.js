import { buildCaseFlow, fetchFromLangfuse, safeCaseId, findCaseDir, countTraces } from "../../../lib/server-core.js";

export default async function handler(req, res) {
  try {
    const caseId = req.query.id;
    const normalized = safeCaseId(caseId);
    let existingDir = findCaseDir(normalized);
    if (countTraces(existingDir) > 0) {
      return res.status(200).json(buildCaseFlow(normalized));
    }
    try {
      await fetchFromLangfuse(normalized);
      return res.status(200).json(buildCaseFlow(normalized));
    } catch (fetchErr) {
      res.status(200).json({ error: "not_cached", message: fetchErr.message || "Case 未缓存且无法从 Langfuse 拉取。", nodes: [], edges: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
