import { buildCasePayload, fetchFromLangfuse, safeCaseId } from "../../../lib/server-core.js";

export default async function handler(req, res) {
  try {
    const caseId = req.query.id;
    try {
      res.status(200).json(buildCasePayload(caseId));
    } catch (firstErr) {
      if (firstErr.message.includes("not found") || firstErr.message.includes("directory")) {
        await fetchFromLangfuse(caseId);
        res.status(200).json(buildCasePayload(caseId));
      } else {
        throw firstErr;
      }
    }
  } catch (err) {
    res.status(err.message.includes("not found") ? 404 : 500).json({ error: err.message });
  }
}
