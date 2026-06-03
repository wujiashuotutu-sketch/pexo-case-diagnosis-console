/**
 * Pexo Case Diagnosis Workbench — shared library.
 * Extracted from the self-contained server for Vercel deployment.
 */

import { readFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const BUNDLED_CASES_DIR = join(PROJECT_ROOT, "data", "cases");
const TMP_CASES_DIR = "/tmp/pexo-cases";

const jobs = new Map();

export function sendJson(res, status, body) {
  if (typeof res.status === "function") {
    return res.status(status).json(body);
  }
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body, null, 2));
}

function readJson(path, fallback = null) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}

function mime(filePath) {
  const ext = extname(filePath).toLowerCase();
  return { ".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",
    ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".svg":"image/svg+xml",
    ".mp4":"video/mp4",".mov":"video/quicktime",".webm":"video/webm",
    ".mp3":"audio/mpeg",".wav":"audio/wav",".m4a":"audio/mp4",".aac":"audio/aac",".ogg":"audio/ogg",".flac":"audio/flac",
  }[ext] || "application/octet-stream";
}

function isUsableUrl(url) {
  return typeof url === "string" && /^https?:\/\//.test(url) && !url.includes("...]");
}

function inferMediaKind(url = "") {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(clean)) return "image";
  if (/\.(mp4|mov|webm)$/.test(clean)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(clean)) return "audio";
  return "link";
}

function stripGeneratedSuffix(value = "") {
  return String(value).split("?")[0].split("/").pop()
    .replace(/\.[^.]+$/, "")
    .replace(/_\d{8}T\d{6}_[a-f0-9]+$/i, "")
    .replace(/_[a-f0-9]{8}$/i, "")
    .toLowerCase();
}

function addLink(links, seen, label, url, source) {
  if (!isUsableUrl(url) || seen.has(url)) return;
  seen.add(url);
  links.push({ label: label || url.split("?")[0].split("/").pop(), url, source, kind: inferMediaKind(url) });
}

function findAssetMediaLinks(asset, urlMap) {
  const links = [], seen = new Set();
  const candidates = [
    asset.name, asset.file_path, asset.asset_id, asset.download_url,
    ...(asset.reference_urls || []),
    ...((asset.references || []).map(r => r.url || r.name || "")),
    ...((asset.audio_inputs || []).map(r => r.url || r.name || "")),
    ...((asset.assembly_urls || []).slice(0, 6)),
  ].filter(Boolean).map(String);

  for (const value of candidates) {
    addLink(links, seen, value, urlMap[value] || value, "asset/reference");
    const file = value.split("/").pop();
    if (file && urlMap[file]) addLink(links, seen, file, urlMap[file], "url_map");
    const stem = stripGeneratedSuffix(file || value);
    for (const [key, url] of Object.entries(urlMap)) {
      if (!isUsableUrl(url)) continue;
      const keyStem = stripGeneratedSuffix(key);
      if (stem && keyStem && (keyStem.includes(stem) || stem.includes(keyStem) || key.includes(stem)))
        addLink(links, seen, key, url, "url_map");
    }
  }
  if (!links.length && asset.name) {
    const stem = stripGeneratedSuffix(asset.name);
    for (const [key, url] of Object.entries(urlMap)) {
      if (isUsableUrl(url) && (key.includes(asset.name) || stripGeneratedSuffix(key).includes(stem)))
        addLink(links, seen, key, url, "url_map");
    }
  }
  return links;
}

const OSS_BASE = "https://pexo-assets.oss-us-east-1.aliyuncs.com";

function buildAssetIdMap(caseDir) {
  const idMap = {};
  const ossPattern = /https:\/\/pexo-assets[^\s'"\\,}]+/g;
  for (const f of readdirSync(caseDir).filter(f => /^trace-.*\.json$/.test(f))) {
    try {
      const content = readFileSync(join(caseDir, f), "utf8");
      for (const url of content.match(ossPattern) || []) {
        const decoded = decodeURIComponent(url.split("?")[0]);
        const m = decoded.match(/\/assets\/(a_[a-zA-Z0-9]+)\/([^/]+)$/);
        if (m) {
          const [, assetId, filename] = m;
          if (!idMap[assetId]) idMap[assetId] = filename;
        }
      }
    } catch {}
  }
  return idMap;
}

function extractObservationAssetIds(traces) {
  const obsAssetIds = {};
  for (const trace of traces) {
    for (const obs of (trace.data.observations || [])) {
      const obsId = obs.id || "";
      if (!obsId) continue;
      const outStr = typeof obs.output === "string" ? obs.output : JSON.stringify(obs.output || "");
      const assetMatch = outStr.match(/asset:\/\/(a_[a-zA-Z0-9]+)/);
      if (assetMatch) {
        obsAssetIds[obsId] = assetMatch[1];
      }
      const contentMatch = outStr.match(/"content"\s*:\s*"(a_[a-zA-Z0-9]+)"/);
      if (!assetMatch && contentMatch) {
        obsAssetIds[obsId] = contentMatch[1];
      }
    }
  }
  return obsAssetIds;
}

function extractSignedUrlsFromFileInfo(traces, urlMap) {
  for (const trace of traces) {
    for (const obs of (trace.data.observations || [])) {
      if (!/get_file_info/i.test(obs.name || "")) continue;
      const outStr = typeof obs.output === "string" ? obs.output : JSON.stringify(obs.output || "");
      const signedMatch = outStr.match(/"signed_url"\s*:\s*"(https:\/\/pexo-assets[^"]+)"/);
      if (signedMatch) {
        const url = stripOssSignature(signedMatch[1]);
        const decoded = decodeURIComponent(url);
        const name = decoded.split("/").pop();
        if (name && !urlMap[name]) urlMap[name] = url;
      }
    }
  }
}

function constructOssUrl(projectId, assetId, filename) {
  return `${OSS_BASE}/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/${encodeURIComponent(filename)}`;
}

function enrichAssets(assets, urlMap, assetIdMap, projectId, obsAssetIds) {
  return assets.map(a => {
    const links = findAssetMediaLinks(a, urlMap);

    if (!links.length && projectId) {
      let assetId = a.asset_id || "";
      const filePath = a.file_path || "";
      const obsId = a.observation_id || "";

      if (!assetId && obsId && obsAssetIds?.[obsId]) {
        assetId = obsAssetIds[obsId];
      }

      if (assetId && assetId.startsWith("a_")) {
        const knownFilename = assetIdMap?.[assetId];
        if (knownFilename) {
          const url = constructOssUrl(projectId, assetId, knownFilename);
          const kind = inferMediaKind(knownFilename);
          links.push({ label: knownFilename, url, kind, source: "constructed" });
        } else if (filePath) {
          const fn = filePath.split("/").pop();
          if (fn) {
            const url = constructOssUrl(projectId, assetId, fn);
            const kind = inferMediaKind(fn);
            links.push({ label: fn, url, kind, source: "constructed_from_path" });
          }
        }
      }

      if (!links.length && filePath) {
        const fn = filePath.split("/").pop();
        for (const [key, url] of Object.entries(urlMap)) {
          const fnStem = fn.replace(/\.[^.]+$/, "");
          const keyStem = key.replace(/\.[^.]+$/, "");
          if (keyStem.includes(fnStem) || fnStem.includes(keyStem)) {
            links.push({ label: key, url, kind: inferMediaKind(url), source: "fuzzy_path" });
            break;
          }
        }
      }
    }

    return { ...a, mediaLinks: links };
  });
}

function extractSourceMedia(conversation, urlMap) {
  const sourceMedia = [], seen = new Set();
  const tagPattern = /<original-(image|video|audio)>(.*?)<\/original-\1>/g;
  for (const msg of conversation) {
    if (msg.role !== "human") continue;
    for (const match of msg.content.matchAll(tagPattern)) {
      const kind = match[1], raw = match[2], file = raw.split("/").pop();
      const url = urlMap[file] || raw;
      if (seen.has(raw)) continue;
      seen.add(raw);
      sourceMedia.push({ kind, label: file || raw, raw, url: isUsableUrl(url) ? url : "", hasPreview: isUsableUrl(url) });
    }
  }
  return sourceMedia;
}

function stripOssSignature(url) {
  return url.split("?")[0];
}

function buildUrlMapFromTraces(caseDir) {
  const urlMap = {};
  const ossPattern = /https:\/\/pexo-assets[^\s'"\\,}]+/g;
  for (const f of readdirSync(caseDir).filter(f => /^trace-.*\.json$/.test(f))) {
    try {
      const content = readFileSync(join(caseDir, f), "utf8");
      for (const url of content.match(ossPattern) || []) {
        const clean = stripOssSignature(url);
        const name = decodeURIComponent(clean.split("/").pop());
        if (name && !name.endsWith(".json") && !urlMap[name]) urlMap[name] = clean;
      }
    } catch {}
  }
  return urlMap;
}

function safeCaseId(value) {
  const id = String(value || "").trim();
  if (!/^[\w:./-]+$/.test(id)) throw new Error("Invalid case id.");
  return id.replaceAll("/", "_");
}

function findCaseDir(caseId) {
  const bundledPath = join(BUNDLED_CASES_DIR, caseId);
  if (existsSync(bundledPath) && countTraces(bundledPath) > 0) return bundledPath;
  const tmpPath = join(TMP_CASES_DIR, caseId);
  if (existsSync(tmpPath) && countTraces(tmpPath) > 0) return tmpPath;
  return bundledPath;
}

function buildCaseFlow(caseId) {
  const normalized = safeCaseId(caseId);
  const caseDir = findCaseDir(normalized);
  if (!existsSync(caseDir) || countTraces(caseDir) === 0)
    return { error: "Case not found", nodes: [], edges: [] };

  const traceFiles = readdirSync(caseDir).filter(f => /^trace-.*\.json$/.test(f)).sort();
  const allObs = [];
  const userTurns = [];

  for (const f of traceFiles) {
    const trace = readJson(join(caseDir, f));
    if (!trace) continue;
    const tid = trace.id || "";

    const inputStr = JSON.stringify(trace.input || "");
    if (inputStr.includes("Review the conversation")) continue;
    if (!trace.input) continue;

    const msgs = (trace.input?.messages || []);
    for (const m of msgs) {
      if (m.type === "human") {
        userTurns.push({ traceId: tid, traceFile: f, message: (m.content || "").slice(0, 500), timestamp: trace.timestamp || "" });
        break;
      }
    }

    for (const o of (trace.observations || [])) {
      o._tid = tid;
      o._tf = f;
      allObs.push(o);
    }
  }

  allObs.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const nodes = [];
  const edges = [];
  let nodeId = 0;

  const skillPhases = {
    "brainstorm-skill": { label: "创意构思", icon: "💡", color: "#f4c865" },
    "script-skill": { label: "分镜设计", icon: "🎬", color: "#72b9ff" },
    "subject-asset-skill": { label: "主体资产", icon: "🎨", color: "#5ce4d4" },
    "generation-skill": { label: "生产执行", icon: "⚡", color: "#ad9cff" },
    "assembly-skill": { label: "后期组装", icon: "🔧", color: "#72dc93" },
    "modification-skill": { label: "迭代修改", icon: "🔄", color: "#f0a050" },
    "publishing-skill": { label: "发布包装", icon: "📦", color: "#ff8ec4" },
  };

  // Helper: extract prompt and key params from provider_param
  function extractParams(inp) {
    if (typeof inp !== "object" || !inp) return {};
    const pp = inp.provider_param || {};
    const ppObj = typeof pp === "string" ? (() => { try { return JSON.parse(pp); } catch { return {}; } })() : pp;
    let prompt = "", negPrompt = "", refImage = "", duration = "", aspectRatio = "", extraParams = {};
    for (const [k, v] of Object.entries(ppObj)) {
      if (typeof v === "object" && v !== null) {
        prompt = v.prompt || v.text || "";
        negPrompt = v.negative_prompt || "";
        refImage = v.reference_image || (v.image_list ? JSON.stringify(v.image_list).slice(0, 200) : "");
        duration = v.duration || inp.duration || "";
        aspectRatio = v.aspect_ratio || v.image_size || "";
        if (v.composition_plan) extraParams.composition_plan = v.composition_plan;
        if (v.seed) extraParams.seed = v.seed;
      }
    }
    return { prompt, negPrompt, refImage, duration, aspectRatio, extraParams };
  }

  function extractError(outp) {
    const s = typeof outp === "string" ? outp : JSON.stringify(outp || "");
    if (s.includes('"error"') || s.includes('"ok":false')) {
      try { const o = JSON.parse(s); return o.error || o.message || s.slice(0, 300); } catch {}
      return s.slice(0, 300);
    }
    return "";
  }

  let prevNodeId = null;
  let currentSkillNode = null;

  for (const turn of userTurns) {
    const id = "user_" + (nodeId++);
    nodes.push({ id, type: "user", label: "用户输入", detail: turn.message, timestamp: turn.timestamp, color: "#72b9ff", icon: "💬" });
    if (prevNodeId) edges.push({ from: prevNodeId, to: id, type: "flow" });
    prevNodeId = id;
    currentSkillNode = null;

    const turnObs = allObs.filter(o => o._tid === turn.traceId);
    const tools = turnObs.filter(o => o.type === "TOOL").sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    for (let i = 0; i < tools.length; i++) {
      const o = tools[i];
      const name = o.name || "";
      let inp = o.input || {};
      if (typeof inp === "string") { try { inp = JSON.parse(inp.replace(/'/g, '"')); } catch { } }
      const outp = o.output || {};
      const outStr = typeof outp === "string" ? outp : JSON.stringify(outp);
      const failed = o.level === "ERROR" || outStr.includes('"ok":false') || outStr.includes('"error"');
      const errMsg = failed ? extractError(outp) : "";
      const ts = o.startTime || "";

      if (name === "read_file") {
        let filePath = "";
        if (typeof inp === "object" && inp !== null) {
          filePath = inp.file_path || "";
        } else if (typeof inp === "string") {
          const m = inp.match(/file_path['":\s]+['"]([^'"]+)['"]/);
          if (m) filePath = m[1];
        }
        if (!filePath) continue;
        const isSkill = filePath.includes("SKILL.md");
        const isRef = filePath.toLowerCase().includes("reference");
        const shortPath = filePath.split("/").slice(-2).join("/");

        if (isSkill) {
          const skillName = filePath.match(/\/([^/]+)\/SKILL\.md/)?.[1] || shortPath;
          const phase = skillPhases[skillName] || { label: skillName, icon: "📘", color: "#9dafcf" };
          const id2 = "skill_" + (nodeId++);
          const skillContent = typeof outp === "string" ? outp.slice(0, 2000) : (outp?.content || "").slice(0, 2000);
          const skillNode = {
            id: id2, type: "skill_branch", label: phase.label,
            detail: filePath, timestamp: ts, color: phase.color, icon: phase.icon,
            skillName, skillContent,
          };
          nodes.push(skillNode);
          edges.push({ from: prevNodeId, to: id2, type: "flow" });
          prevNodeId = id2;
          currentSkillNode = skillNode;
        } else if (isRef) {
          const refContent = typeof outp === "string" ? outp : (outp?.content || JSON.stringify(outp || ""));
          const id2 = "ref_" + (nodeId++);
          // Match reference to its actual owning skill by path
          const refSkillMatch = filePath.match(/\/([^/]+)\/references\//);
          const refSkillName = refSkillMatch ? refSkillMatch[1] : null;
          let matchedSkillId = currentSkillNode?.id || null;
          if (refSkillName) {
            const candidates = nodes.filter(nd => nd.type === "skill_branch" && nd.skillName === refSkillName);
            if (candidates.length) matchedSkillId = candidates[candidates.length - 1].id;
          }
          // Extract line range from numbered content
          const contentLines = refContent.split("\n");
          let readStart = null, readEnd = null;
          for (const cl of contentLines) {
            const lm = cl.match(/^\s*(\d+)\t/);
            if (lm) {
              const ln = parseInt(lm[1], 10);
              if (readStart === null || ln < readStart) readStart = ln;
              if (readEnd === null || ln > readEnd) readEnd = ln;
            }
          }
          nodes.push({ id: id2, type: "reference", label: shortPath, detail: filePath, timestamp: ts, color: "#72b9ff", icon: "📄", content: refContent, parentSkill: matchedSkillId, readStartLine: readStart, readEndLine: readEnd });
          edges.push({ from: matchedSkillId || prevNodeId, to: id2, type: "ref" });
          prevNodeId = id2;
        }
        continue;
      }

      // write_todos — show agent planning/thinking
      if (name === "write_todos") {
        const id2 = "plan_" + (nodeId++);
        let todoContent = "";
        if (typeof inp === "object" && inp.todos) {
          todoContent = (Array.isArray(inp.todos) ? inp.todos : []).map(t => `${t.status === 'in_progress' ? '▶' : t.status === 'completed' ? '✓' : '○'} ${t.content || t.description || ''}`).join("\n");
        } else {
          todoContent = JSON.stringify(inp, null, 2).slice(0, 1000);
        }
        nodes.push({ id: id2, type: "planning", label: "Agent 规划", detail: todoContent, timestamp: ts, color: "#f4c865", icon: "🧠" });
        edges.push({ from: prevNodeId, to: id2, type: "flow" });
        prevNodeId = id2;
        continue;
      }

      if (name === "edit_file" || name === "write_file" || name === "ls") continue;

      // Build rich tool node — each generation is its own node (no grouping)
      const params = extractParams(inp);
      const aidMatch = outStr.match(/asset:\/\/(a_[a-zA-Z0-9]+)/);

      const id2 = "tool_" + (nodeId++);
      let nodeData;

      if (name === "video_generate" || name === "image_generate") {
        const assetName = typeof inp === "object" ? (inp.name || "") : "";
        nodeData = {
          id: id2, type: "generation",
          label: name === "video_generate" ? "🎬 " + (assetName || "视频生成") : "🖼️ " + (assetName || "图片生成"),
          detail: assetName,
          provider: inp?.provider || "", model: (inp?.model || ""),
          mode: inp?.mode || "", duration: params.duration || "",
          aspectRatio: params.aspectRatio || "",
          timestamp: ts, color: name === "video_generate" ? "#ad9cff" : "#f4c865",
          icon: name === "video_generate" ? "🎥" : "🖼️", failed, errMsg,
          assetId: aidMatch ? aidMatch[1] : "", toolName: name,
          prompt: params.prompt, negPrompt: params.negPrompt,
          refImage: params.refImage,
          rawInput: JSON.stringify(inp, null, 2).slice(0, 2500),
        };
      } else if (name === "audio_produce" || name === "tts_generate") {
        nodeData = { id: id2, type: "audio", label: "语音合成", detail: (typeof inp === "object" ? (inp.text || inp.input || "") : "").slice(0, 100), timestamp: ts, color: "#72dc93", icon: "🎙️", failed, errMsg, params: typeof inp === "object" ? inp : {}, rawInput: JSON.stringify(inp, null, 2).slice(0, 2000) };
      } else if (name === "music_generate" || name === "text_to_music") {
        nodeData = { id: id2, type: "music", label: "BGM 生成", detail: (typeof inp === "object" ? (inp.name || "") : ""), timestamp: ts, color: "#ff8ec4", icon: "🎵", failed, errMsg, prompt: params.prompt, musicParams: params.extraParams, rawInput: JSON.stringify(inp, null, 2).slice(0, 2000) };
      } else if (name.includes("execute_edit_video")) {
        const clipCount = (JSON.stringify(inp).match(/"file"/g) || []).length;
        nodeData = { id: id2, type: "assembly", label: "时间线装配", detail: clipCount + " 个片段", timestamp: ts, color: "#72dc93", icon: "🔧", failed, errMsg, rawInput: JSON.stringify(inp, null, 2).slice(0, 3000) };
      } else if (name.includes("ffprobe")) {
        nodeData = { id: id2, type: "analyze", label: "媒体分析", detail: typeof inp === "object" ? (inp.file || "") : "", timestamp: ts, color: "#9dafcf", icon: "🔍", failed, errMsg, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      } else if (name === "show_final_video") {
        const finalAid = outStr.match(/"content"\s*:\s*"(a_[a-zA-Z0-9]+)"/)?.[1] || outStr.match(/a_[a-zA-Z0-9]+/)?.[0] || "";
        nodeData = { id: id2, type: "deliver", label: "交付成片", detail: "最终视频呈现给用户", timestamp: ts, color: "#5ce4d4", icon: "🎬", failed, assetId: finalAid };
      } else if (name === "add_attachments") {
        nodeData = { id: id2, type: "attachment", label: "展示素材", detail: "向用户展示中间成果", timestamp: ts, color: "#f4c865", icon: "📎", failed, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      } else if (name === "get_file_info") {
        nodeData = { id: id2, type: "file_info", label: "获取文件信息", detail: "", timestamp: ts, color: "#9dafcf", icon: "📋", failed, rawInput: JSON.stringify(inp, null, 2).slice(0, 1000) };
      } else if (name === "analyze_file_content") {
        nodeData = { id: id2, type: "analyze", label: "内容分析", detail: typeof inp === "object" ? (inp.file || inp.url || "").slice(0, 80) : "", timestamp: ts, color: "#9dafcf", icon: "🔍", failed, errMsg, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      } else if (name === "summarize_url") {
        nodeData = { id: id2, type: "web", label: "网页抓取", detail: typeof inp === "object" ? (inp.url || "").slice(0, 80) : "", timestamp: ts, color: "#72b9ff", icon: "🌐", failed, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      } else if (name.includes("analyze_audio")) {
        nodeData = { id: id2, type: "analyze", label: "音频分析", detail: typeof inp === "object" ? (inp.file || "") : "", timestamp: ts, color: "#9dafcf", icon: "🎧", failed, errMsg, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      } else {
        nodeData = { id: id2, type: "tool", label: name, detail: "", timestamp: ts, color: "#9dafcf", icon: "🔧", failed, errMsg, rawInput: JSON.stringify(inp, null, 2).slice(0, 1500) };
      }

      nodes.push(nodeData);
      edges.push({ from: prevNodeId, to: id2, type: "flow" });
      prevNodeId = id2;
    }
  }

  // Second pass: extract URLs from all observations
  const urlMap = {};
  for (const o of allObs) {
    const outStr = typeof o.output === "string" ? o.output : JSON.stringify(o.output || "");
    const inpStr = typeof o.input === "string" ? o.input : JSON.stringify(o.input || "");
    const combined = outStr + inpStr;
    const ossUrls = [...combined.matchAll(/https?:\/\/pexo-assets[^\s"'\\<>]+/g)].map(m => m[0].split("?")[0]);
    for (const u of ossUrls) {
      const aidMatch = u.match(/assets%2F(a_[a-zA-Z0-9]+)%2F/);
      if (aidMatch) { try { urlMap[aidMatch[1]] = decodeURIComponent(u); } catch { urlMap[aidMatch[1]] = u; } }
    }
    const assetIds = [...combined.matchAll(/asset:\/\/(a_[a-zA-Z0-9]+)/g)].map(m => m[1]);
    for (const aid of assetIds) {
      if (!urlMap[aid]) {
        const directUrl = ossUrls.find(u => u.includes(aid));
        if (directUrl) { try { urlMap[aid] = decodeURIComponent(directUrl); } catch { urlMap[aid] = directUrl; } }
      }
    }
  }

  // Enrich generation nodes with URLs
  for (const n of nodes) {
    if (n.assetId && urlMap[n.assetId]) n.url = urlMap[n.assetId];
  }

  // Third pass: identify parallel groups (consecutive refs or gens that branch from one parent)
  let groupId = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    // Consecutive references after a skill → parallel branch
    if (n.type === "skill_branch") {
      const refs = [];
      let j = i + 1;
      while (j < nodes.length && nodes[j].type === "reference") { refs.push(j); j++; }
      if (refs.length > 1) {
        const gid = "pg_" + (groupId++);
        for (const ri of refs) nodes[ri].parallelGroup = gid;
        n.branchGroup = gid;
        // Rewrite edges: remove sequential ref→ref edges, connect skill→each ref, last ref→next
        const lastRef = nodes[refs[refs.length - 1]];
        for (let ri = 1; ri < refs.length; ri++) {
          const refNode = nodes[refs[ri]];
          // Change edge from prev ref→this ref to skill→this ref
          const edgeIdx = edges.findIndex(e => e.to === refNode.id && e.from === nodes[refs[ri - 1]].id);
          if (edgeIdx !== -1) { edges[edgeIdx].from = n.id; edges[edgeIdx].type = "ref"; }
        }
        // Find edge from last ref to next node, change from to skill (for convergence)
        const afterIdx = edges.findIndex(e => e.from === lastRef.id);
        if (afterIdx !== -1) {
          // All refs converge to the next node
          const nextId = edges[afterIdx].to;
          edges.splice(afterIdx, 1);
          edges.push({ from: lastRef.id, to: nextId, type: "flow" });
        }
      }
    }
    // Consecutive generations within 3s → parallel branch
    if (n.type === "generation" && !n.parallelGroup) {
      const batch = [i];
      let j = i + 1;
      while (j < nodes.length && nodes[j].type === "generation" && n.timestamp && nodes[j].timestamp && Math.abs(new Date(nodes[j].timestamp) - new Date(n.timestamp)) < 3000) { batch.push(j); j++; }
      if (batch.length > 1) {
        const gid = "pg_" + (groupId++);
        for (const bi of batch) nodes[bi].parallelGroup = gid;
        // Find the parent (node before the first gen in this batch)
        const parentEdge = edges.find(e => e.to === n.id);
        const parentId = parentEdge?.from;
        if (parentId) {
          // Rewrite: parent→each gen (instead of gen1→gen2→gen3)
          for (let bi = 1; bi < batch.length; bi++) {
            const genNode = nodes[batch[bi]];
            const edgeIdx = edges.findIndex(e => e.to === genNode.id && e.from === nodes[batch[bi - 1]].id);
            if (edgeIdx !== -1) { edges[edgeIdx].from = parentId; }
          }
          // Last gen connects to next node
          const lastGen = nodes[batch[batch.length - 1]];
          const afterIdx = edges.findIndex(e => e.from === lastGen.id);
          if (afterIdx !== -1) {
            const nextId = edges[afterIdx].to;
            edges.splice(afterIdx, 1);
            edges.push({ from: lastGen.id, to: nextId, type: "flow" });
          }
        }
      }
    }
    // Consecutive analyze within 3s → parallel
    if (n.type === "analyze" && !n.parallelGroup) {
      const batch = [i];
      let j = i + 1;
      while (j < nodes.length && nodes[j].type === "analyze" && n.timestamp && nodes[j].timestamp && Math.abs(new Date(nodes[j].timestamp) - new Date(n.timestamp)) < 3000) { batch.push(j); j++; }
      if (batch.length > 1) {
        const gid = "pg_" + (groupId++);
        for (const bi of batch) nodes[bi].parallelGroup = gid;
        const parentEdge = edges.find(e => e.to === n.id);
        const parentId = parentEdge?.from;
        if (parentId) {
          for (let bi = 1; bi < batch.length; bi++) {
            const aNode = nodes[batch[bi]];
            const edgeIdx = edges.findIndex(e => e.to === aNode.id && e.from === nodes[batch[bi - 1]].id);
            if (edgeIdx !== -1) { edges[edgeIdx].from = parentId; }
          }
          const lastA = nodes[batch[batch.length - 1]];
          const afterIdx = edges.findIndex(e => e.from === lastA.id);
          if (afterIdx !== -1) {
            const nextId = edges[afterIdx].to;
            edges.splice(afterIdx, 1);
            edges.push({ from: lastA.id, to: nextId, type: "flow" });
          }
        }
      }
    }
  }

  return { caseId: normalized, projectId: normalized, nodes, edges, userTurns: userTurns.length, totalNodes: nodes.length, urlMap };
}

const ADMIN_SKILL_IDS = {
  "generation-skill": 2,
  "modification-skill": 3,
  "publishing-skill": 5,
  "brainstorm-skill": 9,
  "assembly-skill": 10,
  "script-skill": 11,
  "subject-asset-skill": 12,
};

async function fetchAdminFileContent(skillId, filePath, token) {
  const base = "https://test-admin.pexo.ai";
  const qs = new URLSearchParams({ filePath }).toString();
  const url = `${base}/api/skills/${skillId}/file?${qs}`;
  try {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const body = data?.body ?? data;
    return body?.content ?? (typeof body === "string" ? body : null);
  } catch { return null; }
}

async function buildSkillsTree(caseId, reqToken) {
  const flow = buildCaseFlow(caseId);
  const { nodes, edges } = flow;
  const token = reqToken || process.env.PEXO_ADMIN_TOKEN || "";

  const skillNodes = nodes.filter(n => n.type === "skill_branch");
  const refNodes = nodes.filter(n => n.type === "reference");

  // Also re-parse raw trace data to get full SKILL.md content with line numbers
  const normalized = safeCaseId(caseId);
  const caseDir = findCaseDir(normalized);
  const traceFiles = readdirSync(caseDir).filter(f => /^trace-.*\.json$/.test(f)).sort();
  const skillReadRanges = new Map(); // skillName -> [{start, end}]
  for (const f of traceFiles) {
    const trace = readJson(join(caseDir, f));
    if (!trace) continue;
    for (const o of (trace.observations || [])) {
      if (o.name !== "read_file") continue;
      const inp = o.input || {};
      let fp = "";
      if (typeof inp === "object" && inp !== null) fp = inp.file_path || "";
      else if (typeof inp === "string") { const m = inp.match(/file_path['":\s]+['"]([^'"]+)['"]/); if (m) fp = m[1]; }
      if (!fp.includes("SKILL.md")) continue;
      const skillName = fp.match(/\/([^/]+)\/SKILL\.md/)?.[1];
      if (!skillName) continue;
      const content = typeof o.output === "string" ? o.output : (o.output?.content || "");
      let readStart = null, readEnd = null;
      for (const cl of content.split("\n")) {
        const lm = cl.match(/^\s*(\d+)\t/);
        if (lm) {
          const ln = parseInt(lm[1], 10);
          if (readStart === null || ln < readStart) readStart = ln;
          if (readEnd === null || ln > readEnd) readEnd = ln;
        }
      }
      if (readStart !== null) {
        if (!skillReadRanges.has(skillName)) skillReadRanges.set(skillName, []);
        skillReadRanges.get(skillName).push({ start: readStart, end: readEnd });
      }
    }
  }

  const uniqueSkills = new Map();
  for (const sn of skillNodes) {
    const key = sn.skillName;
    if (!uniqueSkills.has(key)) {
      uniqueSkills.set(key, { name: key, path: sn.detail, refs: new Map(), nodeIds: [], skillReads: skillReadRanges.get(key) || [] });
    }
    uniqueSkills.get(key).nodeIds.push(sn.id);
  }

  for (const rn of refNodes) {
    const parentSkillId = rn.parentSkill;
    const parentNode = skillNodes.find(s => s.id === parentSkillId);
    const skillName = parentNode?.skillName || "unknown";
    if (!uniqueSkills.has(skillName)) continue;

    const skill = uniqueSkills.get(skillName);
    const refKey = rn.detail;
    if (!skill.refs.has(refKey)) {
      skill.refs.set(refKey, { path: refKey, label: rn.label, reads: [], fullContent: null, totalLines: null });
    }
    const ref = skill.refs.get(refKey);
    if (rn.readStartLine != null && rn.readEndLine != null) {
      ref.reads.push({ start: rn.readStartLine, end: rn.readEndLine });
    }
  }

  const fetchPromises = [];
  for (const [skillName, skill] of uniqueSkills) {
    const adminId = ADMIN_SKILL_IDS[skillName];
    if (!adminId || !token) continue;

    fetchPromises.push((async () => {
      const skillContent = await fetchAdminFileContent(adminId, "SKILL.md", token);
      if (skillContent) skill.fullSkillContent = skillContent;
    })());

    // Fetch file tree to discover all reference files, then fetch ALL their content
    fetchPromises.push((async () => {
      try {
        const base = "https://test-admin.pexo.ai";
        const resp = await fetch(`${base}/api/skills/${adminId}/files`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) return;
        const data = await resp.json();
        const body = data?.body ?? data;
        const allPaths = [];
        function walk(node) {
          if (!node) return;
          if (!node.isDir && node.path) allPaths.push(node.path);
          for (const c of (node.children || [])) walk(c);
        }
        walk(body.root || body);
        const refPaths = allPaths.filter(p => p.startsWith("references/"));
        skill.allFiles = refPaths;

        // Fetch content for ALL reference files (including unread ones) to get total line counts
        const readRefShortPaths = new Set([...skill.refs.keys()].map(p => p.replace(/^\/.skills\/\d+\/[^/]+\//, "")));
        skill.unreadRefContents = new Map();
        await Promise.all(refPaths.filter(fp => !readRefShortPaths.has(fp)).map(async (fp) => {
          const content = await fetchAdminFileContent(adminId, fp, token);
          if (content) skill.unreadRefContents.set(fp, { content, totalLines: content.split("\n").length });
        }));
      } catch { /* ignore */ }
    })());

    for (const [refPath, ref] of skill.refs) {
      const fileName = refPath.replace(/^\/.skills\/\d+\/[^/]+\//, "");
      fetchPromises.push((async () => {
        const content = await fetchAdminFileContent(adminId, fileName, token);
        if (content) {
          ref.fullContent = content;
          ref.totalLines = content.split("\n").length;
        }
      })());
    }
  }

  await Promise.all(fetchPromises);

  const tree = [];
  for (const [skillName, skill] of uniqueSkills) {
    const refs = [];

    // SKILL.md as the first entry
    const skillMdReads = mergeLineRanges(skill.skillReads || []);
    const skillMdReadCount = skillMdReads.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
    const skillMdTotal = skill.fullSkillContent ? skill.fullSkillContent.split("\n").length : null;
    refs.push({
      path: "SKILL.md",
      label: "SKILL.md",
      totalLines: skillMdTotal,
      readRanges: skillMdReads,
      readLineCount: skillMdReadCount,
      fullContent: skill.fullSkillContent || null,
      wasRead: skillMdReads.length > 0,
      isSkillFile: true,
    });

    const readRefPaths = new Set();
    for (const [, ref] of skill.refs) {
      const mergedReads = mergeLineRanges(ref.reads);
      const readLineCount = mergedReads.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      refs.push({
        path: ref.path,
        label: ref.label,
        totalLines: ref.totalLines,
        readRanges: mergedReads,
        readLineCount,
        fullContent: ref.fullContent,
        wasRead: true,
      });
      const shortName = ref.path.replace(/^\/.skills\/\d+\/[^/]+\//, "");
      readRefPaths.add(shortName);
    }
    // Add unread reference files (with line counts from fetched content)
    if (skill.allFiles) {
      for (const fp of skill.allFiles) {
        if (!readRefPaths.has(fp)) {
          const unreadData = skill.unreadRefContents?.get(fp);
          refs.push({
            path: fp,
            label: fp.split("/").pop(),
            totalLines: unreadData?.totalLines || null,
            readRanges: [],
            readLineCount: 0,
            fullContent: unreadData?.content || null,
            wasRead: false,
          });
        }
      }
    }

    // Compute aggregate coverage: total read lines / total lines across all files with content
    let aggReadLines = 0, aggTotalLines = 0;
    for (const r of refs) {
      if (r.totalLines) { aggTotalLines += r.totalLines; aggReadLines += r.readLineCount; }
    }

    tree.push({
      skill: skillName,
      path: skill.path,
      refs,
      allRefCount: (skill.allFiles?.length || 0) + 1,
      readRefCount: readRefPaths.size + (skillMdReads.length > 0 ? 1 : 0),
      aggReadLines,
      aggTotalLines,
      aggPct: aggTotalLines > 0 ? Math.round(aggReadLines / aggTotalLines * 100) : 0,
    });
  }

  return { caseId, tree };
}

function mergeLineRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end + 1) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

function countTraces(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => /^trace-.*\.json$/.test(f)).length;
}

function compactJson(value) {
  if (!value) return "";
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > 5000 ? text.slice(0, 5000) + "\n..." : text;
  } catch { return String(value); }
}

function tryParse(value) {
  if (typeof value === "object" && value !== null) return value;
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === "string") return item;
      if (item?.type === "text") return item.text || "";
      if (item?.type === "tool_use") return `[tool_use] ${item.name || ""} ${compactJson(item.input || {})}`;
      return compactJson(item);
    }).filter(Boolean).join("\n");
  }
  return compactJson(content);
}

function isFailureSignal(status, output) {
  if (/error|fail|timeout/i.test(String(status || ""))) return true;
  if (!output) return false;
  const check = typeof output === "object" ? output : tryParse(output);
  if (check) {
    if (check.success === false || check.ok === false || check.error) return true;
    if (check.content && typeof check.content === "string") {
      return /"ok"\s*:\s*false|"error"\s*:\s*"[^"]+|timeout/i.test(check.content);
    }
  }
  return /"ok"\s*:\s*false|"error"\s*:\s*"[^"]+|timeout/i.test(String(output));
}

function extractConversation(traces) {
  const messages = [];
  const seen = new Set();
  for (const trace of traces) {
    const ts = trace.data.timestamp || trace.data.createdAt || "";
    const sourceMessages = [...((trace.data.input?.messages) || []), ...((trace.data.output?.messages) || [])];
    for (const msg of sourceMessages) {
      const role = msg.type || msg.role || "unknown";
      if (!["human","ai","tool","system"].includes(role)) continue;
      const content = normalizeContent(msg.content);
      if (!content) continue;
      const key = `${role}:${msg.id || msg.tool_call_id || ""}:${content.slice(0,240)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      messages.push({ trace: trace.file, timestamp: ts, role, name: msg.name || "", content, toolCalls: msg.tool_calls || [] });
    }
  }
  return messages;
}

function extractToolCalls(traces, assets) {
  const obsById = new Map();
  const obsList = [];
  for (const trace of traces) {
    for (const obs of (trace.data.observations || [])) {
      const name = obs.name || "";
      if (obs.type !== "TOOL" && !/generate|audio|video|image|edit|file|upload|show_final/i.test(name)) continue;
      const entry = {
        trace: trace.file, id: obs.id || "", name, type: obs.type || "", status: obs.status || "",
        startTime: obs.startTime || obs.timestamp || trace.data.timestamp || "",
        latency: obs.latency || null,
        input: typeof obs.input === "string" ? obs.input : compactJson(obs.input),
        output: typeof obs.output === "string" ? obs.output : compactJson(obs.output),
        failed: isFailureSignal(obs.status, obs.output),
      };
      if (entry.id) obsById.set(entry.id, entry);
      obsList.push(entry);
    }
  }

  const mergedIds = new Set();
  for (const asset of assets) {
    if (!asset.tool) continue;
    const obsId = asset.observation_id || "";
    const obs = obsId ? obsById.get(obsId) : null;
    if (obs) {
      obs.provider = asset.provider || "";
      obs.model = asset.model || "";
      obs.assetName = asset.name || "";
      obs.assetType = asset.type || "";
      obs.type = "ASSET";
      if (!obs.failed && (asset.ok === false || Boolean(asset.message) || /error|fail/i.test(asset.status || "")))
        obs.failed = true;
      mergedIds.add(obsId);
    }
  }

  for (const asset of assets) {
    if (!asset.tool) continue;
    if (asset.observation_id && mergedIds.has(asset.observation_id)) continue;
    obsList.push({
      trace: asset.trace_file || "assets.json", id: asset.observation_id || "",
      name: asset.tool, type: "ASSET", status: asset.status || "",
      startTime: "",
      latency: null,
      input: asset.prompt || asset.text || asset.composition_plan || "",
      output: asset.message || "",
      provider: asset.provider || "", model: asset.model || "",
      assetName: asset.name || "", assetType: asset.type || "",
      failed: asset.ok === false || Boolean(asset.message) || /error|fail/i.test(asset.status || ""),
    });
  }

  const PW = { image_generate:30, video_generate:40, execute_edit_video:50, audio_produce:50, tts_generate:50, music_generate:50, show_final_video:60 };
  obsList.sort((a, b) => {
    if (a.startTime && b.startTime) return String(a.startTime).localeCompare(String(b.startTime));
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return (PW[a.name] || 99) - (PW[b.name] || 99);
  });

  let firstVideoGenIdx = -1, firstFinalIdx = -1;
  for (let i = 0; i < obsList.length; i++) {
    if (obsList[i].name === "video_generate" && firstVideoGenIdx < 0) firstVideoGenIdx = i;
    if (obsList[i].name === "show_final_video" && firstFinalIdx < 0) firstFinalIdx = i;
  }

  for (let i = 0; i < obsList.length; i++) {
    const c = obsList[i];
    if (firstFinalIdx >= 0 && i > firstFinalIdx) {
      c.pipelineStage = "modification";
    } else if (c.name === "show_final_video") {
      c.pipelineStage = "assembly";
    } else if (["tts_generate","music_generate","audio_produce"].includes(c.name)) {
      c.pipelineStage = "assembly";
    } else if (c.name === "execute_edit_video") {
      c.pipelineStage = "assembly";
    } else if (c.name === "video_generate") {
      c.pipelineStage = "generation";
    } else if (c.name === "image_generate") {
      c.pipelineStage = (firstVideoGenIdx >= 0 && i < firstVideoGenIdx) ? "subject-asset" : "generation";
    } else {
      c.pipelineStage = "other";
    }
  }

  return obsList;
}

function analyzeCase({ traces, assets, conversation, toolCalls }) {
  const countBy = (items, key) => items.reduce((acc, i) => { const v = i?.[key] || "unknown"; acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const byType = countBy(assets, "type");
  const byTool = countBy(assets, "tool");
  const failures = toolCalls.filter(c => c.failed).slice(0, 20);
  const finalAssets = assets.filter(a => a.type === "final" || a.tool === "show_final_video");
  const findings = [];
  if (failures.length) findings.push({ severity: "high", title: "存在失败或异常信号", detail: `检测到 ${failures.length} 个失败/异常工具或资产记录` });
  if (!finalAssets.length) findings.push({ severity: "high", title: "未检测到最终交付", detail: "没有 show_final_video 类型资产" });
  if (!findings.length) findings.push({ severity: "low", title: "未发现明显结构性异常", detail: "建议人工检查最终视频" });
  return {
    summary: { traces: traces.length, messages: conversation.length, toolCalls: toolCalls.length, assets: assets.length, finalDeliveries: finalAssets.length },
    byType, byTool, findings,
    recommendations: ["检查 Tool Chain 中失败调用的 Input/Output", "对比用户原始请求和实际工具参数", "检查 video_generate 的 references 和 audio_inputs"],
  };
}

function classifyError(outputStr) {
  const s = String(outputStr).toLowerCase();
  if (/content.?polic|nsfw|sensitive|审核|rejected|违规|forbidden|moderation/i.test(s)) return "content_policy";
  if (/timeout|timed.?out|deadline|超时|ETIMEDOUT/i.test(s)) return "timeout";
  if (/rate.?limit|429|quota|频率|too many/i.test(s)) return "rate_limit";
  if (/not.?found|404|asset_id.*resolv|could not be resolved|找不到|no such/i.test(s)) return "asset_missing";
  if (/invalid|parameter|required|missing|format|schema|参数|格式|constraint|must be/i.test(s)) return "parameter_error";
  if (/"ok"\s*:\s*false|"success"\s*:\s*false|generation.*fail|task.*fail/i.test(s)) return "model_error";
  if (/network|ECONNREFUSED|ECONNRESET|socket|连接/i.test(s)) return "network_error";
  return "unknown";
}

const ERROR_TYPE_LABELS = {
  content_policy: "内容策略拒绝", timeout: "请求超时", rate_limit: "频率限制",
  asset_missing: "资产/文件缺失", parameter_error: "参数格式错误", model_error: "模型执行失败",
  network_error: "网络连接错误", unknown: "未分类错误",
};

function extractErrorDetail(outputStr) {
  const s = String(outputStr || "").trim();
  if (!s) return { message: "输出为空——工具调用可能未返回任何结果", fields: {} };

  let parsed = tryParse(s);
  if (!parsed && s.includes("{")) {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParse(m[0]);
  }
  if (parsed && typeof parsed === "object") {
    const contentStr = typeof parsed.content === "string" ? parsed.content : null;
    if (contentStr) {
      const inner = tryParse(contentStr);
      if (inner && typeof inner === "object") parsed = inner;
    }
  }

  const fields = {};
  if (parsed && typeof parsed === "object") {
    for (const key of ["error", "message", "detail", "reason", "code", "status", "description", "msg"]) {
      if (parsed[key] !== undefined) fields[key] = String(parsed[key]);
      if (parsed.data && parsed.data[key] !== undefined) fields["data." + key] = String(parsed.data[key]);
    }
    if (parsed.ok !== undefined) fields.ok = String(parsed.ok);
    if (parsed.success !== undefined) fields.success = String(parsed.success);
  }

  const regexes = [
    [/"error"\s*:\s*"([^"]{3,})"/, "error"],
    [/"message"\s*:\s*"([^"]{3,})"/, "message"],
    [/"detail"\s*:\s*"([^"]{3,})"/, "detail"],
    [/"reason"\s*:\s*"([^"]{3,})"/, "reason"],
    [/Error:\s*(.+?)(?:\n|"|$)/i, "Error"],
    [/failed[:\s]+(.+?)(?:\n|"|$)/i, "failed"],
  ];
  for (const [re, label] of regexes) {
    if (fields[label]) continue;
    const m = s.match(re);
    if (m) fields[label] = m[1].trim();
  }

  const msg = fields.error || fields.message || fields.detail || fields.reason ||
    fields["data.error"] || fields["data.message"] || fields.Error || fields.failed || "";
  return { message: msg || (s.length > 300 ? s.slice(0, 300) + "..." : s), fields };
}

function traceInputUrls(inputStr, preceding) {
  const issues = [];
  const urls = (inputStr.match(/https?:\/\/[^\s"',}\]\\]+/g) || []);
  if (!urls.length) return issues;

  const succeededOutputUrls = new Set();
  const failedOutputUrls = new Map();
  for (const prev of preceding) {
    const out = String(prev.output || "");
    const prevUrls = out.match(/https?:\/\/[^\s"',}\]\\]+/g) || [];
    for (const u of prevUrls) {
      const filename = decodeURIComponent(u.split("?")[0].split("/").pop());
      if (prev.failed) failedOutputUrls.set(filename, prev);
      else succeededOutputUrls.add(filename);
    }
  }

  for (const url of urls.slice(0, 20)) {
    const filename = decodeURIComponent(url.split("?")[0].split("/").pop());
    const failedSource = failedOutputUrls.get(filename);
    if (failedSource && !succeededOutputUrls.has(filename)) {
      issues.push({
        type: "broken_dependency", severity: "high",
        detail: `输入引用的文件 "${filename}" 来自上游已失败的调用「${failedSource.assetName || failedSource.name}」——此文件可能不存在或不完整。`,
      });
    }
  }
  return issues;
}

function analyzeInputParams(call) {
  const issues = [];
  const inputStr = String(call.input || "");
  const name = call.name || "";

  if (/video_generate|image_generate/.test(name)) {
    if (!inputStr || inputStr.length < 10) {
      issues.push({ type: "empty_input", severity: "high", detail: "输入参数几乎为空——调用缺少必要的 prompt 和参数。" });
    }
    const parsedInput = tryParse(inputStr);
    if (parsedInput && typeof parsedInput === "object") {
      if (name === "video_generate") {
        if (!parsedInput.prompt && !parsedInput.provider_param) {
          issues.push({ type: "missing_prompt", severity: "high", detail: "video_generate 缺少 prompt 字段——这是必填参数。" });
        }
        if (!parsedInput.provider) {
          issues.push({ type: "missing_provider", severity: "high", detail: "video_generate 缺少 provider 字段。" });
        }
      }
    }
  }

  if (/execute_edit_video|analyze_audio|video.?editor/i.test(name)) {
    const urls = inputStr.match(/https?:\/\/[^\s"',}\]\\]+/g) || [];
    const videoUrls = urls.filter(u => /\.(mp4|mov|webm)/i.test(u.split("?")[0]));
    const audioUrls = urls.filter(u => /\.(mp3|wav|m4a|aac|ogg)/i.test(u.split("?")[0]));
    if (/analyze_audio|audio/i.test(name) && videoUrls.length === 0 && audioUrls.length === 0) {
      issues.push({ type: "no_media_url", severity: "high",
        detail: "音频分析工具的输入中未检测到任何视频/音频文件 URL——工具无法执行分析。" });
    }
  }

  if (/tts_generate|audio_produce/.test(name)) {
    const parsedInput = tryParse(inputStr);
    if (parsedInput && typeof parsedInput === "object") {
      const text = parsedInput.text || parsedInput.input || "";
      if (!text) issues.push({ type: "empty_text", severity: "high", detail: "TTS/语音合成缺少 text 输入文本。" });
    }
  }
  return issues;
}

function findDownstreamImpact(call, allCalls, idx) {
  const impacts = [];
  const downstream = allCalls.slice(idx + 1);
  const name = call.name || "";
  const assetName = call.assetName || "";

  if (name === "video_generate") {
    const dependents = downstream.filter(c =>
      c.name === "execute_edit_video" && String(c.input || "").includes(assetName));
    if (dependents.length) {
      impacts.push(`下游有 ${dependents.length} 个 execute_edit_video 引用了此视频片段「${assetName}」`);
    }
    const laterRetry = downstream.find(c => c.name === "video_generate" && c.assetName === assetName && !c.failed);
    if (laterRetry) {
      impacts.push(`此失败后有成功的重试（同名 video_generate），下游应使用重试成功的版本`);
    }
  }

  if (/execute_edit_video|analyze_audio|video.?editor/i.test(name)) {
    const finalCalls = downstream.filter(c => c.name === "show_final_video");
    if (finalCalls.length) {
      impacts.push("此失败可能影响最终交付（show_final_video）");
    }
  }

  if (/tts_generate|audio_produce|music_generate/.test(name)) {
    impacts.push("音频资产缺失会影响后续 execute_edit_video 装配的声音完整性");
  }
  return impacts;
}

const PROBLEM_CLASS = {
  tool_call: { label: "工具调用问题", color: "#e74c3c", icon: "🔧" },
  infra: { label: "基础设施问题", color: "#e67e22", icon: "⚙️" },
  generation: { label: "视频生成问题", color: "#9b59b6", icon: "🎬" },
  content: { label: "内容策略问题", color: "#f39c12", icon: "🛡️" },
  parameter: { label: "参数配置问题", color: "#3498db", icon: "📋" },
  unknown: { label: "待定", color: "#95a5a6", icon: "❓" },
};

function detectWorkspacePathIssue(call, inputStr, outputStr) {
  const hasWorkspacePath = /\/projects\/\d+\/workspace\/|\/workspace\/assets\//.test(inputStr);
  const isVideoEditorTool = /video.?editor|analyze_audio|ffprobe|execute_edit_video/i.test(call.name);
  const resolveError = /unsupported file reference|could not resolve|asset_resolve_failed/i.test(outputStr);

  if (hasWorkspacePath && isVideoEditorTool && resolveError) {
    return {
      detected: true,
      rootCause: {
        type: "framework_path_conversion", severity: "critical",
        detail: `检测到 Framework 路径转换缺陷：输入使用了工作区路径（/projects/.../workspace/...），但 video-editor 只接受 asset:// 格式引用。` +
          `\n\n根因链：上游工具返回 asset:// 引用 → 中间件将其解析为工作区路径注入 model context → model 使用工作区路径调用此工具 → Framework 未将路径转回 asset:// 格式 → 工具拒绝。` +
          `\n\n关键证据：video_generate 的 image_list[].file 参数能被正确转换为 asset://，但 ${call.name} 的 file 参数未被转换——说明转换覆盖不完整。`,
      },
      skillIssues: [
        { skill: "assembly-skill", issue: "Pre-Assembly Checklist (Rule 1, item 4) 明确要求「No /workspace/ paths」，但此规则仅覆盖 execute_edit_video，未覆盖 analyze_audio 等其他 video-editor 工具。建议：扩展 FILE REFS 规则到所有 video-editor__* 调用。",
          ref: "pexo-skills/assembly-skill/SKILL.md:52 → FILE REFS 规则" },
        { skill: "video-editor-tool-guide", issue: "文档声明「agent 框架会把模型看到的工作区路径转换成 asset:// 格式」并标注「勿作为 agent 提示词依据」——但框架转换实际不完整。建议：去掉此免责声明，增加防御性规则：当路径格式不确定时，使用 get_file_info 获取已验证的引用。",
          ref: "pexo-skills/assembly-skill/references/video-editor-tool-guide.md:186-188" },
      ],
      problemClass: "tool_call",
    };
  }

  if (hasWorkspacePath && isVideoEditorTool) {
    return {
      detected: true,
      rootCause: {
        type: "workspace_path_warning", severity: "high",
        detail: `输入包含工作区路径（/projects/.../workspace/...），video-editor 工具内部只接受 asset:// 引用。Framework 应自动转换路径，但转换可能不完整。`,
      },
      skillIssues: [
        { skill: "assembly-skill", issue: "应在调用任何 video-editor 工具前验证 file 参数格式，对工作区路径使用 get_file_info 获取有效引用。",
          ref: "pexo-skills/assembly-skill/SKILL.md:52 → FILE REFS 规则" },
      ],
      problemClass: "tool_call",
    };
  }
  return { detected: false };
}

function detectInfraTimeout(call, outputStr, allCalls, idx) {
  const isAssetDirectTimeout = /create project asset direct.*(?:timeout|deadline exceeded|failed to read file content)/i.test(outputStr);
  const isGenericTimeout = /timeout|deadline exceeded|ETIMEDOUT/i.test(outputStr) && !/content.?polic|nsfw/i.test(outputStr);

  if (!isAssetDirectTimeout && !isGenericTimeout) return { detected: false };

  const parallelCalls = allCalls.filter(c =>
    c.name === call.name && c.id !== call.id &&
    c.startTime && call.startTime &&
    Math.abs(new Date(c.startTime) - new Date(call.startTime)) < 5000
  );
  const parallelSucceeded = parallelCalls.filter(c => !c.failed);
  const laterRetry = allCalls.slice(idx + 1).find(c =>
    c.name === call.name && !c.failed &&
    (call.assetName ? c.assetName === call.assetName : true)
  );

  const result = { detected: true, skillIssues: [], problemClass: "infra" };

  if (isAssetDirectTimeout) {
    result.rootCause = {
      type: "asset_upload_timeout", severity: "high",
      detail: `基础设施超时：生成服务在「create project asset direct」阶段（上传/注册参考文件）超时，错误为 "failed to read file content: context deadline exceeded"。` +
        `\n\n这是资产服务层面的瞬时问题，不是参数或 prompt 问题——调用参数格式正确（asset:// 引用有效）。` +
        (parallelSucceeded.length > 0
          ? `\n\n并行调用证据：同批次有 ${parallelCalls.length} 个并行的 ${call.name} 调用，其中 ${parallelSucceeded.length} 个成功——说明参考资产本身可访问，超时是瞬时的。`
          : "") +
        (parallelCalls.length >= 4
          ? `\nThundering herd 效应：${parallelCalls.length + 1} 个调用同时请求相同资产，最后被处理的调用超时。`
          : "") +
        (laterRetry
          ? `\n\n重试结果：后续相同参数重试成功（${laterRetry.assetName || laterRetry.name}），进一步确认是瞬时问题。`
          : ""),
    };
    result.skillIssues.push(
      { skill: "generation-skill / video-models-scheduling.md",
        issue: "Section VII 降级策略对超时的处理建议是「Retry with adjusted parameters (shorter duration, simplified prompt)」，但对于 'create project asset direct' 类基础设施超时，调整参数无意义——应用相同参数直接重试。建议：区分「基础设施超时」和「参数/内容问题」，前者直接重试，后者才调整参数。",
        ref: "pexo-skills/generation-skill/references/video-models-scheduling.md:667-671 → Section VII" },
    );
    if (parallelCalls.length >= 4) {
      result.skillIssues.push(
        { skill: "generation-skill",
          issue: `EXECUTION MANDATE 要求「所有调用同时发出」（Rule 5），这在速度上最优但可能导致 thundering herd。当 ${parallelCalls.length + 1} 个并行调用引用相同资产时，最后处理的调用易超时。建议：在 Section VII 中增加针对并行超时的处理指导。`,
          ref: "pexo-skills/generation-skill/SKILL.md:138 → EXECUTION MANDATE" },
      );
    }
  } else {
    result.rootCause = {
      type: "generic_timeout", severity: "high",
      detail: `请求超时。` +
        (laterRetry ? `后续重试成功——属于瞬时基础设施问题。` : "未检测到成功重试。") +
        (parallelSucceeded.length > 0 ? ` 同批次其他 ${parallelSucceeded.length} 个调用成功。` : ""),
    };
    result.skillIssues.push(
      { skill: "generation-skill",
        issue: "超时处理应区分瞬时基础设施问题和参数问题。对于瞬时超时，用相同参数重试即可。",
        ref: "pexo-skills/generation-skill/references/video-models-scheduling.md:667-671 → Section VII" },
    );
  }
  return result;
}

function detectAssetRefIssue(call, inputStr) {
  const hasAssetRef = /asset:\/\/[a-zA-Z0-9_]+/.test(inputStr);
  const hasRefMention = /reference|character|style|角色|风格|人物|image_list/i.test(inputStr);
  const urlMatches = inputStr.match(/https?:\/\/[^\s"',}\]]+/g) || [];

  if (hasRefMention && !hasAssetRef && urlMatches.length === 0) {
    return {
      detected: true,
      rootCause: {
        type: "missing_all_refs", severity: "high",
        detail: "Prompt 提及了参考图/角色/风格，但 input 中既无 asset:// 引用也无 HTTP URL。参考素材在上游完全丢失。",
      },
      skillIssues: [
        { skill: "subject-asset-skill",
          issue: "参考素材未被传入。generation-skill Rule 3 要求在生成前 refresh file info。",
          ref: "pexo-skills/generation-skill/SKILL.md:124 → Rule 3 Reference Mapping" },
      ],
    };
  }
  return { detected: false };
}

function classifyProblemType(call, errorType, rootCauses) {
  const types = rootCauses.map(r => r.type);
  if (types.includes("framework_path_conversion") || types.includes("workspace_path_warning")) return "tool_call";
  if (types.includes("asset_upload_timeout") || types.includes("generic_timeout")) return "infra";
  if (errorType === "content_policy") return "content";
  if (errorType === "parameter_error") return "parameter";
  if (errorType === "timeout") return "infra";
  if (errorType === "model_error" && /video_generate|image_generate/.test(call.name)) return "generation";
  if (errorType === "asset_missing") return "tool_call";
  if (errorType === "network_error") return "infra";
  return "unknown";
}

function analyzeFailures(toolCalls, assets) {
  const failed = toolCalls.filter(c => c.failed);
  if (!failed.length) return;

  for (const call of failed) {
    const idx = toolCalls.indexOf(call);
    const preceding = toolCalls.slice(0, idx);
    const outputStr = String(call.output || "");
    const inputStr = String(call.input || "");
    const errorType = classifyError(outputStr);
    const stage = call.pipelineStage || "other";
    const rootCause = [];
    const skillIssues = [];

    const errorDetail = extractErrorDetail(outputStr);
    const inputIssues = analyzeInputParams(call);
    const upstreamIssues = traceInputUrls(inputStr, preceding);
    const downstreamImpact = findDownstreamImpact(call, toolCalls, idx);

    const wpResult = detectWorkspacePathIssue(call, inputStr, outputStr);
    if (wpResult.detected) {
      rootCause.push(wpResult.rootCause);
      skillIssues.push(...wpResult.skillIssues);
    }

    const infraResult = detectInfraTimeout(call, outputStr, toolCalls, idx);
    if (infraResult.detected) {
      rootCause.push(infraResult.rootCause);
      skillIssues.push(...infraResult.skillIssues);
    }

    if (errorDetail.message && !wpResult.detected && !infraResult.detected) {
      rootCause.push({ type: "error_message", severity: "high",
        detail: `实际错误信息：「${errorDetail.message}」` +
          (Object.keys(errorDetail.fields).length > 1
            ? `\n完整字段：${Object.entries(errorDetail.fields).map(([k,v]) => `${k}=${v}`).join(", ")}`
            : ""),
      });
    }

    rootCause.push(...inputIssues);
    rootCause.push(...upstreamIssues);

    const sameNamePrev = preceding.filter(c => c.name === call.name && (call.assetName ? c.assetName === call.assetName : true));
    const sameNameFails = sameNamePrev.filter(c => c.failed);
    if (sameNameFails.length >= 1) {
      const prevErrors = sameNameFails.map(f => extractErrorDetail(String(f.output || "")).message);
      const outputsIdentical = prevErrors.every(e => e === errorDetail.message);
      rootCause.push({
        type: "retry_pattern", severity: "high",
        detail: `此前已有 ${sameNameFails.length} 次同名失败（${call.assetName || call.name}）。` +
          (outputsIdentical
            ? "错误信息完全相同——Agent 在重复相同的失败操作而未改变策略，属于无效重试循环。"
            : `错误信息有变化——前次错误：「${prevErrors[prevErrors.length - 1]?.slice(0, 80) || "?"}」，本次：「${errorDetail.message?.slice(0, 80) || "?"}」`),
      });
      if (sameNameFails.length >= 2) {
        skillIssues.push({
          skill: stage === "modification" ? "modification-skill" : "generation-skill",
          issue: `连续 ${sameNameFails.length + 1} 次同一调用失败——降级策略未被触发或 Agent 未改变假设。`,
          ref: "pexo-skills/generation-skill/SKILL.md → 降级处理",
        });
      }
    }

    if (call.name === "video_generate" && !infraResult.detected) {
      const refResult = detectAssetRefIssue(call, inputStr);
      if (refResult.detected) {
        rootCause.push(refResult.rootCause);
        skillIssues.push(...refResult.skillIssues);
      }

      if (errorType === "content_policy") {
        skillIssues.push({ skill: "script-skill",
          issue: `模型路由问题。当前 provider=${call.provider || "?"}, model=${call.model || "?"}。Seedance 内容审核严格，遇到拒绝应降级到 Kling。`,
          ref: "video-models-scheduling.md:667-671 → Section VII 内容策略降级" });
      }
      if (errorType === "parameter_error") {
        skillIssues.push({ skill: "generation-skill",
          issue: "参数契约违反。generation-skill 的四字段验证（provider, model, mode, provider_param key）可能未通过。",
          ref: "pexo-skills/generation-skill/SKILL.md:41 → Pre-call model verification" });
      }
    }

    if (/execute_edit_video/i.test(call.name)) {
      const failedGens = preceding.filter(c => c.name === "video_generate" && c.failed);
      if (failedGens.length > 0) {
        rootCause.push({ type: "upstream_failure", severity: "high",
          detail: `上游有 ${failedGens.length} 个 video_generate 失败（${failedGens.map(f => f.assetName || f.name).join(", ")}）。装配可能引用了未成功生成的无效资产。` });
        skillIssues.push({ skill: "assembly-skill",
          issue: "预装配检查应验证所有 clip file 的有效性。",
          ref: "pexo-skills/assembly-skill/SKILL.md:52 → FILE REFS 规则" });
      }
      if (errorType === "asset_missing") {
        skillIssues.push({ skill: "assembly-skill",
          issue: "edit_spec 引用的文件不存在。应使用原始生成文件并通过 get_file_info 验证。",
          ref: "pexo-skills/assembly-skill/SKILL.md:52 → Pre-Assembly Checklist item 4" });
      }
    }

    if (/analyze_audio|ffprobe|video.?editor(?!.*execute)/i.test(call.name) && !wpResult.detected) {
      const failedGens = preceding.filter(c => c.name === "video_generate" && c.failed);
      const failedEdits = preceding.filter(c => /execute_edit_video/i.test(c.name) && c.failed);
      if (failedGens.length || failedEdits.length) {
        rootCause.push({ type: "upstream_media_missing", severity: "high",
          detail: `分析目标文件可能来自上游失败的调用：${failedGens.length} 个 video_generate + ${failedEdits.length} 个 execute_edit_video 失败。` });
      }
      skillIssues.push({ skill: "assembly-skill",
        issue: "对所有 video-editor 工具调用（不仅 execute_edit_video），都应验证 file 参数有效。建议：将 FILE REFS 规则扩展到全部 video-editor__* 工具。",
        ref: "pexo-skills/assembly-skill/SKILL.md:52 → FILE REFS 规则" });
    }

    if (["tts_generate", "audio_produce"].includes(call.name)) {
      skillIssues.push({ skill: "assembly-skill",
        issue: "旁白/音频生成失败会导致成品缺少声音。应基于实际视频节奏裁剪文本。",
        ref: "pexo-skills/assembly-skill/references/vo-design-principles.md" });
    }

    if (call.name === "music_generate") {
      skillIssues.push({ skill: "assembly-skill",
        issue: "BGM 生成失败时，应考虑降级方案或跳过 BGM。",
        ref: "pexo-skills/assembly-skill/references/audio-design-guide.md" });
    }

    if (call.name === "image_generate" && stage === "subject-asset") {
      rootCause.push({ type: "ref_gen_fail", severity: "medium",
        detail: "参考图生成失败。下游 video_generate 可能因缺少参考图而质量下降或风格不一致。" });
      skillIssues.push({ skill: "subject-asset-skill",
        issue: "参考图生成失败时应从用户原始素材寻找替代。",
        ref: "pexo-skills/subject-asset-skill/SKILL.md → 补充参考生成" });
    }

    if (call.name === "show_final_video" && call.failed) {
      const failedAssembly = preceding.filter(c => /execute_edit_video/i.test(c.name) && c.failed);
      if (failedAssembly.length) {
        rootCause.push({ type: "upstream_assembly_fail", severity: "high",
          detail: `装配阶段有 ${failedAssembly.length} 次失败。成品文件可能未成功生成。` });
      }
    }

    const problemClass = wpResult.detected ? wpResult.problemClass
      : infraResult.detected ? infraResult.problemClass
      : classifyProblemType(call, errorType, rootCause);

    call.failureAnalysis = {
      errorType,
      errorLabel: ERROR_TYPE_LABELS[errorType] || "未分类错误",
      problemClass,
      problemClassLabel: (PROBLEM_CLASS[problemClass] || PROBLEM_CLASS.unknown).label,
      problemClassColor: (PROBLEM_CLASS[problemClass] || PROBLEM_CLASS.unknown).color,
      problemClassIcon: (PROBLEM_CLASS[problemClass] || PROBLEM_CLASS.unknown).icon,
      rootCause,
      skillIssues,
      retryCount: sameNameFails.length,
      precedingCount: preceding.length,
      precedingFailCount: preceding.filter(c => c.failed).length,
      downstreamImpact,
    };
  }
}

function buildCasePayload(caseId) {
  const normalized = safeCaseId(caseId);
  const caseDir = findCaseDir(normalized);
  if (!existsSync(caseDir)) throw new Error(`Case directory not found for: ${normalized}`);

  const traceFiles = readdirSync(caseDir).filter(f => /^trace-.*\.json$/.test(f)).sort();
  const traces = traceFiles.map(file => ({ file, data: readJson(join(caseDir, file), {}) }));
  let urlMap = readJson(join(caseDir, "url_map.json"), null);
  if (!urlMap) urlMap = buildUrlMapFromTraces(caseDir);
  else {
    for (const [key, val] of Object.entries(urlMap)) {
      if (typeof val === "string" && val.includes("?")) urlMap[key] = stripOssSignature(val);
    }
  }
  const assetIdMap = buildAssetIdMap(caseDir);
  extractSignedUrlsFromFileInfo(traces, urlMap);
  const obsAssetIds = extractObservationAssetIds(traces);
  const projectId = normalized;
  const rawAssets = readJson(join(caseDir, "assets-with-prompts.json"), []) || readJson(join(caseDir, "assets.json"), []) || [];
  const assets = enrichAssets(rawAssets, urlMap, assetIdMap, projectId, obsAssetIds);
  const conversation = extractConversation(traces);
  const toolCalls = extractToolCalls(traces, assets);
  analyzeFailures(toolCalls, assets);
  const analysis = analyzeCase({ traces, assets, conversation, toolCalls });
  const sourceMedia = extractSourceMedia(conversation, urlMap);
  const hasLocalMedia = existsSync(join(caseDir, "media"));

  return { caseId: normalized, caseDir, traceCount: traces.length, assetCount: assets.length, urlMapSize: Object.keys(urlMap).length, hasLocalMedia, sourceMedia, conversation, toolCalls, assets, analysis };
}

export function listCases() {
  const cases = new Map();
  for (const dir of [BUNDLED_CASES_DIR, TMP_CASES_DIR]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || cases.has(entry.name)) continue;
      const caseDir = join(dir, entry.name);
      const files = readdirSync(caseDir);
      cases.set(entry.name, {
        id: entry.name,
        traces: files.filter(f => /^trace-.*\.json$/.test(f)).length,
        hasAssets: files.includes("assets-with-prompts.json") || files.includes("assets.json"),
        source: dir === BUNDLED_CASES_DIR ? "bundled" : "fetched",
      });
    }
  }
  return [...cases.values()].sort((a, b) => b.id.localeCompare(a.id));
}

export async function fetchFromLangfuse(caseId) {
  const normalized = safeCaseId(caseId);
  const existingDir = findCaseDir(normalized);
  if (countTraces(existingDir) > 0) return existingDir;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST;
  if (!publicKey || !secretKey || !host) {
    throw new Error("Case not found in bundled data. Configure LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST to fetch on-demand.");
  }

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  const caseDir = join(TMP_CASES_DIR, normalized);
  mkdirSync(caseDir, { recursive: true });

  let page = 1;
  let traceIdx = 0;
  while (true) {
    const url = `${host}/api/public/traces?page=${page}&limit=50`;
    const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!resp.ok) throw new Error(`Langfuse API error: ${resp.status}`);
    const data = await resp.json();
    const traces = (data.data || []).filter(t =>
      (t.name || "").includes(normalized) || (t.sessionId || "").includes(normalized)
    );
    for (const trace of traces) {
      const traceId = trace.id;
      const obsResp = await fetch(`${host}/api/public/observations?traceId=${traceId}&limit=200`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const obsData = obsResp.ok ? await obsResp.json() : { data: [] };
      trace.observations = obsData.data || [];
      traceIdx++;
      writeFileSync(join(caseDir, `trace-${traceIdx}-${traceId.slice(0, 8)}.json`), JSON.stringify(trace, null, 2));
    }
    if (!data.meta?.hasMore && traces.length === 0 && page > 1) break;
    if (page > 10) break;
    page++;
  }

  if (countTraces(caseDir) === 0) throw new Error(`No traces found for case ${normalized}`);
  return caseDir;
}

export async function startAnalysis(caseId) {
  const normalized = safeCaseId(caseId);
  const job = { id: randomUUID(), title: `Analyze ${normalized}`, caseId: normalized, status: "running", startedAt: new Date().toISOString(), finishedAt: null, logs: [], result: null, error: null };
  jobs.set(job.id, job);

  try {
    await fetchFromLangfuse(normalized);
    job.status = "completed";
    job.finishedAt = new Date().toISOString();
    job.result = buildCasePayload(normalized);
  } catch (err) {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.error = err.message || String(err);
    job.logs.push({ at: new Date().toISOString(), stream: "stderr", line: job.error });
  }
  return job;
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/* ═══════════════════════════════════════════════
   Multi-turn chat with Claude (multimodal)
   ═══════════════════════════════════════════════ */
const chatSessions = new Map();

function buildSystemPrompt(casePayload) {
  const tc = casePayload?.toolCalls || [];
  const failedCalls = tc.filter(c => c.failed);
  const assets = casePayload?.assets || [];
  const summary = casePayload?.analysis?.summary || {};

  const failedSummary = failedCalls.map(c => {
    const fa = c.failureAnalysis || {};
    return `- ${c.name} (${c.assetName || ""}) → ${fa.problemClassLabel || "未知"}: ${fa.errorLabel || c.status}\n  根因: ${(fa.rootCause || []).map(r => r.detail?.slice(0, 150)).join("; ")}\n  Skill建议: ${(fa.skillIssues || []).map(s => `${s.skill}: ${s.issue?.slice(0, 100)}`).join("; ")}`;
  }).join("\n");

  const assetSummary = assets.slice(0, 40).map(a => {
    const links = (a.mediaLinks || []).slice(0, 2).map(l => l.url).join(", ");
    return `- [${a.type}] ${a.name || a.tool} | ${a.provider || ""} ${a.model || ""} | ${a.ok === false ? "FAIL" : "OK"} ${links ? "| " + links : ""}`;
  }).join("\n");

  const toolChainOverview = tc.slice(0, 60).map(c =>
    `${c.pipelineStage}/${c.name} ${c.assetName || ""} ${c.failed ? "FAIL" : "OK"} ${c.startTime ? new Date(c.startTime).toLocaleTimeString("zh-CN") : ""}`
  ).join("\n");

  return `你是 Pexo Case 诊断专家。你在分析一个视频创作 Case 的工具调用链、素材和成品。

Case ID: ${casePayload?.caseId || "未知"}
统计: ${summary.traces || 0} traces, ${summary.toolCalls || 0} 工具调用, ${summary.assets || 0} 资产, ${failedCalls.length} 个失败

失败调用分析:
${failedSummary || "无失败调用"}

资产清单:
${assetSummary || "无资产"}

工具调用链概览:
${toolChainOverview || "无数据"}

Pexo 的 Skill 流水线为: brainstorm-skill → script-skill → subject-asset-skill → generation-skill → assembly-skill → modification-skill

你的职责：
1. 当用户选择了具体素材并描述问题时，分析该素材在工具链中的生成过程、上下游依赖、潜在的根因
2. 对于视觉问题（画面质量、人物一致性等），结合图片/视频内容分析
3. 给出具体的 Skill 层面分析和修改建议
4. 区分「工具调用问题」和「视频生成问题」和「基础设施问题」
5. 用中文回复，简洁专业`;
}

async function callClaude(messages, systemPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 未配置。请在 .env.local 中添加: ANTHROPIC_API_KEY=sk-ant-...");

  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.content?.map(c => c.text).join("") || "";
}

async function handleChat(req, res) {
  try {
    const body = await parseBody(req);
    const { sessionId, message, selectedAssets, caseId } = body;

    if (!message?.trim()) return sendJson(res, 400, { error: "message is required" });

    let session = chatSessions.get(sessionId);
    if (!session) {
      let casePayload = null;
      if (caseId) {
        try { casePayload = buildCasePayload(caseId); } catch {}
      }
      session = {
        id: sessionId || randomUUID(),
        caseId: caseId || null,
        systemPrompt: buildSystemPrompt(casePayload),
        messages: [],
        casePayload,
      };
      chatSessions.set(session.id, session);
    }

    const userContent = [];

    if (selectedAssets?.length) {
      let assetContext = "用户选择了以下素材进行分析:\n";
      for (const sa of selectedAssets) {
        assetContext += `\n【${sa.type || "素材"}】${sa.name || sa.tool}\n`;
        if (sa.provider) assetContext += `  Provider: ${sa.provider}, Model: ${sa.model || ""}\n`;
        if (sa.prompt) assetContext += `  Prompt: ${String(sa.prompt).slice(0, 500)}\n`;
        if (sa.ok === false) assetContext += `  状态: FAIL — ${sa.message || ""}\n`;
        if (sa.duration) assetContext += `  Duration: ${sa.duration}s\n`;

        const mediaLinks = sa.mediaLinks || [];
        for (const link of mediaLinks.slice(0, 2)) {
          if (link.kind === "image" && link.url) {
            userContent.push({
              type: "image",
              source: { type: "url", url: link.url },
            });
          }
        }
      }
      userContent.push({ type: "text", text: assetContext + "\n\n用户问题: " + message });
    } else {
      userContent.push({ type: "text", text: message });
    }

    session.messages.push({ role: "user", content: userContent });

    const reply = await callClaude(session.messages, session.systemPrompt);
    session.messages.push({ role: "assistant", content: reply });

    return sendJson(res, 200, {
      sessionId: session.id,
      reply,
      messageCount: session.messages.length,
    });
  } catch (e) {
    return sendJson(res, 500, { error: e.message || String(e) });
  }
}

/* ═══════════════ Exports ═══════════════ */

export {
  safeCaseId,
  findCaseDir,
  countTraces,
  buildCaseFlow,
  buildCasePayload,
  buildSkillsTree,
  buildSystemPrompt,
  callClaude,
  handleChat,
  chatSessions,
  parseBody,
  jobs,
};
