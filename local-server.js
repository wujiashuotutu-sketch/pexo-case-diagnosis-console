/**
 * Local development server — standalone Node.js HTTP server
 * that mimics Vercel's routing without requiring the Vercel CLI.
 *
 * Usage: node local-server.js
 */

import { createServer } from "node:http";
import { createReadStream, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  sendJson, listCases, buildCasePayload, buildCaseFlow,
  buildSkillsTree, safeCaseId, findCaseDir, countTraces,
  startAnalysis, handleChat, chatSessions, parseBody, jobs,
} from "./lib/server-core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.PORT || 3792);

function mimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".svg": "image/svg+xml", ".css": "text/css; charset=utf-8",
  }[ext] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // Static HTML routes
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(readFileSync(join(PUBLIC, "index.html"), "utf8"));
    }
    for (const page of ["case-flow", "case-list", "skill-map"]) {
      if (path === `/${page}` || path === `/${page}.html`) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(readFileSync(join(PUBLIC, `${page}.html`), "utf8"));
      }
    }

    // Static assets
    if (path === "/st-mascot.png") {
      const fp = join(PUBLIC, "st-mascot.png");
      if (existsSync(fp)) {
        res.writeHead(200, { "content-type": "image/png" });
        return createReadStream(fp).pipe(res);
      }
    }

    // API routes
    if (path === "/api/status") {
      return sendJson(res, 200, {
        mode: "local",
        env: {
          LANGFUSE_PUBLIC_KEY: Boolean(process.env.LANGFUSE_PUBLIC_KEY),
          LANGFUSE_SECRET_KEY: Boolean(process.env.LANGFUSE_SECRET_KEY),
          LANGFUSE_HOST: Boolean(process.env.LANGFUSE_HOST),
        },
      });
    }

    if (path === "/api/cases" && req.method === "GET") {
      return sendJson(res, 200, { cases: listCases() });
    }

    if (path === "/api/jobs" && req.method === "GET") {
      return sendJson(res, 200, { jobs: [...jobs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) });
    }

    if (path === "/api/analyze" && req.method === "POST") {
      const body = await parseBody(req);
      const job = await startAnalysis(body.caseId);
      return sendJson(res, job.status === "failed" ? 500 : 200, job);
    }

    if (path === "/api/chat" && req.method === "POST") {
      return handleChat(req, res);
    }
    if (path === "/api/chat/reset" && req.method === "POST") {
      const body = await parseBody(req);
      chatSessions.delete(body.sessionId);
      return sendJson(res, 200, { ok: true });
    }

    const skillsTreeMatch = path.match(/^\/api\/cases\/([^/]+)\/skills-tree$/);
    if (skillsTreeMatch) {
      const caseId = decodeURIComponent(skillsTreeMatch[1]);
      const normalized = safeCaseId(caseId);
      if (countTraces(findCaseDir(normalized)) === 0) return sendJson(res, 404, { error: "Case not found" });
      const reqToken = url.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim() || "";
      const tree = await buildSkillsTree(normalized, reqToken);
      return sendJson(res, 200, tree);
    }

    const flowMatch = path.match(/^\/api\/cases\/([^/]+)\/flow$/);
    if (flowMatch) {
      const caseId = decodeURIComponent(flowMatch[1]);
      const normalized = safeCaseId(caseId);
      if (countTraces(findCaseDir(normalized)) > 0) return sendJson(res, 200, buildCaseFlow(normalized));
      return sendJson(res, 200, { error: "not_cached", message: "Case 未缓存", nodes: [], edges: [] });
    }

    if (path.startsWith("/api/cases/")) {
      const caseId = decodeURIComponent(path.split("/").pop());
      return sendJson(res, 200, buildCasePayload(caseId));
    }

    if (path.startsWith("/api/jobs/")) {
      const job = jobs.get(decodeURIComponent(path.split("/").pop()));
      return job ? sendJson(res, 200, job) : sendJson(res, 404, { error: "Job not found" });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Pexo Case Diagnosis Workbench (local mode)`);
  console.log(`  http://localhost:${PORT}\n`);
});
