# 线上多模态质检问题：最终成片检查没有形成交付门禁

- 审计日期：2026-08-13
- 数据范围：`2026-08-06T00:00:00Z` 至 `2026-08-13T00:00:00Z`（结束时间不含）
- 环境：production
- 数据源：Metabase BigQuery database 2，`pexo_ods.project_messages`
- 审计对象：`show_final_video` 前是否检查了同一路径的最终 MP4，以及结果是否能阻止交付
- 统计单位：一次 `show_final_video` 调用；同一项目的多个版本或重复展示分别计数

## 结论

线上多模态质检的核心问题不是“模型偶尔看错”，而是**最终成片质检没有形成可执行的交付合同**。

过去 7 个完整 UTC 日共有 2,385 次成片展示，涉及 1,058 个项目：

- 只有 873 次（36.6%）在展示前用 `analyze_file_content` 检查过同一路径的最终 MP4；由于同路径可能被覆盖，这还是 revision 覆盖率的乐观上限。
- 只有 155 次（6.5%）使用 `mode=pro`；只有 21 次（0.9%）要求 `output=qc_json`。
- 只有 987 次（41.4%）对同一最终文件做过任意 `media_probe`；线上当前合同只支持 `info` / `audio`，不存在 `mode=final_qc`。
- 同时存在 AFC 与任意媒体 probe 的只有 164 次（6.9%）。
- 689 次（28.9%）既没有检查最终 MP4 的 AFC，也没有对同一文件做任何 media probe。
- 至少 44 次在最新 AFC 明确出现编号项 `No` 或 `Partially confirmed` 后，仍展示了同一路径的 MP4。这个数字只覆盖容易被 SQL 稳定识别的英文格式，是下限，不是完整失败数。

因此当前真实链路更接近：

```text
生成/渲染完成
  -> Agent 可选地检查中间素材、截图或最终 MP4
  -> AFC 返回自由文本，可能明确指出失败
  -> Agent 自行解释
  -> show_final_video 仍可成功
```

而不是：

```text
最终 MP4 revision
  -> 语义多模态 QC receipt
  -> 确定性媒体 QC receipt
  -> 两者都绑定当前 revision 且 pass
  -> show_final_video 放行
```

## 线上规模

| 指标 | 数量 | 占 2,385 次展示 |
|---|---:|---:|
| 最终 MP4 做过同路径 AFC | 873 | 36.6% |
| 最终 MP4 AFC 使用 `pro` | 155 | 6.5% |
| 最终 MP4 AFC 使用 `qc_json` | 21 | 0.9% |
| 最终 MP4 做过任意 `media_probe` | 987 | 41.4% |
| 线上已有 `media_probe(mode=final_qc)` | 不存在 | 不适用 |
| 同时有 AFC 与任意 probe | 164 | 6.9% |
| AFC 和 probe 都没有 | 689 | 28.9% |
| AFC 明确否定/部分满足后仍展示 | 44 | 1.8% |

### 每日趋势

| UTC 日期 | 展示次数 | 同路径最终 AFC | 覆盖率 |
|---|---:|---:|---:|
| 2026-08-06 | 339 | 89 | 26.3% |
| 2026-08-07 | 344 | 122 | 35.5% |
| 2026-08-08 | 282 | 109 | 38.7% |
| 2026-08-09 | 349 | 127 | 36.4% |
| 2026-08-10 | 346 | 134 | 38.7% |
| 2026-08-11 | 496 | 189 | 38.1% |
| 2026-08-12 | 229 | 86 | 37.6% |

8 月 6 日后覆盖率有所抬升，但随后稳定在 36%-39%，没有继续收敛到可作为交付门禁的水平。

## 问题清单

### P0：`show_final_video` 不依赖当前最终版本的质检 receipt

这是最直接的放行漏洞。44 次可稳定识别的展示中，AFC 已经对同一路径最终 MP4 给出明确否定或部分满足，`show_final_video` 仍然成功。

代表样本：

| 项目 | 最终 AFC 发现 | 后续行为 |
|---|---|---|
| `91655510316` | 两位主持人的特写顺序颠倒；一个要求出现文字的场景没有文字 | 29.8 秒后展示同一 MP4 |
| `99418538443` | 广场大字是 `NEWBORNA`，不是 `NEWBORN`；总时长也不是严格 15 秒 | 23.0 秒后展示同一 MP4 |
| `72817213609` | `mode=pro` 只部分确认食物素材，要求的 burger 没有出现 | 43.0 秒后展示同一 MP4 |
| `67696492678` | 要求贯穿素材段的橙色字幕条缺失 | v1 仍被展示，之后才做 v2 修复 |
| `99418538443` | Logo 和电话出现在车门而非车顶广告牌，广告牌动画也没实现 | 该版本仍被展示 |

这说明“Agent 有看质检结果”不是充分条件。只要结果仍是自然语言，最终放行权仍在 Agent，自然会出现忽略、宽松解释或把局部成功当整体成功。

### P0：最终成片覆盖率不足，且没有确定性全片 QC

63.4% 的展示没有对同一路径最终 MP4 做 AFC；58.6% 没有对同一路径做任何 `media_probe`。当前线上 `media_probe` 只有 `info` / `audio`，无法执行完整 final QC；`final_qc` 是尚未建设的建议能力，不是现有工具模式。

现有 `media_probe(mode=info|audio)` 只能证明部分 metadata、时长或音轨事实，不能等价于完整解码、黑屏、冻结、异常静音、尾黑和音轨合同检查。仅有任意 probe 的 41.4% 也不能解释为“媒体健康检查通过”。

### P1：AFC 输出主要是自由文本，无法可靠消费

873 次同路径最终 AFC 中，只有 21 次使用 `output=qc_json`。其余结果主要是 `Conclusion / Evidence / Indeterminate` 的自由文本。

直接后果：

- `No` 可能是“没有问题”，也可能是“要求没有满足”，Agent 或正则无法稳定区分。
- combined 输出会把视觉和音频的 `Indeterminate` 混在一起，不能直接映射整体验收状态。
- “部分满足”“无法判断”“缺少对照素材”没有统一映射为 `warn / fail / insufficient`。
- 无法把 verdict 与 final asset hash、revision、render job 和 policy version 绑定。

### P1：当前共享 AFC 规范没有“最终成片交付验收”节点

当前 `afc-multimodal-policy.md` 的 Activation matrix 包含：用户素材 intake、生成素材 acceptance、Visual Map、Rendered-frame Overlay QC，但没有 Final Render Acceptance。

其 receipt schema 的 `analysis_purpose` 也只有：

```text
asset_intake | generation_acceptance | visual_map | overlay_qc
```

Motion 的 `SKILL.md` 虽然在最后写了“对 final mp4 revision 重查 Pass B 风险”，但没有规定：

- 必须使用 `scope=combined|visual`、`mode=pro`、`output=qc_json`；
- 必须检查完整的 expected / forbidden / motion / audio 合同；
- `warn / fail / insufficient` 如何影响交付；
- receipt 必须绑定 final asset revision/hash；
- 缺 receipt 或旧 receipt 时 `show_final_video` 必须失败。

所以当前规则有“应该复查”的方向，但没有可落地的 final acceptance contract。

### P1：质检问题设计仍会制造假通过

已有线上 Case 还证明了另一类独立风险：即使 AFC 返回肯定答案，问题本身也可能问错。

- 只问“是否好看/是否专业”，没有把用户硬要求逐项编译成 expected / forbidden contract。
- 检查中间分段或 PNG，不检查最后展示的 MP4。
- 用视觉理解判断透明通道、冻结、音轨存在等确定性事实。
- 对双主体持续动作、精确文字、人物/产品身份等高风险项，只做宽泛描述，没有 fail-seeking 证据要求。

因此服务端门禁能阻止“明确失败仍交付”，但不能自动解决所有 AFC 假通过；质检合同和确定性检查仍要一起补齐。

## 根因归因

| 层级 | 根因 | 归属 |
|---|---|---|
| 交付层 | `show_final_video` 不验证当前 revision 的 QC receipt | 工程 P0 |
| 媒体层 | 线上 `media_probe` 只有 `info` / `audio`，完整 final QC 能力尚未建设 | 工程 P0 |
| 策略层 | AFC 规范缺少 final render acceptance 节点与 receipt purpose | Skill P1 |
| 消费层 | 自由文本结果由 Agent 自行解释，没有统一状态机 | 工程 + Skill P1 |
| 质检设计 | expected / forbidden / motion / audio 合同不完整，导致漏问或宽泛通过 | Script/Motion/Modification P1 |
| 模型层 | 复杂动作、身份、文字、透明度等仍可能误判 | 模型与专项 verifier P2；不是本次第一根因 |

## 修改方案（等待确认）

### 方案 1：补齐共享 AFC 最终成片验收合同（修改现有规则，P1）

- 目标文件：`pexo-skills/{generation,image-production,subject-asset,motion}-skill/references/afc-multimodal-policy.md` 中自包含的四份副本。
- 修改位置：Activation matrix、Stage rules、receipt schema、Decision rules。
- 改动内容：新增 `Final rendered video acceptance`；新增 `analysis_purpose: final_render_acceptance`；规定 exact final MP4 使用真实声画 modality、`mode=pro`、`output=qc_json`，消费 expected / forbidden / motion-required / audio-required 合同；`fail` 或 `insufficient` 不得交付。
- 为什么：当前共享规范只管素材和中间检查，没有定义最终交付验收。

### 方案 2：把 Motion 第 8 步改成明确可执行的门禁（修改现有规则，P1）

- 目标文件：`pexo-skills/motion-skill/SKILL.md`。
- 修改位置：Hard gates 与 Workflow Step 8。
- 改动内容：规定 final MP4 必须取得 `final_render_acceptance` 与 deterministic media receipt；任何重新渲染、拼接、改音频或覆盖文件都使旧 receipt 失效；禁止用 Pass B PNG、中间分段或 `media_probe(info|audio)` 替代。
- 为什么：当前“recheck risks”措辞太软，没有参数、状态和 revision 绑定要求。

### 方案 3：实现 `show_final_video` 服务端双 receipt 门禁（新增工程要求，P0）

- 目标：交付服务 / `show_final_video`，不是修改 `tech-*` 文件。
- 改动内容：当前 final asset revision/hash 必须同时存在 semantic AFC receipt 与 deterministic media receipt，且状态均为 `pass`；缺失、失败、`insufficient`、旧 revision 或汇总失败分别返回稳定错误码并拒绝展示。
- 为什么：Skill 只能提高遵循率，不能阻止 Agent 忽略质检结果。
- 已有工程需求：`analysis/2026-08-09_bug-final-video-delivered-without-exact-qc-receipt.md`；本报告补充了最新 7 日全量调用证据。

### 方案 4：建设确定性 final QC 并与 AFC 并行（新增工程要求，P0）

- 目标：新增确定性媒体 QC 服务；如复用 `media_probe`，再新增并正式发布 `mode=final_qc`。
- 改动内容：完整解码、duration、stream、black/freeze、audio presence/silence 检查，绑定 final revision；只对上游明确声明的黑场、静帧、静音窗口做精确豁免。
- 为什么：AFC 不应承担像素透明、音轨、黑屏比例、冻结和完整解码等确定性事实。

### 方案 5：建立 shadow -> gate 线上指标（新增观测规则，P1）

- 指标：exact-final semantic receipt coverage、deterministic receipt coverage、dual-pass coverage、negative-result delivery prevented、insufficient rate、revision mismatch、AFC 与 deterministic 分歧。
- 上线门槛：先 shadow；稳定后开启 `show_final_video` gate；最后再下线 `render_frame` 的交付验收角色。
- 为什么：不能直接把当前 0.9% 的结构化覆盖率切成强阻断而没有容量与失败率观测。

## 新增规则与修改现有规则

| 类型 | 内容 |
|---|---|
| 修改现有 Skill 规则 | AFC policy 新增最终成片节点；Motion Step 8 从原则性复查改为参数化、revision-bound 的阻断流程 |
| 新增工程要求 | `show_final_video` 双 receipt 强门禁；确定性 final QC 服务（如复用 `media_probe`，需新增并发布 `final_qc` mode）；稳定错误码与 revision 失效机制 |
| 不应直接修改 | `tech-*` 参考文件；按工作区规则，技术层缺口记录为工程 requirement，由工程实现合同 |

## 口径限制

1. 本报告以文件路径相等判断“同一最终 MP4”。如果文件被原路径覆盖，旧检查可能被错误计为命中，因此 36.6% 是上限。
2. 统计的是展示调用，不是唯一项目或唯一资产；多轮版本会重复计数，因为每次展示本身都需要独立交付门禁。
3. `No / Partially confirmed` 的 44 次只使用保守英文格式匹配；它不能覆盖中文否定、非编号否定、模型委婉表达或错误的肯定结果。
4. BigQuery 用于完整历史窗口；最新数小时可能受同步延迟影响，所以选择了截至 2026-08-13 00:00 UTC 的完整 7 日窗口。

## 证据文件

- 汇总数据：`analysis/case-data/recent-7d-final-multimodal-qc-2026-08-13/summary.json`
- 快速摘要：`analysis/case-data/recent-7d-final-multimodal-qc-2026-08-13/report.md`
- 既有工程方案：`analysis/2026-08-09_bug-final-video-delivered-without-exact-qc-receipt.md`
