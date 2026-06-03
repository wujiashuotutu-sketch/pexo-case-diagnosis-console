import { buildCasePayload, safeCaseId } from "../../../lib/server-core.js";

export default function handler(req, res) {
  try {
    const caseId = req.query.id;
    res.status(200).json(buildCasePayload(caseId));
  } catch (err) {
    res.status(err.message.includes("not found") ? 404 : 500).json({ error: err.message });
  }
}
