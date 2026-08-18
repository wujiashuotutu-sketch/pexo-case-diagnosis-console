# 基于线上现状的 Seedance 2.5 / MiniMax H3 / Wan 3.0 接入需求 v2.2

**日期：**2026-08-13
**定位：**线上现状增量接入设计，优先用于研发排期和联调
**不包含：**新建意图级主工具、重做现有路由体系、先行改造完整计费状态机

## 0. 先锁定线上现状

本期设计以当前线上实际使用的 `video_generate` 为唯一接入入口：

```json
{
  "name": "<sequence_name>",
  "provider": "seedance | kling | dashscope | minimax | wan",
  "model": "<provider_model_id>",
  "mode": "reference2video | text2video | editvideo（本期新增灰度路由）",
  "provider_param": {
    "<capability_block>": {"...": "provider-specific fields"}
  }
}
```

线上执行链是：

```text
MCP video_generate
  → bind / strict provider_param schema
  → capability registry 按 provider + mode + model 查找
  → capability.Validate
  → capability.Generate
  → GetResult 轮询
  → Asset Service 上传
  → 返回 request_id / asset_id / 可选 intent_receipt
```

现有生产路由和参数块：

| 线上路由 | 调用量（2026-08-04 至 2026-08-11） | 现状 |
|---|---:|---|
| Seedance 2.0 `reference2video` | 8,383（71.90%） | 最大流量、主要参考生成入口 |
| Kling V3 Omni `reference2video` | 2,038（17.48%） | 文字/UI、细节；线上 mode 统计未单独观察到 editvideo |
| HappyHorse `text2video` | 983（8.43%） | 纯文生，部分线上已超过文档声明的 10 秒 |
| Seedance 2.0 Fast `reference2video` | 251（2.15%） | 快速参考预览 |
| 参数缺失/未映射 | 4（0.03%） | 异常，不纳入模型路由 |

输入也以当前线上形状为准：生产日志里的图片/视频/音频主要通过 `file` 路径传入；但当前部分源码快照的 typed schema 使用 `image_url` / `video_url` / `audio_url`。这不是可以靠猜测解决的差异，接入前必须确认实际部署版本；短期应在绑定层兼容两种输入并归一化到 Adapter，或明确完成一次可回滚的 Schema 迁移。新 Adapter 不得只支持 URL 写法而破坏已存在的 `file` 调用。

**线上 mode 结论：**在已审计的 11,659 次生产 `video_generate` 调用中，正常流量只有 `reference2video` 和 `text2video`；尚未观察到独立 `editvideo` 生产调用。与此同时，当前源码已经定义 `ModeEditVideo`，并已具备 FAL Grok 的 `editvideo` spec、Capability 和注册骨架，只是模型目录默认未开放。因此本期可以基于现有架构新增 `editvideo`，但必须把它标记为“新能力灰度”，不能描述成线上已有能力。Kling 源码中的 `refer_type=base` 仍只是 `reference2video` Provider 参数内的编辑语义，不能作为独立 mode 已在线的证据。

当前不要把以下目标态能力当成本期接入前置：

- 新建 `generate_video` 主工具；
- Agent 只传 `request + assets + requirements` 的新入口；
- 完整的 canonical intent 编译器和自动模型评分 Router；
- 统一 `max_attempts`、billing hold/settle、跨 Provider 事务；
- 把所有 Provider payload 收敛成一个新的公共参数协议。

这些可以作为后续演进，但本期先把三个模型接入现有 `video_generate`，并尽量不扰动当前四条线上路由。

## 1. 本期目标和边界

### 1.1 本期目标

1. 让 `video_generate` 的公开 Schema 能列出新模型的合法 `provider/model/mode/provider_param` 组合。
2. 为每个新 Provider route 增加独立 Capability、配置、HTTP Client、请求编译、状态解析和结果下载/上传适配。
3. 复用现有 `Capability.Validate → Generate → GetResult → Asset Upload` 生命周期。
4. 先支持模型最小可用子集，再通过配置模型目录和账号白名单控制是否出现在生产 Schema/路由中。
5. 为新模型补齐与当前 Seedance/Kling 测试相同粒度的 Schema、编译和异步生命周期测试。
6. 保留当前 Agent / Generation Skill 的调用方式，只增加路由文档和 Provider 参数示例。
7. 为 Seedance 2.5、MiniMax H3、Wan 3.0 分别增加独立 `editvideo` route；按模型单独开关灰度，不与普通参考生成共用参数块。

### 1.2 本期不做

- 不重命名 `video_generate`。
- 不要求 Agent 先生成新的 `compiled_plan`。
- 不让模型名从 Prompt 自动推断；Agent 仍按现有 Skill 路由规则填顶层 `provider/model/mode`。
- 不同时开放所有高级能力；延长、首尾帧、文档和 URL 逐项加白名单。三个模型的 `editvideo` 都纳入本期，但“能按指令编辑”不自动等于严格保持源片结构、时序、像素和原音轨；这些保证按模型单独评测、单独开放。
- 不把模型返回 `succeeded` 当成语义质量通过；现有 Post-Call Gate 继续负责业务验收。
- 不把参考音频描述成原始音频透传；线上现状只承诺模型参考/生成，严格保留仍由后期链路另行处理。

## 2. 现有代码要复用的边界

当前 `media-orchestrator` 已有以下扩展点：

| 位置 | 本期复用方式 |
|---|---|
| `internal/mcp/videogen/spec_*.go` | 新增模型对应的 `capabilitySpec` 和 Provider 参数 Schema |
| `internal/mcp/videogen/capability.go` | 把新 model ID 加入 capability spec，并由 `config/model.yaml` 过滤 |
| `internal/domain/video/model_ids.go` | 新增稳定的 Provider model 常量 |
| `internal/domain/video/*_params.go` | 新增 Provider 参数 DTO；严格解码，禁止未知字段 |
| `internal/infrastructure/provider/<provider>/` | 新增 Client、请求体、Capability、状态映射和测试 |
| `internal/mcp/register.go` | 创建 Client、注册 Capability、执行 `ValidateRuntimeRoutes` |
| `internal/application/video/service.go` | 原则上不改主流程；只在新 Provider 需要特殊终态/结果 URL 时做最小通用兼容 |
| `config/model.yaml` | 增加模型目录、支持 mode、地域/启用开关或环境配置 |
| generation routing reference | 增加“何时手工选择新 route、何时仍用 Seedance 2.0/Kling”的规则 |

新模型基础生成仍优先接入线上已使用的 `reference2video` / `text2video`。编辑具有不同的必填源视频、Prompt 写法、输出约束和验收语义，复用 `reference2video` 会使校验和灰度边界含混，因此本期复用源码已有的 `editvideo` 顶层枚举，并为三个模型分别注册精确 model route。`editvideo` 是 Pexo 的业务任务 mode，不要求供应商存在同名 endpoint：各 Adapter 可以将它编译到供应商的多模态生成/编辑接口，但必须保留“源视频”和“普通参考视频”的角色差异。不能为了贴合供应商命名而继续新增无业务边界的 mode。

**model-specific Client 不能通过修改现有默认 Capability 来“顺便支持”新模型。**当前 Seedance 2.0 Capability 使用无 model 的 `Key()` 作为 provider+mode fallback；2.5 使用不同的 Base URL/Key 时，必须注册带精确 model 的独立 Capability，或使用独立 block + 独立 Capability，避免 2.5 请求落到 2.0 Client。

如果当前 `Capability.Key()` 只能返回无 model 的 `RouteKey`，需要先做最小注册层改造：允许按 `RouteKey{Provider, Mode, Model}` 注册和校验精确路由，同时保留现有无 model fallback 给 Seedance 2.0/Fast；不能只把 2.5 model ID 加进同一个无 model Capability 的 allowlist。

## 3. 现状下的接入策略

### 3.1 上线控制方式

当前模型是否显示在 MCP Schema，受 `config/model.yaml` 的模型目录过滤；因此建议：

1. 代码先注册新 Capability，但默认不加入生产 `model.yaml`，避免工具 Schema 提前暴露。
2. 在测试/Shadow 配置中加入 route，使用独立 Provider Key、地域和账号。
3. 通过 Schema、Provider contract test 和少量在线 smoke 后，再加入灰度模型目录。
4. 生产 Skill 文档只有在灰度验证后才把新模型写成“可选路由”，不要提前替换 Seedance 2.0 主路由。

### 3.2 Agent 侧变化

Agent 仍然按线上现有形式调用：

```yaml
provider: seedance
model: doubao-seedance-2-5-260628
mode: reference2video
provider_param:
  seedance_reference2video:
    prompt: "..."
    image_list:
      - file: "/projects/<project>/workspace/assets/presenter.png"
    sound: "on"
    aspect_ratio: "9:16"
    duration: "15"
```

Seedance 2.5 编辑任务仍使用同一个 `video_generate` 工具，但显式切换到独立 route：

```yaml
provider: seedance
model: doubao-seedance-2-5-260628
mode: editvideo
provider_param:
  seedance25_editvideo:
    prompt: "把源视频中的白色鞋子替换为红色运动鞋；保持人物、动作、镜头、时序和背景不变"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    sound: "off"
    resolution: "720p"
```

`mode=editvideo` 是任务类型的结构化事实；Prompt 只描述编辑内容和应保留的部分。Agent 不得仅在 `reference2video` Prompt 中写“编辑/替换”来触发编辑任务。

新模型的业务差异由：

- 顶层 `provider/model/mode`；
- 对应 `provider_param` block；
- 现有 Skill 的模型选择规则；
- Prompt 中的引用绑定；
- 生成后 Post-Call Gate；

共同表达。不要把 `scene`、`speech`、`references` 等当前已经存在但仍属辅助/兼容字段的意图对象当成新模型专属 API 字段。

### 3.3 路由策略

本期不做自动评分 Router，采用“现有 Skill 规则 + 明确场景路由表”：

| 场景 | 现状首选 | 新模型接入后的建议 |
|---|---|---|
| 通用参考图/参考视频，4-15 秒 | Seedance 2.0 | 继续 Seedance 2.0；2.5 先手工灰度 |
| 修改已有视频中的对象、属性或局部画面 | Kling `reference2video + refer_type=base` 有代码语义，但无独立线上 mode 流量 | Seedance 2.5 / H3 / Wan 3.0 分别注册 `editvideo` 并独立灰度；按编辑类型、保持要求和评测结果选择，不自动 fallback 到普通 reference |
| 15-30 秒连续视频 | 需拆成多个现有调用 | Seedance 2.5 灰度；Wan 3.0 Shadow |
| 复杂动作、因果、产品结构 | Seedance/Kling 视经验选择 | H3 Shadow；通过 case 评测后再写入规则 |
| 2K 输出 | 当前无稳定主路线 | H3 专项灰度，不自动路由 |
| 首帧/首尾帧 | 现有普通 reference 或 Kling 近似 | 2.5/H3/Wan 先以显式新 route 评测 |
| 纯音频作为唯一参考 | 现有 Seedance 不支持 | 2.5 作为专项灰度；H3/Wan 暂不承诺 |
| 文档/公开 URL 驱动 | 当前无统一生产入口 | Wan 3.0 仅 Shadow，先做安全和权限验证 |
| 严格口型 / 原音轨保留 | 现有音频策略和 QA 约束 | 新模型默认不改变现有承诺，单独 Gate |

### 3.4 三模型 `editvideo` 公共合同

三个模型对外统一使用：

```text
provider + model + mode=editvideo + 对应 provider_param block
```

统一业务语义是“修改一个已有源视频”，不是“把视频当作灵感参考重新生成”。三个编辑 block 至少都有：

| 公共概念 | 要求 |
|---|---|
| `prompt` | 必填；分开描述目标修改和必须保留项 |
| `source_video` | 必填单值对象；绑定后必须获得类型、大小、时长、比例、解码和音轨事实；编辑 block 不使用 `video_list` 表达源片 |
| `resolution` | 使用各模型自己的合法枚举，不建立虚假公共枚举 |
| `audio_policy` | 内部编译事实：模型生成、最终静音或源音轨后期回贴；不能只靠 Prompt 表达 |
| 编辑审计事实 | 通过现有日志或可选 receipt 记录模型 route、源资产 revision、编辑指令摘要、requested/effective 规格和最终资产；本期不新造公共响应字段 |

以下字段不统一透传：`duration`、`aspect_ratio`、额外参考素材、mask、原声保持开关。Seedance 2.5 由 Adapter 固定 `adaptive/-1`；H3 和 Wan 按各自编辑接口合同编译输出规格。若供应商需要通过自然语言区分 reference/edit，Pexo 顶层 `mode=editvideo` 仍是唯一业务事实，Adapter 负责生成确定性的 Provider 指令，不允许运行时从 Prompt 关键词重新猜 mode。

编辑 fallback 也必须保持 task type：`editvideo(A) → editvideo(B)`。若没有满足源视频、必保留项、规格和声音要求的候选，应返回结构化不可路由，不得静默变成 `reference2video`。

## 4. Seedance 2.5：普通生成兼容接入，编辑使用独立 route

### 4.1 建议入口

**首选：**保持顶层 `provider=seedance`、`mode=reference2video`，但为 2.5 注册精确 model route。Provider block 是否复用 `seedance_reference2video`，取决于是否只开放兼容子集。

理由：线上 8,383 次 Seedance 2.0 主要都走这个 route；Agent 已熟悉该结构；现有 Capability 已经负责 `prompt + image/video/audio list + sound + aspect_ratio + duration`。但 2.5 的 Client、限制和响应不能直接塞进 2.0 的无 model fallback。

不建议首期新增 `seedance25_reference2video` 参数块，除非以下字段无法通过兼容扩展安全表达：

- `content[].role` 的不同素材类型；
- 4-30 秒与 `-1`；
- 480p/720p；
- 7 种比例和 `adaptive`；
- `generate_audio` 与现有 `sound` 的映射；
- 延长/首尾帧等非编辑特殊任务。

### 4.2 推荐分两步

**S2.5-A：复用 `reference2video`，不扩大当前参数块语义。**

只开放普通文生/参考生成：

| Provider block 字段 | 当前线上兼容处理 |
|---|---|
| `prompt` | 保留现有字段和素材位置引用；新模型仍做非空/限长校验 |
| `image_list[].file` | 保持线上主流文件路径形状，由 adapter 转 Provider 可接受 URL/文件引用 |
| `video_list[].file` | 保持现有字段，先校验单段/总时长 |
| `audio_list[].file` | 保持现有字段；必须有视觉伴随素材，除非单独灰度纯音频模式 |
| `sound` | Adapter 映射为 `generate_audio`；默认值继续与现有线上规则一致 |
| `aspect_ratio` | 第一阶段只允许现有 `16:9/9:16/1:1`，避免一次改变 Agent 习惯 |
| `duration` | 第一阶段仍允许 `4-15`；15-30 秒作为单独灰度字段/配置能力 |

**S2.5-B：增加 2.5 专属 reference block，承载非编辑高级能力。**

只有在要开放以下能力时再增加专属 contract：

```text
duration = -1 / 16..30
resolution = 480p | 720p
ratio = 21:9 | 4:3 | 3:4 | adaptive
role = first_frame | last_frame | reference_image | reference_video | reference_audio
output_format = mp4 | mov
return_last_frame
```

建议 block 名为 `seedance25_reference2video`，但需研发确认是否会破坏现有 Provider Schema 生成和 Skill 兼容。专属 block 的好处是字段边界清晰、不会让 Seedance 2.0 误收到 2.5 字段；代价是 Agent 需要学习一个新的参数 key。

### 4.3 Seedance 2.5 首期硬校验

- model ID 只允许 `doubao-seedance-2-5-260628`，不接受任意字符串；
- `resolution` 首期固定服务端值 720p，或在专属 block 中显式支持 480p/720p；
- 首期不开放 1080p/4K；
- reference 图片/视频/音频数量和大小在 adapter 侧按 2.5 合同校验；
- `last_frame` 没有 `first_frame` 时在 Provider task 前拒绝；
- 首尾帧和普通 reference 不混用；
- `generate_audio=false` 只代表输出静音，不代表参考音频会被原样保留；
- 任务创建成功后必须沿用现有轮询和 Asset 上传返回 `request_id + asset_id`。

### 4.4 Seedance 2.5 `editvideo` 独立灰度 route

编辑不能复用 `seedance_reference2video` block。建议新增精确路由：

```text
provider = seedance
model = doubao-seedance-2-5-260628
mode = editvideo
provider_param key = seedance25_editvideo
```

首期参数合同：

| 字段 | 规则 |
|---|---|
| `prompt` | 必填；必须同时写清“要修改什么”和“哪些主体、动作、镜头、时序、背景要保留” |
| `source_video` | 必填单值对象；兼容线上 `file`，迁移期可兼容 `video_url`，绑定后统一为 source URL |
| `sound` | `on/off`；仅控制模型生成音频，不代表保留源视频原音轨；首期建议默认 `off` |
| `resolution` | `480p/720p`，首期默认 `720p` |
| `output_format` | 首期固定 `mp4`；MOV 验证后再开放 |
| `ratio` | 不暴露给 Agent；Adapter 固定编译为 `adaptive` |
| `duration` | 不暴露给 Agent；Adapter 固定编译为 `-1`，保持源片时长语义 |

Provider payload 继续使用 Seedance 2.5 官方 `reference_video` role。顶层 `editvideo` 决定这是编辑任务，不能依靠 Provider 从 Prompt 关键词猜测。

Provider task 创建前必须阻断：

- 无源视频、多个源视频、源文件不是 MP4/MOV；
- 源视频短于 2 秒、长于 30 秒、超过 200 MB、无法解码或事实未就绪；
- 同时传入 `image_list`、`audio_list`、首尾帧或普通 reference 素材；
- Agent 传入非 `adaptive` 比例、非 `-1` 时长或其他仅适用于生成任务的字段；
- 要求“严格保留原音轨”，却没有声明后期音轨回贴方案；该要求不能由 `sound=on` 满足。

编辑完成后的 Post-Call Gate 至少检查：输出可解码、时长与源片一致或在约定容差内、比例保持、目标修改可见、未要求修改的主体/动作/镜头/背景没有明显漂移。若要求保留源音轨，应把模型输出按视觉编辑产物处理，并在独立后期步骤回贴源音轨后再验收。

### 4.5 Seedance 2.5 需要新配置

现有 `Seedance20Config` 不应直接复用同一 API Key/地域。建议新增：

```yaml
provider:
  seedance25:
    base_url: ${SEEDANCE25_BASE_URL}
    api_key: ${SEEDANCE25_API_KEY}
    timeout_second: 60
    enabled: false
    allowed_models:
      - doubao-seedance-2-5-260628
    allowed_modes:
      - reference2video
      - editvideo
    editvideo_enabled: false
```

配置结构可按现有 `Seedance20Config` 实现，不在本期引入通用 Provider 配置框架。

## 5. MiniMax H3：新增 Provider，并注册独立 `editvideo`

### 5.1 入口选择

H3 官方接口是 `POST /v2/video_generation`，可以承载：

- 纯文生：`text`；
- 首帧/首尾帧：`first_frame` / `last_frame`；
- 普通多模态参考：`reference_image` / `reference_video` / `reference_audio`。

基础生成分别注册 `text2video` 和 `reference2video`；编辑另注册 `editvideo`。H3 的 generalized reference/editing 由自然语言和多模态上下文表达，Provider endpoint 仍可复用 `/v2/video_generation`，但 Pexo 必须用独立 route 固化“源视频是待修改对象”这一业务事实。

参考生成示例：

```yaml
provider: minimax
model: MiniMax-H3
mode: reference2video
provider_param:
  minimax_h3_reference2video:
    prompt: "..."
    image_list:
      - file: "/projects/<project>/workspace/assets/product.png"
    resolution: "768P"
    ratio: "16:9"
    duration: 8
```

另增加 `minimax_h3_text2video` 供纯文生使用。不要复用 `seedance_reference2video`，因为 H3 的 `text` 必填、分辨率命名、时长类型和首尾帧互斥规则不同。首尾帧先作为 `reference2video` block 的显式字段，不新增 `first_last_frame` mode；若后续需要独立权限/计费，再单独拆 mode。

### 5.2 H3 Provider 参数 block

首期建议只暴露线上已有概念的映射字段：

| H3 block 字段 | 说明 |
|---|---|
| `prompt` | 必填、非空，编译为 H3 `content[type=text]`；≤7000 字符 |
| `image_list` | 参考图片；Adapter 转 `reference_image` |
| `video_list` | 参考视频；Adapter 转 `reference_video` |
| `audio_list` | 参考音频；Adapter 转 `reference_audio`，先标实验 |
| `first_frame` | 仅首帧模式使用 |
| `last_frame` | 仅首尾帧模式使用；必须同时有 first frame |
| `resolution` | `768P` 或 `2K` |
| `ratio` | T2V 具体比例；I2V 按输入图事实记录实际比例 |
| `duration` | 整数 4-15 |
| `callback_url` | 仅服务端配置，不由 Agent 传入 |

`sound`、`lip_sync`、`seed`、`negative_prompt`、`idempotency_key` 不进入 H3 block：线上现有工具也没有可靠的公共语义承载位，且 H3 API 不支持或没有等价字段。

### 5.3 H3 `editvideo` block

新增 `mode=editvideo + minimax_h3_editvideo`：

```yaml
provider: minimax
model: MiniMax-H3
mode: editvideo
provider_param:
  minimax_h3_editvideo:
    prompt: "把源视频中的纸杯替换为透明玻璃杯，保持人物身份、手部动作、镜头运动、背景和节奏不变"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    resolution: "768P"
    duration: 8
```

首期合同：`prompt` 必填且不超过 7000 字符；`source_video` 必填且恰好一个，Adapter 编译为 H3 `reference_video`；可选编辑参考图片/音频受 H3 混合素材总量约束；`resolution` 允许 `768P/2K`；`duration` 仍按 H3 的 4-15 秒整数合同传入。H3 没有结构化 `preserve_timeline`、`keep_original_sound` 或 `mask` 字段，所以这些不能伪装成已保证能力。

H3 编辑的第一阶段只承诺“以源视频为主要上下文，按 Prompt 生成修改结果”，以下能力必须专项评测后逐项升级：输出时长严格等于源片、剪辑点/运镜/动作逐帧保持、局部区域外零漂移、源音轨原样保留。严格原音保留继续走后期回贴。

### 5.4 H3 首期视觉场景

接入后即使 Schema 可见，Skill 路由也只允许：

- 复杂动作顺序和因果关系；
- 产品结构、部件关系；
- 拼贴/Explainer；
- 首尾帧过渡；
- 2K 视觉输出。

不把以下请求路由到 H3：

- 严格可见口型；
- 原视频现场声原样保留；
- 需要真正无音轨的静音文件；
- 2-3 秒原生输出；
- 首尾帧同时携带普通参考音频/视频。

### 5.5 H3 配置和执行

新增最小配置：

```yaml
provider:
  minimax:
    base_url: https://api.minimax.io
    api_key: ${MINIMAX_API_KEY}
    timeout_second: 60
    enabled: false
    allowed_modes: [text2video, reference2video, editvideo]
    editvideo_enabled: false
```

实现一个 `minimax.Client`、基础生成 Capability 和 `H3EditVideoCapability`，共享 H3 payload compiler 并复用现有 Service 的轮询入口；由于 H3 为异步任务，需完成：

1. create response task ID 提取；
2. query endpoint 和 `queued/running/succeeded/failed` 映射；
3. 首期沿用现有 Service 轮询，不把 callback challenge 作为上线前置；若配置了 callback，再补 challenge 校验和幂等处理；
4. 下载/上传到现有 Asset Service；
5. H3 `running` 不可取消时，不在本期扩展 Service 的取消语义；文档和 Capability 明确该状态不支持取消，不返回“已取消”。

## 6. Wan 3.0：新增 Provider，先 Shadow 不进默认线上路由

### 6.1 先做接入条件，不先改 Skill 默认路由

Wan 3.0 当前存在三个线上前置条件：邀测权限、地域一致性、临时 task URL 生命周期。三者任一未满足时，代码可以存在，但生产 `model.yaml` 不加入该模型。

建议新增：

```yaml
provider:
  wan:
    base_url: ${WAN3_BASE_URL}
    api_key: ${WAN3_API_KEY}
    region: cn-beijing | ap-southeast-1
    timeout_second: 60
    enabled: false
    allowed_modes: [text2video, reference2video, editvideo]
    editvideo_enabled: false
```

model catalog 仅在 Shadow 环境加入：

```yaml
- provider: wan
  model: wan3.0-video
  support_mode: [text2video, reference2video, editvideo]
```

### 6.2 入口选择

Wan 接口的 `input.prompt`、`input.media`、`parameters` 与现有视频 mode 最接近。官方接口没有 `mode` 参数，任务形态由 `media[].type` 和 Prompt 意图共同决定。为符合当前“唯一 provider/model/mode route 对应唯一 provider block”的注册合同，注册三条 route：纯文生使用 `mode=text2video + wan3_text2video`；普通带素材生成使用 `mode=reference2video + wan3_reference2video`；修改已有视频使用 `mode=editvideo + wan3_editvideo`。三条 route 在 Provider 内共享同一个 payload compiler，不能维护三份漂移的 Wan 请求结构。参考生成示例：

```yaml
provider: wan
model: wan3.0-video
mode: reference2video
provider_param:
  wan3_reference2video:
    prompt: "..."
    image_list:
      - file: "/projects/<project>/workspace/assets/character.png"
    aspect_ratio: "16:9"
    duration: 6
    resolution: "720P"
    sound: "on"
```

建议使用独立 Wan block，而不是强行复用 Seedance block。Wan 有 `file/link/document` 输入、`adaptive`、不同分辨率命名和首尾帧/全能参考互斥，复用会造成 Schema 与语义漂移。尤其 `reference_xx/file/link` 整组与 `first_frame/last_frame` 互斥，不能只在 Prompt 中约定；Schema 能表达 `oneOf` 时直接排除非法组合，否则必须在 `Capability.Validate` 中于创建 Provider task 前确定性阻断。

### 6.3 Wan 首期 Provider block

只开放已确定可映射到现有视频工作流的字段：

| Block 字段 | 第一阶段处理 |
|---|---|
| `prompt` | Pexo 首期必填，≤20000 字符，编译为 `input.prompt`；官方超长会自动截断，所以必须在本地拒绝，不能依赖 Provider 静默截断 |
| `image_list` | 参考图片，编译为 `reference_image` |
| `video_list` | 参考视频，单段 1-15 秒、总计不超过 15 秒；参考输入不等于编辑、续写或原音轨保留 |
| `audio_list` | 参考音频，单段 1-15 秒、总计不超过 15 秒；先 Shadow，不作为严格口型、音色克隆或逐字台词合同 |
| `first_frame` / `last_frame` | 只存在于 `wan3_reference2video` 的 frame 输入组；不能和普通参考、file 或 link 混用 |
| `file` | 文档输入，默认关闭，安全评测后开放 |
| `link` | 公开网页输入，默认关闭，安全评测后开放 |
| `resolution` | `480P` / `720P` / `1080P` |
| `aspect_ratio` | `adaptive` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16` |
| `duration` | `2-30` 或 `-1` |
| `sound` | 映射为 `parameters.audio`，不代表原音轨透传 |
| `seed` | 仅 Shadow/调试入口；不进入普通 Agent 默认路径 |
| `watermark` | 服务端策略，不由 Agent 自由关闭 |

完整官方合同、能力分级、安全门、状态/取消/回调修正和评测矩阵见 `analysis/2026-08-13_wan30-capability-api-deep-dive-v1.md`。

### 6.4 Wan `editvideo` block

新增：

```yaml
provider: wan
model: wan3.0-video
mode: editvideo
provider_param:
  wan3_editvideo:
    prompt: "将源视频中的蓝色背包改为黄色，保持人物、动作、机位、环境和节奏"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    duration: 8
    resolution: "720P"
    aspect_ratio: "adaptive"
    sound: "off"
```

首期合同：`source_video` 必填且恰好一个，Adapter 编译为 `input.media[type=reference_video]`；`prompt` 必填且不超过 20000 字符；输出参数沿用 Wan 的 2-30 秒、480P/720P/1080P、比例和 audio 开关。编辑 block 不允许 `file/link`、首尾帧或多个普通参考视频；额外参考图片/音频是否开放由模型专项测试决定。

Wan 的编辑由统一多模态生成接口表达，首期承诺等级与 Seedance 2.5 不同：先验证指令修改能力，不预先承诺源片时长、剪辑点、动作轨迹和原音轨严格保持。`sound` 只控制输出音频生成，严格保留源音轨仍由后期回贴完成。灰度前必须用对象替换、局部删除、风格修改和文字/Logo 保持四类 case 测出可支持边界。

### 6.5 Wan 结果处理

Wan task ID 与视频 URL 有短期有效期，必须在现有 `GetResult` 成功后立即下载并调用 Asset Service 上传。不能把 Wan 临时 URL 直接作为长期 `file` 返回给 Agent。

如果下载/上传失败，沿用现有 Service 错误返回，但在接入验收中必须能用日志里的 `request_id + provider + model + task status` 定位到失败任务。更完整的 billing settlement / retry receipt 不作为 Wan Adapter 上线前置。

## 7. 现有 Service 的最小通用改动

### P0：新模型必须具备

1. `model_ids.go` 增加三个模型常量；Provider 枚举增加 `minimax`、`wan`，或使用工程已确定的正式标识。
2. `videogen/spec_*.go` 增加对应 capability spec 和严格 Provider Schema。
3. `config/model.yaml` 增加可关闭的模型目录行；默认生产配置关闭 H3/Wan，S2.5 仅灰度配置开启。
4. `register.go` 创建新 Client 并注册 Capability；启动时继续执行 `ValidateRuntimeRoutes`。
5. 新 Provider 实现 `Validate / Generate / GetResult`；请求与查询响应增加 fixture 测试。
6. 新模型的 create task ID 必须非空；成功结果必须有下载 URL 或可转换的结果资产。
7. 新模型的 provider-specific 错误统一映射为现有 `error` 返回格式，不改变上游工具 envelope。
8. 新模型默认不改变 Seedance 2.0、Kling、HappyHorse 的 Schema 和行为。
9. 分别新增 `seedance25_editvideo`、`minimax_h3_editvideo`、`wan3_editvideo` spec、DTO 和精确 Capability；复用已有 `ModeEditVideo`，不得修改 FAL Grok `editvideo` 的 block 或校验。
10. `model.yaml` 中三个模型的 `support_mode` 都可分别控制基础生成与 `editvideo`；关闭某模型编辑开关时，Schema 不暴露该模型的编辑组合，运行时也不得创建任务。

### P1：新模型灰度前补齐

1. 对跨字段限制补少量 Provider validator：三模型编辑源视频唯一性、Seedance 2.5 `adaptive/-1` 固定编译、H3/Wan 编辑输出边界、参考总数、首尾帧互斥、视频/音频总时长、H3 text 非空、Wan file/link 互斥。
2. 对 provider URL 做即时下载/Asset 上传测试，验证临时 URL 不会过期后才处理。
3. 对结果状态映射补齐 `cancelled/expired` 等终态；现有 Service 当前对未知终态会报 unsupported status，需要新 Provider 明确归一化。
4. 为新模型在日志中增加 route/model/task id/attempt（如现有日志能承载），方便 Shadow 复盘；不改变 public tool output。
5. 新增在线 smoke 和 10-20 个离线 case，记录生成质量和费用，不能只用接口返回成功判定可用。

### P2：后续演进，不阻塞三模型初接

- 统一跨 Provider `max_attempts` 和降级 receipt；
- 统一成本估算/hold/settle；
- 统一 requested/effective output facts；
- 新建意图级 `generate_video`；
- 自动模型评分 Router；
- callback 驱动替代轮询；
- 统一幂等键和任务取消语义。

## 8. 现有 Skill / 文档的最小改动

### 8.1 `video-models-routing.md`

只增加三个模型的“显式选择规则”和限制，不改现有主路由：

```text
Seedance 2.5：仅灰度账号；普通 reference2video、15-30s 专项任务，以及 editvideo 视觉编辑。编辑必须有且只有一个源视频，不承诺原音轨自动保留。
MiniMax H3：仅 Shadow/视觉专项；复杂动作、产品结构、Explainer、2K、首尾帧和 generalized editvideo。
Wan 3.0：仅 Shadow；测试文生、首尾帧、1080P、editvideo 和文档/公开 URL，默认不生产。
```

补充原则：

- 新模型没有在配置目录开启时，Agent 不得调用对应 route；
- 普通 4-15 秒参考生成继续使用 Seedance 2.0；
- “修改已有视频”必须显式走对应模型的 `editvideo`；不得靠 `reference2video` Prompt 隐式触发；
- 编辑模型之间的 fallback 只能在源视频、必保留项、输出规格和音轨方案都兼容且用户策略允许时发生；不得直接降级成普通 reference；
- 不因新模型存在而自动将现有失败 fallback 改到新模型；
- 新模型不支持的严格口型、原音轨保留、精确字幕仍按现有 Gate 阻断或走 Kling/Motion/Assembly。

### 8.2 `video-generation-execution.md`

只补 Provider 差异表：

- S2.5 的 `generate_audio` 与线上 `sound` 的映射；
- S2.5 `editvideo` 的源视频唯一性、固定 `adaptive/-1` 编译，以及严格原音轨保留需要后期回贴；
- H3/Wan `editvideo` 将源视频编译为各自的 `reference_video` 输入，但使用独立业务 route；不承诺严格时序/原音轨保持；
- H3 无 `sound` / `lip_sync`，不能把 `sound:on` 传过去；
- Wan `parameters.audio` 与临时 URL 转存；
- 参考音频驱动时仍保留现有“模型原生音频是口型时钟”的规则；
- `audio_list_speech` / `audio_list_voice_ref` 继续只通过现有 `audio_list` + Prompt 角色区分。

### 8.3 不改的线上规则

- `video_generate` 顶层字段和现有 Provider block key；
- 当前 `name`、Asset Service 上传和 MCP response envelope；
- 现有 Seedance 2.0/Kling/HappyHorse 路由优先级；
- 用户侧不展示 Provider 名称、模型名、mode 或 sound flag。

## 9. 测试和验收

### 9.1 不付费的本地/合同测试

每个模型先完成：

- Capability spec 能正确出现在测试 Schema，关闭配置后不出现；
- provider/model/mode/provider_param block 组合不匹配时 task 不创建；
- 三个模型的 `editvideo` 独立 block 能正确出现在各自灰度 Schema，且不会跨模型匹配或误匹配 FAL Grok、Seedance 2.0 Capability；
- 未知字段被严格拒绝；
- 最小/最大时长、分辨率、比例、素材数量和互斥组合；
- Prompt 与素材绑定语法能对应到实际 payload 顺序；
- create/query 成功、pending、failed、expired、空 task ID、空 video URL；
- Asset 上传失败、下载超时、签名 URL 过期模拟；
- 当前四条线上路由回归，尤其是 Seedance 2.0 8,383 次调用对应的常用 payload。

三个编辑 route 都需覆盖：0/1/2 个源视频、合法/非法格式、各自时长与大小边界、混入不兼容参考素材、源视频无音轨/有音轨，以及编辑模型未开时零 Provider task。另分别验证 Seedance 2.5 `adaptive/-1` 固定编译、H3 4-15 秒与 768P/2K、Wan 2-30 秒与 480P/720P/1080P。

### 9.2 Seedance 2.5 在线 Smoke

按成本从低到高：

1. 4 秒、480p/720p、纯文生、`sound=off`；
2. 4 秒、单图片参考、`sound=off`；
3. 4 秒、图片 + `sound=on`；
4. 纯音频参考 + 视觉素材，验证 `audio_list` 角色和音轨重构；
5. 15 秒普通参考；
6. `editvideo`：单个短源视频、局部对象替换、`sound=off`，验证输出时长/比例保持和目标修改；
7. 同一编辑样例要求保留源音轨，验证视觉编辑结果回贴源音轨后的最终产物，而不是把 `sound=on` 视为原音保留；
8. 30 秒任务、首尾帧、延长、MOV/尾帧按开关逐项验证。

### 9.3 H3 在线 Smoke

1. 4 秒文生，具体 `ratio`，768P；
2. 单图参考，确认 `text` 非空；
3. 首帧和首尾帧；
4. 2K 视觉任务；
5. 混合图片/视频参考；
6. H3 `running` 查询；callback challenge 仅在首期启用回调时测试；明确 `running` 不支持取消；
7. 参考音频只做 Shadow，不作为严格口型验收。
8. `editvideo`：对象替换和局部风格修改，验证编辑命中、身份/动作/镜头保持，以及失败时不降级为普通参考生成。

### 9.4 Wan 3.0 在线 Smoke

前提：邀测、地域和 Key 已确认。

1. 4 秒文生，720P；
2. 单图参考；
3. 首尾帧；
4. 1080P；
5. 2 秒 / 30 秒边界；
6. 音频参考、file、公开 link 分开测试；
7. file/link 互斥、参考视频总时长、任务 URL 即时转存；
8. 地域错误和权限错误必须在 Provider task 前或 create 阶段可识别。
9. `CANCELED` / `UNKNOWN` 状态映射、仅 `PENDING` 可取消；完成通知若启用，走同地域 EventBridge HTTP/RocketMQ，不伪装成 create 请求的 `callback_url`。
10. `editvideo`：对象替换、局部删除和风格调整；分别记录时长/比例/动作保持与非目标漂移，不以 Provider 成功状态替代编辑质量验收。

### 9.5 灰度准入

模型不以“接口返回成功”直接转生产。至少满足：

- 连续成功 smoke，结果可下载并上传现有 Asset Service；
- 无 P0 请求编译错误、状态错误或资产丢失；
- 10-20 个业务代表 case 有人工视觉/音频复核；
- 费用、延迟、Provider task ID 和错误可从现有日志回溯；
- 不影响现有四条路由的 Schema、注册和执行回归；
- 具备配置级关闭开关和明确的 fallback，不将必需参考或声音要求静默丢弃。
- 三模型编辑专项样例中，目标修改成功率和非目标区域保持率分别达到该模型门槛；源视频、编辑结果和最终音轨装配产物可以关联复盘。

## 10. 风险和现实限制

当前 Service 的生命周期仍存在已知缺口：重试预算、完整失败 receipt、billing gate、跨阶段 deadline、幂等和最终 Postflight 尚未形成统一生产合同。因此本期接入的现实边界是：

1. 新模型只能复用现有单 task 生命周期，不应在 Adapter 内自行实现并行 fan-out 或复杂换路。
2. 新 Provider 的重试只允许调用方按现有 Skill 规则显式处理，不能在 Adapter 内隐藏重试造成不可见费用。
3. 新模型的结果必须尽快转存，尤其 Wan 3.0，避免临时 URL 过期；但不要声称本期已经解决所有资产结算问题。
4. H3 和 Wan 的声音能力先按实验/Shadow 描述；不要把 `audio_list` 传入等同于口型通过。
5. 如果产品要求严格原音轨保留、严格口型或 2-3 秒原生输出，应继续走已有可验证路线或后期流程，不能因为新模型接入而放宽线上承诺。
6. `editvideo` 是新增生产能力，不是已有线上流量的兼容升级；必须按模型独立计量调用量、成功率、编辑命中率、非目标漂移率和回贴音轨失败率，并可分别关闭。

## 11. 研发排期建议

| 阶段 | 交付 | 依赖/退出条件 |
|---|---|---|
| A. Seedance 2.5 基础兼容接入 | model ID、Config、reference Schema、精确 Capability、create/query、测试 | 先只开 4-15 秒和既有比例；Seedance 2.0 全量回归 |
| A2. Seedance 2.5 编辑灰度 | `seedance25_editvideo` DTO/spec/Capability、唯一源视频校验、`adaptive/-1` 编译、编辑专项 Gate 和开关 | 不影响 Grok/Kling/Seedance 2.0；在线编辑样例通过后仅对白名单开放 |
| B. H3 Provider Shadow | 新 Provider Config、`minimax_h3_text2video` / `minimax_h3_reference2video` / `minimax_h3_editvideo`、共享 H3 compiler、create/query、2K/首尾帧/编辑测试 | 无默认正式路由；离线/在线 case 可复盘，编辑保持边界有数据 |
| C. Wan Provider Shadow | 新 Provider Config、`wan3_text2video` / `wan3_reference2video` / `wan3_editvideo`、共享 Wan compiler、异步查询、URL 转存、地域/安全/编辑测试 | 邀测与地域条件满足；默认关闭，编辑保持边界有数据 |
| D. 灰度规则 | model catalog、测试账号/流量开关、Skill routing reference、小看板 | 可一键关闭，不改现有默认 route |
| E. 后续统一化 | 意图编译、自动 Router、retry/billing/receipt | 不作为本期模型接入完成条件 |

## 12. 待确认事项

1. Seedance 2.5 是否接受“先复用 `seedance_reference2video`、只开放 4-15 秒”作为最小上线方案；还是首期必须直接新增 2.5 专属 block。
2. H3 的 Provider 名称和 block 命名最终采用 `minimax` / `minimax_h3_reference2video` 还是现有基础设施约定的其他值。
3. Wan 3.0 的 Provider 名称、地域，以及三条 route（text/reference/edit）和 reference block 内的 frame/reference 互斥是否符合现有模型目录规范。
4. H3 callback 是否本期实现；默认只轮询并保留现有 `maxWait` 限制，callback 不作为首期前置。
5. Wan 文档/公开 URL 是本期只做代码 Shadow，还是连同真实第三方内容测试一起做。
6. Seedance 2.5 的 `sound` 默认值是否沿用现有线上 `on`，以及 2.5 是否需要把 `resolution` 暴露给 Agent。
7. 新模型灰度是否允许 Agent 手工指定顶层 model，还是仅由测试配置/内部路由注入。
8. 三模型 `editvideo` 首期是否都只做视觉编辑并默认关闭模型原生声音；若业务要求保留源音轨，是否统一走后期回贴并作为最终验收对象。
9. 三模型编辑灰度是否采用同一组基础质量指标、不同阈值；目标修改成功率、非目标区域保持率、时长/比例容差分别采用什么阈值。

## 13. 关联现状证据

- `analysis/production-video-model-parameter-distribution-20260811.md`：线上 11,659 次 `video_generate` 的模型、mode、字段形状、输入组合和状态分布。
- `analysis/2026-08-09_video-generation-runtime-snapshot-audit.md`：当前 runtime 已有 provider capability，但需求级 preflight、统一 retry/billing/receipt 仍缺失。
- `analysis/2026-08-09_video-generation-runtime-gap-probe-report.md`：真实入口的任务、轮询、资产和取消边界缺口。
- `pexo-skills/generation-skill/references/video-models-routing.md`：当前线上 Seedance/Kling/HappyHorse 路由和参数合同。
- `pexo-skills/generation-skill/references/video-generation-execution.md`：当前 Generation → `video_generate` → Post-Call Gate 的执行规则。
- `analysis/2026-08-13_seedance25-minimax-h3-wan30-integration-requirements-v1.md`：目标态统一底座方案，本稿不把它作为本期前置。
