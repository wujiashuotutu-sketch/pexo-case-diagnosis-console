# Seedance 2.5 / MiniMax H3 / Wan 3.0 正式接入需求 v1.1

**日期：**2026-08-14
**状态：**研发评审稿
**原则：**基于线上 `video_generate` 增量接入，不以目标态 Router 或新工具为前置

## 1. 需求结论

本期继续使用线上唯一视频生成入口 `video_generate`，复用现有：

```text
Validate -> Generate -> GetResult -> Asset Upload
```

本期接入 **11 条精确路由**：

| 模型 | `text2video` | `reference2video` | `editvideo` | `continuation` |
|---|---|---|---|---|
| Seedance 2.5 | 不新增 | 接入 | 接入 | 接入 |
| MiniMax H3 | 接入 | 接入 | 接入 | 接入 |
| Wan 3.0 | 接入 | 接入 | 接入 | 接入 |

`editvideo` 当前没有线上生产流量，但源码已有 mode 与注册骨架。本期将其作为新增业务 mode 灰度开放。Seedance 2.5、MiniMax H3、Wan 3.0 都支持该业务任务，分别使用独立参数块和独立开关。

支持 `editvideo` 表示“可以把一个源视频作为待修改对象并按指令生成结果”，不自动承诺：

- 逐帧保持源时间线；
- 非目标区域零漂移；
- 时长、剪辑点和运镜完全不变；
- 原音轨原样保留；
- mask 级局部编辑。

严格保留原音轨统一由后期回贴完成，不能用模型的 `sound/audio` 开关代替。

线上续写已有稳定执行量，但当前全部绕在 `reference2video + video_list + Prompt`。本期新增规范业务 mode `continuation`，`extendvideo` 仅作为 Provider Adapter 内部映射名；既有 Seedance 2.0/Kling 历史调用保持兼容，不静默迁移。Seedance 2.5 continuation 先 Gated，H3/Wan continuation 先 Shadow。

## 2. 线上基线

已审计的 11,659 次生产 `video_generate` 调用中：

| mode | 调用量 | 说明 |
|---|---:|---|
| `reference2video` | 10,672 | Seedance 2.0、Kling、Seedance 2.0 Fast |
| `text2video` | 983 | HappyHorse |
| 未映射异常 | 4 | 不纳入正常路由 |
| `editvideo` | 0 | 本期新增灰度能力 |
| `continuation` | 0 | 本期新增灰度能力；线上历史续写仍混在 `reference2video` |

现有调用和响应形状保持不变：

```json
{
  "name": "<sequence_name>",
  "provider": "<provider>",
  "model": "<model_id>",
  "mode": "<mode>",
  "provider_param": {
    "<provider_block>": {}
  }
}
```

本期不得改变 Seedance 2.0、Seedance 2.0 Fast、Kling、HappyHorse 的 Schema、默认路由、Provider payload 或返回 envelope。

### 2.1 为什么本期必须增加 `editvideo`

近 30 天有标签的最终视频项目中，295 / 738（40.0%）已经进入修改后交付；修改后严格 Bad 率为 34.6%，比一次直出的 26.0% 高 8.6 个百分点。102 个修改后 Bad 项目中，71 个（69.6%）属于“指令未落实”或“修改无效/变差”，且 100 个（98.0%）存在可读修改文字或 Mark-to-Fix 信号。

这说明修改是主流程，问题也不是简单缺少用户指令。当前真正缺失的是“以一个已有视频为修改对象，同时声明修改项和保留项”的任务合同。

传统时间线工具只能处理裁切、拼接、变速、声音和叠加层，不能替换已经烘焙在像素中的人物、服装、物体或局部动作。`reference2video` 又把源视频视为普通参考，允许整段重新演绎，无法强制唯一编辑源、保持项、差分 QA 和编辑类型 fallback。因此必须增加独立 `editvideo` mode，而不是继续把编辑意图藏在 `reference2video` Prompt 中。

线上 `editvideo` 调用为 0 是因为生产 route 尚未开放，不能解释为需求为 0。当前需求只能通过用户修改消息、多版本交付和失败标签观察。完整数据、案例、能力边界与灰度验证假设见 `analysis/2026-08-13_editvideo-importance-evidence.md`。

## 3. 目标与非目标

### 3.1 本期目标

1. 将 11 条路由注册到现有 Capability Registry，并按 `provider + model + mode` 精确匹配。
2. 为三个模型实现或扩展 Config、Client、DTO、Validator、Payload Compiler、状态查询和结果转存。
3. 为三个模型各提供独立 `editvideo` block，统一用单值 `source_video` 表达编辑源。
4. 为三个模型各提供独立 `continuation` block，统一用单值 `source_video` 和 `junction=tail` 表达续写源和接点。
5. 在创建付费任务前完成格式、数量、时长、互斥、模型准入和字段合法性校验。
6. 用 route 级 feature flag 控制 Schema 可见性和运行时准入。
7. 完成合同测试、在线 smoke、编辑/续写质量评测和现有路由回归。

### 3.2 本期不做

- 不新建 `generate_video` 或替换 `video_generate`。
- 不建设自动模型评分 Router。
- 不统一改造计费、retry、receipt、cancel 和 callback 底座。
- 不让运行时从 Prompt 关键词推断 mode。
- 不一次开放 Seedance 2.5 的全部延长、MOV 输出、尾帧返回等高级能力；`continuation` 只开放受控的尾部续写子集。
- Wan `file/link` 仅保留 Shadow 开关，不进入默认生产路由。
- 不把 H3/Wan 的参考音频输入宣称为严格口型、音色克隆或逐字台词能力。

## 4. 路由与参数块

### 4.1 完整路由表

| Provider | Model | Mode | `provider_param` key | 首期状态 |
|---|---|---|---|---|
| `seedance` | `doubao-seedance-2-5-260628` | `reference2video` | `seedance_reference2video` | Gated |
| `seedance` | `doubao-seedance-2-5-260628` | `editvideo` | `seedance25_editvideo` | Gated |
| `seedance` | `doubao-seedance-2-5-260628` | `continuation` | `seedance25_continuation` | Gated |
| `minimax` | `MiniMax-H3` | `text2video` | `minimax_h3_text2video` | Shadow |
| `minimax` | `MiniMax-H3` | `reference2video` | `minimax_h3_reference2video` | Shadow |
| `minimax` | `MiniMax-H3` | `editvideo` | `minimax_h3_editvideo` | Shadow |
| `minimax` | `MiniMax-H3` | `continuation` | `minimax_h3_continuation` | Shadow |
| `wan` | `wan3.0-video` | `text2video` | `wan3_text2video` | Shadow |
| `wan` | `wan3.0-video` | `reference2video` | `wan3_reference2video` | Shadow |
| `wan` | `wan3.0-video` | `editvideo` | `wan3_editvideo` | Shadow |
| `wan` | `wan3.0-video` | `continuation` | `wan3_continuation` | Shadow |

Seedance 2.5 普通参考生成首期复用现有 `seedance_reference2video` 字段形状，但必须注册精确 model route 和独立 2.5 Client。不得落入 Seedance 2.0 的无 model fallback。

### 4.2 Mode 判定

| 用户任务 | mode | 规则 |
|---|---|---|
| 无素材生成视频 | `text2video` | H3/Wan 可用；本期不新增 Seedance 2.5 文生 route |
| 素材用于身份、产品、风格、动作或声音参考 | `reference2video` | 素材是参考，不是待修改对象 |
| 修改一个已有视频中的对象、属性、风格或局部内容 | `editvideo` | 必须有且只有一个 `source_video` |
| 从已有视频尾部增加新内容 | `continuation` | 必须有且只有一个 `source_video`，`junction=tail` 和新增片段 Prompt |

不得在 `reference2video` Prompt 中仅写“替换、删除、改色、编辑”来隐式触发编辑，也不得仅写“继续”来隐式触发续写。普通 `video_list` 不得自动升级成 `editvideo` 或 `continuation`；历史兼容调用只能保留原 route 并标记为 legacy intent。

## 5. 参数合同

### 5.1 Seedance 2.5 普通参考生成

首期只开放与线上 Seedance 2.0 兼容的子集：

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，沿用现有素材编号绑定规则 |
| `image_list/video_list/audio_list` | 沿用线上 `file` 形状；绑定层兼容当前已部署的 URL 形状 |
| `sound` | `on/off`，Adapter 映射为 `generate_audio` |
| `aspect_ratio` | `16:9 / 9:16 / 1:1` |
| `duration` | 字符串 `"4"` 至 `"15"` |
| `resolution` | 不对 Agent 暴露，首期服务端固定 `720p` |

16-30 秒、更多比例、纯音频唯一输入、首尾帧和其他高级能力使用独立 feature flag，未开启时不得出现在 Schema。

### 5.2 Seedance 2.5 编辑

```yaml
provider: seedance
model: doubao-seedance-2-5-260628
mode: editvideo
provider_param:
  seedance25_editvideo:
    prompt: "把白色鞋子替换为红色运动鞋；保持人物、动作、镜头、时序和背景"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    sound: "off"
    resolution: "720p"
```

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，同时描述目标修改和必须保留项 |
| `source_video` | 恰好一个；MP4/MOV；2-30 秒；不超过 200MB；可解码 |
| `sound` | `on/off`，仅控制模型生成声音；默认 `off` |
| `resolution` | `480p/720p`，默认 `720p` |
| `ratio` | 不暴露，Adapter 固定 `adaptive` |
| `duration` | 不暴露，Adapter 固定 `-1` |
| `output_format` | 首期固定 MP4 |

首期不允许额外图片、音频、首尾帧或普通参考视频与编辑源混用。

### 5.3 MiniMax H3 基础生成

`minimax_h3_text2video`：

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，1-7000 字符 |
| `resolution` | `768P/2K` |
| `ratio` | `21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16`，文生不得用 `adaptive` |
| `duration` | 整数 4-15 |

`minimax_h3_reference2video` 在上述字段上增加：

| 字段 | 合同 |
|---|---|
| `image_list` | 最多 9 张，单张不超过 30MB |
| `video_list` | 最多 3 段；单段 2-15 秒、50MB；总时长不超过 15 秒 |
| `audio_list` | 最多 3 段；单段 2-15 秒、15MB；总时长不超过 15 秒；实验能力 |
| 混合素材 | 总数不超过 12 |
| `first_frame/last_frame` | `last_frame` 必须有 `first_frame`；与普通 reference 组互斥 |

H3 block 不提供 `sound`、`lip_sync`、`seed`、`negative_prompt` 或原音保留字段。

### 5.4 MiniMax H3 编辑

```yaml
provider: minimax
model: MiniMax-H3
mode: editvideo
provider_param:
  minimax_h3_editvideo:
    prompt: "把纸杯替换为透明玻璃杯；保持人物、动作、镜头和背景"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    resolution: "768P"
    duration: 8
```

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，1-7000 字符 |
| `source_video` | 恰好一个；2-15 秒；不超过 50MB；Adapter 编译为 `reference_video` |
| `resolution` | `768P/2K` |
| `duration` | 整数 4-15 |

首期不开放额外参考素材。H3 没有 `preserve_timeline`、mask 或 `keep_original_audio` 字段；最终要求静音时由后处理移除音轨，要求保留源音轨时由后期回贴。

### 5.5 Wan 3.0 基础生成

`wan3_text2video`：

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，1-20000 字符；超长本地拒绝，不允许 Provider 静默截断 |
| `duration` | `-1` 或整数 2-30 |
| `resolution` | `480P/720P/1080P` |
| `aspect_ratio` | `adaptive / 16:9 / 4:3 / 1:1 / 3:4 / 9:16` |
| `sound` | `on/off`，映射为 `parameters.audio` |
| `seed` | 仅 Shadow/调试可见 |

`wan3_reference2video` 在上述字段上增加：

| 字段 | 合同 |
|---|---|
| `image_list` | 最多 10 张，单张不超过 20MB |
| `video_list` | 最多 5 段；单段 1-15 秒、100MB；总时长不超过 15 秒 |
| `audio_list` | 最多 5 段；单段 1-15 秒、15MB；总时长不超过 15 秒；实验能力 |
| `first_frame/last_frame` | `last_frame` 必须有 `first_frame`；与普通 reference 组互斥 |
| `file/link` | 独立 Shadow flag，二者互斥，默认关闭 |

有参考视频时必须满足：`输入视频总时长 + 请求输出时长 <= 30 秒`。

### 5.6 Wan 3.0 编辑

```yaml
provider: wan
model: wan3.0-video
mode: editvideo
provider_param:
  wan3_editvideo:
    prompt: "把蓝色背包改为黄色；保持人物、动作、机位、环境和节奏"
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    duration: 8
    resolution: "720P"
    aspect_ratio: "adaptive"
    sound: "off"
```

| 字段 | 合同 |
|---|---|
| `prompt` | 必填，1-20000 字符 |
| `source_video` | 恰好一个；MP4/MOV；1-15 秒；不超过 100MB；编译为 `input.media[type=reference_video]` |
| `duration` | `-1` 或整数 2-30；显式时长需满足输入加输出不超过 30 秒 |
| `resolution` | `480P/720P/1080P` |
| `aspect_ratio` | `adaptive / 16:9 / 4:3 / 1:1 / 3:4 / 9:16` |
| `sound` | `on/off`，只控制输出是否含模型音轨 |

编辑 block 不允许 `file/link`、首尾帧、多个视频或额外参考素材。

### 5.7 三模型 `continuation` 续写

三个模型统一使用 `mode=continuation`，Provider 是否调用原生 extend 或 reference endpoint 由 Adapter 决定。平台不对外暴露 `extendvideo` 这一第二个同义 mode。

公共参数合同：

```yaml
mode: continuation
provider_param:
  <provider>_continuation:
    source_video:
      file: "/projects/<project>/workspace/assets/source.mp4"
    junction: tail
    continuation_prompt: "从源视频最后一帧无切镜继续动作，保持人物、场景和机位"
    duration: 8
    continuity_keep: [subject_identity, scene, action_phase, camera, lighting]
    audio_strategy: preserve | regenerate | silent | post_mix
```

| 字段 | 合同 |
|---|---|
| `source_video` | 恰好一个；MP4/MOV；可解码；必须取得时长、比例、帧率和音轨事实 |
| `junction` | 固定 `tail`；不允许把首帧/尾帧或普通参考视频混入续写源 |
| `continuation_prompt` | 必填；只描述新增内容、接续动作和保持项 |
| `duration` | 表示新增片段时长；由各 Adapter 按 Provider 合同校验 |
| `continuity_keep` | 结构化记录人物、场景、动作相位、机位、光照和音频边界等保持要求 |
| `audio_strategy` | `preserve` 由后期回贴源音轨；`regenerate/silent/post_mix` 由 Adapter/后期链路执行 |

模型差异：

- Seedance 2.5：`seedance25_continuation`，优先编译到原生 extend；首期 Gated，不自动开放全部 2.5 延长高级字段；
- MiniMax H3：`minimax_h3_continuation`，首期 Shadow，先验证尾部连续性，再决定 reference endpoint 的生产准入；
- Wan 3.0：`wan3_continuation`，首期 Shadow，遵守输入视频与输出时长总预算，先验证连续性和转存。

续写与 `editvideo` 互斥：若任务要求替换、删除、改色、修复源视频已有内容，必须使用 `editvideo`；若任务从源视频尾部增加新内容，必须使用 `continuation`。不满足续写合同必须结构化失败，不得静默降级到 `reference2video`。

## 6. Hard Gate

以下校验必须发生在 Provider task 创建前。失败时返回结构化错误，Provider 请求数和费用均为 0。

| 错误码 | 触发条件 |
|---|---|
| `route_not_enabled` | route 或 edit 开关未开启 |
| `unsupported_route` | provider/model/mode/block 组合不匹配 |
| `provider_param_mismatch` | block 与精确 route 不一致 |
| `unknown_provider_field` | DTO 出现未声明字段 |
| `prompt_required` | Prompt 缺失或为空 |
| `prompt_too_long` | 超过模型长度限制 |
| `edit_source_required` | 编辑任务无源视频 |
| `multiple_edit_sources` | 编辑任务有多个源视频 |
| `invalid_media_fact` | 素材类型、格式、大小、尺寸、时长或解码事实不合法/未就绪 |
| `reference_count_exceeded` | 素材数量超过模型限制 |
| `reference_duration_exceeded` | 单段或总时长超过模型限制 |
| `frame_reference_conflict` | 首尾帧和普通 reference 混用 |
| `file_link_conflict` | Wan 同时出现 file 和 link |
| `io_duration_budget_exceeded` | Wan 输入视频总时长加显式输出时长超过 30 秒 |
| `ratio_must_be_explicit` | H3 文生使用 `adaptive` |
| `last_frame_without_first_frame` | 只传尾帧 |
| `unsupported_audio_guarantee` | 把模型开关当作严格原音轨保留 |
| `continuation_source_required` | continuation 没有且只有一个源视频 |
| `continuation_tail_only` | junction 不是 `tail`，或混入首尾帧/普通参考视频 |
| `continuation_duration_invalid` | 新增片段时长不符合模型合同或总时长预算 |
| `edit_continuation_conflict` | 同一请求同时表达编辑已有内容和尾部续写 |

Schema 能表达的限制使用 enum、required 和 `oneOf`；涉及媒体事实和跨字段关系的限制由 `Capability.Validate` 执行。Validator 不得偷偷修正非法参数后继续付费调用。

## 7. Runtime 改动

### 7.1 Capability 与注册

1. 增加三个稳定 model ID 和 `minimax/wan` Provider 标识。
2. 支持 `RouteKey{Provider, Mode, Model}` 精确注册；保留现有无 model fallback，但只服务已有模型。
3. 新增 10 个模型专属参数 block（3 个 `editvideo` + 3 个 `continuation` + H3/Wan 基础 block）；Seedance 2.5 普通参考继续使用现有 block。
4. 新增或扩展三个 Client，分别实现 create/query/download。
5. H3 的 text/reference/edit/continuation 共享一个 H3 payload compiler；Wan 的四条 route 共享一个 Wan payload compiler。
6. 启动时执行 `ValidateRuntimeRoutes`；目录声明但 Capability 缺失时启动失败。

### 7.2 Config 与开关

每条 route 至少有独立开关：

```yaml
video_models:
  seedance25:
    reference2video_enabled: false
    editvideo_enabled: false
    continuation_enabled: false
  minimax_h3:
    text2video_enabled: false
    reference2video_enabled: false
    editvideo_enabled: false
    continuation_enabled: false
  wan3:
    text2video_enabled: false
    reference2video_enabled: false
    editvideo_enabled: false
    continuation_enabled: false
    file_link_enabled: false
```

开关必须同时控制：

- MCP Schema 是否暴露该组合；
- Runtime 是否允许创建任务；
- Skill 路由文档是否可将其列为可选生产 route。

仅隐藏 Schema 但 Runtime 仍可调用，或仅 Runtime 拒绝但 Schema 仍诱导 Agent 生成参数，均不验收。

### 7.3 输入归一化

线上素材主要使用 `file`，部分 typed schema 使用 `image_url/video_url/audio_url`。绑定层需要兼容已部署形状并归一化为内部资产引用；Provider Adapter 只接收归一化后的 URL 和媒体事实。不得要求 Agent 直接传临时签名 URL。

## 8. 状态、结果与错误处理

| Provider 状态 | 平台状态 |
|---|---|
| PENDING/QUEUED | pending |
| RUNNING/PROCESSING | processing |
| SUCCEEDED/SUCCESS | succeeded |
| FAILED | failed |
| CANCELED/CANCELLED | canceled |
| EXPIRED | failed，`error_stage=expired` |
| UNKNOWN 或未识别状态 | 不得视为成功；有限重查后返回 `provider_status_unknown` |

要求：

1. create 成功必须得到非空 Provider task ID。
2. succeeded 必须得到可下载视频 URL；空 URL 按 Provider 结果错误处理。
3. Provider URL 必须立即下载并上传现有 Asset Service，尤其是 Wan 临时 URL。
4. 对 Agent 仍返回现有 `request_id/asset_id` envelope，不直接返回 Provider 临时 URL。
5. 日志至少记录 route、model、Provider task ID、状态、错误阶段和最终 asset ID，不记录密钥或完整签名 URL。
6. 本期 Adapter 内不做隐藏重试或隐藏换路；每次新建付费 task 必须由现有上层显式触发。
7. fallback 必须保持任务类型：`editvideo(A) -> editvideo(B)`；无合格编辑候选时失败，不得降级成 `reference2video`。

### 8.1 统一成片漏斗与接入观测要求

三模型及现有视频路由必须共用以下四层项目漏斗：

| 层级 | 定义 | 最新线上基线（30 天） |
|---|---|---:|
| L0 有用户需求 | 窗口内至少一条用户消息 | 11,685 |
| L1 进入视频生产 | 有 `video_generate`、`submit_render`，或已经出现 L2 视频产物 | 8,296 |
| L2 有视频产物生成 | `AI_GENERATED + FINAL + file_size>0` 且为视频文件 | 6,674 |
| L3 有生成且已交付 | L2 且有 `final_video` / `show_final_video` | 4,862 |

新增 route 不得只上报 Provider `succeeded`。至少需要写入或可回溯：

```text
provider, model, mode, intent, route_flag,
request_id, provider_task_id,
generated_asset_id, delivery_asset_id,
generation_stage, delivery_stage, error_stage
```

L2 只表示系统生成了可播放视频产物，不能自动解释为最终完整成片；L3 才是严格成片交付口径。宽口径 `final_video/show_final_video` 信号另行统计，不能替代 L3。完整定义、资产过滤、去重、时间窗口、三模型指标和验收基线见 `analysis/2026-08-14_video-production-funnel-requirements.md`。

## 9. 编辑后的声音与质量处理

编辑结果的声音策略只有三种：

| 最终要求 | 处理 |
|---|---|
| 使用模型新声音 | 使用模型输出音轨，并做音轨存在性和内容 QA |
| 最终静音 | 后处理确定性移除音轨并 probe |
| 严格保留源音轨 | 丢弃模型音轨，按源时间线回贴源音轨，再对最终 MP4 验收 |

`sound=on`、`parameters.audio=true` 或 H3 输出带 AAC 音轨，都不能作为“原音保留成功”的证据。

编辑 Post-Call Gate 至少检查：

- 文件可解码、无黑片和异常冻结；
- 目标修改是否命中；
- 核心主体身份和主要动作是否保持；
- 镜头、背景、文字/Logo 等非目标内容是否出现严重漂移；
- requested/effective 时长与比例；
- 最终声音策略是否兑现。

## 10. 测试与验收

### 10.1 工程完成标准

- 11 条 route 均有 Schema、Validator、Compiler、create/query fixture 和错误 fixture。
- 三条编辑 route 均覆盖 0/1/2 个源视频、格式、大小、时长边界和互斥组合。
- 三条 continuation route 均覆盖 0/1/2 个源视频、tail 接点、时长预算、音频策略和编辑/续写互斥组合。
- 配置关闭时 Schema 不暴露、Runtime 零付费 task；配置开启时只接受精确 block。
- Seedance 2.5 请求不会命中 Seedance 2.0 Client。
- H3/Wan 的四条 route 分别复用各自共享 compiler，快照测试证明 role 编译正确。
- pending/running/succeeded/failed/canceled/expired/unknown、空 task ID、空 URL、下载失败和上传失败均有测试。
- 现有四条生产路由的 Schema 和常用 payload fixture 全部回归通过。

### 10.2 在线 Smoke

每个 route 至少完成 3 次连续成功的最小调用；编辑 route 另覆盖：

1. 对象替换；
2. 局部删除；
3. 局部改色/材质；
4. 整体风格调整；
5. 文字/Logo 非目标保持。

Smoke 必须验证 Provider task、轮询终态、下载、Asset 上传、最终 MP4 解码和日志追踪，不得只看 Provider 返回成功。

Continuation route 另覆盖：从尾部无切镜接续、人物/场景保持、动作相位变化、机位/光照边界、音频策略和源片/输出时长对账。工具成功不等于续写连续性通过。

### 10.3 编辑生产准入 Gate

每个模型使用同一套至少 20 个编辑 case 独立计分。建议首期门槛：

| 指标 | 门槛 |
|---|---:|
| Provider 技术成功率 | >=95% |
| 目标修改命中率 | >=80% |
| 核心主体/动作可接受保持率 | >=80% |
| 无严重非目标漂移比例 | >=90% |
| 最终 MP4 可解码与转存成功率 | 100% |
| 严格原音回贴成功率（有此要求的 case） | 100% |

未达到质量门槛不影响代码接入验收，但该模型的 `editvideo` 必须保持 Shadow/关闭，不能进入生产 Schema。

Seedance 2.5 额外记录源片与输出时长/比例偏差；H3/Wan 只记录并建立能力边界，在专项证据完成前不对外承诺严格保持。

### 10.4 Continuation 生产准入 Gate

每个模型使用至少 20 个续写 case 独立计分，至少包含用户显式续写和 Agent 串行续写两类。建议首期门槛：

| 指标 | 门槛 |
|---|---:|
| Provider 技术成功率 | >=95% |
| 尾部接点连续性通过率（人物/场景/动作相位/机位） | >=80% |
| 无严重非目标漂移比例 | >=90% |
| 输出时长、资产转存和 MP4 解码成功率 | 100% |
| 声音策略兑现率（要求保留/静音的 case） | 100% |

未达到门槛的模型只能保持 Shadow/关闭；不得因为模型接受 `source_video` 就宣称支持续写。既有 Seedance 2.0/Kling 的 legacy continuation 路径继续单独监控，不纳入新 route 的准入结论。

## 11. 灰度顺序与回滚

1. 所有代码合并时 route 默认关闭。
2. 测试环境开启全部 route，完成合同测试和低成本 smoke。
3. Seedance 2.5 `reference2video` 先对白名单账号 Gated 开放。
4. Seedance 2.5 的 `continuation` 先跑尾部连续性评测，独立 Gated；H3/Wan 的 `continuation` 保持 Shadow。
5. Seedance 2.5、H3、Wan 的 `editvideo` 分别跑同一编辑评测集，独立达标、独立开启。
6. H3 text/reference 和 Wan text/reference 保持 Shadow，业务专项达标后再逐条开放。
7. 任一路由出现 P0 编译错误、资产丢失、不可控计费或连续质量回退时，只关闭该 route 开关；现有生产路由不变。

灰度期间按 route 监控：调用量、任务创建率、Provider 成功率、Asset 转存率、P50/P95 延迟、单次费用、编辑命中率、严重漂移率和音轨处理失败率。

## 12. 研发任务拆分

| Epic | 任务 | 交付 |
|---|---|---|
| E1 路由底座 | 精确 model RouteKey、model 常量、Provider 枚举、注册自检 | 11 条 route 可独立注册和关闭 |
| E2 Seedance 2.5 | 独立 Config/Client、兼容参考 route、编辑/续写 block、固定参数编译 | 3 条 route + 测试 |
| E3 MiniMax H3 | Config/Client、4 个 block、共享 compiler、轮询和转存 | 4 条 route + 测试 |
| E4 Wan 3.0 | 地域 Config/Client、4 个 block、共享 compiler、状态和即时转存 | 4 条 route + 测试 |
| E5 Preflight | 媒体事实、互斥、数量、时长、Prompt、音频保证 Gate | 付费创建前确定性阻断 |
| E6 灰度与观测 | route flags、日志、指标、白名单和一键关闭 | 可灰度、可复盘、可回滚 |
| E7 质量验收 | smoke、20-case 编辑评测、现有路由回归 | 分模型准入结论 |
| E8 文档同步 | model catalog、Generation routing/execution reference | 只在 route 达标后写为生产可选 |
| E9 成片漏斗观测 | L0-L3 状态、资产/交付关联、去重、固定窗口报表 | 新旧路由共用漏斗，生成与交付可审计 |
| E10 续写能力准入 | continuation 合同、尾部连续性 QA、历史兼容和独立灰度 | 2.5 Gated，H3/Wan Shadow |

## 13. 产品需确认

仅保留两项产品决策，不阻塞研发先按本稿实现：

1. 编辑生产准入是否采用第 10.3 节建议阈值；若不同，需在灰度前给出最终阈值。
2. Seedance 2.5 普通参考生成达标后，是保持白名单手工选择，还是逐步替换部分 Seedance 2.0 流量；本期默认不替换。

## 14. 关联材料

- `analysis/2026-08-13_seedance25-minimax-h3-wan30-online-current-state-integration-v2.md`：线上现状与详细设计依据。
- `analysis/2026-08-13_seedance25-minimax-h3-wan30-integration-requirements-v1.md`：目标态统一底座方案，不作为本期前置。
- `analysis/video-generation-h3-api-routing-pre-review-v1.md`：H3 接口和能力边界。
- `analysis/2026-08-13_wan30-capability-api-deep-dive-v1.md`：Wan 官方合同、状态、安全与在线 smoke。
- `analysis/seedance-2.5-runtime-encapsulation-requirements.md`：Seedance 2.5 Runtime 细项。
- `analysis/2026-08-14_video-production-funnel-requirements.md`：统一成片漏斗与数据口径需求。
