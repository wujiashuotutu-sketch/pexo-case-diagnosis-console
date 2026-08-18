# MiniMax H3 `reference_audio` pilot 结果 v1

测试日期：2026-08-14  
范围：`H3-RA-01`、`04`、`05`、`06`、`09`、`11`，每条 1 次有效试次。  
状态：pilot 已完成；正式 24 次尚未启动。

## 先给结论

1. 修正请求 MIME 后，6/6 条 pilot 都成功创建并返回可下载视频。
2. `H3-RA-04` 的“忽略人声并绝对静音”没有被 H3 执行：输出有 AAC 音轨，integrated loudness `-15.0 LUFS`，与输入人声波形相关性 `0.9591`。
3. `H3-RA-09` 的 marker 音频也基本被保留：输出与 marker 输入相关性 `0.9685`；Prompt 要求不输出 marker tones，但 Provider 没有做到。
4. `H3-RA-05` 口型用例输出中主脸和嘴部清晰可见，且音频与校准人声相关性 `0.9811`；这支持“参考人声进入输出”，但没有 ASR 和逐帧口型评测，不能判定严格 `250 ms` 通过。
5. `H3-RA-06` 与输入人声相关性仅 `0.1124`，说明没有原样复制参考波形；“是否说出指定新文本”和“音色相似度”仍缺 ASR/盲听证据。
6. `H3-RA-11` 输出保留人声（与 8 秒人声相关性 `0.9118`），click 相关性低（`0.2174`）；2/4/6 秒抽帧可见镜头重构，但精确节拍误差尚未自动测量。

## 任务与媒体事实

| 用例 | 有效 task ID | 状态 | 输出时长 | 实际视频 | 音轨 |
|---|---|---|---:|---|---|
| H3-RA-01 | `430646217736590` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |
| H3-RA-04 | `430645487927604` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |
| H3-RA-05 | `430646184100114` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |
| H3-RA-06 | `430646914339297` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |
| H3-RA-09 | `430649074962818` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |
| H3-RA-11 | `430643473932723` | SUCCEEDED | 15.083s | H.264 1344×768 | AAC 32kHz 2ch |

Provider 回执均记录请求 `ratio=16:9`、`resolution=768P`、`duration=15`；实际 1344×768 是 H3 的 768P 输出尺寸，不能按像素尺寸直接断言为精确 16:9。

## 音频探针与波形相似度

| 用例 | Integrated loudness | Peak | 与参考音频相关性 | 初步解释 |
|---|---:|---:|---:|---|
| H3-RA-01 | `-15.3 LUFS` | `-1.4 dBFS` | 无参考 | 默认基线是明显有声输出 |
| H3-RA-04 | `-15.0 LUFS` | `-2.6 dBFS` | `0.9591` | 静音 Prompt 失败；近似保留参考人声 |
| H3-RA-05 | `-16.2 LUFS` | `-3.5 dBFS` | `0.9811` | 口型驱动音频进入输出，接近原波形 |
| H3-RA-06 | `-15.1 LUFS` | `-3.0 dBFS` | `0.1124` | 未原样复制参考波形；新文本仍需 ASR |
| H3-RA-09 | `-24.2 LUFS` | `-14.5 dBFS` | `0.9685` | marker tones 仍进入输出，静音/不输出要求失败 |
| H3-RA-11 | `-17.4 LUFS` | `-2.3 dBFS` | voice `0.9118`；click `0.2174` | 人声保留，click 未明显作为最终音轨保留 |

相关性是解码 PCM 的诊断证据，不是“原音轨字节级透传”结论；编码、响度和尾部长度仍需按平台合同独立处理。

## 视觉抽查

- `H3-RA-05` 联系表显示单一主脸、嘴部无遮挡，多个发声采样点嘴型有变化；但三分之二侧脸参考和缺少逐帧评测意味着口型断言暂记为待判，不写成通过。
- `H3-RA-09` 在 2/5/8/11/13 秒抽帧中分别看到飞机起飞、进入室内、红丝带已出现、桌面飞行、落桌。红丝带在 8 秒已经出现而 Prompt 指定应在 11 秒触发，事件角色/时间存在疑似提前，需人工逐帧确认。
- `H3-RA-11` 在 2、4、6 秒抽帧可见正面、侧面、全身三个构图变化，支持视觉节奏被使用；尚未计算每个重构点相对 click 的毫秒误差。

联系表和定点抽帧：

- `pilot-20260814/H3-RA-05/contact-sheet.jpg`
- `pilot-20260814/H3-RA-09/marker-time-frames.jpg`
- `pilot-20260814/H3-RA-11/reframe-time-frames.jpg`

## 请求层问题与修复

第一次提交的 5 条音频用例均因 Python `mimetypes` 生成 `audio/x-wav` 被 H3 以错误码 `2013` 拒绝；这不是模型能力结果。Runner 已固定 WAV MIME 为 `audio/wav`，并保留原始失败在各用例的 `attempt-01/`。修正后的第 2 次尝试才计入上述 6 条有效 pilot。

## 证据缺口

当前环境没有本地 Whisper/ASR 命令或 Python ASR 模块。因此以下断言尚未完成：

- `speech_content_and_order_auto`
- `new_speech_content_auto`
- `lip_sync_alignment_model/human`
- `timbre_similarity_model/human`
- 精确 `rhythm_alignment` 和 `event_timing_alignment`

在这些评测器可用并完成已知样本校准前，不启动正式 24 次。静音失败和 marker 音频保留已经由确定性音频探针确认，不依赖 ASR。

## 证据目录

每条用例的 `request.json`、去敏 create/final response、状态历史、`output.mp4`、`ffprobe.json`、`audio.wav` 和 `audio-probe.txt` 均位于：

`pilot-20260814/<case-id>/`

有效结果没有保存 API Key 或签名下载 URL；输出文件 SHA-256 记录在各自 `summary.json`。
