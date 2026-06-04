export default async function handler(req, res) {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST;

  const info = {
    envPresent: { publicKey: !!publicKey, secretKey: !!secretKey, host: !!host },
    hostValue: host ? host.replace(/^(https?:\/\/[^/]+).*/, "$1") : null,
    publicKeyPrefix: publicKey ? publicKey.slice(0, 8) + "..." : null,
  };

  if (!publicKey || !secretKey || !host) {
    return res.status(200).json({ ...info, test: "skipped", reason: "missing env vars" });
  }

  try {
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
    const url = `${host}/api/public/traces?limit=1`;
    const start = Date.now();
    const resp = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(15000),
    });
    const elapsed = Date.now() - start;
    const body = await resp.text();

    if (!resp.ok) {
      return res.status(200).json({ ...info, test: "failed", status: resp.status, elapsed, body: body.slice(0, 500) });
    }

    const data = JSON.parse(body);
    return res.status(200).json({ ...info, test: "ok", status: resp.status, elapsed, traceCount: (data.data || []).length });
  } catch (err) {
    return res.status(200).json({ ...info, test: "error", error: err.message });
  }
}
