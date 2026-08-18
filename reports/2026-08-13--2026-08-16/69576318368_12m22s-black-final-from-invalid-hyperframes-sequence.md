# Case 69576318368: black-screen root-cause re-review

> Production case. Evidence source: Metabase `pg-server` database 3 plus locally downloaded project assets. Review time: 2026-08-13 Asia/Shanghai.

## Executive verdict

The linked GitHub report gets the high-level story partly right: the generated source clip was healthy, the first rendered final was black with audio, and final-delivery QA failed. Its claimed renderer mechanism and recovery description are not supported by the complete case record.

The direct cause was a read-but-violated HyperFrames HTML timing/sequence contract. The first composition put one `<video>` inside `data-hf-sequence`, gave the child `data-track-index="0"`, and omitted an explicit `data-start`. It rendered a 24.000 s output from a 12 s composition whose video pixels were constant black. The agent fixed the same dynamic video by removing the sequence wrapper, adding `data-start="0"`, and applying full-frame positioning directly to the video. The second render was 12.011 s and visibly animated.

Therefore:

- Confirmed direct cause: malformed Motion/HyperFrames DOM timing structure.
- Confirmed upstream contributor: unnecessary final HTML composition for a single generated clip with no overlays.
- Confirmed delivery escape: the agent checked only audio before first delivery and ignored the 24 s versus 12 s duration mismatch.
- Confirmed recovery failure: after the user reported the missing wolf, the agent first analyzed the source clip and contradicted the user instead of inspecting the exact delivered MP4.
- Not evidenced: CORS, signed-URL expiry, incompatible codec, media load events, or seek synchronization.
- False in the linked report: recovery did not replace the video with a static image.

## Case facts

| Field | Value |
|---|---|
| Project | `69576318368` / Moonlit Wolf Howl |
| Environment | Production |
| User request | Animated wolf on cliff, 9:16, about 12 s, clouds rolling in |
| Project window | 2026-08-13 09:54:21 to 10:06:43 +08:00 |
| Messages/events | 194 |
| Actual tool calls | 42 |
| Source video | 12.097 s container, 12.041667 s playable video, H.264/yuv420p/24 fps, AAC |
| First delivered final | asset `a_4V6PBjM`, 24.000 s, all frames black, audio present |
| Fixed final | asset `a_z1RDG1n`, 12.010667 s, wolf/moon/clouds visible and moving |

## Session overview

| Phase | Time +08:00 | What happened | Result |
|---|---:|---|---|
| Brief/style | 09:54:22-09:57:21 | User chose 9:16, 12 s; style frame generated and approved | Valid style anchor |
| Generation | 09:57:44-10:02:23 | One 12 s Seedance reference-to-video call with sound on | Healthy source clip |
| First composition | 10:02:30-10:03:32 | Motion HTML authored, rendered, audio-probed, delivered | 24 s black video with sound |
| Complaint | 10:04:31 | User: “the wolf isnt there just the sound” | Complaint was accurate |
| Wrong first response | 10:04:36-10:04:52 | Agent analyzed the source MP4, not delivered MP4, then blamed preview/device | Misdiagnosis |
| Repair | 10:05:09-10:06:39 | Agent inspected black delivered frame, fixed DOM structure, sampled frame, rerendered | 12 s animated final |

## Mandatory Audit A: complete tool call chain

| # | Time +08:00 | Tool | Key parameters / action | Result | Problem? |
|---:|---:|---|---|---|---|
| 1 | 09:54:26 | `read_file` | capability-discovery Skill | Complete | No |
| 2 | 09:55:38 | `read_file` | brainstorm Skill | Complete | No |
| 3-4 | 09:55:41 | `read_file` x2 | image guide; ideation principles | Complete | No |
| 5-6 | 09:55:44 | `read_file` x2 | brief contract; rhythm design | Complete | No |
| 7 | 09:55:49 | `write_todos` | Four-step plan | Success | No |
| 8 | 09:55:52 | `ls` | Project path | Success | No |
| 9 | 09:56:10 | `write_file` | Creative brief outside workspace | Success | Redundant |
| 10 | 09:56:12 | `ls` | Workspace path | Success | No |
| 11 | 09:56:20 | `write_file` | Duplicate creative brief in workspace | Success | Wasted duplicate |
| 12 | 09:56:24 | `write_todos` | Style frame in progress | Success | No |
| 13 | 09:56:32 | `image_generate` | Seedream, 9:16 style frame | Success | No |
| 14 | 09:56:46 | `add_attachments` | Style frame | Success | No |
| 15 | 09:57:24 | `write_todos` | Video in progress | Success | No |
| 16 | 09:57:27 | `read_file` | script Skill | Complete | Read but then bypassed |
| 17-18 | 09:57:30 | `read_file` x2 | routing; generation execution | Complete | No |
| 19 | 09:57:44 | `video_generate` | Seedance reference2video, 12 s, sound on, one image ref | Success, source MP4 | No |
| 20 | 10:02:27 | `write_todos` | Assembly in progress | Success | No |
| 21 | 10:02:30 | `read_file` | motion Skill | Complete | Later violated |
| 22-23 | 10:02:34 | `read_file` x2 | tech-html; visual styles | Complete | tech-html later violated |
| 24-25 | 10:02:38 | `read_file` x2 | AFC policy; data attrs | Complete | AFC policy later violated |
| 26 | 10:02:42 | `media_probe` | Source info | 12.041667 s playable | No |
| 27 | 10:02:55 | `write_file` | composition.html with one-child `data-hf-sequence` | Success write | **Causal invalid DOM** |
| 28 | 10:02:59 | `submit_render` | 24 fps portrait | Accepted | Missing pre-render frame check |
| 29 | 10:03:02 | `query_render` | job `a41gh73t` | Done | Render success only |
| 30 | 10:03:21 | `media_probe` | Final, audio mode | **24 s**, audio present | **Duration mismatch ignored** |
| 31 | 10:03:27 | `write_todos` | Mark all complete | Success | Premature |
| 32 | 10:03:30 | `show_final_video` | First final | asset `a_4V6PBjM` | **Black output delivered** |
| 33 | 10:04:36 | `analyze_file_content` | Source MP4, not delivered MP4 | Wolf visible | **Wrong artifact** |
| 34 | 10:05:09 | `analyze_file_content` | Delivered annotation frame | Pure black | Correct diagnosis finally |
| 35 | 10:05:19 | `read_file` | composition.html | Complete | No |
| 36 | 10:05:26 | `edit_file` | Remove sequence; add video `data-start=0` + direct positioning | Success | Correct repair |
| 37 | 10:05:29 | `render_frame` | 2.43 s | Frame produced | No |
| 38 | 10:05:36 | `analyze_file_content` | Fixed rendered frame | Wolf visible | No |
| 39 | 10:05:47 | `submit_render` | Fixed HTML | Accepted | No |
| 40-41 | 10:05:50 / 10:06:33 | `query_render` x2 | job `9obsx35x` | Running then done | No |
| 42 | 10:06:37 | `show_final_video` | Fixed final | asset `a_z1RDG1n` | Fixed, but no exact-final MP4 QC |

Summary:

- Total calls: 42.
- Generation calls: 2/2 succeeded.
- Render/edit calls: 7 relevant calls; both full render jobs completed, but only the second had a pre-render frame check.
- Wasted calls: 3. Duplicate brief write; wrong-artifact source analysis after complaint; first black full render/delivery.
- The first render's 24 s duration was itself a deterministic failure signal and should have blocked delivery.

## Mandatory Audit B: Skill and reference effectiveness

### Files actually read

| Order | File | Lines read | Complete? | Applied? | Evidence |
|---:|---|---:|---|---|---|
| 1 | capability-discovery-skill/SKILL.md | 55/55 | Yes | Yes | Capability response stayed qualitative |
| 2 | brainstorm-skill/SKILL.md | 227/227 | Yes | Partial | Brainstorm produced a reasonable brief, but later production ownership was bypassed |
| 3 | brainstorm image-generation-guide.md | 186/186 | Yes | Yes | Legal image call and prompt |
| 4 | brainstorm creative-ideation-principles.md | 112/112 | Yes | Yes | Brief coherent |
| 5 | brainstorm creative-brief-contract.md | 108/108 | Yes | Partial | Brief written twice; downstream artifact discipline weak |
| 6 | brainstorm creative-rhythm-design.md | 76/76 | Yes | Yes | 5/4/3 beat timing |
| 7 | script-skill/SKILL.md | 126/126 | Yes | **No** | Line 111 forbids production-tool bypass, but Script called generation |
| 8 | script video-models-routing.md | 197/197 | Yes | Yes | Legal 12 s Seedance route |
| 9 | script video-generation-execution.md | 358/358 | Yes | Yes | Source generation succeeded |
| 10 | motion-skill/SKILL.md | 135/135 | Yes | **No** | Step 8 required exact final MP4 subject/action verification |
| 11 | motion tech-html.md | 281/281 | Yes | **No** | It required pre-submit render_frame and defined sequence media contract |
| 12 | motion design-visual-styles.md | 40/40 | Yes | Yes | Legal style receipt |
| 13 | motion afc-multimodal-policy.md | 151/151 | Yes | **No** | Final revision was not visually checked before first delivery |
| 14 | motion tech-data-attributes.md | 119/119 | Yes | Partial | Legal attributes used, but structure was not validated |
| 15 | project composition.html | 43/43 | Yes | Yes | Used for repair diagnosis |

### Triggered but never read

| Tool/condition | Expected file from active trace | Read? | Impact |
|---|---|---|---|
| `<video data-has-audio>` in Motion | motion `references/design-audio-and-assembly.md` | No | Contributory; the first audio probe caught duration 24 s but no audio-truth gate blocked it |
| Any GSAP element animation | motion `references/design-motion.md` | No | Minor for black screen; fade logic was simple |
| Final render/delivery after complaint | modification-skill/SKILL.md | No | Contributory; wrong-artifact complaint triage |
| Script final handoff | script `references/script-handoff-contract.md` | No | Contributory; no `packaging_route` authority |
| Audio/SFX planning | script `references/audio-design-guide.md` | No | Not causal to black screen |

Coverage:

- File-level read coverage: 15 / 20 = 75%.
- Line-level coverage for opened files: 2,418 / 2,418 = 100%.
- Relevant application accuracy: 9 / 15 = 60%.
- Dominant pattern: **read-but-violated**, not missing documentation.

## Root cause

### P1: Motion HTML timing/sequence contract was read and violated

The first composition used:

```html
<div class="seq" data-hf-sequence>
  <video class="clip"
         data-track-index="0"
         data-duration="12"
         src="...mp4">
  </video>
</div>
```

The active `tech-html.md` said:

- `data-hf-sequence` owns child timing and lanes.
- Do not put `data-track-index` on ordinary sequence children.
- Direct sequence media must cover the composition spatially.
- Render 1-2 hero frames before the first `submit_render`.

The agent did not follow those gates. The output became 24 s, exactly double the intended duration, with constant black video frames. This makes a timeline preprocessing/DOM structure failure the strongest diagnosis.

The successful repair was:

```html
<video class="clip"
       data-track-index="0"
       data-start="0"
       data-duration="12"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
       src="...mp4">
</video>
```

No source URL, codec, audio, provider asset, or dynamic-video element was replaced.

### P1: Final-delivery QA inspected the wrong dimension

Before first delivery the agent ran `media_probe(mode=audio)` only. It reported 24 s, versus the locked 12 s target, but the agent marked the work complete and delivered it. No `render_frame` or exact-final MP4 visual analysis occurred until the user complained.

After complaint, the agent first analyzed the source generation and told the user the wolf was present. That was true of the source and irrelevant to the delivered artifact.

### P2: Single-clip direct output was not preserved

The generated MP4 already satisfied the requested 9:16, 12 s visual and audio result. There were no subtitles, overlays, multi-clip edits, or format changes. Re-rendering through HTML created risk without adding user value.

This is a valid upstream routing improvement, but it should be classified as a preventive contributor, not the direct black-screen root cause.

### P2: Workflow ownership was bypassed

The trace shows Script called `video_generate`, then Motion directly consumed the source with no formal Script/Generation/Assembly handoff. This removed the authoritative `packaging_route` and made “direct out versus HTML composition” an improvised Motion decision.

## Evidence against the linked report's speculative mechanisms

| Claim | Evidence verdict |
|---|---|
| Signed URL / CORS failure | Unsupported: the HTML used a local `/projects/.../workspace/assets/*.mp4` path |
| Incompatible codec | Contradicted: H.264 High, yuv420p, 24 fps; same source rendered after DOM-only edit |
| Seek/load race | Possible in the abstract, but no positive evidence; no readiness code changed |
| Static-image recovery | False: the repaired DOM retained the same `<video src>` |
| Single-clip direct out | Good prevention recommendation, not direct causal proof |
| Render `done` is insufficient | Confirmed |
| Final black-frame/motion gate needed | Confirmed |

## Recommended Phase B changes

### 1. P1, modify existing Motion rules

- Target: `pexo-skills/motion-skill/SKILL.md`, workflow steps 3, 7, 8.
- Change: require at least one `render_frame` before the first `submit_render` whenever a video picture surface exists; require exact final MP4 visual verification plus duration match before `show_final_video`.
- Why: current rules already say this, but the delivery gate did not enforce it. This should become a hard receipt, not prose.

### 2. P1, engineering requirement for render submit/lint

- Target: renderer/linter engineering, documented separately in `analysis/69576318368_hyperframes-render-contract-engineering-requirements.md`.
- Change: reject one-child/invalid sequence structures, conflicting sequence child lane ownership, uncovered picture surface, and rendered duration outside the declared root tolerance.
- Why: the root Skill and tech reference were read completely and still violated; product enforcement is required.
- Classification: new engineering gate, not a `tech-*` edit.

### 3. P2, modify direct-out routing contract

- Target: Script packaging route and Motion intake in `pexo-skills/script-skill/references/script-handoff-contract.md` and `pexo-skills/motion-skill/SKILL.md`.
- Change: when one final visual clip already matches aspect/duration/codec/audio and no overlays/mix/edit are required, emit/consume `route: direct_out`; do not author `composition.html`.
- Why: removes a non-value-adding failure surface.
- Classification: clarify/enforce an existing direct-out concept.

### 4. P2, modify complaint triage

- Target: `pexo-skills/modification-skill/references/complaint-triage-and-reverification.md`.
- Change: after a delivered-video complaint, inspect the exact delivered asset revision first. Source/intermediate analysis may follow only to localize the defect.
- Why: the agent contradicted a valid complaint by inspecting the wrong artifact.
- Classification: modification of existing verification logic.

No Skill or runtime file has been changed in this phase. User confirmation is required before Phase C.

