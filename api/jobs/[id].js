import { jobs } from "../../lib/server-core.js";

export default function handler(req, res) {
  const job = jobs.get(req.query.id);
  if (job) return res.status(200).json(job);
  res.status(404).json({ error: "Job not found" });
}
