# 视频生成四层漏斗与成片数据口径需求 v1.0

**日期：**2026-08-14  
**状态：**研发评审稿  
**适用范围：**Seedance 2.5、MiniMax H3、Wan 3.0 及现有视频生产链路

## 1. 背景与目标

线上目前把“用户有需求”“调用模型”“生成视频文件”和“向用户交付成片”混在一起统计，导致 `11,685` 个有用户消息的项目被误当成已完成成片项目，`video_generate` 调用也被误当成生成成功。

本需求建立平台级四层项目漏斗，统一普通生成、续写和 `editvideo` 的分母，并要求新模型接入时同时提供资产生成和交付观测。

本期不改变 Provider 路由、计费、重试或 Asset Service 主流程；也不把 L2 自动解释为用户最终采用的完整成片。

## 2. 统一口径

固定统计窗口：`[2026-07-15T00:00:00Z, 2026-08-14T00:00:00Z)`。

项目 cohort：窗口内至少一条 `role=USER AND event_type=message` 的项目。项目按 `project_id` 去重，不能用消息数或调用数代替。

| 层级 | 业务名称 | 判定条件 | 是否算成片成功 |
|---|---|---|---|
| L0 | 有用户需求 | 项目有用户消息 | 否 |
| L1 | 进入视频生产 | 有 `video_generate`、`submit_render`，或已出现 L2 产物 | 否 |
| L2 | 有视频产物生成 | 存在符合资产生成合同的视频文件 | 否，可能是中间片段 |
| L3 | 有生成且已交付 | L2 存在，且有正式交付事件 | 是，严格成片交付口径 |

### 2.1 L2 视频产物生成合同

至少一个资产必须满足：

```text
source = AI_GENERATED
asset_status = FINAL
file_size > 0
asset_type = VIDEO
  OR mime_type starts with video/
  OR file_name has .mp4/.mov/.webm/.mkv/.m4v extension
```

这表示系统确实产生了可播放视频文件。当前资产表没有 `is_final_composition` 字段，因此不得把 L2 单独解释为最终完整成片。

### 2.2 L3 严格交付合同

L3 必须同时满足：

1. 项目满足 L2；
2. 存在 `role=ASSISTANT AND event_type=final_video`，或 `show_final_video` 调用；
3. 交付事件与视频产物处于同一统计窗口。

另行记录宽口径交付信号：`final_video` 事件或 `show_final_video` 调用，不要求匹配同窗口 L2 资产，只用于对账。

## 3. 线上基线

固定窗口重跑结果：

| 指标 | 项目数 | 占 L0 |
|---|---:|---:|
| L0 有用户需求 | 11,685 | 100.0% |
| L1 进入视频生产 | 8,296 | 71.0% |
| L2 有视频产物生成 | 6,674 | 57.1% |
| L3 有生成且已交付 | 4,862 | 41.6% |
| 宽口径交付信号 | 4,869 | 41.7% |

补充事实：

- L2 共 36,779 个视频资产，平均 5.51 个/项目；
- 1,812 个 L2 项目未在窗口内严格交付，占 L2 的 27.1%；
- 7 个宽口径交付项目没有匹配到同窗口 L2 资产，记为对账差异；
- 7,010 个项目调用过 `video_generate`，但只有 5,402 个匹配到 L2；调用是生产尝试，不是生成成功；
- 1,272 个 L2 项目没有 `video_generate`，说明 Motion/渲染等其他路径也必须进入漏斗。

## 4. 功能需求

### FR-01 项目状态

系统必须能按事件和资产事实重算以下状态：

```text
has_user_demand
production_started
video_artifact_generated
generated_and_delivered
wide_delivery_signal
```

`generated_and_delivered` 必须等于 `video_artifact_generated AND strict_delivery_signal`，不能直接使用宽口径信号。

### FR-02 资产和交付关联

每个生成视频资产必须可关联 `project_id`、`asset_id`、`created_at`、状态、大小、来源、类型、MIME、Provider、model、mode、intent 和 request/task ID（若存在）。续写和 `editvideo` 还必须关联源资产及 revision。

`final_video` / `show_final_video` 必须记录或可回溯到 `delivery_asset_id` / `final_video_id`。无法关联时保留宽口径，但进入 `delivery_asset_unmatched`，不得计入严格 L3。

### FR-03 去重与版本

- 项目按 `project_id` 去重；资产按 `asset_id` 去重；最终版本按 `final_video_id` 去重；
- 重试、轮询和重复展示不得增加项目或资产数量；
- 同一项目的多版本必须保留版本数，不能只保留最后版本。

### FR-04 统一分析维度

所有路由至少支持按以下维度切分：

```text
provider / model / mode / intent / source_kind / duration_bucket / aspect_ratio / route_flag
```

`intent` 至少包含 `text2video`、`reference2video`、`editvideo`、`continuation`。`editvideo` 与 `continuation` 互斥，不能仅凭 `video_list` 自动推断。

### FR-05 失败分层

必须分别统计：Provider 创建/轮询失败、空 URL/下载/转存失败、资产解码失败、L2 生成未交付、交付事件无资产关联、交付后的 Bad。Bad 不得反写生成失败。

### FR-06 计费和时间窗口

L2 不是 L3，不能用 L2 自动结算为用户已获得最终成片。报表必须分别展示 Provider task success、L2 generated、L3 delivered。

固定窗口结束时仍在 pending/processing 的任务不能计入 L2/L3；另提供 +24h/+7d 延迟完成视图，不回写历史窗口。

## 5. 三模型接入要求

Seedance 2.5、MiniMax H3、Wan 3.0 每条 route 都必须进入同一漏斗，至少记录：

```text
provider, model, mode, intent, route_flag
request_id, provider_task_id
generated_asset_id, delivery_asset_id
started_at, provider_terminal_at, asset_uploaded_at
generation_stage, delivery_stage, error_stage
```

每个 model + mode 独立产出 L1 进入率、L2 生成率、转存率、L3 严格交付率、宽严差异、P50/P95 延迟、生成未交付数和质量指标。Provider `succeeded` 不得单独作为默认生产准入条件。

## 6. 续写与 editvideo

两类能力都必须同时报告 L0、L2、L3 三个分母。当前 61 个严格续写项目相对于这三个分母的机械上界分别为：

```text
61 / 11,685 = 0.52%
61 / 6,674  = 0.91%（上界）
61 / 4,862  = 1.25%（上界）
```

后两项只有在严格续写项目与 L2/L3 项目完成逐项目交集后才能替换为精确比例。

### 6.1 `continuation` mode 决策

**结论：新增平台级 `mode=continuation`。** `extendvideo` 只作为 Provider Adapter 的内部映射名，不对 Agent 暴露第二个同义 mode。

新增该 mode 的理由：

- 最新 30 天已有 123 次严格续写调用、61 个项目；相邻窗口也有 113 次、52 个项目；
- 当前 0 次独立 mode 不是需求为 0，而是线上把续写降级塞进 `reference2video + video_list + Prompt`；
- 续写要求“从源视频尾部增加新内容”，与 `editvideo` 的“修改源视频已有内容”在源素材角色、时长、音频、QA 和路由上都不同；
- 没有独立 mode 就无法做准确的 continuation 计费、幂等、连续性 QA 和 Provider 能力准入。

首期 route：

| Provider/model | `continuation` route | 首期状态 | Adapter 方向 |
|---|---|---|---|
| Seedance 2.5 | `seedance25_continuation` | Gated | 优先映射原生 extend；无原生能力时才走受控 reference endpoint |
| MiniMax H3 | `minimax_h3_continuation` | Shadow | 先验证尾部连续性，再决定是否映射 H3 reference endpoint |
| Wan 3.0 | `wan3_continuation` | Shadow | 先验证尾部连续性，再决定是否映射 Wan reference endpoint |

历史兼容要求：Seedance 2.0/Kling 现有 `reference2video + video_list` 调用不回溯迁移、不改变计费和结果；平台可以记录其 `intent=continuation_legacy`，但不能把新 `continuation` mode 静默降级为 `reference2video`。

统一输入合同：

```yaml
provider: seedance | minimax | wan
model: <exact_model_id>
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

Continuation Hard Gate：

- `source_video` 恰好一个，必须能解码并取得时长、比例、帧率和音轨事实；
- `junction` 只能是 `tail`；首帧/尾帧和多个普通参考视频不能混入；
- `continuation_prompt` 和新增片段时长必填，时长按 Adapter 的 Provider 合同校验；
- 任务中出现“替换、删除、改色、修复源视频已有内容”等编辑语义时，必须路由 `editvideo`，不能路由 `continuation`；
- `audio_strategy=preserve` 表示后期回贴源音轨，不表示模型原样透传音频；
- 不满足 continuation 合同必须结构化失败，不得 fallback 到 `reference2video`。

Continuation QA 至少比较源视频尾部与输出新片头部的：人物身份、场景、动作相位、机位、光照、画面边界和音频边界。Provider `succeeded` 或工具 `ok=true` 不能替代连续性通过。

## 7. 验收标准

固定窗口 SQL 重跑应得到：

```text
L0 = 11,685
L1 = 8,296
L2 = 6,674
L3 = 4,862
wide_delivery = 4,869
generated_assets = 36,779
generated_not_delivered = 1,812
```

工程验收还必须满足：

- 新模型成功任务能关联 L2 资产，或返回结构化资产生成失败；
- L3 交付能回溯到最终资产，无法回溯只能计入宽口径；
- 重试不重复计数；
- route/model/mode/intent 缺失时进入 `observability_incomplete`，不进入模型成功率分母；
- 新旧路由都能按同一 SQL 输出 L0-L3 和失败分层；
- 报表能分开显示生成成功、交付成功和交付后 Bad。

## 8. 研发拆分

| Epic | 内容 | 交付 |
|---|---|---|
| F1 状态合同 | L0-L3、严格/宽交付、失败阶段 | 统一状态枚举和重算规则 |
| F2 资产关联 | 生成资产、源 revision、交付 asset | L2/L3 可审计 |
| F3 观测埋点 | route/model/mode/intent/request/task/asset | 三模型统一日志 |
| F4 去重版本 | project、asset、final_video 去重 | 重试和迭代不污染统计 |
| F5 报表 SQL | 固定窗口、延迟完成、维度切分 | 可复现漏斗报表 |
| F6 质量联动 | L2/L3 与 Post-Call QA、Bad 分离 | 生成成功不等同质量通过 |
| F7 接入回归 | 新模型和现有路由统一跑漏斗 | 可灰度、可回滚、可对比 |

## 9. 关联材料

- `analysis/2026-08-14_online-video-continuation-usage.md`
- `analysis/case-data/video-continuation-online-2026-08-14/delivery-funnel.sql`
- `analysis/2026-08-13_seedance25-minimax-h3-wan30-formal-integration-requirements-v1.md`
