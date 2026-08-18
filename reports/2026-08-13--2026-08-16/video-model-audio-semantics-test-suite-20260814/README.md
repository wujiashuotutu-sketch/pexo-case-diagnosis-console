# 四模型口播声音语义测试集

测试日期：2026-08-14

## 目的

同一张人物图、同一句目标台词、同一输出规格下，区分三种容易被混为一谈的能力：

1. `exact_speech`：上传的音频就是目标台词和时间轴，模型应尽量保留原声音并同步嘴型。
2. `voice_reference`：上传音频只提供音色，参考音频说 A，Prompt 要求用相同音色说全新的 B。
3. `prompt_only`：不上传音频，只靠 Prompt 指定新台词和声音描述。

## 核心输入

- 人物图：`inputs/presenter.png`
- 目标台词：`今天我们测试声音、口型和人物是否稳定。`
- 原音驱动：`inputs/exact-speech-driver.wav`，6 秒
- 音色参考 A：`inputs/voice-reference-a.wav`，8 秒
- 音色参考 B：`inputs/voice-reference-b.wav`，8 秒，仅作为后续 A/B 扩展
- 多语言扩展：`inputs/multilingual-switch-30s.wav`，30 秒；不进入本轮四模型共同核心矩阵

音色参考 A/B 中的内容与目标台词不同。因此，输出若复述参考音频内容，就说明模型没有正确执行 `voice_reference` 语义。

## 核心矩阵

| 模型 | 原音驱动 | 音色参考 | Prompt 直出 |
|---|---:|---:|---:|
| Seedance 2.0 | 1 | 1 | 1 |
| Seedance 2.5 | 1 | 1 | 1 |
| MiniMax H3 | 1 | 1 | 1 |
| Wan 3.0 | 1 | 1 | 1 |

共 12 条，统一 6 秒、16:9、720p 或 Provider 最接近规格。MiniMax H3 使用 768P。

所有模型均直接调用官方接口：Seedance 2.0/2.5 使用火山方舟，MiniMax H3 使用
`api.minimaxi.com/v2/video_generation`，Wan 3.0 使用 DashScope。小体积图片和音频直接
内联为 Data URI，不经 FAL 模型代理或 FAL 文件存储。

## 变量控制

- 视觉参考、目标台词、时长、画幅和镜头约束保持相同。
- 三种模式只改变声音来源语义。
- 音色参考和 Prompt 直出都说同一句新台词；两者差异只在是否提供音色样本。
- 无音乐、无音效、无字幕、无切镜、无运镜、无额外人物。

## 通过条件

### 原音驱动

- 输出台词与输入音频一致；
- 无额外或重复话语；
- 输入与输出音频的时间轴和波形没有被明显重构；
- 嘴部在整段发声期间持续跟随；
- 人物身份稳定且无长时间冻结。

### 音色参考

- 输出说的是目标台词，不是参考音频中的句子；
- 输出音色更接近参考音频，而不是只符合文字描述的通用声音；
- 嘴型跟随模型新生成的台词；
- 人物身份稳定且无长时间冻结。

### Prompt 直出

- 输出说出目标台词；
- 声音符合 Prompt 中“明亮、清澈、自然的成年女声”描述；
- 嘴型自然连续；
- 人物身份稳定且无长时间冻结。

## 结果不能混判

- 接受 `reference_audio` 不等于支持音色克隆。
- 台词正确不等于原声音被保留。
- 输出声音像参考音色不等于嘴型严格同步。
- 有嘴部运动不等于没有冻结或时间轴漂移。

## 运行

```bash
python3 run_suite.py --submit
python3 run_suite.py --wait
```

脚本支持断点续跑：已创建的任务不会重复提交。

运行前需提供 `ARK_API_KEY`、`MINIMAX_API_KEY`、`DASHSCOPE_API_KEY`。仓库本地
`.env.local` 仅按变量名读取，不会把密钥写入请求或结果文件。

## 结果

- 中文结论：`FINAL-REPORT.md`
- 机器可读裁定：`results/final-verdicts.json`
- 全量分析：`results/analysis-summary.json`
- 输入和正式视频校验值：`results/checksums.sha256`
- 每条抽帧、音频和分析文本：`derived/<model>__<case>/`
- 12 条正式视频：`outputs/`
- 被排除的旧样本：`legacy-fal-transport/`
