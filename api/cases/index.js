import { listCases } from "../../lib/server-core.js";

export default function handler(req, res) {
  try {
    res.status(200).json({ cases: listCases() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
