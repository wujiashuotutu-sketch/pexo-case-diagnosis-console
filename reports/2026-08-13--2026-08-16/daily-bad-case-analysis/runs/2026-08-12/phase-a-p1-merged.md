# 2026-08-12 P1 Bad Case 合并分析（Phase A）

## 范围与安全边界

- 分析对象：日报中两个 P1 项目 `21144260283`、`14378442003`。
- 分析模式：合并 Phase A，只读；未进入 Phase B/C。
- 数据源：Metabase production Postgres database 3；已按项目核对消息、展开工具链和 `project_assets`。两个项目均通过完整性门禁，未使用 Langfuse。
- 反馈只作为现象索引；根因由工具参数/结果、QA 输出、资产元数据和交付调用共同证明。
- 本报告不保存或复述 user ID、签名 URL、token、邮箱、手机号或原始私密消息。

## 合并结论

两个 P1 的共同失败不是“没有做 QA”，而是**QA 已产生明确反证，却没有转成 revision-bound 的交付阻断**：

1. `21144260283` 的生成后 QA 明确说 head、torso、body 没有冻结；随后仍执行 `show_final_video`。
2. `14378442003` 的目标帧明确没有 Buddy/dog 或 glasses，但字幕仍描述 Buddy 处理 glasses；随后仍完成 `submit_render → query_render → show_final_video`。

因此共同主因是最终交付门禁缺失，模型/素材/时间线问题是各案的上游促成因素。两案均应保留 P1；不应仅以“渲染成功”“HTML lint valid”或“媒体可播放”视为业务验收通过。

## Production 数据完整性核对

| 项目 | 消息 rows | tool-call 事件 rows | 展开工具调用 | 有结果的调用 | lifecycle rows | final_video 事件 | 资产 rows |
|---|---:|---:|---:|---:|---:|---:|---:|
| `21144260283` | 1,728 | 348 | 399 | 399 | 579 | 13 | 101 |
| `14378442003` | 1,265 | 210 | 332 | 324 | 490 | 5 | 75 |

`14378442003` 有 8 个展开调用没有匹配到结果，但相关生成、定帧分析、渲染和展示调用均有结果；结合本地完整脱敏包，证据足以完成本次诊断。两案的最终资产均在 production `project_assets` 中登记为 `VIDEO / STAGE_FINAL_VIDEO / FINAL`；`14378442003` 的反馈最终媒体缓存已过期，`21144260283` 的反馈资产缓存同样不可直接复核，但 `21144260283` 有本地技术代理，`14378442003` 有目标帧工具证据。

## Case A：`21144260283`

### 证据

- 用户锁定的约束是“Raven 站立面对镜头、身体不动，只有手指/右手完成 come-here 手势”，并明确排除 head/torso/body/whole-arm movement。
- `video_generate` sequence 335 的提示词把约束写成 `head, torso, legs, and left arm are FROZEN`、`ONLY the right arm and right hand move`，说明意图已进入模型调用，而不是遗漏在用户输入层。
- sequence 334 对 v2 的 QA 已返回：`body/head completely still: Confirmed false`，并指出 head 与 torso 在 arm sweep 时移动。
- sequence 336 对最终候选 v3 再次返回：`body, head, and torso ... are not completely frozen`；证据区间为约 1.5–2.5s，并明确“more than just the right arm and hand move”。
- sequence 337 随即对同一 v3 执行 `show_final_video`。这形成直接因果链：**已知硬约束失败 → 未阻断 → 展示为 final**。
- 之前的 `submit_render` 还带有 `MOTION_CONTRACT_COVERAGE_AUDIO_GAP` 与 `MOTION_CONTRACT_COVERAGE_NO_AUDIO` acknowledgement；该声音问题与身体运动问题应分别出具 receipt，不能因被 acknowledgement 记录就算通过。
- 本地 `media/final-proxy.mp4` 可播放，约 10.04s、1280×720、H.264，无黑屏/冻结段且无音频。它证明代理媒体技术健康，但不是对已过期反馈缓存的逐像素替代，因此不扩大最终反馈资产像素结论。

### 根因与归因

- **上游生成/模型保真失败（促成因素）：** 即使 prompt 已明确限定 owned motion，v3 仍带来 head/torso/body motion；模型没有满足 only-fingers contract。
- **交付门禁失败（主要根因）：** sequence 336 的否定结论没有进入阻断状态，`show_final_video` 仍可消费该 revision。结构 lint、渲染完成和技术媒体健康都没有覆盖“只有指定区域移动”的业务断言。
- 归因：**mixed**；模型/生成造成内容不符合要求，runtime/workflow 负责把已知失败交付出去。

### 业务影响

- 核心编辑目标被直接反转，用户得到的是身体随手臂/头部转动的版本，而不是“只有手指移动”。
- 迭代已经产生多个候选和重复渲染，仍将失败候选展示为 final，造成 credits 消耗和交付信任损失。
- 当前证据可以确认“失败已被 QA 识别并交付”；由于反馈缓存过期，不能把本地代理的技术健康误报为最终反馈像素通过。

## Case B：`14378442003`

### 证据

- 锁定脚本把 Buddy 定义为金棕色狗，并在安全场景要求 Buddy 抓起太阳镜、倒戴在脸上；字幕/VO 对应文本为“Buddy grabbed the glasses”与“and put them on upside down”。
- composition 在 sequence 220 首次 lint 报告 104.5s 起 1.3s visual gap，后经编辑在 sequence 222 变为 `valid: true`。这只证明结构覆盖被修正，不证明镜头与旁白语义一致。
- sequence 263（约 79.5s 定帧）明确指出画面没有任何人持有或佩戴 glasses。
- sequence 264（约 88s 定帧）明确指出只有猫和男孩，**没有 Buddy/dog，也没有 glasses**，但画面字幕为 `Buddy grabbed the glasses`。
- sequence 268（约 90s 定帧）再次指出没有 Buddy/dog，字幕为 `and put them on upside down`。
- sequence 270（约 91s 定帧）再次指出可见角色只有男孩和猫，狗不在画面，且字幕仍为 `and put them on upside down`。
- sequence 271 提交 R03，274 查询到 render done，275 仅 probe 到时长/响度，277 对同一 R03 执行 `show_final_video`。这形成直接因果链：**目标帧连续反证 → 仅做结构/音频层检查 → 仍展示为 final**。
- 反馈最终媒体缓存已过期；因此最终编码像素不可独立复核，但目标帧和调用链足以证明交付前已知的 A/V 语义矛盾。

### 根因与归因

- **画面/素材连续性失败（促成因素）：** 目标字幕/VO 要求 Buddy + glasses 的动作，实际目标帧却是 boy + cat 的安全场景；证据指向镜头内容、资产选择或时间线映射没有保持角色/道具绑定。
- **语义同步复核缺失（主要根因）：** 定帧分析已经发现 named subject/action 缺失，却没有生成“subject present + action present + subtitle/VO aligned”的阻断 receipt；后续 `lint valid` 和 `media_probe` 不能替代语义验收。
- 归因：**mixed**；图像/序列连续性是上游内容问题，交付流程在已知矛盾后仍放行是决定性问题。

### 业务影响

- 关键安全教育动作与画面不相符：观众听到/看到字幕说 Buddy 处理 glasses，却看不到狗或眼镜，核心叙事和安全提示失效。
- 该错误发生在用户指定的 named subject/action 上，不能降级为一般风格或轻微同步问题；渲染成功不改变 P1 影响。
- 由于最终反馈资产缓存过期，不能对 R03 的全部最终像素作额外结论；但不能用这个限制否定交付前已保存的连续目标帧反证。

## 共同工具链与 Skill/reference 审计摘要

| 项目 | 关键工具调用 | 读文件事件 | 审计观察 |
|---|---|---:|---|
| `21144260283` | `video_generate` 10；`analyze_file_content` 100；`render_frame` 51；`lint_composition` 20；`submit_render` 13；`show_final_video` 13 | 37 | 生成与 Motion Skill/若干 reference 被读取；历史导出不能可靠重算每个 reference 的完整行覆盖，但 sequence 336 的反证已在交付前可见。 |
| `14378442003` | `video_generate` 18；`analyze_file_content` 69；`render_frame` 37；`media_probe` 28；`lint_composition` 11；`submit_render` 5；`show_final_video` 5 | 58 | Brainstorm/Script/Generation/Assembly/Motion/Modification 及多份 reference 被读取；目标帧反证已在 R03 提交前可见，但未形成语义阻断。 |

这两案不表现为“完全没有读取 Skill”。更准确的共同问题是：读取内容产生的 QA 结论仍是 advisory/free text，未被最终交付工具强制消费；`lint_composition valid` 与 `media_probe` 也没有覆盖跨帧运动合同或跨模态 subject/action 合同。

## 共同根因、系统影响与边界

### 共同根因

1. **没有 revision-bound final acceptance contract。** 旧 revision 的分析、当前 revision 的渲染和 `show_final_video` 之间没有服务端绑定的双 receipt（render identity + final media/semantic QC）。
2. **反证没有硬化为阻断。** `Confirmed false`、主体缺失、道具缺失、A/V mismatch 可以被记录，也可以被 acknowledgement 覆盖，但不阻止提交或展示。
3. **结构 QC 与业务语义 QC 分离。** HTML lint 只证明时间/元数据合同，media probe 只证明编码/响度等技术事实，均不能证明“only-fingers”或“Buddy handles glasses”。

### 影响范围判断

本次只对两个 P1 做证据级结论，不计算全线上发生率。两案提供了同一类 systemic risk 的两个独立表现：窄动作合同失败和 named subject/action 语义失败都能穿过 final delivery。该趋势可与 2026-08-12 日报中“已知 QA findings 被 acknowledge 后仍 submit/show”的观察相互印证，但不外推为全量项目比例。

## 待确认 Phase B 方案（本轮不执行）

1. **建立 revision-bound delivery gate。** `show_final_video` 只能消费当前 render revision 的成功 receipt；任何重新渲染、文件替换或时间线编辑都使旧 receipt 失效。无最终媒体 QC receipt 时，服务端拒绝展示。
2. **加入 owned-region motion assertion。** 对用户声明的“only X moves”生成可审计断言：跨多个时间点比较 owned region 与 frozen regions；若 head/torso/body/未授权肢体变化超过阈值，状态为 block，而不是自由文本 warning。把 `21144260283` v3 作为回归夹具。
3. **加入 subject/action A/V alignment receipt。** 从脚本、字幕/VO 和 asset binding 形成 named subject/action；在每个 cue window 验证主体和道具同时出现且动作成立。缺 Buddy、dog 或 glasses 时阻断。把 `14378442003` 的约 88–91s 窗口作为回归夹具。
4. **将三层验收串联。** 保留结构 lint、技术媒体 probe，并新增语义/运动层；只有三层均通过，且 receipt 与当前 revision 匹配，才允许 `submit_render → show_final_video`。
5. **验证恢复闭环。** Phase B 只做离线回放/测试夹具：失败断言 → 阻断 → 修订 → 重新 render → final media QC → 新 receipt → 展示。验收必须证明不会因 `valid:true`、`render done` 或旧分析结果而放行。
6. **确认历史 reference 规则的运行时执行。** 对两案记录中已读取但未强制消费的 Skill/reference 规则做运行时挂载检查；若规则已存在而未生效，登记 engineering/runtime requirement，不在本报告中修改 Skill 或 `tech-*`。

## Phase A 完成声明

本报告及两个 case 包仅用于只读分析。未修改 production 数据库、项目、资产、消息、反馈、Skill、Admin 或 Release；未上传或发布任何内容；未进入 Phase C。

## 证据入口

- [日报摘要](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/summary.md)
- [P1 manifest](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/p1-subtask.json)
- [`21144260283` 分析](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/21144260283/analysis.md)
- [`21144260283` 工具链](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/21144260283/tool-chain.json)
- [`21144260283` 资产清单](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/21144260283/project-assets.json)
- [`21144260283` QA 看板](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/21144260283/qa-report.html)
- [`14378442003` 分析](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/14378442003/analysis.md)
- [`14378442003` 工具链](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/14378442003/tool-chain.json)
- [`14378442003` 资产清单](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/14378442003/project-assets.json)
- [`14378442003` QA 看板](/Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-12/cases/14378442003/qa-report.html)
