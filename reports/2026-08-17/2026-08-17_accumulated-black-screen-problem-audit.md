# 当前积累的黑屏问题审计

- 审计日期：2026-08-17
- 模式：Fleet audit / 已有证据归并
- 证据范围：2026-06-16 至 2026-08-13 已落盘单案、2026-08-05 至 2026-08-11 每日评分与 Bad case 审计
- 边界：本报告盘点已知问题池，不是全量线上发生率；同一 Case 只计一次，没有重新扫描生产全量数据
- 状态：Phase A，只读；未修改 Skill、Runtime、`tech-*`、Admin 或线上项目

## 结论

当前积累的黑屏问题不是一个单点 Bug，而是三类上游缺陷加一个共同的交付逃逸口：

1. **视觉覆盖不足**：短素材被塞进更长的旁白或场景窗口，素材播完后露出黑底。
2. **Motion / HyperFrames 时间线结构错误**：非法 sequence、嵌套 timed media、错误 lane/track 或渲染预处理导致有流但无像素内容。
3. **全屏遮挡生命周期错误**：黑色转场层、Banner 或 clip-path mask 在不该出现的时间覆盖主画面。
4. **最终交付门禁失效**：`lint_composition`、render done、metadata probe、audio probe 或少量 `render_frame` 被当作最终 MP4 已验收，导致上述三类问题都能进入 `show_final_video`。

现有策略文件已经补了视觉覆盖、禁止重复填充、source playable cap 和 final revision 复核等规则，但仓库内仍看不到系统自动生成的 `media_probe(mode=final_qc)`、revision-bound deterministic receipt，或 `show_final_video` 的 fail-closed 强制依赖。因此，**策略层已部分缓解，P0 交付门禁仍未闭环**。

## 已知问题规模

### 最近统一评分窗口

2026-08-05 至 2026-08-09 的 12 个 P1 最终媒体合计 733.285 秒，其中：

- blackdetect 累计 267.083 秒，占 36.4%；
- freezedetect 累计 403.249 秒，占 55.0%；
- 6/12 项目有明确技术黑屏：`62420823062`、`50645523562`、`20865641982`、`12231532353`、`37026038605`、`65935633483`；
- 其余主要是冻结、静态卡片或无音轨，属于同一最终媒体门禁的近邻问题，不能全部算作黑屏。

随后新增的已确认样本包括：

- `79604626571`：开场后约 89% 时长黑屏；三段上游视频正常，最终 composition 遮住画面。
- `69576318368`：首版 24 秒最终视频全黑但有声音；12 秒源视频正常。

再加上此前独立落盘的 `10149930612`、`93650081586`、`03249823990`、`97257777324`，当前已知问题池至少覆盖 **12 个有确定技术黑屏或关键空白窗口证据的项目**。这个数字用于维护回归集，不代表线上发生率。

`05468909925` 单独归为“近黑设计退化”：画面大面积黑底、低信息密度，但不是视频像素链断裂，不应和技术黑屏混算。

## 根因分桶

| 根因簇 | 代表 Case | 已确认机制 | 当前缺口 |
|---|---|---|---|
| A. 素材时长不足，时间轴留洞 | `10149930612`、`12231532353`、`20865641982`、`03249823990` | 约 5-15 秒素材覆盖 18-32 秒窗口；素材结束后露出黑底，或 loop/sequence 实际失效 | 规划覆盖表没有成为 render preflight 的机器硬约束 |
| B. 非法 sequence / timed-media 结构 | `93650081586`、`69576318368`、`65935633483` | 嵌套 timed media、普通 sequence child 手写 lane、缺失/冲突 timing，输出容器成功但多数像素为黑 | 文档有规则，lint/preprocessor 没有完整拒绝这些结构及异常成片时长 |
| C. 全屏遮罩或 mask 生命周期错误 | `50645523562`、`79604626571`、`97257777324` | 黑色 transition overlay、常驻 Banner、clip-path 变量绑错元素，主画面被顶层覆盖或裁空 | lint 不理解顶层覆盖的实际可见时间与 CSS 变量 owner |
| D. 修复路径制造二次问题 | `03249823990`、`69576318368`、`79604626571` | 用同源重复素材替代黑屏、检查源素材而不是已交付 MP4、修掉黑层后又被 Banner 常驻覆盖 | 投诉恢复没有强制绑定 complained window 和 exact final revision |
| E. 近黑视觉退化 | `05468909925` | 黑底极简模板、主体过小、信息密度过低，技术上可播放 | 确定性 blackdetect 不能单独判断，需要 AFC/语义质量门禁 |

## 代表性事实

| Case | 最终媒体事实 | 直接根因 | 为什么被放行 |
|---|---|---|---|
| `12231532353` | 168 秒；黑屏 107.7 秒（64.1%），冻结 94.033 秒 | 短视频未覆盖长旁白窗口 | 已知 coverage gap 被 acknowledge；最终只做 info probe |
| `20865641982` | 165.312 秒；黑屏 99.458 秒（60.2%） | sequence child clip/loop 结构失效 | AFC 长片汇总失败，仍未形成 fail-closed receipt |
| `10149930612` | 164.352 秒；黑屏 63.067 秒（38.4%） | 13-15 秒源片被拉到 18-29 秒窗口 | lint 只验结构，不验每秒视觉覆盖 |
| `50645523562` | 30 秒；黑屏 20.067 秒（66.9%），无音轨 | 全屏黑色转场层长期可见 | lint 修掉旧问题后，没有继续检查新遮罩生命周期 |
| `79604626571` | 全片 91.5% 帧为暗帧 | `fade-overlay` / Banner 等顶层元素遮住正常源视频 | 最终 MP4 没有视觉分析，只验证渲染和文件存在 |
| `69576318368` | 首版 24 秒全黑、有声音；修正版 12.011 秒正常 | 单视频被错误包进 one-child sequence，child timing 违规 | 只查了音频；24 秒对 12 秒的时长异常也未阻断 |
| `93650081586` | 93 秒容器和音视频流正常，多数后续 scene 为黑底 | recovery 分段中嵌套 timed media | 分段 render success 被当作画面正确 |
| `97257777324` | 15 秒核心 reveal 帧几乎全黑；最终无音轨 | clip-path 变量写在 inner child，实际裁剪 owner 在 parent | frame 已渲出空白，但没有语义 verdict 阻断 |

## 当前已具备的缓解

当前本地策略已经包含：

1. Assembly 必须建立 sequence coverage map，禁止用无关重复片段或 stretch filler 补缺口。
2. Motion 禁止重复源视频填充 VO，`measured_visual_coverage_plan` 每组必须为 `covers`。
3. `tech-html.md` 已要求用 `derived.video_playable_seconds` 约束 `<video data-duration>`，禁止超过可播放上限。
4. Motion 已要求最终 revision 重新检查 Pass B 风险，旧预览 receipt 不能证明最终 MP4。
5. 当前规则已识别 root background、重复 id、缺失稳定 timed-media id 等会导致 final black 的 silent layout bug。

这些改动能减少 Agent 主动写错，但多数仍依赖 Agent 阅读、执行和自报结果，不能代替服务端门禁。

## 仍未闭环的问题

### P0：最终 MP4 双 receipt 交付门禁仍缺失

已有工程需求已经定义：render 完成后，系统自动对 exact final MP4 并行执行 AFC 语义 QC 与 deterministic media QC，receipt 绑定 `render_job_id + final_asset_id + content_hash + composition_hash`；任一 `fail`、`insufficient`、missing 或 stale 都阻断 `show_final_video`。

当前仓库检查结果：

- 没有发现 `media_probe(mode=final_qc)` 在 Motion workflow 中成为可执行硬门；
- 没有发现 `FINAL_QC_MISSING`、`FINAL_UNDECLARED_BLACK` 等服务端拒绝合同被当前 Skill 消费；
- Motion 明确的 Hard Gate 仍主要是 audio probe；最终视觉检查位于自然语言 `Post-render sanity`；
- Pass B 仍以若干 `render_frame` 样本为主，无法替代全片 black/freeze/decode 扫描。

因此这项不是“再写一条 Skill 提醒”能解决，必须保留为 P0 Runtime / Delivery 工程项。

### P1：render preflight / lint 仍缺三组结构检查

1. 根据已 probe 的 playable duration，拒绝所有未声明意图的视觉覆盖不足。
2. 拒绝非法 nested timed media、one-child sequence 异常、普通 sequence child lane/track 冲突，以及 root duration 与渲染结果明显不一致。
3. 检查 full-screen overlay 的可见生命周期、结束时残留、z-index 覆盖，以及 clip-path/CSS variable 的动画目标与实际 owner 是否一致。

### P1：投诉恢复缺 exact-final-first 规则

用户投诉“黑屏、空白、只有声音”时，第一步必须检查已交付 final MP4 及投诉时间窗，而不是源视频、旧预览帧或 composition metadata。每次修改后都要在新 revision 上复验 complained window 和不受影响区间。

### P2：技术黑屏与有意黑底需要分层判定

FFmpeg 负责逐帧事实，AFC 负责业务语义。黑底标题、用户明确的 blackout、静态 end card 可以有精确上游声明，但 AFC 的“看起来像有意设计”不能覆盖未声明的 blackdetect fail。`05468909925` 这类近黑低信息密度则必须由 AFC/业务质量判断，不能仅靠亮度阈值。

## 建议处理顺序

1. **先完成 P0 final receipt gate**：它不能修复根因，但能立即阻止坏片交付。复用现有 `2026-08-07_final-mp4-deterministic-media-qc-requirement.md`，不要重复拆票。
2. **再补 P1 render preflight/lint**：优先覆盖 playable duration、sequence graph 和 full-screen overlay 三类已复现机制。
3. **把 12 个技术黑屏项目固化为回归集**：每个 case 保留预期错误码、黑屏区间、修复后 pass 条件；另放一个合法黑底负例。
4. **补投诉恢复门禁**：exact final first、complained window first、new revision recheck。
5. **单列近黑设计质量**：用 AFC 检查主体面积、信息密度和必需内容，不和 deterministic blackscreen 指标混算。

## Phase B 待确认项

本轮没有修改任何规则。若进入修复，建议只确认以下三包，避免重复建设：

1. **沿用现有 P0 工程需求**：final MP4 双 receipt + `show_final_video` fail-closed。
2. **新增/强化 P1 lint 与 preflight**：visual coverage、sequence graph、fullscreen overlay/mask lifecycle。
3. **修改现有 Modification 恢复规则**：黑屏投诉强制 exact-final-first 和 complained-window regression。

## 证据索引

- `analysis/2026-08-11_p1-fleet-phase-a.md`
- `analysis/2026-08-07_final-mp4-deterministic-media-qc-requirement.md`
- `analysis/2026-08-09_bug-final-video-delivered-without-exact-qc-receipt.md`
- `analysis/2026-08-06_afc-black-screen-detection-smoke-test.md`
- `analysis/12231532353_168s_long-black-screen-freeze.md`
- `analysis/20865641982_165s-sequence-child-clip-removal-and-loop-failure.md`
- `analysis/10149930612_164s_black-screen-visual-coverage-gap.md`
- `analysis/50645523562` 证据见 `analysis/BUG-50645523562-motion-fullscreen-cover-black-screen.md`
- `analysis/79604626571_1h26m_black-screen-overlay-and-qc-bypass.md`
- `analysis/69576318368_12m22s-black-final-from-invalid-hyperframes-sequence.md`
- `analysis/93650081586_93s_nested-timed-video-black-screen.md`
- `analysis/03249823990_4h04m_black-screen-repaired-by-repeated-footage-and-credit-stranding.md`
- `analysis/97257777324_27s-clearboard-dom-mask-and-passb-failure.md`
- `analysis/05468909925_60s-black-minimal-hyperframes-overcomplex-render-recovery.md`
