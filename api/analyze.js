import { startAnalysis, parseBody } from "../lib/server-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const body = typeof req.body === "object" && req.body ? req.body : await parseBody(req);
    const job = await startAnalysis(body.caseId);
    res.status(job.status === "failed" ? 500 : 200).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
