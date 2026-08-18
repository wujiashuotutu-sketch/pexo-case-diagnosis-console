# Case 74523577395：BGM 已生成并进入渲染，但交付前两版不可感知

- Case / project: 74523577395 / Al Ries Positioning
- 用户 / 时间: 58137355935; 2026-08-14 11:16:01–13:19:41 (+08:00)
- 视频规格: 9:16，约 35.9 s；两段约 15 s 素材拼接，后配统一英文男声
- 触发请求: 11:36:21 “可以给视频增加些音效与 bgm 吗? 让视频更加生动些”
- 迭代: 初次 BGM 交付、用户反馈“还是没有 bgm 啊”后调大、用户再次反馈“完全听不到啊”后改为离线混音；共 71 个已配对工具调用

## 结论

这不是音乐生成失败，也不是视频完全没有音轨。music_generate 在 11:37:59 成功生成 37.04 s BGM，随后 composition_final.html 两次渲染均通过 lint 并交付；最终三版 MP4 都有 AAC 音频流。

问题是前两版的增益策略把 BGM 压到了感知阈值以下：先把床底归一到 -28 LUFS，HTML 再分别乘以 0.12、0.35；相对 -16 LUFS 口播约低 30 dB、约低 21 dB。Agent 只验证“成片整体 LUFS 正常”，没有验证 BGM 独立存在、目标相对响度或最终可感知性，因此在用户首次投诉后仍只改一个音量参数。

第三版才改变混音假设：把 vo_audio_only.mp3 与 bgm_ready.mp3 渲染成 mixed_audio_track.mp4，探测混音结果，再替换进视频。该版本的混合音轨和最终视频均有约 35.875–36.011 s 音频，最终探测 -13.17 LUFS；从调用链看这是第一次形成“真实混合音轨 → 替换 → 最终探测”的闭环。

## Session Overview

| 阶段 | 时间 (+08:00) | 用户 / Agent 行为 | 结果 |
|---|---|---|---|
| 初始剪辑 | 11:16–11:33 | 静音两段原片、生成两段 Med 口播并拼接 | final_with_vo.mp4，约 36 s |
| BGM 请求 | 11:36:21 | 用户请求音效与 BGM | Agent 规划并生成 BGM |
| v1 | 11:37:59–11:46:35 | BGM -28 LUFS；HTML BGM 0.12；渲染 | 声称已加入，用户听不到 |
| 投诉 1 / v2 | 13:10:48–13:12:36 | 只把 HTML BGM 0.12→0.35 后重渲染 | 未改变混音结构，用户仍听不到 |
| 投诉 2 / v3 | 13:18:11–13:19:38 | 先渲染真实 VO+BGM 混合音轨，再替换成片音频 | final_vo_bgm.mp4 |

## Mandatory Audit A — Tool Call Chain

| # | Time UTC | Tool | Key parameters | Result | Problem? |
|---:|---|---|---|---|---|
| 1 | 03:37:59 | music_generate | ElevenLabs music_v1; 37 s plan | ok=true; BGM returned | OK |
| 2 | 03:40:32 | media_process | trim 35.9 s + loudnorm -28 | bgm_trimmed.mp3 | ⚠ 无相对 VO 目标 |
| 3 | 03:40:47 | write_file | BGM data-volume=0.12 | HTML written | ⚠ 双重衰减 |
| 4 | 03:40:50 | lint_composition | composition_final.html | data-loop=false invalid | ⚠ 可避免失败 |
| 5 | 03:41:05 | edit_file | remove invalid loop | success | BGM 仍未验证 |
| 6 | 03:41:18 | submit_render | positioning_final_with_bgm.mp4 | pending | OK |
| 7 | 03:45:25 | query_render | job 2a3ajgcs | done | OK |
| 8 | 03:46:15 | media_probe | v1 composite audio | 35.883 s, -14 LUFS | ⚠ 只量整体响度 |
| 9 | 03:46:35 | show_final_video | v1 | delivered | ⚠ 无 BGM 可听证据 |
| 10 | 05:10:48 | user | “还是没有 bgm 啊” | failure feedback | v1 感知失败 |
| 11 | 05:11:18 | edit_file | BGM 0.12→0.35 | success | ⚠ 只改标量，不改假设 |
| 12 | 05:11:22 | submit_render | positioning_bgm_louder.mp4 | pending | OK |
| 13 | 05:12:27 | query_render | job 930qvqip | done | OK |
| 14 | 05:12:36 | show_final_video | v2 | delivered | ⚠ 未独立验证 BGM |
| 15 | 05:18:24 | media_process | extract VO; BGM loudnorm -20 | two inputs ready | OK |
| 16 | 05:18:36 | write_file | VO 1.0, BGM 0.4 | mix HTML | Partial |
| 17 | 05:18:39 | lint_composition | mix_audio.html | visual gap | ⚠ audio-only contract rejected |
| 18 | 05:18:48 | edit_file | add black visual cover | lint passed | workaround |
| 19 | 05:18:55 | submit_render | mixed_audio_track.mp4 | pending | OK |
| 20 | 05:18:58 | query_render | job bod60zp9 | done | OK |
| 21 | 05:19:23 | media_probe | mixed track | 35.875 s, -13.16 LUFS | first direct mix evidence |
| 22 | 05:19:28 | media_process | replace video audio | final_vo_bgm.mp4 | OK |
| 23 | 05:19:33 | media_probe | final v3 | 36.011 s, -13.17 LUFS | final audio probe |
| 24 | 05:19:38 | show_final_video | v3 | delivered | closure |

Totals: 71 paired calls (58 tool-call rows expanded to 71 calls). Relevant media production calls were successful. Two avoidable lint failures occurred. The v2 scalar-only retry was the primary wasted render because it did not change or test the failed hypothesis.

## Mandatory Audit B — Skill & Reference Read Effectiveness

### Files actually read

| Order | File | Lines read / total | Complete? | Applied correctly? | Notes |
|---:|---|---:|---|---|---|
| 1 | assembly-skill/SKILL.md | 1–96 / 96 | Yes | Partial | No locked Assembly handoff/audio ledger |
| 2 | assembly-skill/references/voice-production-and-resolution.md | 1–172 / 172 | Yes | Yes for voice | Not the BGM root |
| 3 | motion-skill/SKILL.md | 1–135 / 135 | Yes | Partial | Composite LUFS was treated as BGM verification |
| 4 | motion-skill/references/design-audio-and-assembly.md | 1–205 / 205 | Yes | No / late | Opened after BGM generation and initial decisions |
| 5 | motion-skill/references/tech-html.md | 1–281 / 281 | Yes | Partial | Separate audio runtime mix was not proven before v1 |

### Triggered but never read or read late

| Tool type used | Triggering skill | Expected reference / artifact | Read? |
|---|---|---|---|
| music_generate | active audio workflow | design-audio-and-assembly before audio ownership | Late |
| submit_render / query_render | motion-skill | final-audio validation and render-frame evidence | Root read; no render_frame call |
| replace_audio / BGM mix | assembly + motion | audio truth ledger / explicit owner | No handoff or ledger |

File-level opened: 5. Line-level coverage of opened files: 100%. Application accuracy: 2/5 fully correct, 3/5 partial or late. The causal pattern is read-late and read-but-not-operationalized: the audio reference did not become a relative-level receipt or BGM-specific final QA.

## Root Cause And Attribution

1. P1 — Mix-level failure: -28 LUFS bed was attenuated again by 0.12/0.35; no BGM-to-VO delta was specified or measured.
2. P1 — Validation failure: composite -14 LUFS can be normal even when BGM is inaudible; an audio stream is not proof of requested layer audibility.
3. P1 — Renderer contract uncertainty: the first route relied on a separate HTML audio bed beside a video already carrying speech, without post-render layer proof. v3 bypassed this with one concrete mixed asset.
4. P2 — Recovery failure: after explicit user feedback, v2 changed one scalar and repeated the same route.
5. P2 — Requested SFX omitted: the user requested “音效 与 BGM”, but the 71-call chain contains no SFX generation, extraction, placement, or verification. The delivery message silently narrowed the promise to BGM.
6. P2 — Process gap: no Assembly Handoff or audio ledger was produced before Motion.

Primary attribution is model judgment error, enabled by a Skill gap. Product/runtime capability is not proven as the primary cause because v3 succeeded through explicit pre-mixing.

## Recommendations Requiring Approval

### New rules

1. P1 — motion-skill/references/design-audio-and-assembly.md: add rendered-BGM audibility gate. Record VO loudness, bed loudness, target relative delta, and post-render layer evidence. Composite LUFS alone cannot pass.
2. P1 — motion-skill/SKILL.md: when video already carries speech and separate HTML audio provides BGM, require a supported multitrack receipt or pre-render one concrete mixed audio asset before packaging.
3. P1 — assembly-skill/SKILL.md: add BGM ledger fields for asset, window, gain, target LUFS, ducking delta, and final extracted-audio proof.

### Existing-rule modifications

4. Extend final post-render sanity: when BGM is requested, require BGM-specific evidence, not only duration/audio-stream/composite-LUFS checks.
5. After “BGM absent/inaudible” feedback, prohibit scalar-only retries; inspect delivered output and change the mix or packaging route before rendering again.
6. Add an audible-role completion ledger: every explicitly requested role (VO / BGM / SFX / native sound) must be marked delivered with asset + time window + final evidence, or disclosed as omitted before delivery.

## Evidence Package

- Tool chain: case-data/cases/74523577395/tool-chain.json
- Project assets: case-data/cases/74523577395/project-assets.json
- Normalized prompts: case-data/cases/74523577395/assets-with-prompts.json
- Media: media/v1_bgm_claimed.mp4, media/v2_bgm_louder.mp4, media/v3_explicit_mix.mp4, media/bgm_original.mp3, media/bgm_trimmed.mp3, media/bgm_ready.mp3, media/mixed_audio_track.mp4
