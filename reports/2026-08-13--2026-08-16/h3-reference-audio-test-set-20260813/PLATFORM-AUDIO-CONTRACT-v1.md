# 平台音频交付合同 v1

本文件定义 H3 生成完成后的平台责任。它与 Provider 原生 `reference_audio` 能力分开验收，后处理成功不能用于掩盖 H3 核心测试失败。

## PA-01 严格静音交付

输入：任意可解码的 H3 输出视频，无论是否包含音轨。

处理合同：

1. 默认通过无重编码视频流的 remux 删除全部音频流；只有下游容器明确要求音轨时，才替换为 `audio.silence.digital_15s` 对齐后的静音轨。
2. 不依赖 Prompt、`sound:false` 或响度阈值来实现交付静音。
3. 处理后重新 probe，不复用处理前证据。

| key | severity | expected | evidence | failure codes |
|---|---|---|---|---|
| `silent_delivery_stream_policy` | critical | 默认成片 `audio_stream_count=0`；若业务明确要求静音轨，则整段满足 integrated loudness `<= -60 LUFS`、true peak `<= -50 dBFS` | 最终交付文件的 stream map 和 PCM probe | `AUDIO_STREAM_REMAINS`, `SILENT_TRACK_NOT_SILENT` |
| `video_essence_preserved` | critical | 删除音轨前后视频 packet stream hash 一致；时长差 `<= 1 frame` | 前后视频 stream hash、时长 | `VIDEO_REENCODED`, `VIDEO_DURATION_CHANGED`, `VIDEO_CORRUPTED` |
| `final_file_decodable` | critical | 最终文件可从头到尾解码 | 最终文件 decode log | `FINAL_DECODE_FAILED` |

## PA-02 锁定外部音轨交付

输入：H3 视频和用户已确认的外部音轨。外部音轨是交付真值，不是 H3 `reference_audio` 的原生返回预期。

处理合同：

1. 删除 H3 原生音轨。
2. 按显式策略处理时长：优先裁切画面或补静音；禁止未经授权的循环和时间拉伸。
3. 将锁定音轨作为唯一音轨混入，并保留规范化前后的可追溯指纹。

| key | severity | expected | evidence | failure codes |
|---|---|---|---|---|
| `single_locked_audio_stream` | critical | 最终文件恰好 1 条音轨，且不存在 H3 原生音轨残留 | stream map、源/目标音频指纹 | `NATIVE_AUDIO_REMAINS`, `MULTIPLE_AUDIO_STREAMS`, `LOCKED_AUDIO_MISSING` |
| `locked_content_preserved` | critical | 解码后音频与锁定音轨的内容、顺序、停顿和时间轴一致；未循环、未重排、未拉伸。允许容器编码差异，不要求文件字节相同 | 对齐 PCM、ASR、音频指纹 | `LOCKED_AUDIO_CONTENT_CHANGED`, `LOCKED_AUDIO_LOOPED`, `LOCKED_AUDIO_STRETCHED`, `LOCKED_AUDIO_OFFSET` |
| `declared_duration_policy_applied` | critical | 裁切或补静音策略与交付 receipt 一致，A/V 末端差 `<= 100 ms` | receipt、A/V duration probe | `DURATION_POLICY_UNDECLARED`, `AV_END_MISMATCH` |

## PA-03 保留 H3 原生音频并做 QC

输入：业务明确选择 H3 原生声音的输出。

处理合同：不替换音轨，但必须验证流存在、可解码、覆盖完整、无异常截断，并把语义质量留给对应 H3 核心用例判断。

| key | severity | expected | evidence | failure codes |
|---|---|---|---|---|
| `native_audio_present` | critical | 最终文件至少 1 条可解码音轨 | stream map、decode log | `NATIVE_AUDIO_MISSING`, `NATIVE_AUDIO_DECODE_FAILED` |
| `native_audio_duration_valid` | critical | 音频与视频末端差 `<= 250 ms`，除非 receipt 明确声明设计性提前结束 | A/V duration probe、receipt | `NATIVE_AUDIO_TRUNCATED`, `AV_END_MISMATCH` |
| `native_audio_qc_recorded` | major | 记录 integrated loudness、true peak、静音占比、ASR 和异常区间 | QC report | `NATIVE_AUDIO_QC_MISSING` |

## 责任边界

- H3 核心集判断“模型是否理解并生成了预期声音/节奏/口型”。
- 平台合同判断“最终交付文件是否确定性满足静音或锁定音轨要求”。
- 两层结果分别报告。不得把 PA-01 或 PA-02 的成功写成 H3 原生支持 `sound:false`、原音透传或严格静音。
