# Case 56378623746: 指定 pt-BR 后成片出现不可识别语音

## 基本信息

| 项目 | 事实 |
|---|---|
| Case / project | `56378623746` / Patrocínio com Propósito |
| User | `55094045330` |
| 数据源 | production `pg-server`，Metabase database 3 |
| 时间窗口 | 2026-08-16 22:36:43 至 2026-08-17 01:15:23（Asia/Shanghai） |
| 会话时长 | 约 2h39m |
| 用户要求 | 全部对白使用巴西葡萄牙语（pt-BR），严格按给定教育脚本 |
| 交付状态 | `patroc_com_proposito_final.mp4`、v2、v3 均曾渲染；v3 复核仍有 00:41-00:48 不可识别片段，之后因 credits.insufficient_credits_err 中止 |
| 证据包 | [case data](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/) |
| 完整调用表 | [tool-chain.md](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/tool-chain.md) |
| 业务看板 | [language dashboard](/Users/wellswu/pexo-skills/analysis/56378623746_language_dashboard.html) |

## 结论摘要

用户听到“俄语”并非语言选择参数写成了俄语。调用链显示：

1. 原始用户 prompt 明确写了 `em português brasileiro`，并在后续两次投诉中再次要求 `português do Brasil`。
2. `voice_search` 使用 Brazilian Portuguese 查询；全部正式 `audio_produce` 请求使用 `language_code: "pt"`。原始 TTS 资产抽查为巴西葡萄牙语。
3. 问题出现在 `video_generate` 之后：部分 Seedance 带口型同步的输出把正确的 Portuguese speech 变成不可识别的音频。最终复核确认这不是可接受的俄语，而是无法识别/疑似损坏的语音。
4. 交付前只做了字幕、画面和音频流存在性检查，没有逐片段做“语言 + 可识别度 + 目标台词”验收，因此错误音频进入了 composition。
5. 用户投诉后 Agent 先只抽听开头便断言“全片是 pt-BR”，随后修复了 `clip_mentor_f6`、`clip_mentor_f3a`、`clip_mentor_f3b`，但 v3 仍有一段不可识别语音；最后对 `clip_mentor_f2b` 的复核因额度不足失败，没有形成可交付的修正版。

根因归属：**P1 生成后音频完整性/语言验收缺口**，**P1 Agent 在首轮投诉后的过早结论和不完整修复**，以及 **P2 音频依赖与重试成本控制缺口**。不是“pt-BR 参数没有传递”这一单一问题。

## 会话时间线

| 阶段 | 时间 | 用户意图 | Agent 动作 | 结果 |
|---|---|---|---|---|
| 初始请求 | 22:36 | 90-120 秒教育动画，全部 pt-BR | 读取脚本，搜索两名巴西葡萄牙语候选音色 | 语言意图明确进入脚本 |
| TTS 生成 | 22:38-22:41 | 生成 Bia/Mentor 对白 | 13 次 `audio_produce`；12 次成功，1 次因并发 voice addition 失败后重试成功 | MP3 和字幕资产生成；请求均为 `language_code: pt` |
| 视频生成 | 22:43-00:46 | 对白口型同步 | 58 次 `video_generate`，Seedance `reference2video` + `audio_list` | 18 completed、2 failed、38 pending_confirmation；部分视频音频被破坏 |
| 首轮交付 | 00:58 | 完整视频 | 只抽查字幕/可见性和最终音频流 | 交付 `final.mp4`，没有做全片语言/可识别度门禁 |
| 用户投诉 | 01:03-01:04 | 指出第 5 段以后像俄语，要求重做 pt-BR | Agent 先基于开头两句断言“全片 pt-BR”，要求用户定位时间 | 错过了已有的全片音频验收义务 |
| 第一次定位 | 01:05-01:06 | 用户说“从第五个开始” | 全片扫描发现 00:55-01:16、02:03-02:09 不可识别；先定位到 `f6`，替换其音频并重渲染 v2 | `f6` 修复，但其他异常未闭环 |
| 第二次定位 | 01:10-01:12 | 继续确认第 5 段以后 | 发现 `f3a` 全段、`f3b` 后半段异常；替换两片音频并调整 composition duration/start | v3 渲染成功，但 lint 仍需确认两个 audio/visual gap |
| 最终复核 | 01:14-01:15 | 检查 v3 全片 | v3 仍报告 00:41-00:48 不可识别；尝试检查 `f2b` | `analyze_file_content` 因 `credits.insufficient_credits_err` 失败，未完成最终修复/交付 |

## Tool Call Chain Audit

完整的 276 条按时间排序调用见 [tool-chain.md](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/tool-chain.md)。与本问题直接相关的调用如下：

| # / 时间 | 工具 | 关键参数 | 结果 | 问题？ |
|---|---|---|---|---|
| 16-17 / 22:38 | `voice_search` | `Brazilian Portuguese female/male` | 两次均 completed | 否，语言候选方向正确 |
| 22-34 / 22:40-22:41 | `audio_produce` | `model=eleven_v3`, `language_code=pt`, Bia/Mentor 各句 | 13 次：12 成功、1 并发失败后重试 | ⚠️ 生成前未读取 Generation 的 voice-production 参考 |
| 35-36 / 22:41 | `media_probe` | 两个 TTS MP3，`mode=audio` | 流、时长、响度正常 | ⚠️ 只证明音频可播放，不证明语言/台词可识别 |
| 44-45 / 22:43 | `video_generate` | `audio_list` + 角色图，`sound=on` | pending_confirmation | ⚠️ 依赖音频的生成计划在完整 Generation read-gate 前已启动 |
| 71 / 23:16 | `video_generate` | `clip_bia_f1`, Portuguese audio | completed | 后续视觉 QA 只问画面，不问语言 |
| 113-114 / 00:23 | `video_generate` | `clip_mentor_f2a/f2b`, `mentor_f2_parte1/2.mp3` | completed | `f2b` 未在最终交付前完成音频识别验收 |
| 117 / 00:32 | `video_generate` | `clip_mentor_f2a_v2`, `mentor_f2_parte1.mp3` | completed | 原始 MP3 正确，但视频输出音频后来被判定不可识别 |
| 134-141 / 00:45 | `analyze_file_content` | 7 个视频，`scope=visual` | completed | ⚠️ 完全没有检查音频语言/台词 |
| 149-163 / 00:51 | `media_probe` | 14 个视频，`mode=info` | completed | ⚠️ 有 AAC 流不等于流内容正确 |
| 164 / 00:57 | `media_probe` | `final.mp4`, `mode=audio` | completed | ⚠️ 仍没有语言识别或转写 |
| 167 / 01:03 | `analyze_file_content` | `final.mp4`, 只听开头 | 结论：开头是 pt-BR，但承认有不可识别片段 | ⚠️ Agent 用局部证据断言全片正确 |
| 169 / 01:04 | `analyze_file_content` | `final.mp4`, 48 秒到结尾 | 明确发现 00:55-01:16、02:03-02:09 不可识别 | 证实用户投诉，不能交付 |
| 171-174 / 01:05 | `analyze_file_content` | `f6` 视频、`mentor_f2_parte1`、`mentor_fala_6` MP3 | 视频不可识别；两份 MP3 为 pt-BR | **P1：证明损坏发生在视频生成输出，不是 TTS 输入** |
| 176 / 01:06 | `media_process` | `replace_audio(f6, mentor_fala_6.mp3)` | completed | 局部补救，未先建立全片异常片段清单 |
| 192 / 01:09 | `analyze_file_content` | `v2`, 48 秒到结尾 | `f3a` 区间约 90% 不可识别 | 第二个损坏片段被发现 |
| 194-196 / 01:10 | `analyze_file_content` | `f2a_v2`, `f3a`, `f4` 等逐片段 | `f3a` 全段不可识别，`f3b` 部分不可识别 | 发现后才开始局部替换 |
| 197-198 / 01:11 | `media_process` | `replace_audio(f3a/f3b, mentor_f3_parte1/2.mp3)` | completed | v3 使用修复后的两个片段 |
| 211 / 01:14 | `analyze_file_content` | `v3`, 全片扫描 | 仍有 00:41-00:48 不可识别 | **P1：最终输出仍不合格** |
| 213 / 01:15 | `analyze_file_content` | `clip_mentor_f2b` | `credits.insufficient_credits_err` | 修复链被额度错误中止，无最终交付 |

### 统计与浪费调用

| 指标 | 数量 |
|---|---:|
| 总工具调用 | 276 |
| `video_generate` | 58：18 completed、2 failed、38 pending_confirmation |
| `audio_produce` | 13：12 completed、1 failed 后重试 |
| `analyze_file_content` | 37；交付前与首轮 QA 以 visual 为主，缺少逐片段 audio gate |
| `media_probe` / `media_process` | 22 / 8 |
| 直接相关失败 | 2 个 Seedance 参数失败；3 个已定位视频片段音频损坏；最终 `f2b` 复核因额度不足失败 |
| 浪费/无效调用 | 至少 38 个 pending_confirmation、重复的 Mentor/Bia 片段调用，以及在未完成全片诊断前的局部修复 |

## 音频证据闭环

| 资产 | 独立音频结果 | 对应视频结果 |
|---|---|---|
| [`mentor_f2_parte1.mp3`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/mentor_f2_parte1.mp3) | 明确识别为 pt-BR，转写从“Deve falar da comunidade...”开始 | [`clip_mentor_f2a_v2`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_sPs2DUC_clip_mentor_f2a_v2_20260816T163559_59165889_preview.mp4) 后续区间被判定不可识别 |
| [`mentor_fala_6...mp3`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/mentor_fala_6_20260816T144133_9a6059a3.mp3) | 明确识别为 pt-BR：“É isso...” | 原始 [`clip_mentor_f6`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_axKgbtL_clip_mentor_f6_20260816T164359_15040cec_preview.mp4) 被判定为非葡萄牙语、非俄语、不可识别；替换音频后的 [`f6_fixed`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_vAL66PH_clip_mentor_f6_fixed_preview.mp4) 已修复 |
| [`mentor_f3_parte1.mp3`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/mentor_f3_parte1.mp3) | TTS 资产由 `audio_produce` 成功返回 | 原始 [`clip_mentor_f3a`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_6enz2DH_clip_mentor_f3a_20260816T165000_6217ab15_preview.mp4) 全段不可识别；[`f3a_fixed`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_27tpcSe_clip_mentor_f3a_fixed_preview.mp4) 仅做了波形替换 |
| [`mentor_f3_parte2.mp3`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/mentor_f3_parte2.mp3) | TTS 资产由 `media_process` 分段产生 | 原始 [`clip_mentor_f3b`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_T2HfbLX_clip_mentor_f3b_20260816T164845_14d48367_preview.mp4) 后半段不可识别；[`f3b_fixed`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_dGdPmWZ_clip_mentor_f3b_fixed_preview.mp4) 已替换音频 |
| 最终 [`v3`](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/a_vZ39bEU_patroc_com_proposito_v3_preview.mp4) | 大部分为 Portuguese | 00:41-00:48 仍不可识别；对应 `f2b` 的复核被 credits 错误中止 |

注意：本案证据不能证明输出真的是俄语；更准确的事实表述是“部分片段不是可识别的 pt-BR，也没有足够证据分类为俄语”。但对用户而言，这同样是 P1 语言交付失败。

## Skill & Reference Read Audit

### 实际读取的关键文件

| 文件 | 读取情况 | 应用情况 | 关键证据 |
|---|---|---|---|
| `script-skill/SKILL.md` | trace 中已读 | Partial | 初始脚本保存了 pt-BR，但后续投诉没有形成新的受保护语言 revision |
| `script-skill/references/voice-strategy-execution.md` | 已读 | Partial | 要求 `target_spoken_language`、`audio_list_speech` 与可见口型匹配；未落成可验证的最终音频 receipt |
| `script-skill/references/video-generation-execution.md` | 已读 | Partial | 读到 exact speech/native clock 规则；没有阻止损坏音频进入 final wrapper |
| `generation-skill/SKILL.md` | 22:41:52 才读取 | Late read | 首批 `voice_search`/`audio_produce` 已在 22:38-22:41 执行；规则要求先读再生产 |
| `generation-skill/references/generation-blueprint-design.md` | 已读 | Partial | 要求音频驱动时以真实音频时长为时钟；没有建立逐片段语言/转写门禁 |
| `generation-skill/references/video-models-routing.md` | 已读 | Yes for route | Seedance 路由和 `audio_list` 形状基本正确，但 route 正确不等于输出音频正确 |
| `generation-skill/references/video-generation-execution.md` | 已读 | Partial | 规定保留 native clock；没有执行“native audio content must be verified” |
| `motion-skill/SKILL.md` + audio/caption/tech references | 已读 | Partial | 做了字幕和容器/lint 检查；未做最终音频语言/台词覆盖验收 |

### 触发但未读取的关键 references

该集合按 trace 中当时读取到的 generation-skill 文本校准，不以后续本地版本反推：

| 工具/阶段 | 应读但未读 | 影响 |
|---|---|---|
| `voice_search`、`voice_preview`、`audio_produce` | `generation-skill/references/voice-production-and-resolution.md` | 没有在语音解析、正式 TTS、当前项目 voice resolution 之间建立完整证据链 |
| speech / `audio_list` / visible performance | `generation-skill/references/generation-voice-strategy-execution.md` | 缺少逐行 speech source、protected clock 和输出验证的执行门禁 |
| 每次生成后的接受验收 | `generation-skill/references/afc-multimodal-policy.md` | 没有 revision-bound 音频验收 receipt；视觉 QA 不能替代语言 QA |
| 生成前置 | `generation-skill/references/generation-preflight-gates.md` | 没有在音频验证缺失时 fail-closed |
| 生成完成/交付 | `generation-skill/references/generation-handoff-contract.md` | 没有把每个片段的语言、转写、证据 id 带入 handoff |

**覆盖判断**：已打开关键文件 8 组，但本问题相关的 generation voice/AFC/handoff 触发集合至少缺 5 个文件；最关键的是 `voice-production-and-resolution`、`generation-voice-strategy-execution` 和 `afc-multimodal-policy`。属于“关键参考未读 + 已读规则未落实”，不是单纯模型随机性。

## Phenomenon -> Root Cause -> Attribution

### 1. 参数链正确，但生成后音频不正确

**现象**：原始用户文本、voice search、正式 TTS 均指向 pt-BR；孤立 MP3 可被识别为葡萄牙语，而同一 MP3 驱动的部分 Seedance 视频输出不可识别。

**根因**：`audio_list` 被当作“已绑定音频”而非需要内容验收的生成依赖。`sound:on` 和 AAC stream 只能证明有音频轨，不能证明它保留了输入波形、语言和台词。

**归因**：P1 产品/模型输出可靠性问题；P1 skill 缺少“生成后逐片段语言和台词验收”硬门禁。不能归因于用户语言表达不清。

### 2. 交付前 QA 只看“有声音”，没看“说什么语言”

**现象**：22:45 的 7 个视频 QA 使用 `scope=visual`；22:51 的 `media_probe mode=info` 只验证编码流；22:57 只探测 final 音频流。

**根因**：没有为 visible speech 定义“语言识别、台词转写、覆盖率、可识别度”的验收 receipt，也没有把原始 TTS 与输出视频进行波形/转写对照。

**归因**：P1 QA workflow 缺口，可通过生成阶段门禁预防。

### 3. 用户投诉后的响应先否认，再局部修复

**现象**：Agent 只听到开头两句是 pt-BR，就回复“文件正确”，要求用户提供时间点；用户说明“从第五个开始”后才发现多个异常片段。修复 f6、f3a、f3b 后，v3 仍有 00:41-00:48 异常，f2b 检查又因额度错误终止。

**根因**：没有先建立“全片片段到音频资产”的映射，也没有在首个异常出现后停止交付并做完整扫描；局部 `replace_audio` 修复绕过了新的全片验收。

**归因**：P1 Agent 判断/恢复流程错误；P2 成本控制缺口放大了影响。

## Recommendations（Phase B，等待用户确认）

### P1-A：为 visible speech 增加语言与台词硬门禁

- **目标文件**：`generation-skill/references/generation-voice-strategy-execution.md`、`generation-skill/references/generation-handoff-contract.md`
- **修改位置**：`audio_list_speech` 执行、每片段 post-generation QA、handoff receipt
- **改动内容**：每个带口型同步的输出必须保存 `speech_language`、`expected_transcript`、`observed_transcript`、`intelligibility`、`audio_source_asset`、`evidence_id`。语言不是目标语言、转写覆盖不足或出现不可识别区间时，输出标记 `kill`，禁止进入 composition。
- **原因**：本案原始 TTS 正确，但三个已定位视频输出损坏；存在 AAC 流不能视为成功。
- **类型**：新增硬门禁。

### P1-B：禁止以局部音频证据断言全片语言正确

- **目标文件**：`generation-skill/SKILL.md`、`references/generation-preflight-gates.md`
- **修改位置**：selected revision / direct delivery / final media QA
- **改动内容**：交付前必须覆盖所有 speech-bearing clips；任何用户语言投诉触发全片扫描，而不是要求用户先提供时间码。一个异常片段即可阻断交付。
- **原因**：Agent 先用开头两句否认问题，延迟了准确定位。
- **类型**：修改现有交付门禁。

### P1-C：定义 audio_list 的 waveform-preservation / fallback 行为

- **目标文件**：`generation-skill/references/video-generation-execution.md`；若 provider 无法保证输入波形保留，记录为 engineering requirement
- **修改位置**：`audio_list_speech` native clock、fallback、`replace_audio`
- **改动内容**：明确区分“模型使用音频做口型条件”与“输出保留原始音频”。若输出音频未经证明与输入波形/转写一致，默认采用确定性 `replace_audio`，并重新做 lipsync/时长 QA；不能把模型生成的变体音频静默当作正式对白。
- **原因**：本案正是“输入 MP3 正确、输出视频音频不可识别”。
- **类型**：修改现有规则 + 可能需要运行时能力。

### P2-A：音频异常修复前先建立完整片段映射

- **目标文件**：`generation-skill/references/generation-handoff-contract.md`、`motion-skill/SKILL.md`
- **改动内容**：最终 composition 保存 `clip -> source speech asset -> transcript -> QA receipt` 映射；局部 `media_process` 修复后必须重跑全片音频覆盖检查。
- **原因**：f6、f3a、f3b 修复后，v3 仍有 f2b 对应区间异常。
- **类型**：新增验收规则。

### P2-B：额度/重试保护

- **目标文件**：generation preflight / user-facing execution rules
- **改动内容**：首个语言失败后暂停批量生成；每次重做先列出目标片段、原因、预估 credits；不得在未完成诊断时批量重试或重复创建同名片段。
- **原因**：58 次视频调用中 38 次为 pending_confirmation，最终修复又被 credits 错误中止。
- **类型**：修改现有执行规则。

本轮只完成 Phase A 分析、证据包和看板，没有修改任何 Skill、Runtime 或 `tech-*` 文件，也没有上传后台。等待用户确认方案后再进入 Phase C。
