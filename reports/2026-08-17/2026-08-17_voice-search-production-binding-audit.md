# 搜索选中音色与正式 TTS 绑定审计

**分析时间**：2026-08-17  
**生产窗口**：`2026-08-05T10:30:52Z` 至 `2026-08-13T16:00:00Z`  
**数据源**：Metabase production BigQuery database `2`、production Postgres database `3`  
**数据包**：`analysis/case-data/voice-search-production-binding-2026-08-17/`

## 结论

确认存在 1 个“用户已选音色，但正式生产静默换声”的强证据 Case：`20319333245`。

用户明确选择 David V，系统先用 David V 成功生成两版；后续正式长旁白却改用不在本次搜索结果中的另一个 `voice_id`。用户听到成品后明确反馈声音不一致，系统才切回 David V 重新生成。

这不是“搜索推荐得不准”，而是**用户的选择没有形成项目内后续生产的硬约束**。建议按 P1 正确性 Bug 提交。当前证据不足以把粗筛出的 88 次全部算成 Bug。

## 线上粗筛口径

窗口内共有 2,930 次公共音色正式 TTS，涉及 623 个项目：

| 分类 | TTS 调用 | 项目 | 含义 |
|---|---:|---:|---|
| 过去 24 小时有成功搜索 | 2,751 | 609 | 可以继续核对正式 voice_id 是否来自搜索候选 |
| voice_id 在此前搜索候选中 | 2,663 | 606 | 搜索到正式生产的基本链路一致 |
| voice_id 不在此前任何搜索候选中 | 88 | 10 | 仅是待排查候选，不等于 Bug |
| 过去 24 小时没有成功搜索 | 179 | 24 | 可能使用历史音色、跨项目连续音色或直接指定音色 |

88 次粗筛候选中混有多角色项目、历史已锁定音色、复用上一项目音色、用户主动换声等正常情况。经过逐 Case 排除，目前只有 `20319333245` 达到“明确选择 + 后续换 ID + 用户投诉”的确认标准。

## 确认 Case：`20319333245`

项目：`Computershare Collage Explainer`

### 完整证据链

| 时间 UTC | 事件 | 证据 |
|---|---|---|
| 2026-08-10 14:15:46 | 用户提出轻微澳洲口音 | `Is there one with just a slight Australian accent?` |
| 14:15:49 | 搜索返回候选 | 调用 `toolu_bdrk_01K1Mk2AeBD8j4MD8biBe3XS`；David V 排名 3，`voice_id=pDoe9k94N27tidKG2ssb` |
| 14:17:11 | 用户明确选择 | `OK lets try David V.` |
| 14:17:24 | 第一次使用所选音色 | `toolu_bdrk_01JRkHePKV4GyqjMNTbmSeZw`，David V，成功 |
| 14:19:43 | 第二次继续使用所选音色 | `toolu_bdrk_012MzQURS9yg2eAWhCjaeJ4o`，David V，成功 |
| 17:49:03 | 后续长旁白静默换声 | `toolu_bdrk_01V74zJKXejtpjUvrUYAXv1m` 改为 `pNInz6obpgDQGcFmaJgB`，成功 |
| 18:08:09 | 用户要求生成完整旁白 | `Generate that voice over for me` |
| 18:08:49 | 完整旁白仍使用错误音色 | `toolu_bdrk_01WjgbmewKTs1JpDj7qZAxnZ`，`pNInz6obpgDQGcFmaJgB`，失败 |
| 18:10:02 | 分段重试仍使用错误音色 | `toolu_bdrk_01FcWg38YFvTjPs9UoS2qLaX`、`toolu_bdrk_01L1Wf1zqWEUebPd8dQkUmX1`，均成功 |
| 18:15:38 | 用户明确投诉 | `That voice over does not match what you had earlier, David V with a slight Australian accent` |
| 18:16:28 | 投诉后才切回 David V | 两段重新使用 `pDoe9k94N27tidKG2ssb`，均成功 |

### 为什么这是确认 Bug

1. 用户不是只描述偏好，而是明确说了 `try David V`。
2. 系统已经把 David V 解析到唯一 `voice_id`，并用该 ID 成功生产过两次。
3. 后续换用的 `pNInz6obpgDQGcFmaJgB` 不在本次搜索候选中。
4. 换声不是用户要求的；用户反而明确投诉不一致。
5. 用户投诉后系统能立即切回 David V，说明该音色本身可用，不是 Provider 不可用导致的必要降级。

### 用户影响

这类问题不会一定报技术错误。错误音色的 TTS 可以成功，系统会把“技术成功”误当成“业务正确”。用户实际收到的是与试听/前一版不同的正式旁白，需要听完后主动发现并要求返工；长旁白还会产生额外生成成本和等待时间。

## 已排除的代表样本

| 项目 | 粗筛命中原因 | 排除结论 |
|---|---|---|
| `44280572603` | 搜索结果与正式 voice_id 不同 | 用户只说想要英国女声，没有明确选择 Olivia；项目历史已锁定 Lily，正式生产沿用 Lily |
| `57709562917` | 搜索候选不含正式 voice_id | 用户要求复用上一 Case 的 Callum；搜索没找到 Callum，系统使用既有 Callum ID，属于连续性复用 |
| `15167786016` | 同名 Brooke 可能误配 | 搜索中有两个 Brooke；助手展示并正式使用的都是 Rank 2 `4Bg4N8Tjcy6Rm0IWmqRj`，实际绑定正确 |
| `20601421896` | 一个项目出现多个正式 voice_id | 多角色项目，Carter 和 Luna 分别使用不同音色；不能把一个角色的搜索结果与所有 TTS 做笛卡尔比较 |
| `76680126379` | 后续 voice_id 与第一次搜索不同 | 用户明确要求 `Use different voice`，系统重新搜索并切换到 Kaitlyn，属于用户主动换声 |

## 根因判断

### 已被证据确认

- 搜索结果、用户选择和后续 TTS 之间没有被持续执行的精确 `voice_id` 约束。
- 后续生产阶段允许在没有用户授权的情况下改用另一个 voice_id。
- 当前只校验 TTS 是否成功，没有校验“成功生成的音色是否仍是用户确认的音色”。

### 仍需研发定位

遥测无法区分以下具体实现根因：

- 只在当前对话上下文保存了音色名称，没有持久化精确 voice_id；
- 后续线程/阶段没有继承已选音色；
- 正式生产重新做了一次默认音色解析；
- Provider 或编排层发生了静默 fallback。

无论是哪一种，实现都不应允许无提示换声。

## 研发需求

1. 用户明确选择或直接生产某个搜索音色后，按 `project_id + speaker/role_id` 持久化 `selected_voice_id`。单旁白项目可使用默认 narrator role。
2. 同一角色后续正式 TTS、分段生成、重试、续写和修改必须复用已锁定的精确 voice_id。
3. 正式 TTS 调用前增加硬校验：请求 voice_id 必须等于当前角色已锁定的 voice_id。
4. 禁止静默 fallback、只按音色名称重新解析，或在未收到换声指令时重新搜索替换。
5. 如果已选音色不可用，应阻断并提示用户重新选择，不得自动换成默认音色。
6. 记录 `selection_source`、`search_call_id`、`selected_at`、`changed_by_user_at` 和变更原因，支持线上追踪。
7. 多角色项目必须按角色绑定，不能用项目级单一 voice_id 覆盖所有角色。

## 验收标准

- 复现 `搜索 -> 用户选择非 Rank 1 -> 正式生成 -> 分段重试 -> 续写`，所有调用使用同一 voice_id。
- 用户未提出换声时，任何阶段出现 voice_id 变化都应在调用前被阻断。
- 用户明确换声后，只更新目标角色；其他角色音色不变。
- 已选音色不可用时返回可识别错误并要求重新选择，不生成替代音色。
- 埋点能从正式 TTS 回溯到选中事件和原始 `search_call_id`。

## 可直接贴到 Bug 系统

**标题**：P1｜用户搜索并选定音色后，正式 TTS 会静默切换 voice_id，导致成品声音与试听不一致

**问题描述**：项目 `20319333245` 中，用户搜索轻微澳洲口音并明确选择 David V（`pDoe9k94N27tidKG2ssb`）。系统先用该 voice_id 成功生成两版，但后续正式长旁白改用 `pNInz6obpgDQGcFmaJgB`，该 ID 不在本次搜索结果中，用户也未要求换声。两段正式旁白生成成功后，用户明确反馈声音与之前的 David V 不一致；系统随后切回 David V 才恢复。

**预期**：用户确认音色后，应以 `project_id + speaker/role_id` 锁定精确 voice_id；后续正式生成、分段、重试、续写和修改必须复用。若音色不可用，应阻断并提示重新选择，禁止静默 fallback。

**实际**：后续生产允许在无用户授权的情况下更换 voice_id，且错误音色生成成功，因此无法通过普通成功率监控发现。

**验收**：未收到用户换声指令时，目标角色的 voice_id 全链路不变；任意不一致在 TTS 调用前被拦截并记录选中来源。
