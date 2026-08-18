# Seedance 2.5 / MiniMax H3 / Wan 3.0 接入需求思考 v1.1

**日期：**2026-08-13
**性质：**产品与研发评审稿；不修改 Runtime、Skills 或 `tech-*` 合同
**范围：**视频生成多模型接入、路由、执行、计费、质检与灰度准入

> 本文是统一底座的目标态方案。若按当前线上 `video_generate` 形态做近期接入，请以 `analysis/2026-08-13_seedance25-minimax-h3-wan30-online-current-state-integration-v2.md` 为准；v2 将新建意图工具、自动 Router、统一 retry/billing 等从本期前置中移除。

## 0. 结论先说

这次接入不应被定义为“给 `video_generate` 增加三个 model ID”。真正需要交付的是一套可重复接入新模型的生产底座，以及三个 Provider Adapter。

建议的首期准入顺序：

| 模型 | 当前证据 | 建议状态 | 首期生产定位 |
|---|---|---|---|
| Seedance 2.5 | 官方接口已核验；本地已完成 30 秒纯文生和纯音频参考实测 | `gated`，优先灰度 | 长时通用多模态、声音语义驱动画面和编辑；延长后开 |
| MiniMax H3 | 官方接口与 generalized editing 声明已核验；已有 38 场景 FAL 对比评测，但正式 Adapter 未接通 | `shadow` | 复杂动作、因果顺序、产品结构、Explainer、首尾帧、2K 和编辑 |
| Wan 3.0 | 接口资料已核验；仍受邀测、地域和账号权限约束，尚无完整同口径编辑评测 | `unavailable` 或 `shadow` | 文档/公开链接驱动、1080P、2-30 秒、多媒体参考和编辑 |

**不建议三者同时直接进入自动生产路由。**先上线共享底座，再让每个模型按“接口可用 → Shadow → 定向灰度 → Ready”独立过门。

首期产品原则：

1. Agent 和普通用户声明业务意图，不直接拼 Provider 参数。
2. 硬要求先做 Hard Gate，不能用模型质量分抵消能力缺失。
3. 每次付费任务都必须可追溯、可结算、可防重放、可转存。
4. Provider 返回 `succeeded` 不等于产品成功，必须通过媒体 Postflight 和场景 QA。
5. 模型状态和能力进入版本化 Capability Registry，不写死在 Prompt、Skill 或预设里。

## 1. 为什么要接这三个模型

目标不是增加模型数量，而是补齐当前 Seedance 2.0 单一主力路线的能力缺口：

| 业务缺口 | Seedance 2.5 | MiniMax H3 | Wan 3.0 |
|---|---|---|---|
| 15 秒以上生成 | 最高 30 秒 | 不补，仍为 4-15 秒 | 最高 30 秒 |
| 纯音频参考 | 已实测可驱动画面 | 接口可传，生产能力待验 | 接口可传，生产能力待验 |
| 编辑、延长、首尾帧 | 支持编辑/延长/首尾帧，需分任务类型编译 | 支持 generalized editing 与首尾帧；严格源时间线保持待验 | 支持基于源视频的编辑与首尾帧；严格保持/延长待验 |
| 复杂动作、因果与结构理解 | 候选 | 现有内部评测优势明显 | 待同口径评测 |
| 2K | 不支持 | 支持 | 不支持 2K，最高 1080P |
| 文档/网页直接驱动 | 不支持 | 不支持 | 支持 `file` / `link`，但有安全边界 |
| 更完整的多模态参考 | 30 图 / 10 视频 / 10 音频 | 9 图 / 3 视频 / 3 音频，总 12 | 图片、视频、音频及文档/链接 |

模型选择应由具体 generation unit 的要求决定，不应得出“新版本全量替代旧版本”的结论。Seedance 2.0 / Fast 仍应保留为成本、稳定性和已验证声音路线的候选。

## 2. 产品目标与非目标

### 2.1 目标

1. **统一意图入口：**同一业务请求可以被三个 Adapter 合法编译，不要求 Agent 理解 Provider 字段。
2. **付费前失败：**素材、时长、比例、模式互斥、模型权限和硬能力错误必须在创建任务前阻断。
3. **可解释路由：**记录入选模型、被排除模型、能力版本、评分依据和降级内容。
4. **完整生命周期：**覆盖创建、查询、回调、取消、超时、失败、临时 URL 转存、结算和重放。
5. **成本可控：**创建任务前有价格估算和预算；每次自动重试或换路都消耗同一个 attempt / cost budget。
6. **质量可验证：**不同模型使用各自适用的 QA Profile，不能只检查“有视频 URL”。
7. **可灰度可回滚：**按模型、任务类型、场景、租户和流量比例开关，异常时不发版即可关闭。

### 2.2 非目标

- 本期不让 Agent 自由填写 `content[]`、`input.media`、`generate_audio` 等 Provider 原生字段。
- 本期不把任一新模型设为所有视频任务的默认模型。
- 本期不承诺三家模型都支持严格口型、原音轨保留或多人说话人绑定。
- 本期不让 Prompt 自由文本决定任务类型；编辑、延长、首尾帧和文档驱动必须是结构化意图。
- 本期不把文档/网页输入当成绕过现有素材、安全和事实校验的快捷通道。
- 本期不修改 `tech-*`；本文提出的新字段均是待工程评审的内部合同。

## 3. 用户与 Agent 体验

### 3.1 默认体验

普通路径继续保持简单：

```yaml
request: "让这个人物使用已有完整口播，竖屏介绍产品"
assets:
  - asset_presenter
  - asset_speech
  - asset_product
requirements:
  aspect_ratio: "9:16"
  duration_s: 12
  resolution: "720p"
  must_keep:
    - "人物身份"
    - "完整台词和声音时钟"
```

后台负责把它编译成结构化意图、素材绑定、候选路线和 Provider payload。

### 3.2 模型偏好

首期不向普通 Agent 暴露强制模型字段。评测、灰度和高级产品入口可内部设置：

- `auto`：默认，Router 选择满足合同的最优路线；
- `prefer`：软偏好，模型不满足硬要求时允许换路，但必须在回执中说明；
- `force`：仅评测/高级入口使用；不满足时直接阻断，禁止静默换模型。

### 3.3 无可行路线

当所有模型都被排除时，返回业务可理解的结构化结果：

```yaml
status: blocked
provider_tasks_created: 0
blockers:
  - code: strict_audio_preservation_unsupported
    message: "当前路线只能参考并重构声音，不能原样保留来源音轨"
    suggested_repairs:
      - "改为平台侧重新合入原音轨"
      - "允许模型重构声音"
```

不能私自删除必用素材、关闭声音、降低分辨率或更换任务类型来换取出片。

## 4. 统一接入架构

```text
request + assets + requirements
  → Intent Normalize
  → Media Facts
  → Capability Registry + Hard Gate
  → Weighted Route
  → Provider Compile + Compile Assert
  → Billing Authorize
  → Create / Poll or Callback / Cancel
  → Immediate Asset Transfer
  → Deterministic Postflight + Scenario QA
  → Billing Settle + Execution Receipt
```

### 4.1 统一内部意图

建议内部至少承载以下语义；字段名需由工程合同最终裁定：

```yaml
generation_unit:
  generation_strategy: create | reference | first_frame | first_last_frame |
                       edit | extend | doc_driven | url_driven
  creative:
    description:
    beats: []
    exact_dialogue: []
  asset_bindings:
    - asset_id:
      ref_id:
      role: character | product | style | environment | first_frame | last_frame |
            reference_video | edit_source | continuation_source |
            speech_driver | voice_reference | music | doc_source | link_source
      preservation: must_preserve | may_transform | style_only
      target:
  speech:
    visibility: on_camera | off_camera | none
    driver: co_generated | speech_asset | voice_reference | existing_video_audio | none
    output_audio_policy: model_native | silent | preserve_source_postmix
  output:
    duration_s:
    aspect_ratio:
    resolution:
    container:
  execution:
    idempotency_key:
    max_attempts:
    max_provider_cost:
    degradation_policy:
```

其中 `preserve_source_postmix` 是平台能力，不是模型能力：模型只负责生成或参考声音，平台在后期按确定时钟合入来源音轨并验收。

### 4.2 Capability Registry

每个模型版本必须注册：

- Provider、正式 model ID、Endpoint、地域和鉴权状态；
- 可用状态：`unavailable | shadow | gated | ready | disabled`；
- 支持的任务类型、素材角色、素材数目/大小/时长限制和模式互斥；
- 输出时长、画幅、分辨率、容器和音频语义；
- 创建、查询、回调、取消、任务过期和产物 URL 生命周期；
- 价格版本、计费单位、限流和并发额度；
- 已通过的 QA Profile、质量分、成功率和延迟分位数；
- 合同来源、测试日期、配置版本和 Kill Switch。

生产 Router 只能选择 `ready`；`gated` 只能在明确灰度名单内选择；`shadow` 只编译或进入有预算的评测任务。

### 4.3 Provider Adapter 标准接口

三个 Adapter 需要实现同一组能力，而不是各自直接侵入业务层：

```text
ValidateIntent
CompileRequest
AssertCompiledRequest
EstimateCost
CreateTask
GetTask
CancelTask              # Provider 不支持时显式返回 unsupported
NormalizeStatus
NormalizeError
ExtractUsage
TransferResult
```

Adapter 只负责机械映射和 Provider 生命周期，不负责猜测人物、声音、台词或素材用途。

## 5. 付费前门禁

以下检查必须在 `provider_tasks_created=0` 阶段完成：

1. 所有 `asset_id` 已解析到固定 revision，并取得真实宽高、格式、时长、文件大小和音轨事实。
2. `must_preserve` 素材真实进入 payload；Prompt 中的引用编号和 payload 位置一一对应。
3. 任务类型由结构化意图决定，不从 Prompt 关键词反推。
4. 首尾帧组与普通参考组、`file` 与 `link` 等互斥组合已排除。
5. 时长、画幅、分辨率、容器、素材数量和总时长均在模型合同内。
6. 声音驱动、音色参考、音乐参考和原音轨保留没有被混成同一个“音频参考”。
7. 模型状态、地域、权限、余额/额度和并发可用。
8. 价格版本已加载，能得到预算上界；无法定价时生产请求 Fail Closed。
9. 安全策略已完成；Policy 拒绝不能通过自动改写用户意图后继续付费。
10. 相同幂等键没有已存在的进行中或成功任务。

## 6. 路由需求

### 6.1 Hard Gate

任何一项不满足都直接排除候选：

- 模型未处于允许的生产状态；
- 不支持任务类型或素材角色；
- 严格声音/口型要求没有通过对应 QA Gate；
- 无法保留人物、产品、台词、声音或用户指定的必用素材；
- 输出规格不合法且用户未允许受控调整；
- 地域、合规或权限不满足；
- 预计成本超过本次预算；
- Adapter、回调、临时产物转存或 Postflight 不完整。

### 6.2 Weighted Score

仅对通过 Hard Gate 的路线评分。建议按场景加载版本化权重：

```text
quality + instruction_following + reference_fidelity + audio_fit + reliability
  - normalized_cost - normalized_latency
```

评分必须来自能力合同、同口径离线评测和线上分场景数据，不能让 LLM 根据模型名称主观判断。

### 6.3 首期路由定位

| 场景 | Seedance 2.5 | MiniMax H3 | Wan 3.0 |
|---|---|---|---|
| 16-30 秒通用生成 | 首选候选 | 排除 | 候选待验 |
| 复杂动作顺序/因果 | 候选 | 优先 Shadow/灰度 | 待评测 |
| 产品结构/Explainer | 候选 | 优先 Shadow/灰度 | 待评测 |
| 2K | 排除 | 唯一候选 | 排除 |
| 首尾帧过渡 | 候选 | 候选 | 候选 |
| 修改已有视频 | 候选；编辑特殊约束明确 | Shadow；自然语言 generalized editing，严格保持待验 | Shadow；唯一源视频 + 编辑指令，严格保持待验 |
| 纯音频驱动画面 | 已验证候选 | 实验 | 实验 |
| 严格原音轨保留 | 仅平台后混音 | 仅平台后混音 | 仅平台后混音 |
| 严格可见口型 | Gate 通过前为实验 | Gate 通过前排除 | Gate 通过前排除 |
| 文档/公开网页驱动 | 排除 | 排除 | 唯一候选，需安全 Gate |
| 1080P | 排除 | 规格不等同 1080P | 候选 |

## 7. 分模型接入要求

### 7.1 Seedance 2.5

接口合同重点：

- 独立 model ID 和能力对象，不能复用 Seedance 2.0 写死的 4-15 秒、比例和引用预算。
- 支持文生、普通参考、编辑、延长、首帧、首尾帧等不同任务类型。
- 输出仅按已核验合同开放 480p / 720p；不宣称 1080P 或 4K。
- 一般时长为 4-30 秒或 `-1`；编辑、延长和帧任务需要各自的特殊约束。
- 图片、视频、音频通过 `content[] + role` 编译；首尾帧与普通参考互斥。
- `generate_audio` 只表示生成/输出模型音频，不表示原样保留参考音频。
- 支持 MP4 / MOV、尾帧返回、回调、优先级、任务过期和任务管理时，结果必须进入统一回执。

声音专项要求：

本地 30 秒测试已经证明纯 `reference_audio` 可以驱动画面、角色轮换和声音事件，但输出会重构音色与时间线。因此必须区分：

```text
reference_conditioning  = 用来源音频控制语义、表演和节奏
model_native_output      = 使用模型生成后的音轨
preserve_source_postmix  = 平台重新合入并校验来源音轨
```

Seedance 2.5 首期范围建议：

- P0：文生、普通图片/视频/音频参考、4-30 秒、480p/720p、MP4、任务查询、转存、usage；
- P1：首帧/首尾帧、编辑、延长、MOV、尾帧资产、callback、cancel/list；
- P2：Web Search、priority 等低频高级参数。

### 7.2 MiniMax H3

接口合同重点：

- `text` 必须始终非空，即使存在图片、视频或音频参考。
- 输出只允许 768P / 2K；时长为 4-15 秒整数。
- 文生必须使用具体比例；图生时实际比例可能由输入图决定，必须记录 requested / effective。
- 首尾帧模式与普通 reference image/video/audio 模式互斥。
- 没有独立 `sound`、`lip_sync`、`seed`、`negative_prompt` 或 Provider 幂等字段。
- 平台必须提供 replay key；每次新 task 都要单独记录费用。
- H3-Context-IR 只能做 Prompt 增强，不能覆盖 `must_preserve`、台词和素材角色。

H3 首期只应进入视觉任务：

- 复杂指令、严格动作顺序、因果关系；
- 产品部件关系和结构展示；
- 拼贴、Explainer、混合媒介；
- 首尾帧过渡；
- 需要 2K 的视觉生成。
- 基于单一源视频的视觉编辑；使用独立 `editvideo` 业务 route，先评测目标修改和非目标漂移。

以下能力在专项评测前不得进入生产路由：严格可见口型、原视频现场声原样保留、真正静音文件、首尾帧同时带参考音频/视频、2-3 秒原生输出。

### 7.3 Wan 3.0

接入前先完成商务和基础设施三件套：

1. 邀测权限和可用账号；
2. 模型、Endpoint、API Key 同地域；
3. 目标地域的数据合规、网络连通、限额和价格确认。

接口合同重点：

- 使用异步任务头，完整处理 PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED / UNKNOWN；平台归一化时保留 Provider 原始状态。
- 支持 480P / 720P / 1080P、2-30 秒或智能时长。
- `input.media` 支持首尾帧、图片/视频/音频参考，以及单一 `file` 或 `link`。
- 首尾帧组与普通参考组互斥；`file` 与 `link` 互斥。
- 参考视频输入总时长会占用 30 秒总预算，不能只校验输出时长。
- `audio=true` 表示生成音频，不表示来源音轨保留。
- task_id 和 video_url 的短生命周期必须按当前合同处理，成功后立即转存，不能把 Provider URL 作为长期资产。
- 通用异步任务 API 仅允许取消 PENDING；完成通知走同地域 EventBridge HTTP/RocketMQ，不是 create 请求的 callback 字段。两者都需用 Wan 邀测 Workspace/地域 Endpoint 做在线合同测试。
- 基于唯一源视频的编辑使用独立 `editvideo` 业务 route，Provider 侧可编译为 `reference_video + 编辑 Prompt`；没有 mask、source-timeline 或原音保持字段时，不得承诺逐帧结构、时序和原声保持。

文档/链接专项安全要求：

- `link` 只接受公开 `http/https` URL；拒绝 localhost、内网 IP、云元数据地址和重定向到私网的目标。
- 私有文档必须先进入 Asset Service，再使用短期最小权限签名 URL；禁止把本地路径或内部系统 URL 发给 Provider。
- 记录发送给第三方的资产 revision、地域、过期时间和数据分类，但日志不保存完整签名 URL。
- 文档内容必须先做类型、大小、页数和恶意文件检查；Provider 成功不替代事实与品牌 QA。

Wan 3.0 第一阶段只做权限打通、Adapter 合同测试和 Shadow 评测；没有同口径质量与稳定性证据前不参与自动生产路由。

## 8. 异步任务与错误处理

### 8.1 统一状态

平台对上游只暴露：

```text
accepted → queued → running → succeeded
                            ↘ failed | cancelled | expired | timed_out
```

Provider 原始状态保留在 debug receipt，但不能泄漏为不同业务状态机。

### 8.2 幂等与身份

- 幂等键由 canonical intent、素材 revision、输出要求和合同版本计算；
- 同一幂等键已有进行中任务时返回原任务，不重新创建；
- 创建返回的 task ID、每次查询的 task ID、回调 task ID 和最终资产 lineage 必须一致；
- Provider 没有原生幂等支持时，由平台在创建前做分布式锁和执行记录占位；
- 不允许因客户端超时自动创建第二个任务，必须先查询已有执行状态。

### 8.3 重试与换路

错误分为：

| 类型 | 例子 | 默认处理 |
|---|---|---|
| 请求不可恢复 | 参数、权限、Policy、余额、素材非法 | 不重试 |
| 瞬态未创建 | 网络失败、429、部分 5xx，且确认未创建 task | 有界退避重试 |
| task 已创建 | 查询超时、回调丢失 | 查询同一 task，禁止重建 |
| 模型生成失败 | Provider 终态失败 | 按剩余预算决定同路重试或合同保持型换路 |
| Postflight 失败 | 空文件、不可解码、无预期音轨 | 记录本次费用，再按策略修订或换路 |

自动换路必须重新执行 Hard Gate；`must_preserve`、exact dialogue、声音时钟和输出硬要求不能丢失。

## 9. 计费需求

1. Capability Registry 保存 Provider 原币价格、计费单位、生效时间和平台 credits 换算版本。
2. 创建 task 前返回 `estimated_min / estimated_max`，并完成预算授权或额度 hold。
3. 每个 attempt 单独记录 Provider task、规格、预估、实际 usage 和费用。
4. Provider 失败、Policy 拒绝、取消和 Postflight 失败分别按真实 Provider 计费规则结算，不能一律记为零。
5. 自动重试与换路共享 `max_attempts` 和 `max_provider_cost`，任何一项耗尽立即停止。
6. 分辨率或时长被 Provider 调整时，按 effective output 记录并核对账单。
7. 定价缺失、版本过期或返回无法解释的 usage 时，生产流量 Fail Closed 并告警。

## 10. 产物、Postflight 与 QA

### 10.1 产物处理

- Provider 成功后立即把视频、可选尾帧和其他正式产物转存到 Asset Service；
- 转存完成前不能向上游返回最终成功；
- 对输出做真实解码，记录容器、编码、宽高、FPS、时长、音轨、文件大小和内容哈希；
- 空 `asset_id`、空 URL、不可下载、不可解码或 task lineage 不一致必须失败；
- 日志和错误中清理 API Key、Base64、完整签名 URL 和用户私密素材信息。

### 10.2 场景 QA

| 场景 | 必须检查 |
|---|---|
| 复杂动作/因果 | 动作顺序、完成度、同时/先后关系、主体数量与结构 |
| 人物/产品参考 | 身份、颜色、材质、Logo、部件、参考资产使用事实 |
| 首尾帧 | 开始/结束相似度、过渡连续性、无错误跳变 |
| 可见说话 | 人物归属、逐字台词、口型、非说话人不张嘴、音轨可用 |
| 声音参考 | 输出是重构还是保留、时移、音色、事件同步和 audio lineage |
| 文档/链接 | 关键事实无编造、来源引用正确、品牌与文字不漂移 |

QA verdict 必须绑定 exact output asset revision。抽帧或接触表可辅助，但不能替代对 exact final MP4 的整段分析和确定性媒体检查。

## 11. 统一执行回执

无论成功或失败，都要返回可持久化的 receipt：

```yaml
execution_receipt:
  intent_id:
  canonical_hash:
  capability_registry_version:
  routing_profile_version:
  selected_route:
  candidate_exclusions: []
  compiled_payload_hash:
  provider_tasks_created:
  attempts:
    - attempt_no:
      provider_task_id:
      model_id:
      status:
      started_at:
      finished_at:
      error_class:
      usage:
      cost:
  requested_output:
  effective_output:
  audio_lineage:
  degradations: []
  assets: []
  postflight:
  qa_receipts: []
  billing_settlement:
```

Prompt 和 Provider payload 可在受控日志中保存脱敏版本或 hash；用户私密素材 URL 不进入普通日志。

## 12. 灰度与上线阶段

### Phase 0：共享底座，三模型共同前置

- Capability Registry、模型状态和 Kill Switch；
- canonical intent、Media Facts、Hard Gate、Compiler Assert；
- 幂等执行、统一状态、attempt budget、错误分类；
- 计费授权/结算、临时产物转存、Postflight 和 receipt；
- 保持现有 Seedance 2.0 路径回归不变。

### Phase 1：Seedance 2.5 定向灰度

- 先开文生、普通参考、纯音频参考和 4-30 秒；
- 仅对测试账号/小流量开放，不自动替换 Seedance 2.0；
- 严格口型和原音轨保留分别使用独立 QA Gate；
- 编辑、延长、首尾帧在基础链稳定后逐项开。

### Phase 2：H3 Shadow → 视觉场景灰度

- 接通正式 Adapter 和价格；
- 用同一 canonical intent 与当前生产候选做盲测；
- 首批开放复杂动作、产品结构、Explainer、首尾帧、2K 和编辑 Shadow；编辑专项过 Gate 后再灰度；
- 不开放严格说话和原声合同。

### Phase 3：Wan 3.0 权限与专项评测

- 先完成邀测、地域、数据合规、文档/URL 安全和 24h 转存演练；
- 补齐同口径视觉、声音、稳定性、延迟与成本评测；
- 先开文档/公开 URL、1080P 与编辑 Shadow 差异化场景，不作为通用默认模型。

### Phase 4：自动路由

只有当某个“模型 × 场景 × 输出规格”组合达到 `ready`，Router 才能自动选择。准入粒度不能只到模型级，例如：

```text
H3 + visual_broll + 768P            = ready
H3 + visible_speech + strict_sync   = disabled
Wan3 + doc_driven + 1080P           = gated
Seedance2.5 + audio_reference + 30s = ready
```

## 13. 测试与验收矩阵

### 13.1 共享合同测试

- 同一 canonical intent 在两个执行入口生成相同的候选、排除原因和 Provider payload；
- 未知字段、未知 role、非法枚举和嵌套拼写错误在 task 前拒绝；
- 边界值：最小/最大时长、素材数、总时长、文件大小、比例和分辨率；
- 互斥组合、缺失 Media Facts、缺失 required reference、Prompt 引用错位；
- 相同幂等键只创建一个任务；创建、查询、回调和资产 task ID 不漂移；
- 429/5xx、查询超时、回调重复、回调乱序、取消竞态和服务重启恢复；
- Provider 成功但 URL 为空、转存失败、asset ID 为空、不可解码、音轨不符时不得成功；
- 计费估算、hold、实际结算和多 attempt 汇总一致。

### 13.2 分模型最小在线 Gate

| 模型 | 必测任务 |
|---|---|
| Seedance 2.5 | 文生、单图参考、视频参考、纯音频参考、30 秒、无声输出、首尾帧、编辑、MOV/尾帧、取消/过期 |
| MiniMax H3 | 文生具体比例、首帧、首尾帧、混合普通参考、编辑、2K、4/15 秒边界、模式互斥、callback、无 sound 合同 |
| Wan 3.0 | 文生、首尾帧、普通参考、编辑、1080P、2/30 秒、文档、公开 URL、file/link 互斥、地域错误、24h URL 转存 |

### 13.3 建议准入指标

以下阈值是评审起点，需结合真实配额和成本确认：

- 合法请求技术完成率：连续 50 次在线调用不低于 95%；
- Provider 成功产物转存与可解码率：100%；
- 已知非法请求付费前阻断率：100%；
- 同一幂等键重复 task 创建率：0；
- task/result/asset lineage 漂移率：0；
- 每个目标场景至少 10 个代表 case 与当前生产基线盲测；候选不能出现 P0 硬要求回归；
- Borderline case 至少追加 3 次重复生成，避免用单样本偶然结果决定路由；
- 灰度期间按场景监控 QA 通过率、用户重做率、平均成本和 P50/P95 总耗时。

## 14. 研发拆解建议

| Epic | 交付物 | 优先级 |
|---|---|---:|
| E0 模型准入 | Capability Registry、状态机、地域/权限、Kill Switch | P0 |
| E1 意图与事实 | canonical intent、Asset Binding、Media Facts、Preflight | P0 |
| E2 编译与路由 | Capability Hard Gate、评分、三个 Adapter、Compile Assert | P0 |
| E3 执行生命周期 | 幂等、创建/查询/回调/取消、deadline、attempt budget | P0 |
| E4 计费与资产 | 估算/hold/settle、usage、即时转存、Postflight、receipt | P0 |
| E5 Seedance 2.5 | 基础参考与长时灰度；随后编辑/延长/帧任务 | P0/P1 |
| E6 MiniMax H3 | 正式 Adapter、reference/edit 独立 route、Shadow 评测、视觉场景灰度 | P1 |
| E7 Wan 3.0 | 邀测/地域、安全、Adapter、edit route、专项评测 | P1/P2 |
| E8 QA 与运营 | 场景 QA Profile、看板、告警、灰度和回滚 | P0/P1 |

## 15. 必须先拍板的问题

1. 产品首期是“自动路由”还是允许用户直接选模型；建议首期自动路由，高级入口只做软偏好。
2. 严格原音频保留是否为产品承诺；若是，必须建设平台侧后混音和时间对齐，不能依赖三家模型。
3. 三模型的编辑是否与基础生成同批上线；建议代码同批接入、按模型独立 Shadow/灰度，延长和首尾帧继续拆批。
4. H3 的 2K 成本和延迟是否可被默认路由接受，还是必须显式用户选择。
5. Wan 3.0 使用哪个地域；文档/网页内容是否允许发送给该地域的第三方 Provider。
6. `link` 输入是否只支持公开网页；私有 SaaS 页面建议先由现有采集链形成内部资产，不直接交给 Provider 抓取。
7. 自动重试和换路的默认最大次数、最大 Provider 成本，以及何时需要用户二次确认。
8. Policy 拒绝产生费用时由谁承担，能否自动改写；建议不自动改写用户硬意图。
9. 生产 QA 是“生成后自动阻断”还是只打标；人物、产品、台词、音轨和不可解码应默认阻断。
10. 三个模型的商务价格、额度、SLA、数据保留和故障支持是否已具备生产条件。

## 16. 本轮建议的最小决策

如果本周只做一次评审，建议先确认以下四点：

1. 同意以统一 intent / capability / adapter / receipt 底座接入，而不是扩展 Agent 的 Provider 参数块。
2. 同意 Seedance 2.5 `gated`、H3 `shadow`、Wan 3.0 `unavailable/shadow` 的独立准入顺序。
3. 同意“参考音频会被模型重构”和“原音频保留必须平台后混音”是两个不同产品合同。
4. 同意 Phase 0 的幂等、计费、转存、Postflight 和失败 receipt 是上线前置，不以“接口能出片”代替。

## 17. 证据与关联文档

- `analysis/video-generation-compiler-design-seedance-h3-wan3-v1.md`：三模型字段、能力和编译映射。
- `analysis/seedance-2.5-runtime-encapsulation-requirements.md`：Seedance 2.5 Runtime 专项要求。
- `analysis/video-generation-h3-api-routing-pre-review-v1.md`：H3 API、路由定位和限制。
- `analysis/audio10-seedance25-test-20260810/audio10-seedance25-test-report.md`：Seedance 2.5 纯音频驱动画面实测。
- `analysis/2026-08-09_video-generation-runtime-gap-probe-report.md`：当前 Runtime 在幂等、重试、Postflight、receipt 等方面的真实缺口。
- `analysis/video-generation-skills-to-model-current-chain-v1.md`：Skills 业务语义到模型参数的当前链路和准入矩阵。
