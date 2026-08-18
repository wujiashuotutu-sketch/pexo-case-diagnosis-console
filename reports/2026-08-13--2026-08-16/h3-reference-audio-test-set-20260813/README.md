# MiniMax H3 `reference_audio` 测试包 v1

状态：测试定义与本地物料已整理；6 条 pilot 已完成，正式 24 个有效试次已完成。

## 结论与边界

- H3 的 `reference_audio` 是语义参考输入，不是可靠的输出音频开关，也不等于原音轨透传。
- H3 V2 当前没有已确认可用的 `sound`、`audio`、`mute` 或 `enable_audio` 开关。
- Prompt 中的“静音”“只参考节奏”“只参考音色”是待测的软控制能力，不能直接当作生产交付保证。
- 严格静音、锁定外部音轨和最终音轨保留由平台后处理合同负责，不计入 H3 Provider 原生能力。
- 原 64 条矩阵保留为探索目录；正式核心集去重为 12 条，不把未知字段校验或重复试次混入付费 H3 用例。

## 文件索引

- [`CORE-TEST-SET-v1.md`](CORE-TEST-SET-v1.md)：12 条正式核心 H3 用例，包含精确 Prompt、固定顺序的 `content[]`、断言、证据和失败码。
- [`ASSET-MANIFEST-v1.yaml`](ASSET-MANIFEST-v1.yaml)：核心物料的规范 ID、指纹、媒体属性、已知真值和适用边界。
- [`RUN-CONFIG-v1.yaml`](RUN-CONFIG-v1.yaml)：6 条 pilot 与 24 次正式试次配置；默认禁止执行。
- [`PLATFORM-AUDIO-CONTRACT-v1.md`](PLATFORM-AUDIO-CONTRACT-v1.md)：严格静音、锁定外部音轨和原生音轨保留的后处理合同。
- [`ADAPTER-NEGATIVE-FIELDS-v1.md`](ADAPTER-NEGATIVE-FIELDS-v1.md)：四个未支持音频字段的创建前校验测试，不允许产生付费任务。
- [`PILOT-RESULTS-v1.md`](PILOT-RESULTS-v1.md)：6 条 pilot 的任务、媒体探针、波形诊断和证据缺口。
- [`FORMAL-RESULTS-v1.md`](FORMAL-RESULTS-v1.md)：24 个正式试次的任务状态、媒体探针、参考相关性和结论。
- [`run-pilot.py`](run-pilot.py)：不持久化密钥的 pilot runner；使用隐藏输入或 `MINIMAX_API_KEY` 环境变量。
- [`pilot-20260814/`](pilot-20260814/)：去敏请求、任务状态、本地输出和媒体证据。
- [`FULL-MATRIX-DRAFT-v0.md`](FULL-MATRIX-DRAFT-v0.md)：原 64 条探索矩阵，原样保留，不作为正式 Gate。
- [`assets/`](assets/)：本地媒体物料。
- [`prompts/`](prompts/)：Seed-Audio 声音导演提示词，仅用于解释探索物料来源。
- [`previews/`](previews/)：波形预览。

## 建议执行顺序

1. `RUN-CONFIG-v1.yaml` 的 6 条 pilot 已完成，共 90 秒目标输出，并完成素材解析与证据链校准。
2. 12 条正式核心用例已按重复配置执行，共 24 个有效任务、360 秒目标输出。
3. Provider 结果之后仍需独立验证平台音频交付合同；不能用后处理成功反推 H3 原生能力成功。

## 需要人工确认的限制

`calibrated-person-closeup-768.jpg` 虽比原广角素材更近，但仍是三分之二侧脸。口型用例必须先确认生成结果中的主嘴部在至少 80% 发声区间内清晰可见；否则 `250 ms` 同步判断记为“证据不足”，不能直接判为 H3 失败。正式扩大样本前，建议补一张授权明确、正面、无遮挡、嘴部占画面更高的标准人像。

## 数量校正

原草案不是“统一 15 秒约 960 秒”：按其中 E 组的 4 秒和 10 秒变体精确相加，64 条目标输出约为 939 秒。v1 将重复次数移到运行配置后，正式运行是 24 个任务、360 秒目标输出。
