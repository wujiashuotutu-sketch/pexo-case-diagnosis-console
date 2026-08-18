# MiniMax H3 `reference_audio` 核心测试集 v1

## 评测问题

这 12 条用例只回答 H3 Provider 原生行为：参考音频是否被理解为对白、口型/节奏/事件驱动或音色参考，以及多个声音来源冲突时如何绑定角色。严格静音和锁定音轨的生产保证见 `PLATFORM-AUDIO-CONTRACT-v1.md`；未支持字段见 `ADAPTER-NEGATIVE-FIELDS-v1.md`。

本文件是可执行规范，不是已绑定评测器 export ID 的 `pexo-eval` 导入包。运行前要把逻辑评测器类型绑定到实际 export，并用已知通过/失败样本校准。

## 请求规范

- Endpoint：`POST /v2/video_generation`
- 所有 URL 占位符必须由运行器从 `ASSET-MANIFEST-v1.yaml` 的资产 ID 解析；URL 不得含长期密钥。
- `content[]` 顺序是用例合同的一部分，不得在运行时重排。
- 除用例 01 外，音频均使用 `type=audio_url`、`role=reference_audio`。
- 每条参考音频为 2-15 秒；单个请求的参考音频总时长不超过 15 秒。用例 11 因此使用 8 秒人声加 7 秒 click，而不是两条 15 秒素材。
- 不传 `sound`、`audio`、`mute`、`enable_audio` 或其他未文档化音频开关。
- 输出时长统一为 15 秒，便于比较长音频、停顿和延展行为。

## 逻辑评测器

| 类型 | 用途 | 必需证据 |
|---|---|---|
| `system.api_response` | 创建/查询状态 | 去密后的请求、task ID、最终状态、Provider 错误 |
| `system.media_probe` | 容器、流、时长、解码 | 原始输出文件、ffprobe/解码结果 |
| `system.audio_probe` | 响度、静音、瞬态、音频相似度 | 解码 PCM、LUFS/峰值/静音区间/指纹 |
| `system.asr_alignment` | 台词内容、顺序、重复 | 带时间戳 ASR、已知文本 |
| `system.rhythm_alignment` | 镜头/动作峰值与节拍 | 帧级切点或运动峰值、节拍真值 |
| `system.event_alignment` | 指定事件与 marker | 帧级事件时间、marker 真值 |
| `system.video_timeline` | 冻结、运动覆盖和视觉时长 | 帧差、光流或感知哈希时间线 |
| `model.av_review` | 口型、音色、角色绑定等视听判断 | 原始输出和参考素材；必须配对人工断言 |
| `human.media_review` | 与模型断言语义相同的人工复核 | A/B 播放、逐帧/波形时间线 |

## 通用断言

每条用例默认包含以下两条断言：

| key | severity | expected | evidence locator | evaluator | failure codes |
|---|---|---|---|---|---|
| `task_accepted` | critical | 请求只创建 1 个任务并最终 `SUCCEEDED` | create/query 响应 | `system.api_response` | `TASK_REJECTED`, `TASK_TIMEOUT`, `TASK_FAILED`, `DUPLICATE_TASK_CREATED` |
| `output_media_valid` | critical | 输出可下载、可完整解码，视频时长 `15.0s ± 0.15s` | 输出文件与 media probe | `system.media_probe` | `OUTPUT_MISSING`, `DOWNLOAD_FAILED`, `DECODE_FAILED`, `DURATION_OUT_OF_TOLERANCE` |

## 用例

### H3-RA-01 无参考音频基线

目的：建立相同视觉 Prompt 在没有 `reference_audio` 时的默认声音基线。

```yaml
id: H3-RA-01
assets: []
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create a 15-second cinematic medium shot of a person in a pink suit standing in an open field at golden hour. The person looks around and then walks forward. Use natural camera motion and realistic detail."
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: audio_profile_recorded
    severity: major
    expected: "Record audio-stream presence, codec, duration, integrated loudness, and silence ratio. No particular sound category is required."
    evidence_locator: "output audio stream and audio probe"
    evaluator: system.audio_probe
    failure_codes: [AUDIO_EVIDENCE_MISSING]
  - key: speech_profile_recorded
    severity: major
    expected: "Record timestamped ASR when speech is detected, or an explicit no-speech result when it is not. No particular transcript is required."
    evidence_locator: "output audio and timestamped ASR result"
    evaluator: system.asr_alignment
    failure_codes: [ASR_EVIDENCE_MISSING]
```

### H3-RA-02 参考人声但 Prompt 不声明用途

目的：观察 H3 对 `reference_audio` 的默认解释；与 01 做配对比较，不预设一定复制声音或台词。

```yaml
id: H3-RA-02
assets: [audio.voice.official_en_8_516s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create a 15-second cinematic medium shot of a person in a pink suit standing in an open field at golden hour. The person looks around and then walks forward. Use natural camera motion and realistic detail."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.official_en_8_516s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: audio_profile_recorded
    severity: major
    expected: "Record audio-stream presence, loudness, silence ratio, and similarity to audio.voice.official_en_8_516s; classify audio-level influence without treating any class as required Provider behavior."
    evidence_locator: "output audio, reference audio, and audio probe"
    evaluator: system.audio_probe
    failure_codes: [AUDIO_EVIDENCE_MISSING, REFERENCE_COMPARISON_MISSING]
  - key: speech_profile_recorded
    severity: major
    expected: "Record timestamped ASR when speech is detected, or an explicit no-speech result; compare lexical overlap with the reference transcript when available, without treating either outcome as required Provider behavior."
    evidence_locator: "output audio, reference audio, and timestamped ASR result"
    evaluator: system.asr_alignment
    failure_codes: [ASR_EVIDENCE_MISSING, REFERENCE_TRANSCRIPT_MISSING]
```

### H3-RA-03 参考人声作为对白表演

目的：验证 Prompt 能否把参考人声绑定为主要对白，并保持已知三句的内容、顺序和停顿。

```yaml
id: H3-RA-03
assets: [audio.voice.calibrated_en_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create one visible speaker in a quiet outdoor scene. Use audio 1 as the main dialogue performance. The speaker says the three sentences from audio 1 once, in the same order and with the same pauses. Do not add music or another speaker."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: speech_content_and_order_auto
    severity: critical
    expected: "All three ground-truth sentences are present once, in order; no additional speaker or reordered sentence. Nominal sentence starts remain within 0.75s of 1.0s, 5.0s, and 10.0s."
    evidence_locator: "timestamped ASR aligned to asset ground truth"
    evaluator: system.asr_alignment
    failure_codes: [SPEECH_MISSING, SPEECH_TEXT_MISMATCH, SPEECH_ORDER_MISMATCH, SPEECH_REPEATED, PAUSE_TIMING_DRIFT]
  - key: speech_content_and_order_human
    severity: critical
    expected: "Human hears the same three sentences once, in the same order, with clearly corresponding pauses and no second speaker."
    evidence_locator: "A/B playback of output and audio.voice.calibrated_en_15s"
    evaluator: human.media_review
    failure_codes: [SPEECH_MISSING, SPEECH_TEXT_MISMATCH, SPEECH_ORDER_MISMATCH, SPEECH_REPEATED, EXTRA_SPEAKER]
```

### H3-RA-04 明确忽略参考人声并请求静音

目的：测量 Prompt 对声音的软控制能力；本用例通过不等于平台已具备严格静音交付合同。

```yaml
id: H3-RA-04
assets: [audio.voice.calibrated_en_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create a silent 15-second visual study of a person reading beside a window. The person never speaks. Ignore audio 1 as output sound and as speech content. The final result must contain no audible speech, music, ambience, or sound effects."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: audio_stream_policy
    severity: critical
    expected: "Either no audio stream exists, or the full output is effectively silent: integrated loudness <= -60 LUFS, true peak <= -50 dBFS, and no segment above -45 dBFS lasts 100 ms or longer."
    evidence_locator: "output stream map and decoded PCM loudness/silence report"
    evaluator: system.audio_probe
    failure_codes: [UNEXPECTED_AUDIO_STREAM, UNEXPECTED_AUDIBLE_AUDIO, REFERENCE_SPEECH_LEAKED]
  - key: silence_human
    severity: critical
    expected: "At calibrated monitoring level, no speech, music, ambience, effect, click, or transient is audible anywhere in the output."
    evidence_locator: "full-duration headphone playback plus waveform"
    evaluator: human.media_review
    failure_codes: [AUDIBLE_SPEECH, AUDIBLE_MUSIC, AUDIBLE_AMBIENCE, AUDIBLE_EFFECT]
```

### H3-RA-05 静态近景人物加已校准人声的口型驱动

目的：验证图片和音频组合能否产生可判定的单人口型同步。先判嘴部证据，再判同步。

```yaml
id: H3-RA-05
assets: [image.person.closeup_768, audio.voice.calibrated_en_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Animate image 1 into a stable 15-second close-up talking-head shot. Keep one primary face large and unobstructed, with the mouth clearly visible. The person speaks the three sentences from audio 1 in the same order and timing. Mouth motion must follow the syllables and pauses from audio 1. Do not add music or another speaker."
    - type: image_url
      image_url: {url: "asset://image.person.closeup_768"}
      role: reference_image
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: mouth_visibility_model
    severity: critical
    expected: "Exactly one primary speaking face is visible; its mouth is unobstructed and judgeable during at least 80% of detected speech time."
    evidence_locator: "output frames plus speech intervals"
    evaluator: model.av_review
    failure_codes: [PRIMARY_FACE_MISSING, MULTIPLE_SPEAKERS, MOUTH_OCCLUDED, MOUTH_TOO_SMALL]
  - key: mouth_visibility_human
    severity: critical
    expected: "Exactly one primary speaking face is visible; its mouth is unobstructed and judgeable during at least 80% of detected speech time."
    evidence_locator: "full output with speech-interval overlay"
    evaluator: human.media_review
    failure_codes: [PRIMARY_FACE_MISSING, MULTIPLE_SPEAKERS, MOUTH_OCCLUDED, MOUTH_TOO_SMALL]
  - key: lip_sync_alignment_model
    severity: critical
    expected: "Only if mouth visibility passes: visible mouth activity follows speech onsets, offsets, syllable energy, and long pauses; median absolute offset <= 250 ms and no sustained talking through the 2s+ pauses. Otherwise mark evidence insufficient, not model failure."
    evidence_locator: "mouth-motion timeline, speech envelope, aligned output"
    evaluator: model.av_review
    failure_codes: [LIP_SYNC_OFFSET, MOUTH_MOVES_DURING_LONG_PAUSE, MOUTH_STATIC_DURING_SPEECH, EVIDENCE_INSUFFICIENT]
  - key: lip_sync_alignment_human
    severity: critical
    expected: "Only if mouth visibility passes: frame-by-frame review finds mouth activity aligned to speech and pauses, with no obvious offset above 250 ms at the three sentence starts. Otherwise mark evidence insufficient."
    evidence_locator: "frame-stepped A/V playback and waveform"
    evaluator: human.media_review
    failure_codes: [LIP_SYNC_OFFSET, MOUTH_MOVES_DURING_LONG_PAUSE, MOUTH_STATIC_DURING_SPEECH, EVIDENCE_INSUFFICIENT]
```

### H3-RA-06 只参考音色并生成新文本

目的：验证“音色参考”是否能与原始文本解耦。

```yaml
id: H3-RA-06
assets: [audio.voice.calibrated_en_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create one visible speaker in a quiet interior. Use audio 1 only as a voice and timbre reference. Do not repeat any sentence from audio 1. Generate exactly this new dialogue once: 'Now we begin. The room is quiet, and the lights are warm. I will meet you by the door after sunset.' Do not add music or another speaker."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: new_speech_content_auto
    severity: critical
    expected: "The three requested new sentences are present once and in order; none of the three source sentences is spoken."
    evidence_locator: "timestamped ASR against requested and forbidden texts"
    evaluator: system.asr_alignment
    failure_codes: [NEW_TEXT_MISSING, NEW_TEXT_MISMATCH, SOURCE_TEXT_COPIED, SPEECH_REPEATED]
  - key: timbre_similarity_model
    severity: major
    expected: "A/B comparison finds the output speaker similar to audio 1 in perceived vocal character, pitch range, and speaking texture while speaking the new text; score at least 3 on a calibrated 1-5 similarity rubric."
    evidence_locator: "isolated output speech and audio.voice.calibrated_en_15s"
    evaluator: model.av_review
    failure_codes: [VOICE_SIMILARITY_LOW, SPEAKER_CHANGED, REFERENCE_TEXT_COPIED]
  - key: timbre_similarity_human
    severity: major
    expected: "A/B comparison finds the output speaker similar to audio 1 in perceived vocal character, pitch range, and speaking texture while speaking the new text; score at least 3 on the same calibrated 1-5 rubric."
    evidence_locator: "blind randomized A/B playback"
    evaluator: human.media_review
    failure_codes: [VOICE_SIMILARITY_LOW, SPEAKER_CHANGED, REFERENCE_TEXT_COPIED]
```

### H3-RA-07 click 只驱动画面节奏，输出请求静音

目的：验证参考 click 能否只作为视觉时钟，而不进入输出声音。

```yaml
id: H3-RA-07
assets: [audio.rhythm.click_120bpm_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create a 15-second geometric fashion montage. Use audio 1 only as a timing clock. Change the dominant shot or action on every four clicks, at 2-second intervals. Do not output the clicks. The final result must contain no audible speech, music, ambience, or sound effects."
    - type: audio_url
      audio_url: {url: "asset://audio.rhythm.click_120bpm_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: visual_rhythm_alignment_auto
    severity: critical
    expected: "At least 6 of the 7 expected four-beat boundaries at 2, 4, 6, 8, 10, 12, and 14s have a dominant cut or motion change within ±300 ms; no monotonic drift above 300 ms."
    evidence_locator: "frame-level cut/motion timeline and click ground truth"
    evaluator: system.rhythm_alignment
    failure_codes: [RHYTHM_NOT_FOLLOWED, RHYTHM_HALF_SPEED, RHYTHM_DOUBLE_SPEED, RHYTHM_DRIFT]
  - key: visual_rhythm_alignment_human
    severity: critical
    expected: "A timecoded human review confirms at least 6 of 7 dominant visual changes align within ±300 ms of the expected boundaries."
    evidence_locator: "output with beat-grid overlay"
    evaluator: human.media_review
    failure_codes: [RHYTHM_NOT_FOLLOWED, RHYTHM_DRIFT]
  - key: audio_stream_policy
    severity: critical
    expected: "Either no audio stream exists, or the full output meets the effective-silence thresholds from H3-RA-04; no reference click is audible."
    evidence_locator: "output stream map, PCM probe, transient comparison"
    evaluator: system.audio_probe
    failure_codes: [UNEXPECTED_AUDIBLE_AUDIO, REFERENCE_CLICK_AUDIBLE]
```

### H3-RA-08 click 同时作为可听节拍和视觉时钟

目的：验证 H3 是否能同时生成可听的脉冲节拍与同步画面；不要求波形逐样本透传。

```yaml
id: H3-RA-08
assets: [audio.rhythm.click_120bpm_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create a 15-second geometric fashion montage. Use audio 1 as both the audible metronome and the visual timing clock. Keep a clear pulse at 120 BPM and change the dominant shot or action every four clicks. Do not add speech or melodic music."
    - type: audio_url
      audio_url: {url: "asset://audio.rhythm.click_120bpm_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: audible_pulse_alignment
    severity: critical
    expected: "At least 27 of 30 nominal half-second beat positions contain a detectable output transient within ±150 ms. Exact waveform identity is not required."
    evidence_locator: "output PCM transient timeline and click ground truth"
    evaluator: system.audio_probe
    failure_codes: [PULSE_MISSING, PULSE_TIMING_DRIFT, WRONG_TEMPO, NO_AUDIBLE_AUDIO]
  - key: visual_rhythm_alignment_auto
    severity: critical
    expected: "At least 6 of 7 expected four-beat boundaries have a dominant visual change within ±300 ms."
    evidence_locator: "frame-level cut/motion timeline and output pulse timeline"
    evaluator: system.rhythm_alignment
    failure_codes: [RHYTHM_NOT_FOLLOWED, RHYTHM_DRIFT]
  - key: visual_rhythm_alignment_human
    severity: critical
    expected: "Human review confirms the montage visibly follows the audible 120 BPM pulse, with dominant changes every four beats."
    evidence_locator: "full A/V playback with beat counter"
    evaluator: human.media_review
    failure_codes: [RHYTHM_NOT_FOLLOWED, AUDIO_VISUAL_DESYNC]
```

### H3-RA-09 确定性 marker 驱动五个视觉事件

目的：验证五个已知时间点能否按顺序绑定到不同视觉事件。

```yaml
id: H3-RA-09
assets: [audio.events.markers_v2_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create one continuous 15-second shot of a paper airplane. Use the five markers in audio 1 only as timing cues. At marker 1 the airplane launches; at marker 2 it passes through a window; at marker 3 it turns sharply; at marker 4 it drops a red ribbon; at marker 5 it lands on a desk. Keep this exact order. Do not output the marker tones, speech, music, ambience, or sound effects."
    - type: audio_url
      audio_url: {url: "asset://audio.events.markers_v2_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: event_timing_alignment_auto
    severity: critical
    expected: "All five named visual events are detected in order, each within ±400 ms of 2.0, 5.0, 8.0, 11.0, and 13.0s."
    evidence_locator: "frame-level event labels and marker ground truth"
    evaluator: system.event_alignment
    failure_codes: [EVENT_MISSING, EVENT_ORDER_WRONG, EVENT_TIMING_MISMATCH, EVENT_MERGED]
  - key: event_timing_alignment_human
    severity: critical
    expected: "Human timecode review finds all five named events in the specified order and within ±400 ms of 2.0, 5.0, 8.0, 11.0, and 13.0s."
    evidence_locator: "frame-stepped output with marker overlay"
    evaluator: human.media_review
    failure_codes: [EVENT_MISSING, EVENT_ORDER_WRONG, EVENT_TIMING_MISMATCH, EVENT_MERGED]
  - key: audio_stream_policy
    severity: critical
    expected: "Either no audio stream exists, or the full output meets the effective-silence thresholds from H3-RA-04; marker tones are not audible."
    evidence_locator: "output stream map and PCM transient comparison"
    evaluator: system.audio_probe
    failure_codes: [UNEXPECTED_AUDIBLE_AUDIO, REFERENCE_MARKER_AUDIBLE]
```

### H3-RA-10 带原音参考视频与独立人声冲突

目的：验证 Prompt 能否把视频只绑定为视觉参考，把独立音频绑定为唯一对白来源。

```yaml
id: H3-RA-10
assets: [video.person.official_with_audio_6_060s, audio.voice.calibrated_en_15s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Use video 1 for visual identity and motion reference only. Use audio 1 as the sole dialogue and lip-sync driver. The visible person says the three sentences from audio 1 once, in the same order and timing. Do not use, preserve, or mix the audio embedded in video 1. Do not add music or another speaker."
    - type: video_url
      video_url: {url: "asset://video.person.official_with_audio_6_060s"}
      role: reference_video
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: independent_speech_selected_auto
    severity: critical
    expected: "Output contains the three calibrated sentences once and in order."
    evidence_locator: "output ASR and independent audio ground truth"
    evaluator: system.asr_alignment
    failure_codes: [INDEPENDENT_SPEECH_IGNORED, SPEECH_TEXT_MISMATCH, SPEECH_ORDER_MISMATCH]
  - key: embedded_source_audio_absent
    severity: critical
    expected: "Embedded source-video audio has no matching speech or music fingerprint above the calibrated false-positive threshold in the output."
    evidence_locator: "output PCM and extracted source-video audio fingerprint"
    evaluator: system.audio_probe
    failure_codes: [SOURCE_VIDEO_AUDIO_LEAKED, AUDIO_SOURCES_MIXED]
  - key: source_binding_model
    severity: critical
    expected: "The output visibly follows the reference-video subject/motion while audible speech and mouth motion correspond to audio 1, not to the embedded source-video audio."
    evidence_locator: "output, source video with extracted audio, independent speech reference"
    evaluator: model.av_review
    failure_codes: [VISUAL_REFERENCE_IGNORED, INDEPENDENT_SPEECH_IGNORED, SOURCE_VIDEO_AUDIO_DOMINATES, ROLE_BINDING_AMBIGUOUS]
  - key: source_binding_human
    severity: critical
    expected: "The output visibly follows the reference-video subject/motion while audible speech and mouth motion correspond to audio 1, not to the embedded source-video audio."
    evidence_locator: "three-way A/B review with aligned waveforms"
    evaluator: human.media_review
    failure_codes: [VISUAL_REFERENCE_IGNORED, INDEPENDENT_SPEECH_IGNORED, SOURCE_VIDEO_AUDIO_DOMINATES, ROLE_BINDING_AMBIGUOUS]
```

### H3-RA-11 两条参考音频按固定顺序绑定不同角色

目的：验证 audio 1 负责对白、audio 2 只负责视觉节奏时，角色不会互换或混入输出。

```yaml
id: H3-RA-11
assets: [audio.voice.calibrated_en_8s, audio.rhythm.click_120bpm_7s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Audio 1 is the dialogue and voice reference. Audio 2 is only the visual timing clock. Show one visible speaker saying the two sentences from audio 1 once, in the same order and timing. During the first 7 seconds, reframe the camera every four clicks from audio 2. The final audio contains dialogue only: do not output clicks, music, ambience, or another speaker."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.calibrated_en_8s"}
      role: reference_audio
    - type: audio_url
      audio_url: {url: "asset://audio.rhythm.click_120bpm_7s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: speech_content_and_order_auto
    severity: critical
    expected: "Both calibrated sentences are present once and in order; no second speaker."
    evidence_locator: "timestamped ASR aligned to audio 1"
    evaluator: system.asr_alignment
    failure_codes: [SPEECH_MISSING, SPEECH_TEXT_MISMATCH, SPEECH_ORDER_MISMATCH, EXTRA_SPEAKER]
  - key: visual_rhythm_alignment_auto
    severity: critical
    expected: "All 3 expected four-click boundaries at 2, 4, and 6s from audio 2 have a camera reframe within ±300 ms."
    evidence_locator: "frame-level reframe timeline and audio 2 ground truth"
    evaluator: system.rhythm_alignment
    failure_codes: [RHYTHM_NOT_FOLLOWED, RHYTHM_DRIFT]
  - key: role_binding_model
    severity: critical
    expected: "Audio 1 controls spoken content and audio 2 controls visual timing; the roles are not swapped, duplicated, or merged into an audible click track."
    evidence_locator: "output plus both ordered reference audios"
    evaluator: model.av_review
    failure_codes: [ROLE_BINDING_SWAPPED, ROLE_BINDING_AMBIGUOUS, REFERENCE_AUDIO_DUPLICATED, REFERENCE_CLICK_AUDIBLE]
  - key: role_binding_human
    severity: critical
    expected: "Audio 1 controls spoken content and audio 2 controls visual timing; the roles are not swapped, duplicated, or merged into an audible click track."
    evidence_locator: "three-track synchronized human review"
    evaluator: human.media_review
    failure_codes: [ROLE_BINDING_SWAPPED, ROLE_BINDING_AMBIGUOUS, REFERENCE_AUDIO_DUPLICATED, REFERENCE_CLICK_AUDIBLE]
```

### H3-RA-12 8.516 秒参考人声延展到 15 秒输出

目的：观察短于输出的参考音频结束后，H3 是否循环、重复、拉伸或自然进入静默动作段。

```yaml
id: H3-RA-12
assets: [audio.voice.official_en_8_516s]
request:
  model: MiniMax-H3
  resolution: 768P
  duration: 15
  ratio: "16:9"
  content:
    - type: text
      text: "Create one visible speaker. Use audio 1 as the only dialogue reference. Start the dialogue at the beginning, keep its spoken content and order once, and do not loop, repeat, or time-stretch it after it ends. After the speech ends, the person remains silent and continues natural visual action until 15 seconds. Do not add music or another speaker."
    - type: audio_url
      audio_url: {url: "asset://audio.voice.official_en_8_516s"}
      role: reference_audio
assertions:
  - key: task_accepted
  - key: output_media_valid
  - key: duration_behavior
    severity: critical
    expected: "The reference speech occurs once. No repeated ASR phrase, high audio-fingerprint recurrence, or speech continuation begins after 9.25s. Exact waveform passthrough is not required."
    evidence_locator: "timestamped ASR and audio self-similarity"
    evaluator: system.audio_probe
    failure_codes: [REFERENCE_LOOPED, SPEECH_REPEATED, AUDIO_TIME_STRETCHED]
  - key: post_audio_motion_continues
    severity: critical
    expected: "From 9.25s through 15s, the video continues natural action without a freeze lasting more than 1.0s."
    evidence_locator: "frame-difference timeline from 9.25s to end"
    evaluator: system.video_timeline
    failure_codes: [VIDEO_FROZEN_AFTER_AUDIO, VIDEO_ENDS_EARLY]
  - key: duration_behavior_human
    severity: critical
    expected: "Human review confirms the speech is used once with no audible restart or obvious stretch."
    evidence_locator: "full-duration A/V playback with 8.516s marker"
    evaluator: human.media_review
    failure_codes: [REFERENCE_LOOPED, SPEECH_REPEATED, AUDIO_TIME_STRETCHED]
  - key: post_audio_motion_human
    severity: critical
    expected: "Human review confirms natural visual action continues from 9.25s to the end without a freeze lasting more than 1.0s."
    evidence_locator: "frame-stepped playback from 9.25s to 15s"
    evaluator: human.media_review
    failure_codes: [VIDEO_FROZEN_AFTER_AUDIO, VIDEO_ENDS_EARLY]
```

## 跨用例分析

- `H3-RA-01` 与 `H3-RA-02` 只用于比较默认行为，不能把某一次观察直接写成 Provider 合同。
- `H3-RA-04`、`07`、`09` 的静音结果用于统计 Prompt 软控制稳定性；严格静音生产 Gate 仍由平台后处理实现。
- `H3-RA-05` 的 `250 ms` 仅在嘴部证据充分且评测器完成已知样本校准后有效。
- `H3-RA-06` 的音色结论必须同时报告自动/模型判断与盲听人工判断，不能只凭主观描述。
- `H3-RA-08` 只要求节拍事件与画面同步，不要求参考 WAV 原样透传。
- `H3-RA-10` 测角色冲突，不测试源视频时间线或原音轨的严格保持。
