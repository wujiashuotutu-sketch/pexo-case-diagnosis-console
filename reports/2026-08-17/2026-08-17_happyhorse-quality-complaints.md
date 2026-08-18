# HappyHorse 效果投诉审计

- 数据源：Metabase BigQuery production database `2`，`pexo_ods.project_messages`、`pexo_ods.project_assets`。
- 时间范围（UTC）：`2026-06-01 00:00:00` 至 `2026-08-17 00:00:00`。
- HappyHorse 定义：`video_generate` + `dashscope / happyhorse-1.0-t2v / text2video`。
- 使用背景：窗口内 6,990 次 HappyHorse 调用，覆盖 1,706 个项目；占全部 `video_generate` 的 4.69%。

## 结论

有用户因为 HappyHorse 相关画面而明确表达不满，但最常见的根因不是单纯的“基础画质差”，而是把需要参考素材、角色连续性、精确文字/数学或复杂空间关系的任务路由给了纯文本 HappyHorse。

关键词与最近模型规则给出 9 个项目级候选（约占 1,706 个 HappyHorse 项目的 0.53%），但手工回查发现这个数字仍含误归因，不能当作 HappyHorse 投诉率。例如 `61079365306` 的“树很丑”实际是在评价 Seedream 静态图，HappyHorse 视频调用本身失败。

另有 29 个使用过 HappyHorse 的项目出现过 `STAGE_FINAL_VIDEO = Bad` 标签，占 HappyHorse 项目的 1.70%。这是项目级交集上界：最终成片通常还混有 Seedance、Kling、图片生成、配音和剪辑，不能据此归因 HappyHorse。

当前可确认 5 个强或中强代表案例。

## 代表案例

| 项目 | HappyHorse 事实 | 用户反馈 | 归因判断 |
|---|---|---|---|
| `33887773448` | `2026-08-12 20:35:45` 生成 `seg02_fast_break_v1`，成功；0 张参考图。用户原始需求明确要求严格保留 7 张上传图中的三位女性。 | `thats not even the women in the original video and retry it still looks fake` | **强证据，主要是路由错误。** 需要身份保持却从 Seedance 参考图路线降为纯文本 HappyHorse；投诉后约 1 分钟切回 Seedance 并重新携带 2 张参考图。 |
| `46463577171` | 连续 5 次 HappyHorse 成功调用生成 Scene 1/2，全部 0 参考图；这是同一女性、同一住宅的连续场景。 | `The videos are not consistent, the scene 1 is wearing a ponytail and this is mid length hair...` | **强证据，角色连续性失败。** 纯文本逐段独立生成导致发型漂移；投诉后约 2 分钟改用 Seedance，并为每段带 1 张角色参考图。 |
| `54394035650` | 8 月 5 日多轮使用 HappyHorse 生成剧场、场馆、灯架等背景，用户投诉后仍按“更现代”要求继续用 HappyHorse 重做。 | `This is a really ugly stupid image...`；`This image makes no sense. It looks ugly.`；`This metal image is really bad...` | **强证据，视觉风格与素材选择不达标。** 用户逐帧否定“老旧、丑、无意义”的背景画面；属于 HappyHorse 主导的背景素材质量/提示词落地问题。 |
| `41048364169` | 只有 3 个视频生成调用，均为 HappyHorse，用于圆周长教学动画。 | 点绕圆走了 450° 而非 360°；半径点越界；公式先缺 `r`，补上后又遮住 `pi`。 | **强证据，能力不匹配。** 精确几何运动、公式字形和布局不适合生成式视频直接承担，应由可控图形/后期合成完成。 |
| `32786312042` | 3 个 HappyHorse 片段重建交通事故；没有其他视频模型混入首轮。 | `this is good but some key details are visually wrong`，随后指出车辆车道、方向、相对位置和避让逻辑错误。 | **中强证据，复杂空间/物理关系不可靠。** 对法律用途的事故还原要求确定性过高，不应使用纯文本生成视频作为事实性重建。 |

## 中等证据与能力错配

- `75619364757`：用户在 HappyHorse 抽象 CGI 片段后说 `I want some audio included and more photos. This is not good.`，随后路线切到真人/产品广告风格。这里更像需求和路线错配；同一批次还混有 Kling，不能把全部不满归到 HappyHorse。
- `38777815980`：多轮纯文本 HappyHorse 后用户说 `I'm really disappointed and won't be paying for this service.`，随后切回带参考图的 Kling。情绪证据强，但多次 HappyHorse 调用当场失败，投诉对象是整个交付过程而非某一条成功 HappyHorse 画面。
- `93579514284`：HappyHorse 与 Seedance 同时生成政治讽刺人物片段，用户投诉多路音频叠加和声音不像本人。视觉本身被用户评价为好，问题更可能在音频/装配链，不能算 HappyHorse 画质投诉。

## 明确排除

- `61079365306`：“树很丑”针对随后展示的 Seedream 静态图；HappyHorse 调用返回失败。
- `68391791176`：角色、服装投诉前最近的视频模型是 Seedance。
- `87915266825`：用户否定的首版前最近的视频模型是 Kling。
- `73404800899`：相关生成链以 Kling/Seedance 为主，没有足够证据归因 HappyHorse。

## 问题类型

1. **参考素材被丢弃**：用户上传人物、产品或场景参考后，路线仍切到 0-reference HappyHorse。
2. **跨镜头连续性**：独立文本生成无法稳定保持同一人物的脸、发型、服装和环境。
3. **精确控制任务误用**：数学公式、UI、交通/法律重建等要求确定性的位置、文字和动作关系。
4. **审美/场景年代感偏差**：提示词写了“现代、高级”，输出仍被用户认为老旧、廉价或不合语义。
5. **把项目级差评误算为模型差评**：最终视频混用多个模型与后期链路，必须按最近生成调用和具体资产回溯。

## 建议

1. HappyHorse 仅保留给无参考素材、无重复主体、无连续剧情、无精确文字/UI/几何要求的短纯文本镜头。
2. 一旦用户要求“同一个人/产品/房间”或上传参考图，禁止降级到 HappyHorse；改用可携带参考素材的 Seedance/Kling，并显式保留参考。
3. 数学、UI、Logo、事故重建等确定性内容走可控图形或合成链路，生成模型只提供非关键背景。
4. 质量指标分三层统计：模型调用后的直接文本投诉、明确指向该资产的逐帧评论、项目级 `Bad` 标签。三者不得合并成一个“模型投诉率”。

## 口径说明

- `9 / 1,706 = 0.53%` 只是“关键词命中且投诉前最近视频模型为 HappyHorse”的候选率，不是模型真实投诉率。
- 关键词会漏掉无文本的弃用，也会把静态图、音频、剪辑和整个服务的不满误关联到最近一次视频调用。
- 若要建立正式投诉率，应让每条用户反馈绑定具体 `asset_id`，再沿资产 lineage 回到唯一 `tool_call_id` 和模型。
