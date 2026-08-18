# Case 52414510932: Seedance 原生生成语音取消静音，与正式 VO 重叠

## Header

| Field | Value |
|---|---|
| Conversation ID | `52414510932` |
| Project | `Fitted Sheet Folding Animation` |
| User ID | `08118043385` |
| Thread | `thread_08118043385_52414510932_01KZR9JGZJD685RMCDFH6D5Z66` |
| Trace window | `2026-08-11 19:33:24` to `19:48:28` Asia/Shanghai |
| Requested video | 16:9, English, 20-25s paper-collage fitted-sheet explainer; off-screen warm VO + paper/stamp SFX + upbeat music |
| Delivered video | `fitted_sheet_fold_collage_R01.mp4`, 23.146667s, 1920x1080, H.264 + AAC |
| Iterations | 1 production pass, 1 render, no user revision |
| Metabase source | Production database 3; 283 message rows, 79 resolved tool calls, 23 project assets |
| Dashboard | `analysis/52414510932_dashboard.html` |

## Short Verdict

这不是选了两个 TTS voice。5 条正式 ElevenLabs VO 全部使用同一个 `voice_id=dCK3Zxor7cs21Fya12FS`，Script 也只规划了一个 narrator identity。

第二条人声来自 Seedance 生成视频自己的原生音轨：5 个视频调用全部使用 `sound:on`，5 个输出也全部实测包含 AAC。虽然 prompt 写了 `No human speech`，但 Agent 没有用 STT 或 combined AFC 验证实际音轨；本地分离原生音轨后，至少两段可清晰识别出生成语音：

- `seg04_step3`: `Shapes transform. Stories fold.`
- `seg05_recap`: `And that's how it's done.`

第一版 `composition.html` 原本将 5 个生成视频全部 `muted`，此时可听 narrator 只有正式 VO。第一次 lint 报的是“视频声明有音频但又 muted”的结构冲突，并给出两种修复方向。Agent 错选了“删除 muted”，一次性打开 5 段原生音轨。第二次 lint 随即明确报告 `v1:audio` 与 `vo1`、`v5` 与 `vo5` 同角色重叠；Agent 没有恢复静音，而是在 render 时 `acknowledged_findings: [MOTION_CONTRACT_COVERAGE_AUDIO_OVERLAP]` 后交付。

最终混音因此同时包含：Seedance 原生生成语音、正式 ElevenLabs narrator VO、BGM。最终回复又把 native audio 描述成 `Collage SFX`，但没有验证其中是否只有 SFX。

## Session Overview

| Thread | Time | User input | Agent action | Outcome |
|---|---|---|---|---|
| `...D6D5Z66` | 19:33:24-19:48:28 +08 | 制作 20-25 秒纸张拼贴床单折叠教程，要求 calm VO、纸张/印章 SFX、upbeat music | 读取 20 个 Skill/reference 文件；写 Script Handoff；生成 5 条 TTS、1 张风格图、5 个 sound-on 视频、BGM；用 HTML 合成并做静帧 QA；确认 audio-overlap warning 后渲染 | 23.146667 秒成片交付，但原生生成语音与正式 VO 同时可听 |

## Audio Ownership Chain

| Stage | Evidence | Audio ownership effect |
|---|---|---|
| Script | `VID_narrator`, 5 个 `post_vo` speech labels | 正式规划只有一个 narrator |
| Formal TTS | #30-34 全部 voice `dCK3Zxor7cs21Fya12FS` | 5 个文件、同一音色、分别对应 5 句 |
| Video generation | #38-42 全部 `sound:on` | 每段视频都可能成为 native audio owner |
| Media probe | #44-48 每段都有 `audio:aac` | 已知 5 段不是 silent video |
| Generation QA | #49-53 只问视觉，没有检查音频 | `No human speech` prompt 没有转化为输出证据 |
| Initial HTML | #57 五个 `<video muted data-has-audio="true">` + 五个独立 `<audio>` VO | 听感上仍只有正式 narrator，但声明存在冲突 |
| Wrong lint repair | #59 删除五个 `muted` | 生成视频 native audio 变为可听，第二条人声正式进入 mix |
| Explicit warning | #62 报 `v1:audio`/`vo1` 2.960s overlap，并列出 `v5`/`vo5` | 重复 owner 已被工具明确发现 |
| Render | #75 acknowledge `MOTION_CONTRACT_COVERAGE_AUDIO_OVERLAP` | 告警被当作可接受 mix 放行 |
| Delivery | #77-79 无 final audio probe/STT/combined AFC | 双人声未被最终成片 QA 拦截 |

## Local Speech Evidence

| Asset | Streams | Local STT result | Confidence use |
|---|---|---|---|
| `seg01_hook.mp4` | H.264 + AAC | `Banone pour le Temos...` | 存在 speech-like 输出，具体文本不作为精确事实 |
| `seg02_step1.mp4` | H.264 + AAC | 长段重复 `I'm going to make...` | 存在 speech-like 输出，具体文本不作为精确事实 |
| `seg03_step2.mp4` | H.264 + AAC | `and she constricts...` | 存在 speech-like 输出，具体文本不作为精确事实 |
| `seg04_step3.mp4` | H.264 + AAC | `Shapes transform. Stories fold.` | 清晰证明生成片包含人声 |
| `seg05_recap.mp4` | H.264 + AAC | `And that's how it's done.` | 清晰证明生成片包含人声 |
| Final MP4 | H.264 + AAC | 正式 VO 可识别；混音结果受叠加影响 | 证明最终有音轨，不单独用于分离 owner |

## Complete Tool Call Chain

Total tool calls: **79**.

Generation calls: **12/12 succeeded (100%)**: 5 `audio_produce`, 5 `video_generate`, 1 `image_generate`, 1 `music_generate`.

Edit calls: **3/3 succeeded (100%)**. Render calls: **1/1 submit succeeded**, with 2 render queries.

Wasted retry calls: **0**. No repeated generation retry occurred. However, **10 calls produced evidence that did not reach the audio decision**: 5 probes proved AAC existed (#44-48), while 5 visual-only analyses (#49-53) ignored that audio and supplied no speech verdict.

| # | Time UTC | Tool | Key Parameters | Result | Problem? |
|---:|---|---|---|---|---|
| 1 | 11:33:28 | `write_todos` | Read/plan/generate/audio/render task list | Success | - |
| 2 | 11:33:31 | `read_file` | `script-skill/SKILL.md` | 1-126, complete | **Read-but-violated: measured VO/handoff gate** |
| 3 | 11:33:31 | `read_file` | `brainstorm-skill/SKILL.md` | 1-227, complete | - |
| 4 | 11:33:34 | `read_file` | `creative-ideation-principles.md` | 1-112, complete | - |
| 5 | 11:33:34 | `read_file` | `creative-rhythm-design.md` | 1-76, complete | - |
| 6 | 11:33:37 | `read_file` | `creative-brief-contract.md` | 1-108, complete | - |
| 7 | 11:33:37 | `read_file` | Brainstorm `image-generation-guide.md` | 1-186, complete | - |
| 8 | 11:33:40 | `read_file` | Script `voice-strategy-execution.md` | 1-112, complete | - |
| 9 | 11:33:40 | `read_file` | Script `video-models-routing.md` | 1-197, complete | - |
| 10 | 11:33:44 | `read_file` | `generation-skill/SKILL.md` | 1-98, complete | **Blocking refs and Generation Handoff skipped** |
| 11 | 11:33:44 | `read_file` | `assembly-skill/SKILL.md` | 1-96, complete | **P1: STT/single-owner rule read then bypassed** |
| 12 | 11:33:47 | `read_file` | `motion-skill/SKILL.md` | 1-135, complete | **Final-audio probe gate violated** |
| 13 | 11:33:47 | `read_file` | `generation-blueprint-design.md` | 1-91, complete | Partial application |
| 14 | 11:33:50 | `read_file` | `generation-execution-rules.md` | 1-101, complete | Partial application |
| 15 | 11:33:50 | `read_file` | `design-visual-styles.md` | 1-41, complete | Applied |
| 16 | 11:33:54 | `read_file` | `design-beat-planning.md` | 1-117, complete | Partial application |
| 17 | 11:33:54 | `read_file` | `tech-html.md`, requested limit 120 | Returned 1-281, complete | Structural rules applied |
| 18 | 11:33:57 | `read_file` | `design-motion.md` | 1-82, complete | Partial application |
| 19 | 11:33:57 | `read_file` | `tech-html.md`, offset 120/limit 60 | Returned 1-281 again | Redundant read output, no causal impact |
| 20 | 11:34:01 | `read_file` | `design-transitions.md` | 1-151, complete | Applied: hard cuts |
| 21 | 11:34:01 | `read_file` | `design-house-style.md`, requested limit 100 | Returned 1-336, complete | Applied to visual QC only |
| 22 | 11:34:39 | `write_todos` | Script handoff -> VO -> style -> video -> render | Success | - |
| 23 | 11:34:42 | `ls` | `/projects` | Success | - |
| 24 | 11:34:44 | `ls` | `/projects/52414510932` | Success | - |
| 25 | 11:35:59 | `write_file` | `fitted-sheet-fold__script_handoff__locked__R01.md`, 14,107 chars | Success | - |
| 26 | 11:36:02 | `read_file` | Script Handoff | 1-200 of 357, truncated | **Incomplete artifact read, never continued** |
| 27 | 11:36:08 | `write_todos` | Mark Script complete; start voice | Success | Completion declared despite #26 |
| 28 | 11:36:11 | `read_file` | `voice-production-and-resolution.md` | 1-172, complete | **Read-but-violated: no duplicated embedded speech** |
| 29 | 11:36:17 | `voice_search` | English female, warm/confident/brisk, US preferred | Success | - |
| 30 | 11:37:29 | `audio_produce` | `VO_L3_step2`, voice `dCK3...12FS` | Success | - |
| 31 | 11:37:29 | `audio_produce` | `VO_L2_step1`, same voice | Success | - |
| 32 | 11:37:29 | `audio_produce` | `VO_L1_hook`, same voice | Success | - |
| 33 | 11:37:29 | `audio_produce` | `VO_L4_step3`, same voice | Success | - |
| 34 | 11:37:29 | `audio_produce` | `VO_L5_cta`, same voice | Success | - |
| 35 | 11:37:45 | `write_todos` | VO complete; style frame in progress | Success | - |
| 36 | 11:37:54 | `image_generate` | `collage_style_ref_main`, Seedream 4.5 | Success | - |
| 37 | 11:38:09 | `add_attachments` | Style reference | Success | - |
| 38 | 11:38:38 | `video_generate` | `seg01_hook`, Seedance, 4s, `sound:on`, prompt says no speech | Success | **Prompt intent was not output proof** |
| 39 | 11:38:38 | `video_generate` | `seg03_step2`, 6s, `sound:on`, no-speech prompt | Success | **Native audio owner candidate** |
| 40 | 11:38:38 | `video_generate` | `seg05_recap`, 4s, `sound:on`, no-speech prompt | Success | **Native speech entered asset** |
| 41 | 11:38:38 | `video_generate` | `seg04_step3`, 5s, `sound:on`, no-speech prompt | Success | **STT later proves native speech** |
| 42 | 11:38:38 | `video_generate` | `seg02_step1`, 5s, `sound:on`, no-speech prompt | Success | **Native audio owner candidate** |
| 43 | 11:43:27 | `write_todos` | Generated videos complete; probe/QA in progress | Success | - |
| 44 | 11:43:31 | `media_probe` | `seg04_step3.mp4` | H.264 + AAC | **AAC known; no STT/combined QA** |
| 45 | 11:43:31 | `media_probe` | `seg01_hook.mp4` | H.264 + AAC | **AAC known; no STT/combined QA** |
| 46 | 11:43:31 | `media_probe` | `seg05_recap.mp4` | H.264 + AAC | **AAC + native speech later confirmed** |
| 47 | 11:43:31 | `media_probe` | `seg03_step2.mp4` | H.264 + AAC | **AAC known; no STT/combined QA** |
| 48 | 11:43:31 | `media_probe` | `seg02_step1.mp4` | H.264 + AAC | **AAC known; no STT/combined QA** |
| 49 | 11:43:49 | `analyze_file_content` | `seg03`, visual collage/motion/text query | Visual pass | **Visual-only AFC ignored native audio** |
| 50 | 11:43:49 | `analyze_file_content` | `seg01`, visual collage/motion/text query | Visual pass | **Visual-only AFC ignored native audio** |
| 51 | 11:43:49 | `analyze_file_content` | `seg04`, visual collage/motion/text query | Visual pass | **Visual-only AFC ignored native audio** |
| 52 | 11:43:49 | `analyze_file_content` | `seg05`, visual collage/motion/text query | Visual pass | **Visual-only AFC ignored native audio** |
| 53 | 11:43:49 | `analyze_file_content` | `seg02`, visual collage/motion/text query | Visual pass | **Visual-only AFC ignored native audio** |
| 54 | 11:44:10 | `write_todos` | Audio/visual assets complete; BGM/assembly | Success | - |
| 55 | 11:44:17 | `music_generate` | `BGM_collage_upbeat`, 30s instrumental | Success | - |
| 56 | 11:44:28 | `list_fonts` | Font catalog | Success | - |
| 57 | 11:45:34 | `write_file` | `composition.html`; all 5 videos `muted`; 5 VO audio elements | Success | **Initially preserved one audible narrator owner** |
| 58 | 11:45:37 | `lint_composition` | 30fps | 1 error, 1 question | **Silent-video repair option available** |
| 59 | 11:45:52 | `edit_file` | Remove `muted` from all five videos | Success | **P1: direct double-VO introduction point** |
| 60 | 11:45:56 | `edit_file` | Shift VO3 start 9.30 -> 9.35 | Success | - |
| 61 | 11:46:01 | `edit_file` | Replace visual-map annotation | Success | - |
| 62 | 11:46:04 | `lint_composition` | 30fps | 0 errors, 1 question | **P1: explicit native-video/VO overlap warning** |
| 63 | 11:46:13 | `render_frame` | `qc_t2_title`, 2s | Success | Static visual only |
| 64 | 11:46:13 | `render_frame` | `qc_t5_step1`, 5.5s | Success | Static visual only |
| 65 | 11:46:13 | `render_frame` | `qc_t21_cta`, 21.5s | Success | Static visual only |
| 66 | 11:46:13 | `render_frame` | `qc_t11_step2`, 11.5s | Success | Static visual only |
| 67 | 11:46:13 | `render_frame` | `qc_t17_step3`, 17.5s | Success | Static visual only |
| 68 | 11:46:32 | `analyze_file_content` | Title readability/edge/contrast | Pass | No audio coverage |
| 69 | 11:46:32 | `analyze_file_content` | Step 3 label/caption | Pass | No audio coverage |
| 70 | 11:46:32 | `analyze_file_content` | Step 1 label/caption | Pass | No audio coverage |
| 71 | 11:46:32 | `analyze_file_content` | CTA position/readability | Pass | No audio coverage |
| 72 | 11:46:32 | `analyze_file_content` | Step 2 label/caption | Pass | No audio coverage |
| 73 | 11:46:50 | `add_attachments` | Five QC frames | Success | - |
| 74 | 11:46:56 | `write_todos` | Visual QA complete; render in progress | Success | Audio overlap unresolved |
| 75 | 11:47:00 | `submit_render` | High, landscape; acknowledge audio overlap | Pending | **P1: known same-role overlap accepted** |
| 76 | 11:47:05 | `query_render` | Job `8vwax54m` | Running | - |
| 77 | 11:48:07 | `query_render` | Same job | Done | **No post-render audio/STT verification** |
| 78 | 11:48:13 | `write_todos` | All tasks completed | Success | Marked complete before final audio QA |
| 79 | 11:48:16 | `show_final_video` | `fitted_sheet_fold_collage_R01.mp4` | Asset `a_RuYtZ1m` | **P1: duplicate speech delivered** |

## Skill & Reference Read Audit

### Files Actually Read

The table lists every Skill/reference read call. The separate project Script Handoff read is included because its truncation affected the stage gate.

| Order | File | Lines Read | Total | Complete? | Applied Correctly? | Notes |
|---:|---|---:|---:|---|---|---|
| 2 | `script-skill/SKILL.md` | 1-126 | 126 | Yes | No | Measured-VO and validated handoff gates were not enforced |
| 3 | `brainstorm-skill/SKILL.md` | 1-227 | 227 | Yes | Yes | Coherent brief recognized |
| 4 | `creative-ideation-principles.md` | 1-112 | 112 | Yes | Yes | Creative direction retained |
| 5 | `creative-rhythm-design.md` | 1-76 | 76 | Yes | Yes | Five-beat rhythm retained |
| 6 | `creative-brief-contract.md` | 1-108 | 108 | Yes | N/A | Brainstorm was effectively skipped; no brief lock needed |
| 7 | Brainstorm `image-generation-guide.md` | 1-186 | 186 | Yes | Yes | Style frame route was legal |
| 8 | Script `voice-strategy-execution.md` | 1-112 | 112 | Yes | Partial | One voice identity was preserved; execution ownership later drifted |
| 9 | Script `video-models-routing.md` | 1-197 | 197 | Yes | Yes | Seedance payload shape was legal |
| 10 | `generation-skill/SKILL.md` | 1-98 | 98 | Yes | No | Blocking references and Generation Handoff skipped |
| 11 | `assembly-skill/SKILL.md` | 1-96 | 96 | Yes | No | Explicit STT/single-owner rules bypassed |
| 12 | `motion-skill/SKILL.md` | 1-135 | 135 | Yes | No | Mandatory references and final audio probe skipped |
| 13 | `generation-blueprint-design.md` | 1-91 | 91 | Yes | Partial | Visual beat split applied; audio ownership not closed |
| 14 | `generation-execution-rules.md` | 1-101 | 101 | Yes | Partial | Video probes done; combined AFC/handoff not done |
| 15 | `design-visual-styles.md` | 1-41 | 41 | Yes | Yes | Collage style applied |
| 16 | `design-beat-planning.md` | 1-117 | 117 | Yes | Partial | Five beats authored; formal receipt incomplete |
| 17 | `tech-html.md` | 1-281 | 281 | Yes | Partial | Structural lint used; audio-owner repair was wrong |
| 18 | `design-motion.md` | 1-82 | 82 | Yes | Partial | Motion rules used |
| 19 | `tech-html.md` | 1-281 | 281 | Yes | Partial | Duplicate full output despite requested offset |
| 20 | `design-transitions.md` | 1-151 | 151 | Yes | Yes | Hard cuts applied |
| 21 | `design-house-style.md` | 1-336 | 336 | Yes | Yes | Static visual QC applied; audio outside scope |
| 26 | Project Script Handoff | 1-200 | 357 | **No** | No | Explicit truncation notice; never continued |
| 28 | `voice-production-and-resolution.md` | 1-172 | 172 | Yes | **No** | Explicit final-integrity rule forbids separate VO duplicating embedded speech |

### Triggered But Never Read

Expected references are derived from the active case-time Skill text captured in this trace, not from current local Skill names alone.

| Tool / Stage Used | Triggering Skill | Expected Reference | Read? | Impact |
|---|---|---|---|---|
| Script Handoff | Script | `script-handoff-contract.md` | No | Explicit always-read gate; incomplete handoff validation |
| Video/audio planning | Script | `video-generation-execution.md` | No | Prompt audio ownership and SFX/post-VO separation not audited |
| VO+BGM+SFX | Script | `audio-design-guide.md` | No | Mix ownership not carried downstream |
| Title/labels/CTA | Script | `deterministic-visual-payload-guide.md` | No | Contributory process miss |
| Generated output QA | Generation | `afc-multimodal-policy.md` | No | **Causal: sound-on clips received visual-only QA** |
| Generation start | Generation | `generation-preflight-gates.md` | No | Generation began after truncated upstream artifact read |
| Seedance route | Generation | Generation-local `video-models-routing.md` | No | Script-local copy was read instead |
| Post VO + native audio | Generation | `generation-voice-strategy-execution.md` | No | **Causal: no final speech-owner decision** |
| Sound-on video | Generation | `video-generation-execution.md` | No | **Causal: `sound:on` lineage not resolved** |
| Generation completion | Generation | `generation-handoff-contract.md` | No | No selected-revision audio lineage reached Assembly |
| Audio truth | Assembly | `design-audio-and-assembly.md` | No | **Causal: no STT/evidence/native policy ledger** |
| Assembly completion | Assembly | `assembly-handoff-contract.md` | No | Assembly stage was bypassed |
| Motion mandatory read | Motion | `afc-multimodal-policy.md` | No | No final-revision combined evidence |
| Motion mandatory read | Motion | `tech-data-attributes.md` | No | Audio declarations were repaired without authoritative attribute contract |
| VO/subtitle | Motion | `design-captions.md` | No | Contributory |
| Readable text | Motion | `design-typography.md` | No | Not causal to double VO |
| Audio DOM | Motion | `design-audio-and-assembly.md` | No | **Causal: HTML owner/mix verification skipped** |

### Coverage Scores

- Case-relevant expected set: 27 Skill/reference items
- Opened expected items: 10
- **File-level read coverage: 10 / 27 = 37.0%**
- Skill/reference unique-file line coverage: **2845 / 2845 = 100%**
- Upstream project artifact coverage: **200 / 357 = 56.0%**, incomplete
- Strict application accuracy for the 10 opened case-relevant expected items: **3 / 10 = 30.0%**
- Late reads: 0
- Incomplete reads: Script Handoff #26
- Read-but-violated: Script root, Generation root, Assembly root, Motion root, `voice-production-and-resolution.md`
- Causal skipped references: Generation combined AFC/voice/video/handoff; Assembly audio/handoff; Motion audio/AFC/data attributes

## Root Cause And Attribution

### What happened

`sound:on` made every Seedance clip a native-audio candidate. The actual outputs contained generated speech despite negative prompt wording. The agent did not inspect that speech, then deliberately made native audio audible and knowingly accepted the overlap warning.

### Why the prompt did not protect the result

`No human speech` is a generation request, not a media fact. Provider outputs can violate negative prompts. The agent already had decisive signals that an audio decision was required: `sound:on`, an AAC stream in every output, separate post VO, and a same-role overlap lint finding.

### Primary attribution

| Layer | Conclusion |
|---|---|
| Agent execution | **Primary**. Selected the wrong lint repair, bypassed Assembly ownership, ignored an explicit overlap warning, and skipped final audio QA |
| Skill compliance | **Primary contributory**. Rules were both skipped and read-but-violated; Assembly and voice reference already contained the exact prevention rule |
| Runtime/lint | **Contributory product gap**. It detected the overlap but allowed a broad acknowledgement instead of requiring evidence of distinct non-speech ownership |
| Seedance provider | **Trigger, not root cause**. It emitted speech despite prompt wording, but production rules explicitly require verifying actual media rather than trusting the prompt |
| Data quality | Complete. Metabase, assets, local media, probes, lint results, and local STT close the chain without Langfuse fallback |

## Problem List

1. **P1 - Duplicate speech reached the final mix.** Generated-video embedded speech and independent narrator VO were simultaneously audible.
2. **P1 - Explicit audio-overlap warning was knowingly bypassed.** The finding identified the exact video/VO pairs but remained acknowledgeable.
3. **P2 - Sound-on outputs were visually inspected only.** AAC was known, but no STT or combined AFC established whether it was SFX, music, ambience, or speech.
4. **P2 - Final render had no audio-integrity verification.** No final MP4 audio probe, STT, combined AFC, or speech-owner check occurred.
5. **P2 - Delivery copy misclassified unverified native audio as SFX.** This presented an unverified failure as intended sound design.

## Phase B Fix Proposal - Awaiting Confirmation

### 1. Harden the existing sound-on + post-VO ownership gate

- Target: `generation-skill/references/generation-execution-rules.md`, `assembly-skill/SKILL.md`, `assembly-skill/references/design-audio-and-assembly.md`
- Change: require a receipt for every selected `sound:on` clip overlapping post VO: actual stream probe, STT or combined AFC, `native_audio_policy`, and one declared final owner. Missing receipt blocks Generation Handoff/Assembly Handoff.
- Type: **modify/harden existing rules**, not a new speech principle.
- Why: current prose already says this; the missing part is a required evidence object at the handoff boundary.

### 2. Add a deterministic silent-video repair ladder in Motion guidance

- Target: `motion-skill/references/design-audio-and-assembly.md`
- Change: when an external VO owns speech, `VIDEO_MUTED_WITH_DECLARED_AUDIO` must be repaired by preserving silence/removing native-audio ownership, never by unmuting, unless upstream evidence proves the native track is separately owned non-speech audio.
- Type: **clarify an existing audio-ownership rule**.
- Why: #58 exposed two syntactically valid repairs; only one was semantically valid for this case.

### 3. Make generated-video audio + same-role VO overlap non-bypassable

- Target: new engineering requirement under `analysis/`; implementation belongs to runtime/lint engineering, not direct edits to `tech-*` references.
- Change: upgrade same-role `<video data-has-audio>` + separate VO overlap from acknowledgeable question to error unless an upstream ownership receipt proves distinct non-speech windows/roles. Free-form acknowledgement must not satisfy the error.
- Type: **new engineering capability**.
- Why: this case demonstrates that a correct lint diagnostic still fails if the submit path can waive it without evidence.

### 4. Require final rendered-audio integrity before delivery

- Target: `motion-skill/SKILL.md`, `motion-skill/references/design-audio-and-assembly.md`
- Change: final MP4 must receive audio probe plus combined/STT verification whenever selected source clips were `sound:on` and separate speech exists; verify each intended line is audible exactly once.
- Type: **harden existing final-audio gate**.
- Why: static frames and an AAC stream cannot prove speech ownership.

### 5. Bind user-facing audio descriptions to evidence

- Target: `motion-skill/SKILL.md` final delivery section
- Change: do not describe native audio as `SFX`, `ambience`, `dialogue`, or `music` unless an audio inspection receipt supports that role.
- Type: **modify existing delivery truthfulness rule**.
- Why: `Collage SFX` incorrectly converted an unverified native track into an intended design claim.

This analysis does not modify or publish any production Skill or runtime file. Phase C should begin only after the proposal is confirmed.
