# 2026-08-16 P1 Bad Cases — 合并 Phase A 分析

## 结论摘要

本报告合并分析 5 个 P1 Bad case：`43623995145`、`61439774499`、`40727889270`、`43979777597`、`74106891613`。证据来自 production Postgres database 3 的 chronological `project_messages`、`project_assets`，以及已经落盘的 case evidence package；database 3 completeness gate 对 5/5 通过。没有查询 Langfuse，没有修改线上项目、资产、消息、反馈、业务 Skill、`tech-*`、Admin 或 Release，也没有进入 Phase C。

合并判断：

- 5/5 都存在可追溯的最终交付版本和完整工具链；合计 1,756 条消息、397 个工具调用、87 个资产记录。
- 4/5（436、614、407、439）在交付前已经有明确的语义/视觉 QA 失败、矛盾或验收维度不足，但没有形成阻断式 acceptance decision，仍继续交付。
- 1/5（741）在 lint 明确报告无音频后，重复以 `acknowledged_findings` 放行；trace 没有用户确认“静音就是意图”的证据。
- 共同问题不是反馈标签本身。反馈标签只作为症状上下文；根因证据来自时序工具结果、渲染/分析结论、资产谱系和最终交付节点。

## 范围与数据完整性

分析日按 Asia/Shanghai：2026-08-16；日报对应 UTC 窗口为 `2026-08-15T16:00:00Z`（含）至 `2026-08-16T16:00:00Z`（不含）。本次只分析用户指定的 5 个 P1，不把日报中的 P2/Unscored case 混入结论。

| Case | 生产时序（Asia/Shanghai） | 消息 | tool_call 事件 | tool_result 事件 | 资产 | 精确 Bad 二进制缓存 |
|---|---:|---:|---:|---:|---:|---|
| 43623995145 | 05:22:33–05:55:24 | 348 | 79 | 82 | 19 | 不可用 |
| 61439774499 | 05:38:26–05:58:43 | 81 | 15 | 17 | 8 | 不可用 |
| 40727889270 | 10:22:42–10:48:58 | 312 | 62 | 77 | 21 | 不可用 |
| 43979777597 | 10:45:01–10:53:56 | 73 | 13 | 14 | 2 | 不可用；但 Bad 版本已有本地媒体 QC |
| 74106891613 | 13:32:52–14:34:48 | 942 | 193 | 206 | 37 | 不可用 |

注：数据库复查使用只读聚合查询；先按 `project_messages` 独立聚合，再按 `project_assets` 独立聚合，避免消息与资产 join 造成计数膨胀。case 目录中的 `audit-facts.json`、`tool-chain.json`、`assets-with-prompts.json` 是本报告的本地证据索引；报告不复制个人标识、临时链接、凭证、联系方式或原始消息转储。

## 合并调用链审计（Mandatory Audit A）

下表是每案完整调用链的压缩索引：`tool-chain.json` 保留了全部按 `seq` 排序的调用、参数、结果和状态；下表列出所有工具种类及数量，并单列改变诊断的关键时序节点。

| Case | 全部工具调用（工具: 次数） | 生成/编辑/渲染/展示统计 | 关键时序证据 |
|---|---|---|---|
| 43623995145 | `write_todos`10, `read_file`7, `analyze_file_content`18, `get_file_info`1, `write_file`3, `render_frame`14, `edit_file`13, `add_attachments`3, `lint_composition`3, `submit_render`3, `query_render`4, `show_final_video`3 | 0 generation；13 edits；3 renders；3 shows | seq13 已判定 overlay artificial/misaligned、越出 limb、主体非静止；seq39 无法确认加速；seq50 明确判定首帧不快、主体不静止、线条不持续快速；seq56 仍展示 `shih_tzu_hair_fast`；seq57 判定是慢速稳定扩散；seq82 再展示 spread 版本。 |
| 61439774499 | `write_todos`5, `analyze_file_content`7, `read_file`1, `video_generate`2, `show_final_video`2 | 2/2 video generation completed；0 edit/render；2 shows | seq9 确认三人和位置保留；seq15 明确左侧不 angry、中心 neutral、右侧无 guilt/shame/discomfort/avoid eye contact；seq17 仍展示 `confronto_v2`。 |
| 40727889270 | `read_file`5, `analyze_file_content`21, `write_todos`9, `media_probe`1, `video_generate`5, `add_attachments`3, `image_generate`2, `render_frame`16, `media_process`2, `list_fonts`1, `write_file`3, `get_file_info`1, `edit_file`5, `submit_render`1, `query_render`1, `show_final_video`1 | 7 generation calls（5 completed、2 failed）；5 edits；1 render；1 show | seq13–18 反复发现 ring 不消失、scratch 未居中或方向/数量改变；seq73 仍判定 ring 未消失；seq76 最终分析声称消失，和此前 sampled-frame 证据矛盾；seq77 展示最终版本。 |
| 43979777597 | `write_todos`5, `read_file`4, `analyze_file_content`3, `video_generate`2, `show_final_video`1 | 2 video generation（1 completed、1 pending_confirmation）；0 edit/render；1 show | seq9 初次分析称 6 个 beat 均存在，但只确认“视觉上出现”，没有逐 beat 的连续性/身体计划证据；seq11 展示 Bad `mantis_transformation_v1`；本地 Bad 媒体为 10.1s、720×1280、H.264/AAC，无黑段/冻结/静音段。 |
| 74106891613 | `write_todos`41, `read_file`30, `capture_url`1, `query_capture`1, `download_capture_asset`2, `analyze_file_content`15, `image_generate`12, `add_attachments`3, `list_fonts`1, `write_file`2, `lint_composition`11, `render_frame`2, `edit_file`38, `submit_render`14, `query_render`13, `show_final_video`12, `cutout_image`7, `media_process`1 | 12 image generation；38 edits；14 submit（13 completed、1 failed）；12 shows | seq110/115/131/143 等 lint 持续报告 `MOTION_CONTRACT_COVERAGE_NO_AUDIO`；seq132 以 acknowledged finding 提交 v8；seq133 render done；seq135 展示 `history_title_card_v8`；seq159 未确认时提交失败，seq160 再次 acknowledge 后成功，后续版本仍重复放行。 |

### 调用链统计与浪费

- 合计 397 个工具调用；其中 23 个 generation calls、61 个 `edit_file`、18 个 `submit_render`、19 个 `show_final_video`。
- 明确的重复/无效恢复：436 在已知“不是自然毛发、越界、不能确认速度”后继续 edit/render/show；741 在同一 no-audio lint 问题上重复提交多个版本；407 在 ring 终态仍失败时继续沿样式/结构路线迭代。
- 这不是把所有重试都判为浪费：614 的第二次生成、439 的第二次 pending 生成、407 的若干 provider/render 失败均保留为正常恢复尝试；只有在假设没有改变或 blocking evidence 已存在后仍交付的调用才计入发布控制问题。

## 个案证据、根因与影响

### 43623995145 — hair overlay / motion contract（P1）

**证据。** 用户意图是让照片中的 Shih Tzu 像雕像一样保持静止，臂部黑色线条从慢到快、紧贴手臂。seq13 的图像 QA 已明确：线条是 artificial overlay、没有贴合 limb、延伸到地面，狗的前腿处于迈步状态。seq39 只能确认有滚动，无法确认从慢到快。seq50 对修正版 `shih_tzu_hair_fast` 给出三项全否：首帧不快、狗不静止、线条不持续快速。seq57 进一步判定线条只是稳定慢速扩散、非 loop、伴随慢 zoom。尽管如此，seq56 仍 show final；之后 seq82 又展示 spread 版本。Bad 资产为 `shih_tzu_hair_fast.mp4`，精确 Bad 缓存已失效。

**根因。** 实现采用固定矩形/`clip-path` 叠加层和统一平移，而不是与肢体轮廓绑定的 mask/segmentation；motion 速度用 easing 预设表达，但没有可测的首帧速度和多时点速度验收。已知 QA 失败被当成“继续润色”的输入，而不是 delivery block。

**影响。** 核心效果同时失败于形状自然度、主体静止约束、线条 containment 和速度曲线；用户收到明显人造叠加效果。

**归因。** 直接实现与 acceptance judgment 混合：实现层选择了不适合照片肢体的矩形 overlay；流程层在 seq50 已明确否定后仍交付。trace 读到的 motion skill 已有“最终 QA/交付前检查”方向，但没有将“subject-bound mask、速度曲线和 statue invariance”落成可执行断言。

### 61439774499 — emotion/interaction acceptance（P1）

**证据。** seq9 确认三个人物、左右中位置、森林背景均保留；这证明 identity/layout 不是主要问题。seq15 对最终 `confronto_v2` 明确判定：左侧女孩 calm/firm 而非 angry，中心 neutral 而非 confused/worried，右侧无 guilt、nervousness、shame、discomfort，也没有 avoid eye contact/downward gaze。seq17 仍展示该版本。Bad 精确二进制缓存不可用，因此不做额外 ffprobe/帧抽样推断。

**根因。** 生成前做了角色识别和位置保真，但没有把每个命名情绪、关系动作和视线状态转换为验收矩阵；“人物存在且位置保留”被错误地当成整体通过条件。

**影响。** 场景的核心戏剧动作（严肃对峙和羞愧/不适反应）没有被传达，视觉上是中性站立/轻微表情变化。

**归因。** 主要是 generation/acceptance 语义缺口，次要是交付判断。trace 中 generation skill 的可见部分要求 AFC/reference/user-constraint 比较，但没有可见的 emotion/state checklist；不能把当前本地新增规则反推成当时已知规则。

### 40727889270 — reference geometry and end-state（P1）

**证据。** seq13 的 sampled analysis 判定透明 bubble ring 在 0.0–5.2s 一直存在，且无法确认消失；seq16 判定五条 diagonal scratch 向 lower-left 偏移、未居中。seq18 的中间修正版虽然把线条改成居中，却变成 4 条 horizontal marks，ring 仍存在。seq22 对视频判断 ring 未按示例独立 split/orbit。seq73 对最终 frame 判定 glass ring 和内部 bands 仍存在；seq76 的最终描述反过来声称 ring 在 5.2s 消失。两次 sampled analysis 对终态冲突，且没有第三份同 revision、同 timestamp 的 adjudication。seq77 随即展示 `red_emblem_reveal_final`。Bad 缓存不可用。

**根因。** 迭代优化了“像不像一个 logo reveal”的整体观感，却没有把参考图/示例中的关键几何和 required terminal state（中心、数量/方向、最后只剩 emblem）锁成断言；当不同采样结论冲突时没有 fail-closed。

**影响。** 交付版本不能可靠证明满足示例的两项核心约束：scratch alignment 与 ring disappearance；即使某一分析声称通过，冲突证据仍未消解。

**归因。** reference-fidelity 与 release acceptance 混合。trace 读到 generation/motion skill，但可见规则没有把 reference-critical geometry 和 final-frame state 变成强制 receipt 字段；seq73 的失败证据也没有阻止 seq77。

### 43979777597 — organic mantis transformation（P1）

**证据。** seq3 对源图建立了人形铠甲、王冠、晶体螳螂和祭坛的基线；seq8 的 `mantis_transformation_v1` 生成成功。seq9 的一次视觉分析声称六个 beat 均存在，但只做了“是否出现”的粗粒度判断，未验证连续生长和身体计划。Bad 版本随后被 seq11 展示。既有 final QA 对交付视觉的具体结论是：armor change rushed/pasted-on、head replacement abrupt、claws prosthetic-looking、final body plan predominantly human。Bad 二进制本地媒体 QC 通过：10.1 秒、720×1280、H.264/AAC，无 black segment、freeze 或 silence interval；因此问题是内容语义/连续性，不是编码可播放性。

**根因。** `reference2video` 以人形源作为主要锚点，prompt 虽写了多段 transformation beats，却没有要求每一拍都提供“源材料被替换/身体结构连续改变”的可核验证据；模型用后期 armor/accessory 叠加满足了表面词汇，验收又只核对 beat presence。

**影响。** 用户要的是生物性、非人身体计划的转化，交付却读成“人类穿上螳螂装备”；核心语义失败，尽管容器和基本 beat 可播放。

**归因。** model judgment 与 skill acceptance mixed。trace 已读 generation、video-generation-execution、routing、AFC 参考，但这些可见片段没有足够具体的 anatomical continuity / body-plan gate；因此建议是强化现有 AFC 语义验收，而非把 provider 失败误判为根因。

### 74106891613 — silent-output release control（P1）

**证据。** motion skill 在 trace 中明确写出硬门禁：若无 audio，必须先取得用户确认的 silent intent。seq110、115、131、143 等 lint 均报告 `MOTION_CONTRACT_COVERAGE_NO_AUDIO`；seq132 对 `history_title_card_v8` 以 `acknowledged_findings` 提交，seq133 render 完成，seq135 直接 show v8。seq159 在不带 acknowledgement 时提交失败，错误信息再次要求“Only confirm when the user explicitly wants silent output”；seq160 重新 acknowledgement 后继续渲染，后续版本仍沿用同一模式。用户反馈为 audio issue；但本报告不把标签当作唯一证据，关键事实是“无音频问题被重复确认且没有用户静音意图 receipt”。Bad 缓存不可用。

**根因。** 已存在的 motion hard gate 被读到并被工具错误信息重复提示，但 acknowledgement 被当作权限替代了 user-backed intent；没有把 `audio_completion_route: explicit_silent` 或等价业务确认绑定到最终 revision。

**影响。** 在一个有明显动作/节奏和用户持续要求角色运动的长迭代中，交付静音版本，造成视听体验不完整。

**归因。** 这是最明确的 read-but-violated：motion skill 的可见硬门禁已存在，模型/发布控制仍绕过它。skill 规则本身不是“缺少静音规则”，而是缺少不可伪造的 user-confirmed intent receipt 与 revision-bound enforcement。

## Mandatory Audit B：Skill & reference read effectiveness

`project_messages.content` 中的 `read_file` 结果多次受到宿主输出截断；`audit-facts.json` 只记录路径和调用顺序，不把截断后的内容伪装成 EOF 完整读取。因此“Complete?” 只有在 trace 明确读到 EOF/后续 offset 连续覆盖时才记 Yes。

| Case | 实际读到的 Skill/reference | Complete? | 应用判断 |
|---|---|---|---|
| 43623995145 | modification SKILL、motion SKILL、motion `tech-html`、修改后的 composition、complaint-triage reference | No（多个结果含截断标记；仅 composition 的 offset 200–230 读到尾部） | Partial。overlay QA 和 speed QA 被执行，但 seq50/57 的失败没有阻断；当前 trace 没有 video-generation route，因此不能凭当前文件反推 skipped routing reference。 |
| 61439774499 | generation SKILL（一次 `read_file`，offset 0、limit 80） | No（结果截断，未见续读） | Partial/未证实。角色/位置验证做了，情绪验收缺失；只凭 trace 可见内容不能把当前 skill 的全部 expected references 追溯到历史。 |
| 40727889270 | capability-discovery SKILL、generation SKILL、motion SKILL、motion `tech-html`、`reveal.html` | No（多个结果截断；无完整 EOF 证据） | Partial。多轮 render/analyze 存在，但 ring/scratch 终态冲突没有 fail-closed。 |
| 43979777597 | generation SKILL、video-generation-execution、video-models-routing、AFC policy | No（各结果被截断，且 AFC 仅 limit 60） | Partial。参考确实传入 video call，容器 QC 也有；但 anatomical continuity 未被验收。 |
| 74106891613 | capability-discovery、brainstorm/script/motion SKILL、多个 motion/brainstorm references、PROJECT/composition、product knowledge/FAQ 等 | No（大量单次读取结果截断；少数短文件或 offset 续读完整） | No for decisive rule：motion hard gate 已读到，但 no-audio acknowledgement 仍替代了 user-confirmed silent intent。 |

### Triggered-but-never-read / calibration

期望集合必须来自 case 当时 trace 可见的 active skill 文本，而不是当前工作区反推。对 614/407/439 的 trace，generation SKILL 主体本身被截断在 read result 中，无法安全声称某个具体 reference “历史上必须读而未读”；因此这些项标记为“不可从可见 trace 判定”，不作为硬违规计数。436 的修改路径没有 `video_generate`，不能套用 generation-only gate。741 的 decisive expectation 明确可见：motion SKILL 要求无音频时取得用户确认的 silent intent；该 expectation 已读到，后续被违反。

### Coverage interpretation

- 文件级覆盖：五案均至少打开了触发 Skill；但由于输出截断，不能把“打开过”当成“完整读完”。
- 行级覆盖：无法可靠计算为真实 EOF coverage；`read_file` 返回中出现 `[TRUNCATED]`，且多数没有续读到最后一行。
- 应用准确率：对“已知 QA 仍交付”和“无音频 acknowledgement 仍放行”两个决策点，均为 Partial/No；其中 741 是明确 read-but-violated，436/407/614/439 是 acceptance semantics 不足或未阻断。

## 合并根因与影响

### 1. 共同发布控制缺口（P1，5/5）

每案都有 final presentation 节点，但“分析工具给出的失败/不确定性”没有变成 revision-bound blocking receipt。结果是 show/submit 成功被误读成质量通过。建议优先修复这一层，因为它同时覆盖 overlay、情绪、几何终态、身体转化和音频。

### 2. 语义验收缺口（P1，4/5）

614、407、439 的请求都含有比“主体出现”更强的关系、情绪、几何或身体计划；现有验收更多回答“元素是否存在”，没有回答“用户要求的状态是否以可见、连续、终态一致的方式发生”。436 则显示 motion timing 与 containment 也需要业务可测指标。

### 3. 已知规则被弱化为可选 acknowledgement（P1，741）

无音频 hard gate 的 wording 已经足够清楚，真正缺的是不可伪造的确认绑定。`acknowledged_findings` 不能单独解除用户意图门禁。

### 4. 证据可复核性限制（非交付根因）

4/5 精确 Bad 二进制缓存不可用；因此不能对其重新做 ffprobe、黑帧、冻结、九帧 contact sheet 或音频采样。439 是例外，已有本地媒体 QC。该限制降低复核粒度，但不推翻已有的时序 QA 证据；报告对不可复核处明确标注，不用猜测补齐。

## 待确认 Phase B 方案（本轮不执行）

以下是待用户确认的方案，不是已修改内容。

| 方案 | 目标文件/位置 | 方案类型 | 改动内容 | 根因对应 |
|---|---|---|---|---|
| A1 | `pexo-skills/generation-skill/SKILL.md` 的 post-generation QA / blocking 条款；`references/generation-preflight-gates.md` | 强化现有规则 | 为每个 selected revision 生成 revision-bound acceptance receipt：逐项列出 user hard constraints、reference-critical geometry、命名情绪/互动、变形 beat、主体静止/速度/containment；任何 `fail` 或 `indeterminate` 都阻断 handoff/delivery。 | 4/5 的 QA 结论没有进入发布决策。 |
| A2 | `pexo-skills/generation-skill/references/afc-multimodal-policy.md` 与 `references/video-generation-execution.md` | 新增验收维度 | 增加状态/连续性断言：emotion 需角色级 sampled frames；transformation 需 beat-level source displacement、organic growth、head morph、body-plan evidence；reference animation 需 center/count/orientation/end-state evidence。 | 614/407/439 是“元素存在”代替“语义满足”。 |
| A3 | `pexo-skills/modification-skill/SKILL.md` 与 `references/complaint-triage-and-reverification.md` | 强化现有规则 | 对二次修改建立 `complaint -> smallest failed evidence range -> repair -> same-range recheck -> final revision receipt` 闭环；若同一结论仍为 fail/indeterminate，禁止 `show_final_video`，不得用下一版“看起来更好”覆盖。 | 436/407 的已知失败继续被迭代/交付。 |
| A4 | `pexo-skills/motion-skill/SKILL.md` 的 hard gates；`references/design-audio-and-assembly.md` 的 audio coverage | 强化现有规则 + 新 receipt 字段 | 把 no-audio gate 改成 fail-closed：只有 user-backed `explicit_silent`（绑定 project/revision）可解除；`acknowledged_findings` 单独无效。最终 `submit_render`/`show_final_video` 必须引用该 receipt，并对 audio presence/loudness/coverage 做 final revision probe。 | 741 是明确 read-but-violated。 |
| A5 | `pexo-skills/motion-skill/SKILL.md` 的 final QA / delivery 条款 | 新增跨模态发布门 | 统一要求 final revision 的 visual semantic receipt、audio receipt、lint receipt 三者均 green；任何冲突的 sampled analysis 进入 `indeterminate` 并阻断。 | 407 的 seq73/76 冲突、436 的 seq39/50/57 冲突显示需要冲突即阻断。 |

### 新增规则 vs 修改现有规则

- **修改/强化现有规则：** A1、A3、A4，以及 A5 对现有 final QA/delivery 规则的收紧。
- **新增结构化字段/验收维度：** A2 的 emotion/interaction、reference geometry、transformation continuity、speed/containment evidence；A4 的 user-backed `explicit_silent` receipt；A5 的跨模态 revision receipt 汇合。
- **不建议本轮直接改 provider 或 `tech-*`：** 当前证据首先指向 acceptance/release control 和语义验收，不足以证明 provider/API 是主因；任何 runtime/tech 需求应在用户确认方案后另行记录到 engineering requirements。

## 证据索引

- 日报摘要：[summary.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/summary.md)
- 436 case package：[analysis.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/43623995145/analysis.md)、`tool-chain.json`、`audit-facts.json`、`assets-with-prompts.json`
- 614 case package：[analysis.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/61439774499/analysis.md)、`tool-chain.json`、`audit-facts.json`、`assets-with-prompts.json`
- 407 case package：[analysis.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/40727889270/analysis.md)、`tool-chain.json`、`audit-facts.json`、`assets-with-prompts.json`
- 439 case package：[analysis.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/43979777597/analysis.md)、`tool-chain.json`、`audit-facts.json`、`assets-with-prompts.json`
- 741 case package：[analysis.md](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/74106891613/analysis.md)、`tool-chain.json`、`audit-facts.json`、`assets-with-prompts.json`

**Phase A 状态：完成。Phase B：等待用户确认。Phase C：未进入。**
