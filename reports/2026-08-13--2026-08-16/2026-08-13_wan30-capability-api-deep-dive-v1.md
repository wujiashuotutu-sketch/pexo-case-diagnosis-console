# Wan 3.0 能力接口深挖与接入裁定 v1.1

**日期：** 2026-08-13
**范围：** 阿里云百炼 `wan3.0-video` 的官方 HTTP 合同、Pexo `video_generate` 增量封装和首期准入；本稿不修改 Runtime、Skill 或 `tech-*`。
**结论口径：** 只把官方文档明确承诺的内容记为接口能力；接口接受某类输入，不等于已证明生产质量、严格保真、口型同步、音色克隆或原音轨保留。

## 1. 结论

Wan 3.0 是一个单模型、单异步 Endpoint 的 All-in-One 视频接口，不是多个模型拼接：

```text
POST /api/v1/services/aigc/video-generation/video-synthesis
model = wan3.0-video
input.prompt + input.media[].type 决定实际任务形态
parameters 控制分辨率、画幅、时长、音轨开关、随机种子和水印
```

官方已明确支持：

- 纯文生视频；
- 首帧图生视频、首尾帧图生视频；
- 图片、视频、音频的全能参考生视频；
- 文档或公开网页驱动视频；
- `480P / 720P / 1080P`，`2-30` 秒或 `-1` 智能时长；
- 有声或无音轨输出、`seed`、水印开关；
- 北京和新加坡地域；异步创建、查询、排队期取消及平台级完成事件回调。

但目前只能标记为“输入合同存在、质量待测”的能力：参考音频驱动、严格口型同步、指定音色、参考视频动作/镜头复刻、基于源视频的自然语言编辑、多人多物跨素材一致性、精确台词、文档/网页事实保真。Wan 可通过源视频 + 编辑指令执行视频编辑，但 schema 没有独立的 source-timeline、mask、原音保持或编辑强度参数；因此不能由“支持编辑”直接推导严格时序、局部零漂移或原音轨保持。

2026-08-13 在线 smoke 进一步确认：现有 DashScope Key 可以通过公共 `dashscope.aliyuncs.com` Endpoint 分别提交 `file` 和 `link` 输入，两项均完成并产出有效 MP4。这个结果证明本账号已具备公测调用权限，但不改变官方地域化 Workspace Endpoint 的正式合同，也不等于文件/网页事实保真已经过生产评测。

因此，Wan 3.0 的接入价值不只是“另一个 reference-to-video 模型”，而是四类当前稀缺接口能力：

1. 单模型统一承接文字、图、视频、音频、文件和网页；
2. 原生 `1080P`、最长 `30s`、最短 `2s`；
3. 原生首帧/首尾帧硬边界；
4. `audio=false` 真正生成无音轨结果，以及 `seed` 复现入口。

## 2. 官方硬合同

### 2.1 请求与地域

| 项 | 北京 | 新加坡 |
|---|---|---|
| 创建 | `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis` | 同路径，Host 为 `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` |
| 查询 | `GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}` | 同地域 Host |
| 必要 Header | `Authorization: Bearer ...`、`Content-Type: application/json`、`X-DashScope-Async: enable` | 同左 |

模型、Endpoint、Workspace 和 API Key 必须属于同一地域。地域不是普通请求字段，应该绑定在 Provider 实例配置，禁止 Agent 在单次调用中自由切换。

兼容性实测：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis` 和对应公共任务查询 Endpoint 在本账号上可正常创建、查询 Wan 3.0 任务。正式接入仍以官方地域化 Workspace Host 为配置主路径；公共 Host 只记录为已验证的兼容路径，不能用它绕过地域与数据驻留策略。

### 2.2 `input`

`prompt` 与 `media` 至少提供一个；官方并不要求 `prompt` 必填。Pexo 首期仍建议让 `prompt` 必填，以获得可审计的创作和素材角色绑定。

| 字段 | 官方合同 | Pexo 预检 |
|---|---|---|
| `prompt` | 中英文，最多 20,000 字符；超长由 Provider 自动截断 | 本地按 Unicode 字符数拒绝，禁止依赖静默截断 |
| `media` | 图、视频、音频、文件或网页 | 结构化输入编译，Agent 不直接构造 `type` |
| 引用词元 | 图片、视频、音频按各自类型独立编号：`图1`、`视频1`、`音频1` | 同一 binding table 同时产出词元与 media 顺序 |

### 2.3 `media[].type` 与素材限制

| type | 数量 | 格式与限制 | 能力含义 |
|---|---:|---|---|
| `first_frame` | 1 | JPEG/JPG/PNG（无透明通道）/BMP/WEBP；单边 240-8000px；宽高比不超过 8:1；不超过 20MB | 严格作为第一帧 |
| `last_frame` | 1 | 同图像限制 | 严格作为最后一帧；Pexo 首期要求同时存在 `first_frame` |
| `reference_image` | 10 | 同图像限制 | 参考素材，不等于严格身份/产品外观保真 |
| `reference_video` | 5 | mp4/mov；单段 1-15s；总计不超过 15s；单边 240-4096px；宽高比不超过 8:1；单个不超过 100MB | 普通 route 中是参考素材；在 Pexo `editvideo` route 中可作为唯一编辑源，但不等于严格时序或原音轨保持合同 |
| `reference_audio` | 5 | wav/mp3；单段 1-15s；总计不超过 15s；单个不超过 15MB | 参考素材，不是严格口型、指定音色或原音轨透传合同 |
| `file` | 1 | doc/docx/xls/xlsx/ppt/pptx/pdf/txt/key/pages/numbers/md；不超过 100MB；部分分页格式不超过 50 页 | 模型理解文件内容后生成视频 |
| `link` | 1 | 无需登录的 HTTP/HTTPS 公开网页 | 模型理解网页内容后生成视频 |

硬互斥：

```text
frame group = first_frame + optional last_frame
reference group = reference_image / reference_video / reference_audio / file / link

frame group × reference group 互斥
file × link 互斥
```

这意味着“首尾帧 + 产品参考图”“首帧 + 音频驱动”“首帧 + 网页资料”都不是单次 Wan 请求的合法组合。要完成这类业务需求，必须改为上游先合成控制帧、拆生成单元或选择其他模型，不能把所有素材塞进同一 `media`。

### 2.4 `parameters`

| 字段 | 官方合法域 | 默认 | 接入裁定 |
|---|---|---|---|
| `resolution` | `480P / 720P / 1080P` | `1080P` | Agent 可选；Shadow 默认 480P 或 720P 控成本 |
| `ratio` | `adaptive / 16:9 / 4:3 / 1:1 / 3:4 / 9:16` | `adaptive` | 允许直传；receipt 回填实际比例 |
| `duration` | 无视频输入：整数 2-30；有视频输入：输入视频总时长 + 输出不超过 30；`-1` 智能时长 | `5` | 编译前读取媒体事实；`-1` 回填 `usage.output_video_duration` |
| `audio` | boolean | `true` | 只是结果是否含音轨，不代表参考音频如何被使用；`false` 明确为无音轨 |
| `seed` | 整数 0-2147483647 | 未说明 | 调试/复现可用；“同 seed 完全一致”仍需在线验证 |
| `watermark` | boolean | `false` | 服务端固定 `false`，不开放给 Agent |

官方价格为按输出秒计费，是否开启声音价格相同：`480P ¥0.3/s`、`720P ¥0.6/s`、`1080P ¥1.2/s`。30 秒单次原价分别为 ¥9、¥18、¥36；Shadow 评测必须显式预算，禁止无上限 fan-out。

在线补充：`duration=-1` 已分别在 14 页论文 PDF 和中文长网页上成功，实际选择 20 秒与 30 秒。它证明智能时长会按输入变化，但不代表自动提高内容保真或降低冻结率。

### 2.5 响应与生命周期

创建成功返回 `request_id + task_id + PENDING`。查询终态会返回 `video_url` 和：

```text
usage.video_count
usage.duration
usage.input_video_duration
usage.output_video_duration
usage.fps
usage.SR
usage.ratio
```

完整状态集合为 `PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED / UNKNOWN`。此前只写四个状态不完整。

- 创建通常耗时 1-5 分钟，官方示例建议约 15 秒轮询；查询限制 20 QPS；
- `task_id` 查询有效期 24 小时，`video_url` 也只保留 24 小时；成功后必须立即转存；
- 百炼通用异步任务 API 支持取消 `PENDING`，不支持取消 `RUNNING`；Wan 邀测 Workspace 和地域化 Endpoint 是否完全兼容该通用接口，必须列入在线合同测试；
- 完成通知不是创建请求里的 `callback_url` 字段。百炼通用方案通过同地域 EventBridge 规则把 `dashscope:System:AsyncTaskFinish` 推到 HTTP 或 RocketMQ，通知只携带任务信息，仍需查询一次结果；Wan 邀测任务是否发出该事件也必须在线验证；
- 当前首期沿用轮询即可；若进入规模生产，再建设 EventBridge/RocketMQ，不能把“回调”伪装成单请求参数。

## 3. 能力分级

| 场景能力 | 接口证据 | 当前级别 | 路由结论 |
|---|---|---|---|
| 文生视频 | 官方示例与 schema | `contract_supported` | Shadow 可测 |
| 首帧/首尾帧 | 首尾帧被定义为严格边界 | `contract_supported` | Shadow 可测；不得混普通参考 |
| 多图/多视频/多音频参考 | 数量和编号合同明确 | `input_supported` | 只证明可提交，需专项保真评测 |
| 文档/网页驱动 | `file/link` 明确 | `contract_supported` | 先过安全、事实保真和地域评审 |
| 2-30 秒、1080P、静音 | 参数合同明确 | `contract_supported` | 是 Wan 首批价值点 |
| 原生有声生成 | `audio=true` | `contract_supported` | 证明有音轨，不证明声音内容正确 |
| 严格口型/参考音频逐字驱动 | 无 lip-sync 或 speech-driver 字段 | `unproven` | 不进入严格口播路由 |
| 音色克隆/指定说话人 | 无 voice identity 强度或 clone 字段 | `unproven` | 不作为能力宣称 |
| 精确台词 | 只有 prompt 文本，无逐字合同 | `unproven` | 必须 STT/说话人/口型专项 QA |
| 参考视频原音轨保留 | `audio` 只是输出开关，无 keep-original-audio 字段 | `unsupported_by_contract` | 编辑可以路由 Wan，但原音保留必须后期回贴 |
| 基于源视频的自然语言编辑 | 唯一源视频 + 编辑 Prompt 通过统一多模态接口表达 | `input_supported` | 注册独立 `editvideo`，先 Shadow 评测编辑命中和非目标漂移 |
| 严格源时间线编辑/续写 | 无 mask、source-timeline、keep-motion 或 extend 操作字段 | `unproven` | 不承诺逐帧结构/时序保持；续写另行评测 |
| seed 复现 | 参数存在 | `input_supported` | 需同 payload 同 seed 重跑验证稳定范围 |

这里建议将 Capability Registry 的支持状态从单一 boolean 改成最少四级：

```text
contract_supported   官方明确承诺，可做接口准入测试
input_supported      Provider 接受输入，但业务语义/质量未获保证
evaluated            已通过 Pexo 同口径质量门槛
production_ready     质量、稳定性、成本、安全和资产结算均通过
```

## 4. Pexo 最小增量封装

### 4.1 一个 Provider Adapter，三个 capability block

Provider 内核只实现一个 `wan3.0-video` Adapter；当前 `video_generate` 的 route key 又必须唯一对应一个 provider block，所以不能让两个 mode 共用一个 `wan3_reference2video` key，也不宜把所有形态塞进一个巨型可选字段块。

建议首期暴露三个互斥 capability：

| 顶层 mode | provider_param key | 输入 |
|---|---|---|
| `text2video` | `wan3_text2video` | 无媒体，仅 prompt |
| `reference2video` | `wan3_reference2video` | 首尾帧或普通参考图/视频/音频；file/link 先 feature flag，输入组互斥 |
| `editvideo` | `wan3_editvideo` | 唯一 `source_video` + 编辑 Prompt；额外参考素材先关闭 |

三者共享内部 `Wan30Params -> DashScope payload` 编译函数、同一 preflight、状态映射和结果转存。不要分别维护三份 Provider 请求结构。`editvideo` 是 Pexo 业务 mode，Provider 侧仍编译到统一多模态接口。

不建议首期新造 `doc2video` / `url2video` 顶层 mode：当前线上 mode 词表和 Capability Registry 尚无这两种模式。先把 `file` / `link` 作为 `wan3_reference2video` 内部互斥输入并默认关闭；完成安全与产品决策后，再决定是否给它独立的 Agent preset。

### 4.2 对 Agent 暴露的字段

`wan3_text2video`：

```yaml
prompt: string                  # 1..20000，本地拒绝超长
duration: -1 | 2..30
resolution: 480P | 720P | 1080P
aspect_ratio: adaptive | 16:9 | 4:3 | 1:1 | 3:4 | 9:16
sound: on | off                 # Adapter 编译为 parameters.audio
seed: 0..2147483647             # Shadow/调试可见，普通自动路由不主动填
```

`wan3_reference2video` 内部分为两组互斥输入：frame 组使用 `first_frame_url`、可选 `last_frame_url`；reference 组使用普通参考或 file/link。Schema 能表达 `oneOf` 时从结构上消除冲突，否则在 Validator 中于创建任务前阻断。

`wan3_reference2video`：

```yaml
prompt: string
image_list: [{image_url}]
video_list: [{video_url}]
audio_list: [{audio_url}]
file_url: string                # feature flag, 与 link_url 互斥
link_url: string                # feature flag, 与 file_url 互斥
duration: -1 | 2..30
resolution: 480P | 720P | 1080P
aspect_ratio: adaptive | 16:9 | 4:3 | 1:1 | 3:4 | 9:16
sound: on | off
seed: 0..2147483647
```

服务端持有，不开放给 Agent：地域、WorkspaceId、Endpoint、API Key、`X-DashScope-Async`、`model`、`watermark=false`、轮询间隔、任务取消与转存实现。

### 4.3 请求示例

```json
{
  "provider": "wan",
  "model": "wan3.0-video",
  "mode": "reference2video",
  "provider_param": {
    "wan3_reference2video": {
      "prompt": "图1提供产品身份，视频1仅提供镜头运动。保持图1产品结构和标识，沿用视频1的平稳环绕节奏。无台词，无背景音乐。",
      "image_list": [{"image_url": "https://.../product.png"}],
      "video_list": [{"video_url": "https://.../camera-motion.mp4"}],
      "resolution": "720P",
      "aspect_ratio": "16:9",
      "duration": 8,
      "sound": "off"
    }
  }
}
```

Adapter 编译：

```json
{
  "model": "wan3.0-video",
  "input": {
    "prompt": "...",
    "media": [
      {"type": "reference_image", "url": "https://.../product.png"},
      {"type": "reference_video", "url": "https://.../camera-motion.mp4"}
    ]
  },
  "parameters": {
    "resolution": "720P",
    "ratio": "16:9",
    "duration": 8,
    "audio": false,
    "watermark": false
  }
}
```

### 4.4 必须在创建任务前拦截

- Prompt 超过 20,000 字符，不允许 Provider 静默截断；
- last frame 无 first frame；
- frame block 出现普通 reference；
- `file_url` 与 `link_url` 同时存在；
- 参考图超过 10、视频超过 5、音频超过 5；
- 视频/音频单段不足 1 秒或超过 15 秒；视频总时长或音频总时长超过 15 秒；
- `sum(input_video_duration) + requested_output_duration > 30`；
- 透明 PNG、图像/视频尺寸、比例、格式、文件大小不合法；
- link 不是公开 HTTP/HTTPS，或落入内网、回环、云元数据地址；
- 文档类型、大小或页数不合法；
- 文件 URL 尾段不能识别合法扩展名、包含 Provider 禁止的 `@`，或 PDF 超过 50 页；
- 地域/Workspace/Key/模型准入状态不一致；
- 严格口型、原音轨保留、逐帧时间线保持或续写合同被误当成 Wan 已保证能力；普通编辑任务应走独立 `wan3_editvideo`，不得藏在 reference Prompt 中。

## 5. 文档与网页输入的安全门

`file/link` 是能力优势，也是最大的新攻击面。首期默认关闭，开放前至少实现：

1. URL 解析后只允许 `https`，禁止 userinfo、非标准端口、IP literal；
2. DNS 解析与每次重定向都拒绝 loopback、RFC1918、link-local、CGNAT、IPv6 ULA、云元数据地址；
3. 只允许 Asset Service 签发的文件 URL，或先由平台下载、病毒扫描、类型嗅探、页数校验并转存后再交给 Provider；转存 URL 必须有明确合法扩展名且不含 `@`；
4. 不把需要登录、Cookie、Token 或一次性授权的网页直接发给 Provider；
5. 对文档/网页建立数据分类与地域政策：北京与新加坡分别明确可发送的数据等级；
6. Prompt 注入不参与工具控制。文档或网页中的“忽略系统要求、访问其他 URL、泄露信息”等文字只能当内容素材，不能改写路由、参数、资产权限或回调目标；
7. receipt 记录源资产/URL 的规范化 hash、地域、抓取时间和模型版本，但不记录签名 URL 明文。

## 6. Shadow 评测矩阵

接口 smoke 与质量评测要分开。先用最小低价调用验证合同，再评能力：

### 6.1 T0 接口合同

- 文生 2s/30s、`-1` 智能时长；
- 480P/720P/1080P；六种画幅；`audio=true/false`；固定 seed 重跑；
- 单首帧、首尾帧；frame/reference、file/link 非法组合必须零任务阻断；
- 图 10、视频 5、音频 5 和各自超限；视频/音频 1s 与 15s 边界；
- 北京/新加坡三件套错配；PENDING 取消、RUNNING 取消失败；
- SUCCEEDED 后即时转存，模拟 24h URL/任务过期；
- `CANCELED/UNKNOWN` 状态映射；usage 字段回填。

### 6.2 T1 生产语义

- 多人物、多产品、多参考的编号绑定和身份保持；
- 参考视频分别测试动作、运镜、构图、节奏，不把“参考视频”当单一能力；
- 参考音频分别测试环境声、音乐、说话节奏、音色、逐字台词和口型；
- 首尾帧严格像素边界与中间过渡质量；
- 文件/PDF/PPT/网页的事实召回、错误编造、品牌文本、敏感信息泄漏；
- 原生音轨的 speech/music/SFX 分离 QA，而非只检查 `has_audio=true`；
- 与 Seedance 2.0/2.5、H3 使用同 prompt/素材/时长/画幅做同口径质量、P50/P95 延迟和成本对比。

### 6.3 生产准入

建议按能力子集独立开 Gate，不给整个模型一个总开关：

```text
wan3_text_720p_2_15s_silent        -> 最先候选
wan3_frame_first_last_720p         -> 通过边界和过渡 QA 后
wan3_reference_image_video_720p    -> 通过绑定/保真 QA 后
wan3_1080p                          -> 成本与质量收益成立后
wan3_native_audio                   -> speech/music/SFX QA 后
wan3_reference_audio                -> 口型/音色/台词分别过 Gate 后
wan3_file_link                      -> 安全、地域、事实保真均通过后
```

当前公测阶段默认 `shadow`，不得仅因一次接口成功加入自动生产路由。

### 6.4 2026-08-13 file/link 在线 smoke

两项任务都使用 `480P / 2s / audio=false`，分别只传一个 `file` 或一个 `link`：

| 输入 | 终态 | 提交到完成 | 媒体有效性 | 语义结论 |
|---|---|---:|---|---|
| PPTX file | `SUCCEEDED` | 11m 16.4s | H.264 832x480, 30fps, 2s，无黑帧/冻结/音轨 | 智能眼镜产品、颜色和佩戴场景与源文件直接对应 |
| 官方 API 网页 link | `SUCCEEDED` | 9m 05.5s | H.264 832x480, 30fps, 2s，无黑帧/冻结/音轨 | 识别 Wan 视频生成主题，但新增二维码/拟制 UI，事实严格保真未通过 |

本次 smoke 证明 `file/link` 的创建、解析、生成和结果下载链路可用，同时证明“网页可读”不能直接升级成“事实保真”。完整证据见 `analysis/2026-08-13_wan30-file-link-input-smoke-test.md`。

扩展 10-case 测试进一步覆盖 PDF、DOCX、XLSX、Markdown、TXT、动态/静态网页、302 重定向和认证负例，结果为 8 成功、2 失败。关键新增边界：同一 XLSX 仅增加 `?download=1` 就从下载失败变成成功；认证网页不是创建时拒绝，而是运行约 6 分钟后失败；Markdown/TXT/网页即使主题正确，仍会改写命令、域名或自创 UI；部分 2 秒结果存在 0.4-1.9 秒黑段/冻结。完整证据见 `analysis/2026-08-13_wan30-file-link-input-expanded-test.md`。

Phase 3 长时测试产出 10 条主视频，共 235 秒：固定 15-30 秒 8 条，`-1` 两条分别输出论文 20 秒和网页 30 秒。接口与解码均通过，但长时仍有命令/界面幻觉和大段近静止；XLSX 20 秒累计冻结约 12.73 秒，Markdown 15 秒约 10.10 秒。在线新增边界包括 PDF 50 页上限、文件 URL 尾段扩展名、`@` 禁止，以及同 URL 取件/网页解析的非确定性。完整证据见 `analysis/2026-08-13_wan30-file-link-long-duration-phase3-test.md`。

## 7. 对现有文档的修正

现有稿方向基本正确，但应做以下修正：

| 现有说法 | 修正 |
|---|---|
| 参考视频/音频单段 `2-15s` | 官方是 `1-15s` |
| Prompt 超限就 Provider 报错 | 官方会自动截断；Pexo 应主动拒绝 |
| 生命周期只有 PENDING/RUNNING/SUCCEEDED/FAILED | 还包括 `CANCELED/UNKNOWN` |
| Wan 没有取消 | 通用异步任务 API 可取消 `PENDING`，不能取消 `RUNNING` |
| 回调可能做成请求参数 | 官方完成通知走同地域 EventBridge HTTP/RocketMQ，不是本请求 `callback_url` |
| 普通参考 + `file/link` 可与首尾帧一起传 | `reference_xx/file/link` 整组与 `first_frame/last_frame` 互斥 |
| Wan 不支持任何视频编辑 | 不成立；可用唯一源视频 + 自然语言编辑指令执行编辑，但无 source-timeline/mask/原音保持字段，严格保持仍未证明 |
| 参考音频可作为口型/音色能力 | 只能写输入支持，严格口型/音色仍未证明 |
| `wan3_text2video` 和 `wan3_reference2video` 已覆盖首期 | 还需 `wan3_editvideo` 固化编辑源语义；frame/reference 互斥通过 reference block 的 `oneOf` 或 Validator 处理 |

## 8. 推荐实施顺序

1. 选定唯一首期地域，并用正式 Workspace Host 再验证模型/Workspace/Key/Endpoint 四件套；公共 Host 的 file/link smoke 已通过；
2. 实现一个 Wan Adapter 和三个 capability block（text/reference/edit），共享 payload compiler；
3. 先接 T0：结构预检、异步轮询、完整状态映射、PENDING 取消、usage 与即时转存；
4. 只用低成本 480P/720P 跑合同 smoke；
5. 用现有 38-case manifest 增加 Wan，同口径评测但补齐 30s、1080P、首尾帧、静音、文件/网页和音频专项；
6. 先开放 silent text/frame 子集，reference/audio/file/link/edit 独立过 Gate；
7. 评测和安全门未完成前，不修改生产 Skill 的默认路由，不把 Wan 加入普通 Agent 可见 catalog。

## 9. 官方来源

- [万相 3.0 视频生成 API 参考](https://help.aliyun.com/zh/model-studio/wan3-video-generation-api-reference)，更新时间 2026-08-07；
- [wan3.0-video 模型信息与计费](https://help.aliyun.com/zh/model-studio/wan3-0-video)，更新时间 2026-08-06；
- [异步任务管理 API](https://help.aliyun.com/zh/model-studio/manage-asynchronous-tasks)，更新时间 2026-08-11；
- [通过 EventBridge 配置异步任务完成通知](https://help.aliyun.com/zh/model-studio/async-task-api)，更新时间 2026-07-30。
