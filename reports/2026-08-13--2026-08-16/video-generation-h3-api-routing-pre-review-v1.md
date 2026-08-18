# H3 接入预审补充：字段映射与模型路由 v1.1

> 本文是《视频生成工具怎么封装｜产品与研发精简需求》的 H3 专项补充，当前用于产品和研发预审，不代表接口已经定稿，也不修改 Agent 的 5 个业务入口字段。

## 1. 预审结论

MiniMax H3 可以作为复杂多模态理解、参考融合、generalized editing、因果动作和拼贴/Explainer 场景的优先候选，但不能直接作为“口播模型”或所有场景的默认模型。

H3 的公开生成接口顶层只有 `model`、`content[]`、`resolution`、`duration`、`ratio` 和 `callback_url`。人物、口播、台词、镜头、风格、静音等业务语义没有独立参数，必须由平台先规范化，再编译成 H3 的文本内容、素材角色和路由约束。

## 2. H3 原生接口事实

接口：`POST /v2/video_generation`，模型名：`MiniMax-H3`。

### 2.1 输入模式

| H3 模式 | `content[]` 组合 | 适用场景 |
|---|---|---|
| 文生视频 | 只有一个非空 `text` | 无参考素材，从文字生成画面 |
| 首尾帧图生视频 | `text` + `first_frame` / `last_frame` 图片 | 控制开始帧、结束帧或两者之间的过渡 |
| 参考生成 | `text` + `reference_image` / `reference_video` / `reference_audio` | 保持人物、产品、动作、风格、声音或节奏参考 |
| Generalized editing | `text` + 作为编辑源的 `reference_video`，可选受约束的其他参考 | 以自然语言描述对源视频的修改；Pexo 顶层使用独立 `editvideo` 业务 mode |

首尾帧模式和参考生成模式互斥：带有 `reference_image`、`reference_video` 或 `reference_audio` 时，不能再带 `first_frame` 或 `last_frame`。

### 2.2 输出和素材限制

- 输出分辨率：`768P` 或 `2K`。
- 输出时长：4-15 秒，整数；2-3 秒需要生成后剪辑，不能当作 H3 原生时长。
- 比例：`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`，另有 `adaptive`。
- 文生视频必须传具体比例，不能使用 `adaptive`。
- 图片转视频时比例由输入图片决定，传入其他比例可能被忽略，不能静默假设用户得到了目标比例。
- 参考图片最多 9 张；参考视频最多 3 段，每段 2-15 秒、合计不超过 15 秒；参考音频最多 3 段，每段 2-15 秒、合计不超过 15 秒；混合素材总数最多 12 个。
- 图片、视频、音频单文件大小上限分别为 30MB、50MB、15MB；请求体上限 64MB；prompt 上限 7000 字符。
- 每次请求都必须有非空 `text`，即使同时传了图片、视频或音频。

### 2.3 H3 没有的参数

H3 当前没有独立的 `scene_type`、`speech_mode`、`speaker_id`、`lip_sync`、`sound`、`camera`、`style`、`negative_prompt`、`seed` 或 `idempotency_key` 参数。

这些字段不能直接塞进 `provider_param` 让 Agent 自由组合，而应由平台编译或用于路由筛选。

## 3. 业务字段到 H3 的映射

| 业务字段 | 大白话定义 | H3 映射 | 处理方式 |
|---|---|---|---|
| `scenario` / `scenario_preset` | 用户想做哪类视频 | 不传给 H3 | 只能作为快捷词，先展开成规范意图，不能直接选模型 |
| `instruction` / `creative.description` | 画面发生什么、镜头怎么拍 | `content[].type=text` | 编译成 H3 prompt |
| `scene.type` | 是主播、产品、环境还是编辑画面 | 无对应字段 | 参与路由，并编译成 prompt |
| `references[].role=edit_source` | 哪个视频是待修改源片 | `video_url + role=reference_video` | 只在 Pexo `editvideo` route 中编译；不得与普通 motion/style reference 混淆 |
| `scene.subjects[]` | 谁出镜、是否必须保持一致 | `reference_image` 或 `reference_video` + prompt 中的素材编号说明 | 一部分直接映射，一部分编译进 prompt |
| `references[].role=first_frame` | 开始画面 | `image_url + role=first_frame` | 直接映射 |
| `references[].role=last_frame` | 结束画面 | `image_url + role=last_frame` | 直接映射 |
| `references[].role=character/product/style` | 人物、产品或风格参考 | `reference_image` / `reference_video` + prompt | H3 role 粒度不足，必须说明“素材 1 是什么” |
| `speech.mode` | 画中说话、画外音、自然声还是不说话 | 无对应字段 | 参与路由和 prompt 编译 |
| `speech.driver.audio_asset` | 哪段音频驱动声音或口型 | `audio_url + role=reference_audio` | 直接映射，但不等于严格口型同步 |
| `speech.driver.existing_video_audio` | 使用原视频现场声 | `video_url + role=reference_video` | 只能作为参考，不能承诺原声原样保留 |
| `creative.exact_dialogue` / `dialogue` | 必须逐字说出的台词 | `content[].type=text` 中的逐字台词 | 没有独立台词参数，需保持唯一事实源 |
| `output.duration_s` | 最终需要多长 | `duration` | 仅允许 4-15 秒整数；更短片段需后期裁切 |
| `output.ratio` | 横屏还是竖屏 | `ratio` | 文生视频必填具体值；图生视频可能被输入图覆盖 |
| `output.resolution` | 画质档位 | `resolution` | `768P` 或 `2K` |
| `execution.max_attempts` | 最多重试几次 | H3 无对应参数 | 由平台执行层控制，每次重试都要记录新 task |
| `execution.allow_degradation` | 做不到时是否允许降低要求 | H3 无对应参数 | 由路由器控制，不能丢人物、台词、声音或必用素材 |

## 4. 口播在 H3 上的实际编译

Agent 仍使用现有简化入口：

```yaml
scenario: talking_head_speech
instruction: 主播正对镜头介绍产品，固定中景
assets:
  speaker: asset_presenter
  speech_audio: asset_voice
dialogue: 这款产品有三个关键优点。
output:
  ratio: 9:16
  duration_s: 8
```

内部先展开为：

```text
scene.type = talking_head
speech.mode = on_camera_sync_speech
speech.driver.kind = audio_asset
speech.sync = strict
creative.exact_dialogue = 唯一台词事实源
```

再编译为 H3：

```json
{
  "model": "MiniMax-H3",
  "content": [
    {"type": "text", "text": "9:16 vertical talking-head video. Image 1 is the presenter identity reference. Audio 1 is the exact speech driver. The presenter speaks the exact dialogue: ‘这款产品有三个关键优点。’ Preserve the presenter identity and synchronize visible mouth movement to Audio 1."},
    {"type": "image_url", "image_url": {"url": "<presenter-url>"}, "role": "reference_image"},
    {"type": "audio_url", "audio_url": {"url": "<speech-audio-url>"}, "role": "reference_audio"}
  ],
  "resolution": "768P",
  "duration": 8,
  "ratio": "9:16"
}
```

H3 支持参考音频和统一视听生成，但接口没有 `lip_sync=true` 或 `speech_sync=strict`。因此 `on_camera_sync_speech + strict` 只能先标记为实验能力，必须通过专门的口型、台词和音频验收后，才可进入正式候选。

## 5. H3 路由矩阵

| 场景 | H3 路由建议 | 原因 |
|---|---|---|
| 复杂指令、严格动作顺序、因果关系 | 优先候选 | 内部 FAB-01 评测 H3 100 分 |
| 参考人物身份、环绕镜头、产品部件关系 | 优先候选 | FAB-11、FAB-12、FAB-19 表现较强 |
| 纸张拼贴、照片剪贴、混合媒介 Explainer | 优先候选 | ANM-01、ANM-02 评测 H3 100 分 |
| 图像 + 音频或图像 + 视频的混合参考 | 候选优先 | H3 原生支持多模态 reference-to-video |
| 修改源视频中的对象、属性或风格 | Shadow 候选 | H3 支持 generalized reference/editing；需独立评测编辑命中和非目标漂移 |
| 严格保持源片剪辑点、动作轨迹和逐帧时序 | 实验或排除 | 无 `preserve_timeline`、mask 或 keep-motion 结构化参数 |
| 四镜头微叙事、硬切数量必须精确 | 不默认优先 | FAB-03 Kling 胜出 |
| 高速运动、遮挡后再识别、建筑连续穿越 | 与 Seedance/Kling 竞争 | 内部评测中 H3 不稳定或非最优 |
| 严格口型同步 | 实验候选或排除 | 无独立 lipsync 参数，必须有音频验收证据 |
| 原视频现场声必须原样保留 | 排除 H3 | H3 参考视频不是原声保留合同 |
| 首尾帧 + 口播音频 | 排除 H3 | H3 首尾帧模式与参考音频互斥 |
| 2-3 秒精确输出 | 生成后裁切或换模型 | H3 原生最短 4 秒 |
| 像素级 UI、Logo、文字精确复现 | 不默认承诺 | 没有结构化文字参数，必要时后期渲染 |

内部 38 个场景评测中，H3 平均 87.9，Seedance 2.0 平均 83.9，Kling 3 Pro 平均 72.1；H3 胜出 16 个场景。该结果来自 FAL 同输入对比，只能作为候选排序证据，不能替代线上分场景验收。

## 6. 路由执行顺序

```text
规范化意图
→ Media Facts 素材事实校验
→ 识别 H3 模式（T2V / I2V / R2V）
→ 硬约束排除
→ H3 / Seedance / Kling 候选排序
→ Provider Adapter 编译请求
→ 创建 task
→ 轮询 / 回调 / 资产上传 / 质量验收
```

建议先记录 H3 候选能力：

```text
text_to_video: supported
first_last_frame_i2v: supported
reference_image: supported
reference_video: supported
reference_audio: supported
mixed_multimodal_reference: supported
generalized_editvideo: supported
strict_source_timeline_preservation: experimental
strict_lip_sync: experimental
exact_original_audio_preservation: unsupported
native_silent_output: unsupported
seed_determinism: unsupported
exact_2_to_3_second_output: unsupported
```

## 7. H3-Context-IR 和执行边界

H3 还提供 `/v2/h3_context_ir`，只生成增强后的结构化 prompt，不直接生成视频。建议仅在多素材、多镜头、动作关系复杂或 Agent 描述不完整时使用，不能替代 intent preflight，也不能覆盖 `exact_dialogue`、`must_preserve`、素材角色和计费事实。

- H3 没有 `max_attempts` 和 `allow_degradation`；这两个字段只能由平台执行层处理。
- 每次重试都会创建新的 H3 `task_id`，可能产生新的费用，必须记录 attempt receipt 和 billing receipt。
- H3 是异步任务，支持查询和回调；回调验证需要在 3 秒内原样返回 challenge。
- H3 任务处于 `running` 时不能取消，只能取消排队任务；平台不能把“已发起取消”当成“模型已经停止”。
- 官方 Pay-as-you-go 价格目前为：768P $0.08/秒、2K $0.13/秒；音频输入免费，前 5 张图片免费，额外图片按张计费，视频输入按输入时长和输出分辨率计费。FAL 评测看板价格可能不同，路由成本应使用实际 provider 价格配置。
- H3 当前没有幂等键，平台需要用规范意图、素材 revision 和输出要求计算 replay key，避免重复创建任务和资产。

## 8. H3 专项验收和待确认项

- [ ] 能根据 `content[]` 正确识别 T2V、I2V、R2V。
- [ ] 首尾帧与 reference image/video/audio 混用时，在创建任务前阻断。
- [ ] H3 prompt 始终包含非空 text，且素材编号和 `references[].ref_id` 可追溯。
- [ ] `editvideo` 使用唯一 `source_video/edit_source`，不会被普通 `reference2video` 隐式触发或降级。
- [ ] 编辑专项分别记录目标修改、身份/动作/镜头保持、非目标漂移和输出时长变化。
- [ ] 图生视频时记录 requested ratio 与 effective ratio，不接受 provider 静默忽略用户比例。
- [ ] H3 4 秒以下目标能明确记录 source duration 和 final trim。
- [ ] 严格口播在没有 lip-sync 评测证据前，不得作为 H3 正式能力承诺。
- [ ] 原视频原声保留和真正静音输出不进入 H3 默认候选。
- [ ] 每次 H3 task 都能回看 canonical intent、编译后的 content、provider task_id、attempt、费用和最终质量结论。

产品和研发需要确认：

1. `talking_head_speech` 是否必须达到严格口型同步；如果是，H3 需要先过专项评测门槛。
2. `silent_character` 的“静音”是指不说话，还是最终文件完全没有音轨。
3. `output.duration_s` 小于 4 秒时，是否统一采用 H3 生成后裁切，以及是否接受按 4 秒计费。
4. 是否允许 H3-Context-IR 作为复杂请求的额外预处理步骤，以及如何计入成本和延迟。

参考：
- https://platform.minimax.io/docs/api-reference/video-generation-v2-create
- https://platform.minimax.io/docs/guides/video-generation
- https://platform.minimax.io/docs/api-reference/video-generation-v2-h3-context-ir
- https://platform.minimax.io/docs/guides/pricing-paygo
- https://test-admin.pexo.ai/api/strategy-packages/41/preview/H3%E5%AF%B9%E6%AF%94%E8%AF%84%E6%B5%8B/index.html
