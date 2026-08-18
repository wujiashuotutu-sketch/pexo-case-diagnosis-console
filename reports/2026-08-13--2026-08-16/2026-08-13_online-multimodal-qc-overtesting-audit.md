# 线上多模态质检过度检查审计

- 审计日期：2026-08-13
- 数据范围：`2026-08-06T00:00:00Z` 至 `2026-08-13T00:00:00Z`（结束时间不含）
- 环境：production
- 数据源：Metabase BigQuery database 2，`pexo_ods.project_messages`
- 审计对象：`analyze_file_content`、`media_probe`、`render_frame` 的重复、短时重跑和模式升级

## 结论

线上确实存在重复质检，但**目前证据不足以说整体存在大面积“过度质检”**。更准确的判断是：

1. **项目级多次质检很常见，但多数是合理的多素材、多版本或不同检查目的。**
2. **AFC 的强过度信号很小**：同一项目、同一路径、30 分钟内、`mode/scope/query` 完全相同的重复，仅 17 个调用边、15 个文件组，约占带路径 AFC 调用的 0.09%。
3. **短时重复中，失败/空结果重试占明显部分。** 代表样本显示，重复通常发生在模型 429、空结果、文件无法解析后，或从完整 Gate 检查改为更窄的 style check；这些不应简单计作浪费。
4. **`media_probe` 更有重复优化空间**：6,611 次调用中，311 次是同一项目、同一路径、同一 mode 的后续调用，137 次发生在前一次后的 30 分钟内。由于 `media_probe` 只有线上已有的 `info` / `audio` mode，这些重复应优先做幂等缓存和失败重试抑制。
5. **真正值得治理的是“没有新假设却重跑”的极少数 AFC 调用，以及 `pro` 的无条件升级。** 不能把所有 `pro` 或所有重复都判为过度。

因此当前结论为：**存在局部过度质检，严重度 P2；不是全链路普遍过度。当前更大的线上风险仍是最终成片检查覆盖不足和质检结果不能阻止交付。** 详见既有报告：[`2026-08-13_online-multimodal-final-qc-audit.md`](./2026-08-13_online-multimodal-final-qc-audit.md)。

## 量化结果

### AFC（`analyze_file_content`）

| 指标 | 数量 | 口径 |
|---|---:|---|
| 调用总数 | 19,776 | 带文件路径的有效调用 |
| 项目数 | 1,857 | 至少有一次 AFC |
| 项目+路径文件组 | 17,845 | 路径不等于不可变 revision |
| 第一次之后的重复调用 | 1,931 | 占 9.8% |
| 前后 30 分钟内的重复调用 | 1,423 | 占 7.2% |
| 前后 30 分钟内 mode/scope/query 完全相同 | 17 | 占 0.09% |
| 含 `pro` 调用 | 2,044 | 占 AFC 总量约 10.3% |
| `pro` 紧邻同一路径前一次调用 | 444 | 不能直接判定为升级浪费 |
| `standard -> pro`（30 分钟内） | 79 | 可能是失败后的 targeted confirmation |
| `fast -> pro`（30 分钟内） | 27 | 可能是从 intake 转高风险验收 |
| `pro -> pro`（30 分钟内） | 208 | 需要结合结果和版本判定 |

首次调用 mode 分布为：未设置 6,179、`fast` 5,225、`standard` 4,841、`pro` 1,600。首次即 `pro` 的文件约 9.0%，这部分包含高风险身份、动作、风格或精确文本检查，不能仅凭 mode 判定过度。

### `media_probe`

| mode | 调用数 | 同项目+路径+mode 后续调用 | 30 分钟内重复 |
|---|---:|---:|---:|
| 未设置 | 3,325 | 188 | 77 |
| `audio` | 2,126 | 80 | 40 |
| `info` | 1,160 | 43 | 20 |
| 合计 | 6,611 | 311 | 137 |

线上当前 `media_probe` 只有 `info` / `audio`。不存在 `media_probe(mode=final_qc)`；`final_qc` 是待建设能力，不是线上现状。

### `render_frame`

7 日内共有 7,107 次调用、706 个项目。当前工具参数没有稳定的 `file` 路径字段，无法用本次同一文件+同一时间点规则可靠计算重复率，因此不把它强行归入过度质检结论。后续应记录输入 asset/revision 和时间点，才能判断 Pass B 帧检查是否重复。

## 代表性证据

### 合理重试：模型失败后重跑

项目 `63438035807` 的 `S2_drainage_water...mp4` 和 `S3_water_macro...mp4`：

- 14:50:30 先做 `media_probe(mode=info)`。
- 14:50:42 做 `standard + visual` AFC，结果为模型 429 `ServerOverloaded`。
- 14:53:57 以完全相同的检查问题重试，仍为 429。
- 14:57:28 再次重试后才返回完整结果。

这里的重复是服务失败恢复，不应算作 Agent 主动过度质检；但可以通过指数退避、请求去重和失败状态缓存减少成本。

### 合理缩窄检查：完整 Gate 后改为 style-only

项目 `73404800899`：

- 14:26:03 对 `clip_gate6_zayman_v1`、`clip_end1_moto_departure_v1` 做 `pro + visual` 完整 Gate 检查。
- 部分调用返回空结果，部分结果明确判定 photorealistic / Gate A FAIL。
- 14:28:04 对同一文件改为 `fast + visual` 的 style-only 检查。

虽然文件和风格问题重复，但检查目的已经从完整 Gate 改为单一 style gate，属于降级定位或结果确认，不是“同参数重复”。

### 明确的重复信号：相同问题短时重跑

全窗口仅识别到 15 个文件组、17 个相邻调用边满足：同一项目、同一路径、30 分钟内、`mode`、`scope` 和完整 `query` 都完全相同。代表文件包括：

- `63438035807/S2_drainage_water...mp4`：同一标准视觉问题连续执行 3 次，其中前两次是 429 失败。
- `63438035807/S3_water_macro...mp4`：同上。
- `73404800899/clip_end1_moto_departure_v1...mp4`：完整 Gate 和后续 style-only 之外仍有一次相同参数重跑，需要结合空结果/结果延迟判断。
- `10511259618/a_dfuQdeJ...png`：前一次因文件无法解析，随后同 query 的重试仍无法解析；属于失败恢复，但暴露出缺少“文件注册状态”预检。

因此 17 个边是“疑似过度”的上限式信号，不是 17 次已确认浪费。

## 过度质检分级

### P2：缺少调用级幂等和失败重试策略

`media_probe` 311 次后续调用、137 次 30 分钟内重复，AFC 1,423 次 30 分钟内重复，说明线上没有统一的“同资产、同目的、同参数”去重层。当前只能通过调用日志事后发现，不能在工具入口直接返回已有结果。

### P2：`pro` 升级缺少明确触发条件

7 日内 `pro` 2,044 次；其中 208 次为同一路径前一次 `pro` 后 30 分钟内再次 `pro`，79 次为 `standard -> pro`，27 次为 `fast -> pro`。这些可能合理，但当前日志没有稳定记录“为什么升级、上一次结果是什么、资产 revision 是否变化”，所以无法证明升级带来了新信息。

### P3：同一文件不同目的检查没有统一 receipt/cache

例如同一视频可能先做 intake 描述，再做风格 Gate、动作 Gate、音画同步检查。按路径聚合会把这些都算作重复，但它们回答不同问题。需要把检查目的、合同版本、asset revision 写入 receipt，避免“重复调用”与“多维验收”混为一谈。

## 不应误判为过度的情况

- 同一项目有多个素材：项目级调用次数不能代表同一文件重复。
- 文件 revision 或输出文件名变化：必须按不可变 asset/revision/hash 判断，不能只看 basename。
- `fast` intake 后 `standard/pro` 验收：这是常见的合理升级路径。
- 上一次返回 429、空结果、文件未注册或无法解析：重试有明确新假设。
- 用户反馈后针对同一文件重查：属于修复后复核。
- 最终交付前重新确认当前最终文件：只有在已有 revision-bound receipt 后仍重复，才考虑去重。

## 建议

1. **先做工具层幂等**：以 `project_id + immutable_asset_id/revision + tool + mode + scope + canonical_query + policy_version` 作为 cache key；成功结果短期复用，失败按错误类型退避，不要立即原样重试。
2. **升级必须带理由**：记录 `previous_receipt_id`、`upgrade_reason`、`new_hypothesis`；没有新假设时禁止 `standard -> pro` 或 `pro -> pro` 自动重跑。
3. **把失败恢复与业务复核分开计数**：429、空结果、文件未注册应单独记录为 retry/recovery，不计入过度质检；同参数成功后再次成功才进入 overcheck 指标。
4. **引入不可变 revision/receipt**：当前路径相等只能做粗略聚合，无法判断文件是否被原路径覆盖。没有 revision 绑定前，任何“重复率”都只是信号。
5. **补齐 `render_frame` 可观测字段**：记录输入 asset/revision、timestamp、frame purpose 和消费方，才能判断中间帧检查有没有被重复读取或最终没有被消费。
6. **不要把 `final_qc` 当线上已有能力**：当前 `media_probe` 只有 `info` / `audio`。完整 final QC 若要建设，应另行定义能力、receipt 和门禁，不纳入本次“现状重复率”统计。

## 口径限制

1. 文件路径不是不可变版本标识；路径被覆盖时，重复和命中率都会有误差。
2. `LAG()` 统计的是相邻调用边，不是唯一重复请求数；一次三连调用会产生两条边。
3. Metabase 中部分 tool result 为空或包含工具失败信息；无法确认结果是否已经改变时，只能标为疑似，不直接判定浪费。
4. 本次没有把不同 query 的多维验收合并为“过度”，也没有把 `fast/standard/pro` 的合理阶段升级直接算浪费。

## 证据文件

- 全量工具审计：[`analysis/case-data/recent-7d-final-multimodal-qc-2026-08-13/summary.json`](./case-data/recent-7d-final-multimodal-qc-2026-08-13/summary.json)
- 最终成片覆盖审计：[`analysis/2026-08-13_online-multimodal-final-qc-audit.md`](./2026-08-13_online-multimodal-final-qc-audit.md)
