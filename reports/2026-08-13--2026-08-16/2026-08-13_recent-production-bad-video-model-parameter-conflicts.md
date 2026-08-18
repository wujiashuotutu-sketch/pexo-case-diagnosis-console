# 最近线上 Bad 与视频模型参数冲突审计

审计窗口：`2026-08-06T00:00:00Z` 至 `2026-08-13T01:10:00Z`（北京时间 8 月 6 日 08:00 至 8 月 13 日 09:10）

## 结论

近 7 天线上共有 **60 条 Bad 最终视频反馈，涉及 48 个项目**。其中 **7 个项目（14.6%）** 同时出现了服务端可直接证明的视频模型参数或参考素材契约冲突，共 **20 次被明确拒绝的 `video_generate` 调用**。

但这不等于 7 个 Bad 都由参数冲突造成。下钻后只有 `08110084158` 与 Bad 交付有强链路；`04009303427`、`88487660507` 可能受到冲突和降级影响；其余 4 个是已恢复的同项目共现，其中 `06588668101` 的冲突甚至发生在 Bad 之后，不能作为该 Bad 的原因。

## 口径

- 数据来源：Metabase BigQuery production database 2；单项目恢复链用 pg-server database 3 核对。
- Bad cohort：窗口内至少有一条 `STAGE_FINAL_VIDEO.feedback_label = 'Bad'` 的项目。48 个项目中，43 个项目在窗口内的最新一条有标签反馈仍为 Bad。
- 严格参数冲突：`video_generate` 返回 `ok=false`，且结果直接指出 `provider_param`、`duration`、必填参考素材、参考预检或素材数组类型不合法。
- 未纳入：模型成功返回但画面不好、一般内容审核拒绝、超时，以及只有语义层怀疑但没有拒绝证据的调用。

## 冲突分布

| 冲突类型 | 被拒调用 | 项目 | 项目 ID |
|---|---:|---:|---|
| 把 MP4 放进 `image_list` | 7 | 2 | `06588668101`, `88487660507` |
| 参考素材预检失败 | 4 | 2 | `00323036883`, `04009303427` |
| `provider_param` 不是合法 JSON 对象 | 4 | 1 | `08110084158` |
| 时长缺失或超过模型上限 | 3 | 2 | `39950645238`, `88487660507` |
| `reference2video` 没有图片或视频参考 | 2 | 2 | `04009303427`, `34530466648` |

类别会在项目维度重叠，因此项目数不能逐行相加。

## 按因果置信度排序

### 1. 强关联：`08110084158`

- Bad：`Audio issue`；最终视频 10.05s，反馈时间 `2026-08-11T10:27:09Z`。
- 冲突：3 次 Seedance、1 次 Kling 调用把 `provider_param` 传成尾部多出 `>` 的字符串。
- 原始报错：`provider_param must be a JSON object: invalid character '>' after top-level value`。
- 链路：原 Seedance 路线把 VO 音频作为说话节拍；连续失败后改走 Kling/静态画面并在后期附加 VO。
- 判断：参数错误迫使生成路线放弃原本的音频驱动方式，与最终 Audio issue 高度一致。这是本批最接近“参数冲突导致 Bad”的案例。

### 2. 可能有贡献：`04009303427`

- Bad：`Other: too short`；最终时长 10.16s。
- 冲突：3 次 Kling 参考图预检失败；随后又发出一次没有 `image_list`/`video_list` 的 `reference2video`。
- 恢复：Agent 降级到纯文本 HappyHorse，生成两个 5s 片段后拼成最终视频。
- 判断：参考路线失败后发生了能力降级，且结果确实很短，因此有合理关联。但用户原始请求没有给目标时长，不能断言参数冲突就是 `too short` 的唯一原因。

### 3. 可能有贡献但已恢复：`88487660507`

- Bad：`Request misunderstood`、`Other: Your not listening to what i am asking for`。
- 冲突：1 次带语音的 Seedance 请求缺失 `duration`；另有 6 次把 `beach_pop_peak_frame.mp4` 放进 `image_list`，均报 `image format is not supported`。
- 恢复：缺失时长在 15s 后补为 8s并成功；6 个 MP4 类型错误在约 5 分钟后改为 `video_list`，同批镜头全部成功。
- 判断：用户明确要求参照 `bigger balloon beach pop`，错误引用类型与“没听要求”有语义关联；但纠正后的引用镜头进入了最终生产链，所以只能记为可能贡献，不能写成已证实根因。

### 4. 仅同项目共现：`39950645238`

- Bad：`Wrong visual style`。
- 冲突：Seedance 参考视频超过 r2v 的 15.2s 上限；之后 Kling 又因缺少 `duration` 被拒。
- 恢复：参考视频裁短后 Seedance 成功，Kling 调用补参后也成功。
- 判断：参数问题已恢复，反馈指向视觉风格，现有证据不支持直接因果。

### 5. 仅同项目共现：`34530466648`

- Bad：`Wrong visual style`, `Feels unfinished`。
- 冲突：Kling `reference2video` 没有任何图片或视频参考。
- 恢复：紧接着的重试补入参考并成功，且该成功结果被交付。
- 判断：没有证据说明这次已恢复的必填参数错误导致了风格或完成度问题。

### 6. 仅同项目共现：`00323036883`

- Bad：`Request misunderstood`。
- 冲突：Seedance 拒绝第二张参考图，尺寸 `1099x249`，低于最小 `300x300`。
- 恢复：修正后的重试成功。
- 判断：除非进一步证明最终结果丢弃了关键参考，否则不能把 Bad 归因到这次预检失败。

### 7. 时间上不支持因果：`06588668101`

- Bad：`Revision made it worse`, `Inconsistent subject/reference`, `Wrong visual style`。
- 冲突：把 `s1_manager_keyframe.mp4` 放进 Seedance `image_list`，报 `image format is not supported`。
- 时间关系：冲突发生在 Bad 反馈约 2 小时 49 分钟之后；43s 后改传 PNG 成功，随后交付的 9:16 版本被打 `Good`。
- 判断：这是“Bad 项目出现过参数冲突”的严格命中，但时间顺序直接排除了它作为前述 Bad 的原因。

## 可直接加的拦截

1. `provider_param` 在调用前必须是对象，并按 provider/model/mode 校验唯一合法子键。
2. `reference2video` 调用前校验至少存在一个合法的 `image_list` 或 `video_list` 项。
3. 按真实 MIME/扩展名校验引用数组，视频不得进入 `image_list`，图片不得进入 `video_list`。
4. 在扣费前校验模型必填时长、允许区间和参考视频源时长。
5. 重试后记录“是否恢复、是否进入最终交付”的 lineage，避免运营统计把已恢复错误自动等同于 Bad 根因。

## 证据边界

- 20 次是严格的工具/供应商拒绝数，不是所有可能的 Prompt/参数语义冲突数。
- 7/48 只表示 Bad 项目与参数拒绝的交集，不能解释为 14.6% 的 Bad 都由参数冲突造成。
- 本轮只完成数据拉取和分析，没有修改 Skill、Runtime 或 `tech-*` 文件。

可复跑材料：[`query.sql`](./case-data/recent-7d-bad-video-parameter-conflicts-2026-08-13/query.sql)；结构化结果：[`summary.json`](./case-data/recent-7d-bad-video-parameter-conflicts-2026-08-13/summary.json)。
