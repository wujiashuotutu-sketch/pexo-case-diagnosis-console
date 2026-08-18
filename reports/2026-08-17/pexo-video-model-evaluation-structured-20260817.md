# Pexo 四模型视频生成评测与路由策略

**评测对象：** MiniMax H3、Seedance 2.5、Seedance 2.0、Wan 3.0  
**更新时间：** 2026-08-17  
**文档目的：** 将已有真实测试、接口合同、媒体物料和线上接入状态合并成一份可追溯的路由决策文档。

> 阅读方式：先看第 1 节的路由策略，再看第 3 节的横向结果，最后按模型查看证据和物料。本文不把不同测试硬合成一个总分；“接口支持”也不等于“质量已经通过”。

## 1. 路由策略摘要

### 1.1 当前建议

| 业务场景 | 当前首选 | 接入状态 | 为什么这样选 | 使用前必须明确的边界 |
|---|---|---|---|---|
| 综合多模态参考生成，要求稳定上线 | **Seedance 2.0** | **生产可用** | Ark 真实多模态正向任务 5/5，覆盖 Prompt、图片、视频、音频及组合输入 | 输入音频会被明显重构；不能把它当作原音透传或严格 lip-sync 模型 |
| 30 秒左右、声音事件、表演细节、首尾帧 / 编辑 | **Seedance 2.5** | **白名单灰度** | Audio 1.0 驱动和纯文生两种方案均为 4.0/A；6/6 说话人分配、3/3 声音事件视觉化、对白文字保留率 100% | 先开白名单；复杂遮挡、Logo、服装和真实视频编辑还没有足够证据 |
| 视觉锚定、2K、复杂结构、参考人声保留倾向 | **MiniMax H3** | **仅测试，不进正式流程** | 统一声音测试原音相关性 0.950，画面最贴近输入；参考音频正式集 24/24 成功 | 静音参数不可靠；必须后处理音轨，并补做口型、ASR、音色相似度 |
| 纯文生、文件 / 网页输入、1080P、2–30 秒 | **Wan 3.0** | **仅测试，不进正式流程** | 官方合同支持纯文生、首尾帧、多媒体参考、文件 / 网页；文件网页长时测试 10/10 产出 | 文生质量还没有与其他模型同口径对比；文件下载、技术事实、停嘴 / 冻结要逐项 QA |

### 1.2 线上路由合同

1. **默认生产路线：** 当前线上主路由仍以 Seedance 2.0、Seedance Fast、Kling、HappyHorse 为主。
2. **灰度路线：** Seedance 2.5 需要白名单和明确的复杂编辑验收范围。
3. **仅测试路线：** H3、Wan 3.0 只用于专项对比、影子观测或准入评审，不能静默替换默认生产模型。
4. **质量放行条件：** Provider 返回 `SUCCEEDED` 只说明任务完成，不说明画面、音轨、口型、事实保真或时长稳定性通过。

### 1.3 最简选择逻辑

```text
需要稳定的图片/视频/音频组合输入？
  -> Seedance 2.0

需要 30 秒、声音事件、首尾帧或编辑灰度？
  -> Seedance 2.5（白名单）

需要 2K 视觉锚定或输入画面贴合？
  -> H3（仅测试，不进正式流程）

需要纯文生，或文件/网页驱动的 1080P 长视频？
  -> Wan 3.0（仅测试，不进正式流程）
```

## 2. 评测口径与证据等级

### 2.1 统一横向声音测试

- 统一条件：6 秒、16:9、720p；H3 使用 768P。
- 观察指标：原音波形相关性、音色参考、平均耗时、6 秒成本。
- 该测试用于观察音频行为，不是综合质量分，也不能替代逐音素 lip-sync、ASR 或视觉质量评审。

### 2.2 证据等级

| 标记 | 含义 |
|---|---|
| 生产可用 | 已有生产接入和足够的综合证据，仍需遵守具体场景 QA |
| 白名单灰度 | 已有正向结果，但使用范围、权限或复杂场景仍受控 |
| 仅测试，不进正式流程 | 有真实结果或接口证据，尚不足以成为默认路由 |
| 接口支持 | 官方合同或 Provider schema 明确支持输入，不代表质量已经验证 |
| 未覆盖 | 当前资料没有该模型的同口径测试，不能据此推断好坏 |

## 3. 四模型横向结果

### 3.1 统一声音测试

| 模型 | 原音波形相关性 | 音色参考 | 平均耗时 | 6 秒成本 | 直接解读 |
|---|---:|---:|---:|---:|---|
| Seedance 2.0 | 0.428 | 90 vs 30 | 193 秒 | ¥6.00 | 能直出目标普通话，但明显重构输入音频 |
| Seedance 2.5 | 0.099 | 80 vs 35 | 108 秒 | ¥9.14 | 原音保留最弱；优势在声音语义和表演，而非波形保留 |
| MiniMax H3 | 0.950 | 87 vs 72 | 187 秒 | ¥3.00 | 最接近输入音频；静音和严格口型仍不可靠 |
| Wan 3.0 | 0.935 | 90 vs 25 | 502 秒 | ¥3.60 | 音频保留倾向强，但四者最慢，长时有停嘴 / 冻结风险 |

**共同结论：** 四个模型都能通过 Prompt 直出目标普通话台词；四个模型都没有通过严格逐音素 lip-sync。H3/Wan 更接近保留输入音频，不等于逐样本透传。

### 3.2 能力覆盖对照

| 能力维度 | Seedance 2.0 | Seedance 2.5 | MiniMax H3 | Wan 3.0 |
|---|---|---|---|---|
| 纯 Prompt 文生 | 生产基线有覆盖 | 两种 30 秒方案均有覆盖 | 有 Prompt 控制，但当前重点不是该项 | **官方合同明确支持；质量尚未同口径对比** |
| 图片 / 视频参考 | 5/5 多模态编译任务正向 | 首尾帧与表演细节有正向结果 | 画面最贴近输入 | 首尾帧和多媒体参考为接口能力，质量待专项评测 |
| 音频 / 声音事件 | 可生成目标台词，但会重构音频 | 声音事件视觉化强；Audio 1.0 不是必选前置 | 参考音频 24/24；静音需后处理 | 原音相关性高，但严格声音合同未证明 |
| 长时生成 | 当前证据不集中于长时专项 | 30 秒两种方案 4.0/A | 2K / 复杂结构专项，口型证据未完 | 15–30 秒和 `duration=-1` 均有产出 |
| 局部编辑 / 坐标 / 分割 | 当前未覆盖 | 坐标框、透明分割 smoke 测试命中，但无稳定增益 | 复杂结构可做专项，不等于精确编辑 | 支持编辑接口表达，但无 mask / source-timeline 严格合同 |
| 文件 / 网页 | 当前未覆盖 | 当前未覆盖 | 当前未覆盖 | 短输入 8/10，长输入 10/10；技术事实有风险 |
| 工程接入 | 当前生产基线 | 白名单灰度 | 仅测试，不进正式流程 | 仅测试，不进正式流程，依赖邀测权限和地域 |

## 4. 分模型评测结论

### 4.1 Seedance 2.0：生产基线

**推荐定位：** 综合多模态参考生成的默认生产路线。

**已验证：**

- Ark 真实测试 5/5 正向任务成功。
- 覆盖纯 Prompt、图片、图片+视频、图片+音频、图片+视频+音频。
- 产品身份、标签、参考视频运动基本可见。
- 音频单独输入负例在 Provider 创建前被正确阻断。

**限制：**

- 统一声音测试原音波形相关性为 0.428，输入音频会被重构。
- 不能以“任务成功”推断严格原音保留或逐音素 lip-sync。
- 评测目录中的旧 `summary.json` 有 runner 错误，应以 `summary.corrected.json` 为准。

**路由建议：** 只要需求是综合参考生成且没有明确的 H3/Wan 专项要求，优先走 Seedance 2.0。

### 4.2 Seedance 2.5：长时与声音语义灰度

**推荐定位：** 30 秒内容、声音事件视觉化、角色表演和首尾帧 / 编辑探索。

**已验证：**

- Audio 1.0 驱动和纯文生两种方案均为 4.0/A。
- 两种方案均为 6/6 说话人分配正确、3/3 声音事件视觉化、对白文字保留率 100%。
- Audio 1.0 驱动版的声音事件视觉化、人物材质和表演细节更强。
- 纯文生版镜头更自由、成本更低，自动角色声音区分不弱。
- 坐标框、透明分割图和组合输入的单样本 smoke 测试 A/B/C/D 均命中目标。

**限制：**

- 坐标 / 分割测试目前是单样本 smoke，不能外推复杂遮挡、Logo、人物服装或真实视频编辑。
- 不建议默认把坐标框、箭头、涂鸦直接传给视频模型。
- 统一声音测试原音波形相关性为 0.099；这不是该模型的优势指标。

**路由建议：** 先通过白名单使用；对需要声音控制的内容，Audio 1.0 是可选控制层，不应被设计成所有任务的必选前置。

### 4.3 MiniMax H3：视觉锚定与参考音频专项

**推荐定位：** 视觉锚定、2K、复杂结构的专项候选，不作为默认生产路由。

**已验证：**

- 统一声音测试原音波形相关性 0.950，四模型中最高。
- 参考音频正式测试 24/24 成功。
- 画面最贴近输入，适合需要输入画面一致性的场景。
- 音乐 Prompt 相对稳定。

**限制：**

- Prompt 请求静音 3/3 失败，仍生成 AAC 音轨。
- `sound:false`、`audio:false`、`mute:true` 均不能可靠关闭声音。
- click / marker 可能泄漏到最终音轨。
- 严格口型、逐字 ASR、完整音色相似度目前没有完整证据。

**路由建议：** 只做测试和对比；正式交付前必须由后处理删除或替换音轨，并补齐口型、ASR、音色和输出视频检查。

### 4.4 Wan 3.0：纯文生与文件 / 网页输入专项

**推荐定位：** 纯 Prompt 文生、首尾帧、多媒体参考以及文件 / 网页驱动视频的统一接口候选；当前仍是仅测试路线。

**接口能力已经明确：**

- 官方合同支持纯文生视频。
- 支持首帧、首尾帧、图片 / 视频 / 音频参考。
- 支持文档或公开网页驱动视频。
- 支持 480P / 720P / 1080P、2–30 秒或智能时长 `-1`。
- Pexo 接入建议拆成 `wan3_text2video`、`wan3_reference2video`、`wan3_editvideo` 三个互斥 capability block。

**真实测试已经覆盖：**

- 文件 / 网页短输入 10 条中 8 条成功，2 条失败。
- 长时输入 10/10 产出成功，覆盖 15–30 秒和 `duration=-1`。
- PPTX、图片型 DOCX 相对可靠。
- 技术 Markdown、TXT、网页可能出现错误命令、错误域名或虚构 UI。
- XLSX 20 秒约 63.7% 近静止；Markdown 15 秒约 67.3% 近静止。

**尚未证明：**

- 纯文生质量还没有与 Seedance 2.0、Seedance 2.5、H3 使用同 prompt、同画幅、同时长做完整对比。
- 接口支持不等于严格台词、严格口型、参考音频逐字驱动、原音轨保留或精确编辑已经通过。

**路由建议：** 可以把 Wan 3.0 作为“纯文生 + 文件 / 网页”的测试候选，但不要因为 Provider 成功就直接升级为正式生产路由。

## 5. 评测物料与可复核入口

以下物料保留在 `analysis/` 下，文档中的相对链接可直接打开。

### 5.1 总结报告

| 主题 | 报告 |
|---|---|
| 四模型统一声音测试 | [FINAL-REPORT.md](video-model-audio-semantics-test-suite-20260814/FINAL-REPORT.md) |
| Seedance 2.0 多模态真实测试 | [README.md](seedance-compile-real-test-20260812/results/ark-live-key-20260812/README.md) |
| Seedance 2.5 声音驱动 vs 纯文生 | [seedance25-text-vs-audio-ab-report.md](audio10-seedance25-test-20260810/seedance25-text-vs-audio-ab-report.md) |
| Seedance 2.5 坐标 / 分割测试 | [seedance25-coordinate-segmentation-test-summary-20260817.md](seedance25-coordinate-segmentation-test-summary-20260817.md) |
| H3 参考音频正式结果 | [FORMAL-RESULTS-v1.md](h3-reference-audio-test-set-20260813/FORMAL-RESULTS-v1.md) |
| H3 音频控制 API | [2026-08-13_minimax-h3-audio-control-api-test.md](2026-08-13_minimax-h3-audio-control-api-test.md) |
| Wan 3.0 接口能力与接入裁定 | [2026-08-13_wan30-capability-api-deep-dive-v1.md](2026-08-13_wan30-capability-api-deep-dive-v1.md) |
| Wan 3.0 文件 / 网页扩展测试 | [2026-08-13_wan30-file-link-input-expanded-test.md](2026-08-13_wan30-file-link-input-expanded-test.md) |
| Wan 3.0 长时输入测试 | [2026-08-13_wan30-file-link-long-duration-phase3-test.md](2026-08-13_wan30-file-link-long-duration-phase3-test.md) |

### 5.2 可直接查看的生成物料

#### Seedance 2.0

- 参考视频：[reference_video_720.mp4](seedance-compile-real-test-20260812/assets/reference_video_720.mp4)
- 产品参考图：[product_reference.png](seedance-compile-real-test-20260812/assets/product_reference.png)
- 身份参考图：[identity_reference.png](seedance-compile-real-test-20260812/assets/identity_reference.png)
- 图片 + 视频参考输出：[output.mp4](seedance-compile-real-test-20260812/results/ark-live-key-20260812/sd20_image_video_ref_5s/output.mp4)
- 图片 + 视频 + 音频参考输出：[output.mp4](seedance-compile-real-test-20260812/results/ark-live-key-20260812/sd20_image_video_audio_ref_5s/output.mp4)
- 多模态接触表：[image_video_audio_ref_contact.jpg](seedance-compile-real-test-20260812/results/ark-live-key-20260812/image_video_audio_ref_contact.jpg)

#### Seedance 2.5

- 声音参考输入：[audio10_dialogue.mp3](audio10-seedance25-test-20260810/audio10_dialogue.mp3)
- Audio 1.0 驱动输出：[seedance25_output.mp4](audio10-seedance25-test-20260810/seedance25_output.mp4)
- 纯文生输出：[seedance25_text2video_output.mp4](audio10-seedance25-test-20260810/seedance25_text2video_output.mp4)
- A/B 接触表：[seedance25_ab_contact_sheet.png](audio10-seedance25-test-20260810/seedance25_ab_contact_sheet.png)
- 纯文生接触表：[text2video_contact_sheet.png](audio10-seedance25-test-20260810/text2video_contact_sheet.png)

#### MiniMax H3

- 视觉参考图：[calibrated-person-closeup-768.jpg](h3-reference-audio-test-set-20260813/assets/calibrated-person-closeup-768.jpg)
- 带音频参考视频：[official-person-video-with-audio-6.060s.mp4](h3-reference-audio-test-set-20260813/assets/official-person-video-with-audio-6.060s.mp4)
- 静音参考音频：[deterministic-silence-15s.wav](h3-reference-audio-test-set-20260813/assets/deterministic-silence-15s.wav)
- 正式样例输出：[output.mp4](h3-reference-audio-test-set-20260813/formal-20260814/H3-RA-01__r1/output.mp4)
- 正式样例接触表：[contact-sheet.jpg](h3-reference-audio-test-set-20260813/formal-20260814/H3-RA-01__r1/contact-sheet.jpg)

#### Wan 3.0

- 文件输入样例：[file_docx.mp4](wan30-expanded-input-2026-08-13/file_docx.mp4)
- 网页输入样例：[link_react.mp4](wan30-expanded-input-2026-08-13/link_react.mp4)
- 长时 PPTX / 产品输入：[file_product_pptx.mp4](wan30-long-input-2026-08-13/file_product_pptx.mp4)
- 长时图片 DOCX 输入：[file_image_docx.mp4](wan30-long-input-2026-08-13/file_image_docx.mp4)
- 长时 Markdown 输入：[file_chinese_md.mp4](wan30-long-input-2026-08-13/file_chinese_md.mp4)
- 文件输入接触表：[file_docx-contact-sheet.jpg](wan30-expanded-input-2026-08-13/file_docx-contact-sheet.jpg)
- 长时 PPTX 接触表：[file_product_pptx-contact-sheet.jpg](wan30-long-input-2026-08-13/file_product_pptx-contact-sheet.jpg)

## 6. 当前不能直接下的结论

以下说法目前都不应写成模型保证：

- “Provider 成功，所以视频质量通过。”
- “能说出正确台词，所以已经严格 lip-sync。”
- “H3 / Wan 原音相关性高，所以能原音透传。”
- “Wan 支持纯文生，所以纯文生质量已经优于其他模型。”
- “Seedance 2.5 的坐标框或分割图一定比纯 Prompt 更好。”
- “H3 的 `sound:false`、`audio:false` 或 `mute:true` 可以可靠静音。”

## 7. 建议补测清单

### P0：决定是否扩大生产路由

- Wan 纯文生与 Seedance 2.0、Seedance 2.5、H3 使用同 prompt、同画幅、同时长做横向视频质量对比。
- 四模型统一测试逐字 ASR、说话人分配、口型时间误差和音色相似度。
- H3 静音后处理链路：删除音轨、替换音轨、成片探针和交付验收。
- Wan 文件 / 网页输出做 OCR、URL、命令、二维码和事实一致性检查。

### P1：决定是否扩大能力范围

- Wan 文生 2 秒 / 30 秒 / `-1` 智能时长、480P / 720P / 1080P 和固定 seed 重跑。
- Wan 首帧 / 首尾帧、多图、多视频、多音频参考的身份保持与运动保持。
- Seedance 2.5 复杂遮挡、Logo、人物服装和真实视频局部编辑。
- H3 多人物、多说话人、click / marker / 环境声混合输入。

### P2：工程稳定性与成本

- 四模型 P50 / P95 延迟、失败率、排队时间和单位时长成本。
- 任务取消、URL 过期、转存失败、音频轨存在性和视频解码健康检查。
- 记录权限、地域、Provider 版本和路由配置，避免把一次公测兼容路径当成正式合同。

## 8. 一句话结论

**Seedance 2.0 负责稳定生产；Seedance 2.5 负责长时与声音语义灰度；H3 负责视觉锚定专项；Wan 3.0 负责纯文生和文件 / 网页能力探索，但目前仍要把“接口能用”和“质量已证明”分开。**
