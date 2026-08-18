# Case 56378623746: 分段视频背景颜色漂移

## 基本信息

| 项目 | 事实 |
|---|---|
| Case / project | `56378623746` / Patrocínio com Propósito |
| User | `55094045330` |
| 数据源 | production `pg-server` (Metabase database 3) |
| 时间窗口 | 2026-08-16 22:36:43 至 2026-08-17 01:15:23 (Asia/Shanghai) |
| 会话时长 | 约 2h39m |
| 用户目标 | 90-120 秒、16:9、pt-BR 教育动画；两个固定角色和统一背景风格 |
| 最终输出 | 1920x1080、136 秒；`patroc_com_proposito_final/v2/v3.mp4` |
| 片段结构 | 12 段对话，Mentor 的两段长台词又被拆成 4a/4b、6a/6b，最终 composition 使用 14 个视频片段 |
| 用户投诉 | 后续片段背景颜色与第一段不同；之后又投诉第 5 段以后音频不正确 |

完整证据包位于 [case data](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/)，完整 276 行调用表位于 [tool-chain.md](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/tool-chain.md)。业务调用链看板见 [56378623746_dashboard.html](/Users/wellswu/pexo-skills/analysis/56378623746_dashboard.html)。

## 结论摘要

背景颜色不一致不是用户误判，而是生成链路没有建立可复用的环境/背景锚点，并在用户明确选择第一版 Bia 作为标准后又切换到了另一套白底基准。

有三条独立证据闭环：

1. 每次 `video_generate` 都是 Seedance `reference2video`，`image_list` 只包含当前角色图；没有第一段成片、共享场景图、统一背景首帧或 `video_list` 连续帧。
2. 首版 Bia 的实际顶部背景平均色约为 `RGB 175,148,120`、亮度约 `151.7`；后续选入最终 composition 的片段顶部背景约为 `RGB 197-230`、亮度约 `189-227.6`。这不是同一颜色体系。
3. 用户在 00:19 明确说第一版 Bia 应作为其他片段标准，但最终 composition 第一个片段使用的是 `clip_bia_f1_v2`，其生成提示明确要求 `white/off-white` 背景，已经不是第一版 Bia 的棕色填充背景。

因此，根因归属为：

- **P1 Agent 决策/流程错误**：用户选定的视觉基准没有被锁定为版本化资产，后续 prompt 和 composition 改用了 v2 基准。
- **P1 Skill/能力缺口**：分段生成只锁角色参考，没有强制环境参考或首帧/连续帧链；提示词中的“same style”没有证据效力。
- **P2 QA 缺口**：逐段检查了“是否有线稿背景”，但没有检查“是否与已批准基准及相邻片段的颜色/填充一致”；最终只抽查了字幕/可见性，不检查相邻切点的背景漂移。

## 会话时间线

| 阶段 | 时间 | 用户意图 | Agent 动作 | 结果 |
|---|---|---|---|---|
| 规划 | 22:36-22:43 | 一条完整的 90-120 秒 pt-BR 对话视频 | 读 brainstorm/script 资料，生成 Bia/Mentor 角色图、语音和初始视频调用 | 初始调用停在 `pending_confirmation`，尚未形成视觉锁 |
| 参考风格 | 22:54-22:58 | 用户提供参考视频并要求更干净的西式线稿风格 | 分析参考视频，重做 `bia_v2_editorial` / `mentor_v2_editorial`；随后准备并行生成多个片段 | 新角色图只解决角色外观，没有建立环境图/背景基准 |
| 首段验证 | 23:16-23:48 | 用户批准第一段后继续逐段 | 生成 `clip_bia_f1`、`clip_mentor_f1`、`clip_bia_f2` | Bia 首段为暖棕填充背景；Mentor 片段出现更明显的背景填充，Agent 后来承认不一致 |
| 错误修复 | 23:54-00:05 | 用户指出“不能不同”并要求重做 | 以“白/米白底 + 黑色线稿”为新规则重做 `clip_mentor_f1_v2` | 修复了“是否填色”，但没有保持第一版 Bia 的实际颜色 |
| 用户重新指定基准 | 00:18-00:23 | 用户说第一版 Bia 更好，要求以它为标准，并指出重复生成 | Agent 口头确认，但随后仍按 v2 白底规则生成/选片；Mentor 长台词被未经明确要求拆成 4a/4b | 基准选择未进入资产锁或 composition 约束 |
| 批量生成与组装 | 00:39-00:58 | 用户因成本要求继续到结尾 | 以白/米白线稿 prompt 批量生成剩余片段，生成 14 片段 composition，渲染 v1 | 成片交付，背景仍在暖棕、米色、近白之间漂移 |
| 交付后复核 | 01:03-01:15 | 用户投诉第 5 段以后像俄语/不可理解 | Agent 先断言 pt-BR，再逐段查音频；确认多个片段存在不可识别语音并反复修复 | 这是另一条音频问题链，不能证明背景一致性已修复 |

## Tool Call Chain Audit

### 统计

| 指标 | 数量 |
|---|---:|
| 总工具调用 | 276 |
| `video_generate` | 58: 18 completed, 2 failed, 38 pending_confirmation |
| `image_generate` | 4: 4 completed |
| `audio_produce` | 13: 12 completed, 1 failed后重试 |
| `analyze_file_content` | 37 |
| `media_probe` / `media_process` | 22 / 8 |
| 编辑调用 | 18 `edit_file`，均返回 completed，但多次 lint 仍 invalid/question pending |
| 生成终态成功率 | 18/20 = 90%（不把 pending_confirmation 算作执行成功） |
| 全部生成调用完成率 | 18/58 = 31% |
| 可疑/浪费调用 | 至少 38 个 pending_confirmation 重复计划，外加 2 个失败视频调用和重复的 `clip_bia_f1`、`clip_mentor_f1`、`clip_mentor_f2` 等重试；是否实际扣费以计费系统为准 |

### 与背景问题直接相关的调用

| 时间 | 调用 | 关键参数 | 结果/问题 |
|---|---|---|---|
| 23:16:27 | `video_generate` `clip_bia_f1` | 角色图 `bia_v2_editorial`; prompt: `sketch-only ... no color fill` | 成功；实际输出仍是暖棕色填充背景 |
| 23:21:20 | `analyze_file_content` | 检查线稿背景、角色、lip movement | 返回“无 full color fill”，但没有与用户批准的第一版 Bia 做颜色比较；同一调用后来被更精确复查为“有 muted brown fills” |
| 23:35:36 | `video_generate` `clip_mentor_f1` | 角色图 `mentor_v2_editorial`; 同样要求无背景填充 | 成功；实际背景有 flat color fills |
| 23:41:02 | `analyze_file_content` | 检查是否无填充 | 明确返回“No”，但只触发了口头建议，没有建立 baseline 版本或阻止后续生成 |
| 23:55:38 | `video_generate` `clip_mentor_f1_v2` | 强制 `white/off-white base`、背景只留线稿 | 成功；被 Agent 宣布“igual à Bia”，但它实际对齐的是白底 v2，不是首版 Bia |
| 00:09:28 | `video_generate` `clip_bia_f2` | 同样的 `white/off-white base` 规则 | 成功；与首版 Bia 颜色体系继续分叉 |
| 00:23:23 | `video_generate` `clip_mentor_f2a/f2b` | 强制白/米白底线稿；把一条 Mentor 台词拆成两片 | 成功；拆分增加了新的独立采样点 |
| 00:41:31 | 10 个 `video_generate` | 所有 Bia/Mentor 后续片段都要求 `white/off-white ... zero color fill` | 成功/失败混合；批量规则没有引用用户指定的首版 Bia 资产 |
| 00:53:36 | `write_file` composition | `v1` 使用 `clip_bia_f1_v2`、`clip_mentor_f1_v2`、`clip_bia_f2` 等 | 最终 composition 没有使用用户说的第一版 `clip_bia_f1` 作为基准 |
| 00:58:04 | 3 次 `render_frame` | t=1、55、132 | 只检查字幕、可见性、end card；没有做相邻片段背景颜色比较 |

完整的每一条调用记录见 [tool-chain.md](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/tool-chain.md)，原始 JSON 见 [tool-chain.json](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/tool-chain.json)。

## 视觉证据

以下数值来自下载的 preview MP4，在每个片段约 1 秒处取帧，对顶部 22% 区域做平均色采样。它是可复现的相对比较，不是对压缩视频颜色的绝对色彩管理声明。

| 片段 | 顶部平均 RGB | 亮度 Y | 证据 |
|---|---:|---:|---|
| 首版 Bia `clip_bia_f1` | `175,148,120` | 151.7 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_RttwtLN_clip_bia_f1_20260816T152111_c6d19b81.jpg) |
| 首版 Mentor `clip_mentor_f1` | `213,191,167` | 193.9 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_LqgHtRv_clip_mentor_f1_20260816T154053_28c36ecf.jpg) |
| 首版 Bia `clip_bia_f2` | `186,168,145` | 170.2 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_9KyG81V_clip_bia_f2_20260816T154754_d135802b.jpg) |
| 最终使用的 Bia `clip_bia_f1_v2` | `209,199,186` | 200.2 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_NiAQtuR_clip_bia_f1_v2_20260816T164436_477e789f.jpg) |
| 后续 Bia `clip_bia_f6` | `230,227,226` | 227.6 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_d7u1g5K_clip_bia_f6_20260816T164432_9df5a334.jpg) |
| 后续 Mentor `clip_mentor_f3a` | `223,220,218` | 220.5 | [frame](/Users/wellswu/pexo-skills/analysis/case-data/cases/56378623746/media/frames/a_6enz2DH_clip_mentor_f3a_20260816T165000_6217ab15.jpg) |

这组数据与用户在 00:18 的描述一致：第 1、2、3 段不是同一背景颜色。特别是最终首片 `clip_bia_f1_v2` 比用户指定的首版 Bia 亮约 48.5 Y，后续片段相对首版 Bia 亮约 37.3-75.9 Y。

## Phenomenon -> Root Cause -> Attribution

### 1. 分段独立采样，提示词不能锁住背景

**现象**：所有后续 Seedance 调用的 `image_list` 只传当前角色图。Bia 调用传 `bia_v2_editorial`，Mentor 调用传 `mentor_v2_editorial`；没有传同一张环境图，也没有把前一片段作为视频/首帧参考。

**根因**：`reference2video` 每次都从独立随机采样开始。`"sketch-only"`、`"white/off-white"`、`"same style"` 是生成意图，不是像素级背景约束。角色参考只能稳定角色身份，不能稳定办公室的填充、纸张颜色、光照和线稿密度。

**归因**：模型/产品能力是必要原因；生成 skill 没有把环境锚点、首帧链或背景复用设为硬门禁，是可预防的流程缺口。

### 2. 用户选定了首版 Bia，但 Agent 采用了错误基准

**现象**：用户说“第一个 Bia 要作为标准”。随后所有批量 prompt 仍写 `white/off-white base`，composition 的 `v1` 第一个视频是 `clip_bia_f1_v2`，不是首版 `clip_bia_f1`。

**根因**：Agent 把“背景无填色”这一抽象属性当成了用户选择的具体视觉版本，并在 Mentor 修复后默认把白底 v2 当作新标准，没有写入 `approved_baseline_asset_id` 或 revision lock。

**归因**：这是 Agent 决策错误，严重程度 P1；不是模型随机性可以解释的部分。即使没有环境锚点，也不应静默替换用户批准的版本。

### 3. QA 只验证属性，不验证连续性

**现象**：`analyze_file_content` 多次询问“背景是否为线稿且无填充”，但没有询问“是否与首版 Bia 和上一段的背景色相同”。最终 render 只抽查 t=1、t=55、t=132，问题查询集中在字幕、可见性和 end card。

**根因**：验收模型被给了二元属性问题，而不是 baseline-to-output comparison；没有 revision-bound AFC receipt、相邻切点帧、颜色/线稿漂移指标，也没有在检测到第一处失败后 fail-closed 阻止继续生成。

**归因**：QA workflow 缺口 P2，放大了前两个 P1 根因。

### 4. 额外观察：成本与音频链路

这不是本报告的主问题，但它解释了用户为何强烈反弹：Trace 中有 38 个 `pending_confirmation` 视频计划、2 个失败视频调用和多次重复片段。最终交付后，音频分析确认第 5 段以后存在大量不可识别语音；`clip_mentor_f3a` 被判定为非可识别语言，最终 v3 仍有至少一个不可识别片段。背景修复不能以音频分析结果替代视觉连续性验收。

## Skill & Reference Read Audit

### 实际读取的 skill/reference 文件

所有下列文件在 trace 中均从第 1 行读到文件末尾；部分调用的 `limit` 小于文件长度，但工具返回继续包含了 EOF，未发现“截断后未继续”的证据。按不同文件去重共 24 个，合计约 4,252 行，打开文件的 line-level coverage 为 100%。

| Skill / reference | 读取 | 应用准确性 | 关键说明 |
|---|---|---|---|
| script-skill + handoff/routing/voice/video refs | 完整 | Partial | 能生成 handoff 和语音/视频计划，但没有把用户后续的 baseline 选择更新为受保护版本 |
| brainstorm-skill + ideation/brief/audio/rhythm | 完整 | Yes/Partial | 创意方向和参考视频风格识别正确；没有读取 image-generation-guide |
| generation-skill | 完整 | Partial | 读到“每个输出需 AFC、比较用户约束和引用资产”，但 trace 没有形成对应的 revision-bound receipt |
| generation-blueprint-design | 完整 | No/Partial | 文件明确要求统一 visual language、颜色偏差检查、Visual Intent Table 和 drift check；这些步骤没有落地 |
| generation video-models-routing | 完整 | Yes | Seedance `reference2video` 路由和 payload 形状基本正确 |
| generation video-generation-execution | 完整 | No/Partial | 文件明确写着 prompt 文字不能证明一致性、每个 recurring subject 要有实际 reference；角色参考有，环境/背景参考没有 |
| motion-skill + design refs | 完整 | Partial | 字幕、house style、transition、typography 等有读取；最终 composition 标记 `visual-map: none`，且 lint 多次 invalid/question pending |
| motion tech-html | 完整（重复读取） | Partial | 有 render/lint，但没有做相邻片段背景连续性检查 |

**File-level read coverage**：按最小显式触发集合计算，24 个已读 / (24 个已读 + 11 个应读未读) = **68.6%**。已读文件的 line-level coverage 为 **100%**。

**Causal execution subset application accuracy**：generation blueprint、generation video execution、generation routing、motion tech-html 四份直接决定本问题的规则中，只有 routing 可视为完整应用，约 **1/4 = 25%**；其余三份均为 Partial 或 No。

### 触发但未读取的 references

这是按 trace 中当时读到的 skill 文本校准的最小集合，不以后续本地 skill 版本反推：

| Tool type / stage | 应读取但未读取 | 影响 |
|---|---|---|
| Generation（所有视频/图像生成前） | `references/afc-multimodal-policy.md` | 没有可执行的 AFC/receipt 约束，无法把比较结果绑定到 revision |
| Generation | `references/generation-preflight-gates.md` | 没有在缺少环境锚点、基准未锁定时 fail-closed |
| Generation | `references/generation-execution-rules.md` | 没有把序列参考映射和 payload 证明固化为计划表 |
| Generation | `references/voice-production-and-resolution.md` | voice_search/voice_preview/audio_produce 前缺失必读文件；也与后续音频异常相关 |
| Generation | `references/generation-voice-strategy-execution.md` | visible speech/audio_list 执行规则未按当前 skill 的完整门禁落地 |
| Generation | `references/image-generation-guide.md` | 角色参考图生成前缺失必读文件；无法建立环境/角色资产边界 |
| Generation | `references/generation-deterministic-visual-payload-guide.md` | 文本/品牌 end card 的确定性约束未完整读取 |
| Generation | `references/generation-handoff-contract.md` | 交付前没有完整 handoff/AFC 证据门禁 |
| Brainstorm `image_generate` | `references/image-generation-guide.md` | 角色图生成前缺少模型路由和多图参考规则 |
| Motion | `references/afc-multimodal-policy.md` | 最终视觉 map/receipt 约束缺失 |
| Motion | `references/tech-data-attributes.md` | composition 的 data-* 合约未完成必读审计 |

未发现“读完后直接违反某一条明确规则”的证据只有在少数文件中；本案的主要问题是**关键文件未读 + 读到的 drift/AFC 规则未落实**，而不是单纯的晚读。

## Recommendations (Phase B, 等确认)

### P1-A: 锁定用户批准的视觉基准

- **目标文件**：`generation-skill/SKILL.md`、`references/generation-preflight-gates.md`、`references/generation-handoff-contract.md`
- **修改位置**：generation activation/preflight、selected revision、direct delivery gate
- **新增规则**：用户批准的第一张 style frame 或第一段视频必须写入 `approved_visual_baseline_asset_id`、revision 和 `baseline_scope`（角色、背景、填充、线稿、光照）。后续片段只能使用该 revision 或用户明确批准的新 revision；composition 必须引用同一 selected asset lineage，不得静默替换为 `v2`。
- **原因**：本案的最终 composition 使用了 `clip_bia_f1_v2`，直接违背了用户指定的第一版 Bia 基准。
- **类型**：新增硬门禁。

### P1-B: 分段生成必须有环境/背景锚点

- **目标文件**：`generation-skill/references/generation-execution-rules.md`、`references/video-generation-execution.md`
- **修改位置**：sequence reference mapping、frame-chain strategy、payload proof
- **新增规则**：当用户要求“所有片段背景/颜色/场景一致”时，角色图不算环境参考。必须在每个 sequence payload 中携带同一环境图/合成 style frame，或使用 provider 支持的首帧/`video_list` 连续链；只有 prompt 文字时阻止 `video_generate`。不同说话人只能替换角色层，不能替换背景基准。
- **原因**：本案 58 次视频调用均为独立 `reference2video`，只有角色图，导致背景每次独立采样。
- **类型**：新增硬门禁，必要时记录为 engineering requirement：若 provider 无法消费环境/首帧参考，需要确定性背景合成或颜色归一化能力。

### P1-C: 首段验收后再允许批量生成

- **目标文件**：`generation-skill/references/generation-preflight-gates.md`、`generation-blueprint-design.md`
- **修改位置**：split/parallel decision、first segment approval
- **修改内容**：第一段必须同时产出 baseline frame、background/style receipt 和用户批准状态；在 receipt 通过前，不得并行生成其余片段。用户投诉后自动切换 serial，并禁止重复已批准片段，除非用户明确请求重做。
- **原因**：本案 Agent 在发现 Mentor 背景不同后仍反复创建 pending/duplicate 调用，并在用户说“第一版 Bia 为标准”后继续批量发白底 prompt。
- **类型**：修改现有 split/parallel 规则。

### P2-A: 增加相邻片段背景连续性 QA

- **目标文件**：`generation-skill` AFC/handoff 相关 references；`motion-skill/SKILL.md`
- **修改位置**：per-output `analyze_file_content` acceptance query、final render Pass B
- **修改内容**：每个片段至少取首帧/中帧，与 approved baseline 和前一片段比较背景填充、顶部平均色、线稿颜色/密度、光照；比较结果必须带 revision-bound evidence/frame。相邻背景偏差超阈值即 kill/block，不进入 composition。
- **原因**：本案的 QA 只问“有没有填充”，没有问“是否与已批准片段一致”。
- **类型**：新增验收规则。

### P2-B: 成本和未经授权重试保护

- **目标文件**：generation preflight / user-facing execution rules
- **修改内容**：`pending_confirmation` 不得自动扩展为并行批量任务；每次重做显示目标片段、理由、预估 credits，等待明确批准。重复片段的 asset name 必须被判定为 stale/duplicate 并阻断。
- **原因**：本案至少 38 个 pending 视频计划和多次重复生成直接引发用户的信用投诉。
- **类型**：修改现有执行规则。

### 暂不执行

本轮仅完成 Phase A 分析、证据包和看板，没有修改任何 skill、runtime 或 `tech-*` 文件，也没有上传 admin backend。等方案确认后再进入 Phase C。
