# H3 Adapter 未支持音频字段测试 v1

目标：阻止调用方把未文档化字段误认为可靠开关。以下测试只运行到 Adapter 创建前校验，禁止调用 MiniMax，禁止产生 task ID 或费用。

## 推荐策略

默认使用严格模式：只要 H3 Provider 参数中出现 `sound`、`audio`、`mute` 或 `enable_audio`，即拒绝请求并返回结构化错误 `unsupported_provider_field`。不要静默接受，也不要把字段值编译进 H3 payload。

若未来为了兼容旧调用方增加“剥离并警告”模式，必须是显式兼容开关，并记录 `field_stripped` warning；该模式不在本 v1 Gate 内。

## 公共输入

```yaml
provider: minimax
model: MiniMax-H3
mode: reference2video
provider_param:
  resolution: 768P
  duration: 15
  ratio: "16:9"
content:
  - type: text
    text: "Create a quiet cinematic shot."
  - type: audio_url
    audio_url: {url: "asset://audio.voice.calibrated_en_15s"}
    role: reference_audio
```

## 用例

| ID | 增量字段 | 预期错误路径 |
|---|---|---|
| H3-ANF-01 | `provider_param.sound: false` | `provider_param.sound` |
| H3-ANF-02 | `provider_param.audio: false` | `provider_param.audio` |
| H3-ANF-03 | `provider_param.mute: true` | `provider_param.mute` |
| H3-ANF-04 | `provider_param.enable_audio: false` | `provider_param.enable_audio` |

每条用例使用相同断言：

| key | severity | expected | evidence | failure codes |
|---|---|---|---|---|
| `validation_rejected` | critical | Adapter 在 Provider 调用前拒绝；错误码为 `unsupported_provider_field`，错误路径精确命中对应字段 | Adapter 校验结果 | `FIELD_ACCEPTED`, `WRONG_ERROR_CODE`, `WRONG_ERROR_PATH` |
| `no_provider_task_created` | critical | MiniMax create 调用次数为 0，无 task ID、无轮询、无计费记录 | mock/call ledger、task ledger、billing ledger | `PROVIDER_CALLED`, `TASK_ID_CREATED`, `BILLING_RECORDED` |
| `unsupported_field_not_serialized` | critical | 去敏后的 outbound payload 不存在；若框架生成 preflight payload，其中不得包含该字段 | outbound capture | `FIELD_SERIALIZED`, `OUTBOUND_PAYLOAD_CREATED` |

## 不纳入 H3 付费矩阵的原因

Provider 忽略未知字段并返回成功，无法证明字段有效，反而会制造“开关可用”的假象。字段支持性属于 Adapter 合同，应在创建付费任务前确定性失败，而不是靠生成结果猜测。
