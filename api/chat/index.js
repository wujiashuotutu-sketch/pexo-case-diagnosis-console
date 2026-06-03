import { handleChat, parseBody } from "../../lib/server-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  return handleChat(req, res);
}
