import { chatSessions, parseBody } from "../../lib/server-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const body = typeof req.body === "object" && req.body ? req.body : await parseBody(req);
    chatSessions.delete(body.sessionId);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
