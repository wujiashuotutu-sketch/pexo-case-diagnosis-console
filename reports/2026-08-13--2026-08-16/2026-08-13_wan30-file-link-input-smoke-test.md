# Wan 3.0 文件与网页输入实测

**日期：** 2026-08-13  
**模型：** `wan3.0-video`  
**Endpoint：** `https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`  
**测试范围：** 分别验证 `input.media[].type=file` 与 `type=link`，不混合两种输入。

## 1. 结论

文件和公开网页输入都能通过公共 DashScope Endpoint 创建任务、进入 `RUNNING`、最终返回 `SUCCEEDED`，并产出可下载的有效 MP4。因此，两种输入的接口合同在本账号上已经实测通过，不再只是文档推断。

质量结论必须分开：

- 文件输入通过了本次内容关联性检查。源 PPTX 是 AURORA One 智能眼镜产品提案，结果明确呈现了同类智能眼镜、黑色与金色款式，以及佩戴后的信息浮层场景，和源文件四页内容高度对应。
- 网页输入只通过“理解了网页主题”的检查。结果出现 `WAN`、提示词、参考图像、时长设置等相关意象，但同时生成了源网页没有的二维码和拟制界面；不能据此宣称网页事实严格保真。
- 两个结果都无黑帧、无连续冻结、每帧均发生变化。两次生成均遵守 `audio=false`，MP4 只有视频流。

生产裁定：`file/link` 可以从 `contract_supported` 升为“本账号在线合同已验证”，但仍不能标记为 `evaluated` 或 `production_ready`。开放生产路由前还需覆盖事实召回、幻觉、品牌文字、提示词遵循、安全与地域策略。

## 2. 请求设计

为控制成本，两项测试都使用：

```json
{
  "model": "wan3.0-video",
  "parameters": {
    "resolution": "480P",
    "ratio": "adaptive",
    "duration": 2,
    "audio": false,
    "watermark": false
  }
}
```

文件源：

```text
https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260806/ebapmr/glass.pptx
```

网页源：

```text
https://help.aliyun.com/zh/model-studio/wan3-video-generation-api-reference
```

两条 prompt 都要求只依据输入内容生成简洁视觉摘要、不增加源中不存在的事实，并要求无旁白、无字幕。文件和网页分别单独提交，未使用首尾帧或其他 reference media。

## 3. 生命周期与成本

| 输入 | task_id | 排队 | 执行 | 提交到完成 | 终态 |
|---|---|---:|---:|---:|---|
| file | `3bc87b83-f3bb-4764-bf92-3e501382dcd3` | 49.2s | 10m 27.1s | 11m 16.4s | `SUCCEEDED` |
| link | `6244e778-4fe4-4000-ac13-f30f095a4cc8` | 1m 14.7s | 7m 50.8s | 9m 05.5s | `SUCCEEDED` |

Provider usage 两项一致：输出 2 秒、30fps、`SR=480`、实际画幅 `16:9`、无输入视频时长。按官方 `480P` 单价 `0.3 元/秒` 估算，每项 0.6 元，两项合计 1.2 元；实际账单以百炼计费记录为准。

本次样本显示，短输出不代表低端到端延迟：2 秒任务仍需约 9 至 11 分钟。接入时应保留异步任务、长轮询、超时分层和即时转存，不能按普通同步接口设计。

## 4. 媒体检查

| 输入 | 编码与尺寸 | 时长/帧 | 文件大小 | 检查结果 |
|---|---|---:|---:|---|
| file | H.264, 832x480, 30fps | 2.000s / 60 | 1,066,956 bytes | 60 个唯一帧；无黑段；无 >=0.3s 冻结；无音频流 |
| link | H.264, 832x480, 30fps | 2.000s / 60 | 1,888,774 bytes | 60 个唯一帧；无黑段；无 >=0.3s 冻结；无音频流 |

黑帧使用 `blackdetect=d=0.10:pix_th=0.10`，冻结使用 `freezedetect=n=-50dB:d=0.3`；两项均未报告事件。

## 5. 语义检查

### 5.1 文件输入

源 PPTX 实际包含 4 页整页栅格图：

1. `AURORA One` 智能眼镜封面；
2. 黑、银、金三色与多视角产品展示；
3. 眼镜结构爆炸图及摄像头、传感器、芯片、电池等组件；
4. 佩戴者办公场景与 AR 信息、语音助手、记录、导航等能力。

结果抽帧依次出现：黑色智能眼镜产品特写、金色款产品正视图、佩戴者办公与悬浮信息界面。产品类别、主要外形、色彩和使用场景均能从源 PPTX 找到直接证据。品牌细节没有完全稳定复刻，但本次 2 秒摘要可判为“源文件理解与视觉关联通过”。

### 5.2 网页输入

源网页是万相 3.0 视频生成 API 参考。结果抽帧出现 `WAN`、媒体/生成意象，以及“提示词、参考图像、时长设置”控件，说明模型抓住了视频生成 API 的主题与部分参数概念。

但结果后段出现大型二维码和拟制操作界面。二维码不是源网页的核心事实，也没有证据证明它对应有效官方入口；同时可见控件文字违背了 prompt 的“无字幕”要求。因此本项判定为：

```text
网页抓取/理解：通过
主题相关性：通过
事实严格保真：未通过
无字幕指令遵循：未通过
生产质量 Gate：未通过
```

## 6. 接入建议

1. 公共 `dashscope.aliyuncs.com` Endpoint 在本账号上可以创建和查询 Wan 3.0 任务。官方地域化 Workspace Endpoint 仍是正式合同，公共 Host 应记录为实测兼容路径，而不是替代地域配置设计。
2. `file/link` 需要独立 feature flag 和质量 Gate。接口成功只证明 Provider 能读取输入，不能证明事实保真。
3. 网页结果必须做视觉事实 QA，至少检查品牌、产品类型、关键参数、二维码/联系方式/价格等高风险新增事实。
4. Prompt 的“无字幕”不是可靠硬约束。对不可接受的文字、二维码和 UI 幻觉，需要生成后 OCR/二维码检测并按策略拒收或重试。
5. 成功后立即转存。任务查询和 `video_url` 仍只有 24 小时有效期。

## 7. 产物

- `analysis/wan30-file-input-2026-08-13.mp4`
- `analysis/wan30-link-input-2026-08-13.mp4`
- `analysis/wan30-file-input-contact-sheet.jpg`
- `analysis/wan30-link-input-contact-sheet.jpg`

后续扩展测试覆盖 PDF、DOCX、XLSX、Markdown、TXT、动态/静态网页、重定向和认证负例，详见 `analysis/2026-08-13_wan30-file-link-input-expanded-test.md`。
