# 2026-08-15 P1 Bad Cases — 合并 Phase A 分析

**范围**：2026-08-15 Asia/Shanghai 的 P1 Bad cases：`07491535358`、`47160372389`、`38798858134`。本报告只做 Phase A 证据分析，不执行 Phase B 改动，不进入 Phase C。

**数据源与完整性**：按 `case-analyzer` 要求读取工作区规范、`case-analyzer/SKILL.md` 与 `references/metabase-case-data.md` 全文；三案均在 production Postgres database 3。三案分别有 421、107、1489 条 `project_messages`，并且本地审计包记录的 call/result/asset 覆盖通过完整性门槛；database 5 与 Langfuse 未作为回退。以下只引用脱敏后的 project、asset 名称、工具事实和 QA 观察，不输出 user_id、签名 URL、token、邮箱、手机号或原始消息转储。

## 合并结论

三案共同暴露同一个发布控制缺口：生成、装配和局部 QA 已经产生了可操作的失败证据，但最终交付路径仍可继续到 `show_final_video`/FINAL 资产。失败类型不同，不能合并成单一模型错误：

| P1 项目 | 交付级失败 | 主要归因 | 影响 |
|---|---|---|---|
| `07491535358` | 五秒 intro 中明确要求的三次 pebble throw 未被最终交付可靠证明；title/checklist 证据冲突仍未解决 | 执行与 QA gate 混合 | 核心动作节拍不符合，需返工 |
| `47160372389` | MANAZI wordmark 在 preview QA 中缺失；后续 QA 又指出外轮廓不是干净的 lemniscate，改造后的 mark 仍交付 | 参考保真与验收混合 | 品牌识别元素和几何身份不可信 |
| `38798858134` | `LIGNE5_v1` 被 QA 明确判定不是 Renault 5 Turbo，并缺少完整 drawing-sheet 与 marker-off ending | 参考/意图保真与最终验收混合 | 核心车型和结尾叙事均不满足 |

共同的待确认方向是“显式约束 → 可核验 acceptance item → 未通过则阻断交付”，但具体检查项按项目分别定义。反馈 label/issues 仅作为 cohort 入口和症状索引，未单独作为根因证据。

## 审计快照

| 项目 | 解析 tool calls | 关键链路事实 | Skill/reference 读取观察 |
|---|---:|---|---|
| `07491535358` | 113 | 4 generation、4 media_probe、6 lint、11 frame render、14 edit、1 final show；final QC 对三 throw 评分 1/3 | generation、assembly、motion 及相关 reference 被读取；缺口在读取后没有形成 final hard gate |
| `47160372389` | 25 | 1 composition write、1 lint、3 frame render、1 edit、1 submit、1 final show；preview 明确缺 wordmark，后续几何检查失败 | brainstorm、motion 与 design/tech references 被读取；未见 brand/reference-lock acceptance artifact |
| `38798858134` | 369 | 68 video generation、50 media probe、22 lint、30 edit、12 submit、12 final show；LIGNE5 仍在失败 QA 后提交 | LIGNE 阶段读取的 routing contract 明确禁止 reference-sensitive 任务使用 text-only HappyHorse，但随后仍以无参考输入的 HappyHorse 生成四段：read-but-violated |

这些数字来自 production database 3 的 chronological message expansion 和本地脱敏 audit facts；call/result 行按 `tool_call_id` 语义配对，不能把 event row 数直接当 call 数。

## 证据基线与限制

- `07491535358`：创建至更新约 42 分钟；113 个解析后的 tool calls；21 个资产；最终资产 `pebblefairy_intro_v1.mp4` 在 01:08:48 创建，随后由 `show_final_video` 展示。
- `47160372389`：约 12 分钟；25 个 tool calls；5 个资产；最终资产 `MANAZI_logo_motion.mp4` 在 05:26:57 创建，随后由 `show_final_video` 展示。
- `38798858134`：跨 2026-08-06 至 2026-08-17 的同一 project chronology；369 个解析后的 tool calls；112 个资产；`LIGNE5_v1.mp4` 在 2026-08-15 18:25:03 创建并展示，后续 chronology 还继续到别的项目/版本上下文。
- 三案 Bad 二进制的缓存下载/播放 URL 在本次审计时不可用，不能重新执行针对该二进制的 ffprobe、blackdetect、freezedetect、音频和九帧像素检查。结论来自 chronological messages、tool results、QA 观察和资产 lineage；没有用猜测补齐媒体证据。

## Case `07491535358`

### 证据链

1. 用户意图是 5 秒、16:9 channel intro：fairy 落到 pebble 后，先连续投掷三颗 pebble（左、右、过肩），再投第四颗到镜头，随后 title/end beat。
2. 参考图分析、三张 action reference image 和两段 `video_generate` 均成功；其中 action segment 的 QA 认为三颗 pebble 与 golden trails 可见，但明确说三次投掷的左右/过肩顺序不能从采样帧完全确认。
3. 另一段 final-throw QA 认为拾取、蓄力、朝镜头投掷、停顿、smirk/hands-on-hips 均存在。也就是说，上游局部证据覆盖了不同片段，却没有形成对最终合成的逐 beat 证明。
4. 最终 QC 对交付合成给出直接计数：开场/落石通过，但“Shows 3 pebble throws with golden sparkle trails”评分为 **1/3**，证据写明在约 3.0s 只看到 **1 次**带 golden trail 的 throw，没有第二、第三次；同一 QC 还把 title 完整在画面内评为 2/3。
5. 最终 composition 阶段先后多次 `render_frame`/`analyze_file_content` 发现：fairy 局部被裁切、裂纹效果不符合、`PEBBLEFAIRY` 标题缺字/越界；后续 v2-v6 编辑和渲染虽修补部分问题，但 QA 仍反复记录标题完整性问题。
6. 最终资产 `pebblefairy_intro_v1.mp4` 被登记为 `STAGE_FINAL_VIDEO`/FINAL，并在 `show_final_video` 中展示；project chronology 没有显示一个“动作计数、标题一致性全部通过后才允许展示”的阻断事件。

### 根因

主要根因不是“没有生成三次 throw”，而是验收对象错位：上游 segment/reference QA 的局部观察被当作足以支持 final composition 的证据，未将用户的数值动作约束和 title/checklist 冲突编译成 final-media 级 hard gate。反复 edit/render 解决了部分画面问题，却没有建立“最终二进制中三次可辨识 throw + 第四次 camera throw + title/end beat”的闭环证明。

归因：模型/执行层对复杂节拍的可见性和合成后状态判断不足；流程/skill 层缺少强制的 beat-count 与冲突阻断规则。不是由反馈 label 单独推导。

### 影响

核心 intro 动作序列无法被可靠传达，用户需要重新制作；同时多轮分析、编辑和渲染消耗了执行时间，却没有降低最终交付风险。

### 待确认的 Phase B 方案（不执行）

- **目标文件/位置**：`pexo-skills/script-skill/references/script-handoff-contract.md` 的 handoff schema；`pexo-skills/generation-skill/references/generation-handoff-contract.md` 的 QA/lineage 字段；`pexo-skills/motion-skill/SKILL.md` 的 final QA 与提交前 gate。
- **新增规则**：在 Script/Assembly-to-Motion handoff 中生成“显式约束验收表”，为每个 timed beat、数量约束和 title 文本指定可观察证据。
- **修改现有规则**：Motion final QA 必须对最终合成二进制重新检查，而不是只复用 segment QA；动作计数、顺序、title 字符完整性或 checklist 有任一 `unknown/failed/conflict` 时，禁止 `show_final_video`/最终提交。
- **根因对应**：把当前的“证据已收集”改成“最终交付满足每个硬约束才可发布”，避免局部通过掩盖合成后失败。

## Case `47160372389`

### 证据链

1. 用户要求 square logo motion，品牌标志由 owl-eye、glasses-like eye form 和 clean infinity/lemniscate 构成，并明确没有 water-wave imagery；源标志包含 MANAZI wordmark。
2. `analyze_file_content` 对源 logo 的描述识别了“icon + wordmark”结构；但实际执行只读取 brainstorm、motion 及 motion 设计/tech 文件，未见专门的 logo/reference-lock acceptance artifact。
3. 最终 composition 的 QA/preview 观察明确记录 MANAZI wordmark 缺失；后续观察又把结果描述为更接近“两只眼睛”而非源 owl/infinity mark，并指出替代 outer path 不是干净的数学 lemniscate：外轮廓虽是横向双环，但上下中心是尖锐 V 形凹口、不是平滑连续的标准 infinity path。
4. 即使这些失败证据已经出现，`lint_composition`、`render_frame`、`submit_render`、`query_render` 继续完成，`MANAZI_logo_motion.mp4` 被登记为 STAGE_FINAL_VIDEO/FINAL 并由 `show_final_video` 展示。

### 根因

参考图被用于启发视觉方向，却没有被转化为品牌关键元素的不可变约束：wordmark、owl/infinity 语义和 lemniscate 几何都没有对应的 blocking comparison。后续修补接受了“看起来接近”的替代 mark，说明决策标准从 source-equivalence 退化为风格相似。

归因：下游生成/编辑对品牌几何保真不足是执行因素；缺少 reference-lock 和 brand-critical acceptance gate 是主要流程/skill 因素。反馈 label 只说明用户感知为错误风格，不能单独证明上述根因。

### 影响

交付物不能稳定代表 MANAZI 品牌，wordmark 缺失和几何变形会使 logo motion 无法直接使用，并增加后续返工与品牌风险。

### 待确认的 Phase B 方案（不执行）

- **目标文件/位置**：`pexo-skills/motion-skill/references/design-cutout-and-brand.md` 的 brand/reference 约束；`pexo-skills/motion-skill/SKILL.md` 的 render QA gate；必要时由 `pexo-skills/generation-skill/references/generation-preflight-gates.md` 承载生成前锁定。
- **新增规则**：Logo/brand reference lock，先登记品牌关键元素（wordmark、核心轮廓、负空间关系、禁止元素），再允许生成和动画化。
- **修改现有规则**：最终 QA 对源 reference 与 final-media 关键帧做元素级比对；wordmark 缺失、核心几何非等价或出现禁止 imagery 时，状态必须为 blocked，不得提交或展示。
- **根因对应**：把“视觉相似”提升为“品牌关键元素等价”，并让 preview QA 失败直接阻断后续 finalization。

## Case `38798858134`

### 证据链

1. 该 project chronology 很长，包含多轮车型/视频上下文；本次 P1 目标资产是 `LIGNE5_v1.mp4`，对应 2026-08-15 的四段 drawing sequence 资产（`ligne5_seq1_paper`、`ligne5_seq2_arches`、`ligne5_seq3_intakes`、`ligne5_seq4_wheel_reveal`，另有 `ligne5_seq1_paper_v2`）。
2. LIGNE 阶段先读取了 `video-models-routing.md`；读到的 Hard Block 明确写着 HappyHorse 是 text-only，必须保留 references 时不能使用。随后四个 LIGNE 段仍全部调用 `dashscope/happyhorse-1.0-t2v`，参数只有文本 prompt，没有 image/video reference payload。这是结果相关的 read-but-violated。
3. 对 Bad `LIGNE5_v1` 的 QA 明确判定画出的 vehicle 不是 1980 Renault 5 Turbo，而是另一种长车头 sport-car silhouette；另一个 final-beat QA 明确指出相机没有完整展示 drawing sheet，且视频结束前 marker 仍在手中，没有可见 marker-off。chronology 还记录手/车型连续性不一致。
4. 发现首段车型错误后，只重生成了 `ligne5_seq1_paper_v2`；其 QA 认为基本比例改善。但 ending 段没有因“full sheet/marker-off 失败”而重生成，最终 composition 仍由这些分段组成，未形成完整的全片修复。
5. LIGNE composition 的首次 lint 报告 same-track overlap；修正后仍保留三处 audio overlap questions。`submit_render` 以 acknowledged findings 继续，随后 `LIGNE5_v1.mp4` 被登记为 STAGE_FINAL_VIDEO/FINAL 并由 `show_final_video` 展示。lint acknowledgement 本身不证明车型和 ending-beat 合格。

### 根因

第一根因是路由规则被读取后仍被违反：这是 reference-sensitive 的 Renault 5 Turbo 任务，却选择了 text-only HappyHorse 且没有传入车型 reference，直接放大了身份漂移风险。第二根因是修复与 release gate 不完整：发现首段车型错误后只替换首段，没有把完整 drawing-sheet、marker-off、hand/object continuity 作为最终版本的阻断项；因此局部 QA/lint 通过不代表整片满足核心意图。

归因：模型/生成层在无 reference 的 text-to-video 路由中出现车型与连续性漂移；agent 决策层 read-but-violated 是直接可预防因素；流程/skill 层还缺少 reference-identity、ending-beat 和 final-version binding 的阻断规则。lint findings 是装配风险的旁证，但不能单独解释车型错误；反馈 issues 也没有被当作根因。

### 影响

视频既不能作为 Renault 5 Turbo 的绘制演示，也没有完成用户要求的“完整图纸 reveal → marker-off”叙事收束；手和车型不连续进一步损害可信度，导致大部分素材不可用。

### 待确认的 Phase B 方案（不执行）

- **目标文件/位置**：`pexo-skills/script-skill/references/subject-definition-framework.md` 的 subject identity；`pexo-skills/generation-skill/references/generation-handoff-schema.md` 的 identity/lineage；`pexo-skills/motion-skill/references/design-beat-planning.md` 与 `pexo-skills/motion-skill/SKILL.md` 的 ending-beat/final gate。
- **新增规则**：对每个 reference-sensitive sequence 生成 identity manifest，绑定车型/主体、手、道具和最终版本；所有 ending beats 也列为必需证据。
- **修改现有规则**：Final QA 必须在 LIGNE5_v1 对应的最终二进制上验证车型身份、完整 drawing sheet、marker-off、hand/object continuity；任一失败或 unknown，禁止提交。
- **修改现有规则**：把当前 routing Hard Block 接入 generation preflight：当 identity manifest 标记 `reference_preservation_required=true` 时，text-only HappyHorse 必须被执行层拒绝；finalization 同时显式绑定当前 sequence、source references 和 final asset lineage。
- **根因对应**：将“生成了若干可播放片段”改成“目标身份、结尾 beat 与资产版本均被证明后才可发布”。

## 跨案 Phase B 决策清单（待用户确认）

以下是一个合并方案，不拆成三个独立任务：

1. **新增统一 release gate**：把用户明确的数量、顺序、品牌/主体身份、文字、结尾 beat 编译为最终媒体 acceptance items；`unknown`、`failed`、矛盾证据均阻断交付。
2. **新增 reference-lock 分支**：logo、车型和 recurring subject 必须登记关键不可变元素及禁止元素，并在 final keyframes/视频上逐项比对。
3. **修改 final QA 顺序**：任何 composition edit、版本切换或 asset lineage 变化后，必须重新检查最终二进制；不能用旧 segment QA 代替。
4. **新增版本绑定**：最终提交记录 sequence/beat manifest、source reference IDs、final asset ID 和 QA verdict，避免长 chronology 中跨项目/跨版本污染。
5. **保留当前限制**：本次不修改任何 Skill、tech-*、Admin、Release、线上项目、资产、消息或反馈；不进入 Phase C。

方案类型区分：统一 release gate、reference-lock、identity manifest 是**新增规则**；final-media recheck、版本绑定和提交前阻断是对现有 handoff/final-QA 规则的**修改**。上述目标文件仅是待用户确认后的候选落点，本轮未改动。

只有在用户明确确认上述 Phase B 方案（可全部、部分或修改）后，才可另行进入改动评估。

## 本地证据索引

- [日期摘要](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/summary.md)
- [07491535358 分析](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/07491535358/analysis.md) · [tool-chain.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/07491535358/tool-chain.json) · [audit-facts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/07491535358/audit-facts.json) · [assets-with-prompts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/07491535358/assets-with-prompts.json)
- [47160372389 分析](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/47160372389/analysis.md) · [tool-chain.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/47160372389/tool-chain.json) · [audit-facts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/47160372389/audit-facts.json) · [assets-with-prompts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/47160372389/assets-with-prompts.json)
- [38798858134 分析](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/38798858134/analysis.md) · [tool-chain.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/38798858134/tool-chain.json) · [audit-facts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/38798858134/audit-facts.json) · [assets-with-prompts.json](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-15/cases/38798858134/assets-with-prompts.json)
