# 69576318368 直接生成视频绕过 HTML 的路由与工具状态需求

## 背景

Case `69576318368` 的源视频本身约 12 秒、可播放且画面正常，最终却经过不必要的 HyperFrames HTML 合成后变成 24 秒黑画面带音频。直接原因仍是非法的单子节点 `data-hf-sequence` 与时序/轨道声明冲突；本需求记录的是防止同类问题再次进入 HTML 的上游路由和运行时门禁，不替代黑屏渲染合同，也不修改任何 `tech-*` 文件。

## 目标

当一个生成视频已经覆盖完整 Script 内容和时长、输出规格正确、原生音频是最终音频且没有后期工作时：

1. 生成阶段明确写出终态路由 `deliver_video`。
2. Router 直接把精确的资产 revision 交给最终视频交付工具。
3. Assembly、Motion 和 `composition.html` 全部不被激活。
4. 如果工具目录没有可用的最终视频交付能力，流程失败并暴露缺失依赖，不能把视频降级送入 HTML。

## 路由模型

`next_action` 是 Generation Handoff 的不可变下一步决策，不是跨阶段可回写的 `status`。每个 Handoff 只由自己的生产阶段写入一次；后续阶段只能消费，不能把早期状态改成另一个状态。

| `next_action.type` | 进入阶段 | 允许的工具面 | 终止/继续条件 |
|---|---|---|---|
| `deliver_video` | 最终视频交付 | 已注册的 final-video delivery action | 交付成功即终止；禁止 Assembly、Motion、HTML、`submit_render` |
| `edit_file` | Assembly | 单输入/单输出 `media_process`、probe、结果校验 | 返回精确修订资产给交付 owner 后终止；禁止 Motion/HTML |
| `compose_video` | Motion（必要时先 Assembly） | HTML、lint、render、final QA | 只有通过最终 receipt 才能交付 |

`packaging_route.route: direct_out` 只表示无需 Visual Map 或包装层的计划，不是最终交付许可。Router 不得从 `direct_out`、文件扩展名、probe 成功或“只有一个视频”自行推导终态；必须消费 `next_action.type`。

## 运行时要求

### 1. Handoff 消费

- Router 在激活下游 Skill 前读取 Generation Handoff 到 EOF，拒绝重复 YAML key，并验证 `next_action.type` 是否属于三个枚举值。
- 缺失、未知、大小写错误或无法解析的 action 必须 fail closed，返回结构化错误，例如 `GENERATION_NEXT_ACTION_MISSING`、`GENERATION_NEXT_ACTION_UNKNOWN`。
- `asset_label` 必须解析到当前选中的资产 revision/path。旧 revision、源素材、候选素材和中间 render 不能作为交付绑定。

### 2. `deliver_video` 门禁

只有以下条件全部满足时才允许 `deliver_video`：

- 一个选中的生成视频覆盖完整 Script 内容和目标时长；
- duration、宽高、帧率/编码等输出规格满足请求；
- 原生音频已确认是最终音频，不需要独立 VO/BGM/SFX 或替换音轨；
- 没有字幕、精确文字、overlay、transition、layout、source edit 或 HTML 任务；
- `delivery_checks` 完整，且 `final_qc_receipt_id` 与当前资产 revision 绑定；
- final-video delivery action 在当前 Tool Catalog 中 active 且 runtime 可见。

缺少最后一项时，返回 `FINAL_VIDEO_DELIVERY_TOOL_UNAVAILABLE`，不要激活 Assembly/Motion。Skill 不得编造工具名；工具能力由环境的 Tool Catalog 注册和映射提供。

### 3. 下游激活互斥

- `deliver_video` 与 Assembly/Motion 是互斥的；一旦路由写入并验证通过，后续调用任一 composition/render 工具都应被 runtime 拒绝。
- `edit_file` 只允许一个输入和一个输出的 `media_process` 变换。需要字幕、混音、叠加、转场或多轨时，必须由 Generation 写 `compose_video`，不能由 Assembly 偷换语义。
- `compose_video` 才允许 `write_file`/`edit_file` 创建或修改 `composition.html`，并继续使用现有 lint、render、最终媒体 QA 门禁。

### 4. 最终交付校验

交付工具必须校验：

1. 交付资产与 Handoff 的 `asset_label + revision + path/content hash` 完全一致；
2. receipt 的用途是当前资产的 final/delivery acceptance，而非仅 generation acceptance、source probe 或预览帧；
3. 有音轨时检查音频流和时长；无音轨时必须有明确静音意图；
4. 任何 revision、用户约束或输出规格变化都会使旧 receipt 失效；
5. 校验失败返回缺失字段和结构化错误，不允许 Agent 用自然语言确认绕过。

## 状态流转与可观测性

不维护一个由多个 Skill 反复改写的全局 `status`。运行时只记录事件和不可变 Handoff：

```text
Script delivery_preference
  -> Generation writes next_action
  -> Router validates and consumes next_action
  -> {deliver_video -> delivery receipt -> terminal
     edit_file -> Assembly -> revised asset
     compose_video -> Motion -> render receipt -> delivery}
```

每次路由事件至少记录 `project_id`、`generation_handoff_path`、`next_action.type`、`asset_label`、`asset_revision`、`consumer_stage`、`allowed_tools`、`blocked_reason`（如有）和 receipt id。这样可以区分“Skill 写错路由”“Tool Catalog 缺能力”和“渲染器/交付 QA 拒绝”三类问题。

## 验收用例

1. 单个 12 秒生成视频，原生音频最终、无包装 -> 写 `deliver_video`，直接交付，零次 HTML/render 调用。
2. 同一视频仅需裁剪/转码 -> 写 `edit_file`，仅进入 Assembly 的 `media_process`，不生成 `composition.html`。
3. 同一视频需要字幕或 BGM 混音 -> 写 `compose_video`，允许进入 Motion。
4. `packaging_route: direct_out` 但 `next_action: compose_video` -> 进入 Motion，跳过 Visual Map；不得把它当成直接交付。
5. `next_action: deliver_video` 但 final-video tool 不在 Tool Catalog -> 阻断并返回 `FINAL_VIDEO_DELIVERY_TOOL_UNAVAILABLE`，不得 HTML fallback。
6. `next_action` 缺失/未知 -> Router fail closed，Assembly 和 Motion 均不启动。
7. 交付 receipt 绑定旧 revision 或只包含 source probe -> 拒绝交付。
8. 回归 case `69576318368`：同一个健康源视频直接交付通过；非法单子节点 sequence 的 HTML 仍由现有 HyperFrames 结构门禁拒绝。

## 工程拆分

- **Router/runtime**：实现 action 枚举、fail-closed、下游激活互斥和工具能力检查。
- **Tool Catalog**：注册并暴露一个明确的 final-video delivery capability；Skill 只引用平台实际可见能力，不硬编码未注册工具。
- **Delivery service**：实现精确资产 revision 绑定和 final/delivery acceptance receipt 校验。
- **Render/lint service**：继续实现已有黑屏、时长、非法 sequence 结构门禁；本需求不直接编辑 `tech-*`。
- **Skill 层**：Script 只写 `delivery_preference`，Generation 写 `next_action`，Assembly/Motion 在入口消费并拒绝非法路由。
