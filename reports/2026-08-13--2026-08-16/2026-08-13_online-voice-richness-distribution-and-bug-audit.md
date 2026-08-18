# 线上音色丰富度、分布与 Bug 审计

**审计时间**：2026-08-13  
**数据截止**：2026-08-12 16:00:00 UTC（Metabase production BigQuery 当前可见的最新完整窗口）  
**音色运营上线点**：首次线上 `voice_search` 调用 `2026-08-05T10:30:52.004978Z`  
**数据源**：Metabase production BigQuery database `2`，`pexo_ods.project_messages`；tool call 与 tool result 按 `project_id + tool_call_id` 去重。  
**可复用数据包**：[recent-voice-richness-2026-08-13](</Users/wellswu/pexo-skills/analysis/case-data/recent-voice-richness-2026-08-13/>)

## 结论先行

音色运营上线后，**音色供给的实际使用丰富度明显提升**，而且不是 TTS 量增长造成的假象：在等长前后窗口中，成功 TTS 从 `2,996` 次降到 `2,631` 次，但成功使用身份从 `81` 增至 `448`，公共 `voice_id` 从 `2` 增至 `378`，Top4 使用占比从 `53.8%` 降至 `9.7%`，HHI 从 `0.1033` 降至 `0.0070`。

但上线还没有形成可靠的生产闭环。当前最值得优先修的不是“再增加多少音色”，而是：

1. **P0：音色生产前校验缺失**。克隆样本非法/找不到/不满足时长大小的失败占上线后明确失败的 `174/401 = 43.4%`；同一 voice 的并发冲突再占 `143/401 = 35.7%`。
2. **P1：搜索结果没有成为正式生产的强约束**。`1,940` 次可关联到成功搜索的公共 `voice_id` TTS 中，`796` 次使用非 Rank 1，`353` 次使用不在最近候选集中的音色。这里不能把所有调用都判成违规，因为当前没有用户选择/试听 receipt；但“无法证明为什么换声”本身就是治理 bug。
3. **P1：候选语言资格缺少可审计元数据**。`1,908` 个带语言的候选 ID 中，`148` 个在不同目标语言搜索中出现，`463` 个跨多个语言+口音组合；生产结果没有返回候选的顶层 `language/accent`，无法验证公共 Preview 是否满足主语言和同一 `(language, accent)` 组合。
4. **P1：结果遥测仍有缺口**。上线后 `167/3,199 = 5.2%` TTS 没有可解析结果；搜索另有 `44/980 = 4.5%` 缺失或不可解析结果。

## 1. 前后对照：丰富度确实提升

前后窗口均为 `173.4856` 小时，避免把时间长度当成增长原因：

| 指标 | 上线前 | 上线后 | 变化 |
|---|---:|---:|---:|
| TTS 调用 | 3,496 | 3,199 | -8.5% |
| TTS 项目 | 560 | 554 | -1.1% |
| 成功 TTS | 2,996 | 2,631 | -12.2% |
| 成功使用的独立身份 | 81 | 448 | +453% |
| 其中公共 `voice_id` | 2 | 378 | 新主路径 |
| 其中目录 `voice_key` | 40 | 11 | 默认 key 退居次要路径 |
| 其中克隆身份 | 39 | 59 | 小幅增加 |
| Top1 使用占比 | 24.0% | 2.9% | -21.1pp |
| Top4 使用占比 | 53.8% | 9.7% | -44.1pp |
| Top10 使用占比 | 80.1% | 17.9% | -62.2pp |
| HHI | 0.1033 | 0.0070 | -93.3% |
| 有效身份数（entropy） | 17.62 | 242.39 | +13.8x |

这里的成功身份口径只计 `audio_produce` 有 `ok=true` 的调用；失败的自造 `voice_key`、失效克隆路径不会被当成“丰富度”。如果把所有尝试都算进去，上线后身份数是 `528`，但其中 `80` 个身份没有成功产出，不能用于评价供给效果。

### 项目内分布没有变成无意义换声

上线后成功 TTS 项目中：

- 中位数每项目仍只使用 `1` 个独立身份；
- P90 为 `2` 个，P99 为 `8` 个；
- `396/508` 个项目（77.9%）只使用 1 个身份；
- `50/508` 个项目使用至少 3 个，`17/508` 个至少 5 个。

因此更合理的解释是：运营提升了**跨项目的匹配覆盖和长尾分发**，没有把单个项目默认变成频繁换声。

## 2. 供给池与需求分布

### 供给池快照（2026-07-26）

这是上线前抓取的 ElevenLabs 公共音色池快照，不代表今天实时目录，但可作为供给结构基线：`623` 条记录、`25` 种语言、`39` 个 locale、`61` 种 accent、`7` 个 use case、`32` 个描述标签。

| 维度 | 分布 |
|---|---|
| 语言 | English 308（49.4%）、Hindi 73、Spanish 64、German 28、French 26；其余 20 种语言共 124 条 |
| 性别 | male 406（65.2%）、female 216（34.7%）、neutral 1 |
| 年龄 | middle-aged 354（56.8%）、young 251（40.3%）、old 17（2.7%） |
| 口音 | American 192（30.8%）、standard 161（25.8%）、British 43、Indian 34、Latin American 29 |
| 用途 | narrative/story 291（46.7%）、conversational 151（24.2%）、social media 55、educational 44、characters/animation 35 |

供给有两个明显结构性偏斜：英文、男性、中年、叙事类占主导；中文在该快照里只有 `2/623`，但上线后成功 TTS 的 `language_code=zh` 已有 `117` 次、覆盖 `39` 个项目。这说明快照已经落后于线上公共/自定义目录，或者中文 voice 没有进入同一份可运营 inventory；两者都属于需要补齐的目录可观测性问题。

### 上线后搜索需求

`887` 次成功且返回候选的搜索中，最终结构化标签分布如下：

- language：English `736`（83.0%），Chinese `46`（5.2%），French `23`，Spanish `13`；
- gender：male `453`（51.1%），female `368`（41.5%），neutral `6`；
- age：young `297`（33.5%），middle-aged `149`，old `49`，缺失 `392`；
- accent：American `280`（31.6%），British `27`，其余分散，缺失 `492`；
- use case：characters/animation `178`、narrative/story `174`、educational `136`、conversational `89`、social media `81`、advertisement `63`，缺失 `144`。

需求和旧供给快照存在明显错配：英文需求占比高于旧库存，中文需求却已经出现实际生产规模，而年龄/口音在多数成功搜索中没有结构化值。这不等于搜索错了，但意味着“目录、标签和搜索结果”目前不是一套可持续运营的事实源。

## 3. 搜索漏斗与候选池

上线后共 `980` 次 `voice_search`，覆盖 `563` 个项目：

| 搜索结果 | 次数 | 占比 |
|---|---:|---:|
| success + 有候选 | 887 | 90.5% |
| 缺失/不可解析结果 | 44 | 4.5% |
| `intent_parse_failed` | 33 | 3.4% |
| `invalid_request` | 7 | 0.7% |
| `no_match` | 5 | 0.5% |
| Provider failure | 4 | 0.4% |

成功搜索平均返回 `9.82` 个候选，共 `1,985` 个 distinct candidate voice ID；`883` 个只出现过一次，`374` 个曾经当过 Rank 1。对候选返回结构做了确定性检查：没有发现重复 voice_id、缺失 voice_id、缺失 rank 或 rank 序列断裂。这一层暂时不像是数组拼装 bug。

但候选池到正式生产的转化很弱：上线后成功使用的 `378` 个公共 voice_id 中，只有 `363` 个曾在某次搜索候选中出现，`15` 个从未出现在关联候选中；候选池 `1,985` 个 ID 中最终被成功生产使用的只有约 `19.0%`。这可以是探索池较宽的正常现象，但当前没有记录“用户选了哪一个、试听了哪一个、为什么换到候选外”的 receipt，不能解释这个差距。

## 4. 确认到的 Bug 与高风险信号

### P0：克隆样本没有在 TTS 前做资产门禁

上线后克隆路径 `543` 次：`355` 成功、`100` 次素材找不到/非法引用、`74` 次样本不满足时长/大小/可解析性，另有 `9` 次超时。仅明确的两类输入错误就有 `174` 次，占全部 TTS 明确失败 `401` 次的 `43.4%`。

这不是供应商质量问题，根因是 `voice_sample_files` 在 `audio_produce` 之前没有验证：文件是否为音频、是否属于当前项目、是否能解析、是否满足时长和大小限制。旧下钻已经看到跨项目路径、图片/视频被当作声音样本的具体例子。

### P0：同一 voice 的并发 TTS 会触发资源冲突

上线后 `voice_id` 路径出现 `143` 次 `Multiple voice additions/deletions for the same voice were called at the same time`，涉及 `50` 个项目。这类错误占 voice_id 路径全部非成功调用的 `143/322`；如果只看有明确结果的失败，则是 `143/179`。它不是随机网络超时；生产需要对同一 `project_id + voice_id` 串行化或幂等化。

### P1：搜索结果到正式 TTS 没有强约束和选择回执

`2,099` 次成功公共 `voice_id` TTS 中，`1,940` 次能在过去 24 小时找到成功搜索：

- Rank 1：`791` 次（40.8%）；
- 非 Rank 1：`796` 次（41.0%）；
- 不在最近候选集：`353` 次（18.2%）。

不能把 `1,149` 次全部判为用户违规，因为日志没有 `voice_preview`、用户确认或显式 voice selection 事件。但这恰好证明当前 contract 不完整：系统无法回答“非 Rank 1/候选外是用户选的、试听选的、克隆替换，还是 Agent 自己换的”。在没有明确用户指定时，正式生产应绑定最新有效搜索 receipt，并默认只允许 Rank 1。

### P1：候选语言资格无法审计，存在跨语言返回信号

`1,908` 个带语言的候选 ID 中，`148` 个曾在多种语言目标搜索中出现，`463` 个跨多个语言+口音组合。代表例子：

- `Charlotte - SA/UK Explainer` 出现在 English、Hungarian、Dutch 目标搜索；
- `Gabriel - Friendly Brazilian Ad` 出现在 German、Portuguese、Chinese 目标搜索；
- `Cozy Storyteller` 出现在 Arabic、English、Spanish 目标搜索。

由于生产 `voice_search` result 只返回 voice_id/name/description/preview，没有候选顶层 `language/accent` 和过滤原因，这里不能仅凭跨搜索出现就断言 Provider 一定返回错音色；但它已经是高置信的资格审计缺口。当前合同要求：language/accent 先粗召回，公共 Preview 必须再按候选顶层 language 和同一 `(language, accent)` 组合过滤，`verified_languages[]` 不能替代公共试听语言。这个过滤结果应落 receipt，否则线上无法验证是否执行。

### P1：结果遥测丢失，成功率被两种口径撕裂

上线后 TTS：`2,631` 成功、`401` 明确失败、`167` 缺失/不可解析。全调用成功率是 `82.2%`，只在有可解析结果的调用中算则是 `86.8%`。搜索也有 `44` 次缺失结果。需要把 started/completed/failed/aborted 和 tool_result 关联起来，不能让结果缺失混入 Provider failure。

### P2：`voice_key` 自造问题下降，但没有消失

上线后 `voice_key` 仍有 `25` 次“不在配置目录”失败，涉及 `10` 个项目；相比上线前的 `178` 次已有明显改善，说明公共 voice_id 路由确实减少了这类错误，但目录 gate 仍应保留，描述性人设不能直接当身份 key。

## 5. 建议修复顺序

1. **先做请求前 Hard Gate**：克隆只接受当前项目、可解析的音频 asset；校验 MIME、时长、大小和项目归属，一次失败就阻断同一坏引用的批量复制。
2. **对同一 voice 做幂等/串行**：键建议至少包含 `project_id + voice identity + text hash + provider params hash`；同一 voice 的资源变更不能并发触发。
3. **增加 voice selection receipt**：保存 search_id、候选快照、rank、preview、用户确认/明确指定事件、最终 voice identity 和 relaxed_fields。无明确指定时 Rank 1 才能直接生产，候选外必须阻断或记录理由。
4. **把候选顶层资格放进返回和 receipt**：每个 candidate 返回并保存主语言、主口音、过滤原因；固定 language 时不允许 verified-only 候选通过，language+accent 必须是同一顶层组合。
5. **修复结果账本**：所有调用都产生可关联的 started/completed/failed/aborted；单独监控 missing result，不再把它混成 provider failure。
6. **刷新音色 inventory**：定期同步公共/自定义 voice 目录，补齐中文等实际生产语言，保存 `voice_id -> language/gender/age/accent/use_case` 的版本快照。

## 最终判断

音色运营上线是有效的：它把线上成功使用从少数默认 key 推向了更宽的公共 voice_id 长尾，且项目内没有明显的无意义换声。但运营成功目前被三类工程问题打折：输入门禁、搜索选择治理、结果可观测性。建议把下一阶段 KPI 从“搜索调用量/使用音色数”升级为：**成功身份覆盖 + Rank1/显式选择采用率 + 候选外使用率 + 克隆前置拒绝率 + voice 级并发冲突率 + 结果可追溯率**。

本轮未修改线上 Skill、Runtime、Provider 或 `tech-*` 文件。
