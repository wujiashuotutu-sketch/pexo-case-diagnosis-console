# Wan 3.0 文件与网页输入扩展实测

**日期：** 2026-08-13  
**模型：** `wan3.0-video`  
**配置：** `480P / 2s / adaptive / audio=false / watermark=false`  
**范围：** 10 个独立任务，覆盖 PDF、DOCX、XLSX、Markdown、TXT，以及动态官网、静态网页、重定向和认证网页。每个任务只传一个 `file` 或一个 `link`。

## 1. 结论

10 个任务中 8 个成功、2 个失败。格式合同总体可用，但生产接入不能把 `SUCCEEDED` 当成内容质量通过：

- PDF、DOCX、XLSX、Markdown、TXT 都有成功样本；公开动态/静态网页和 HTTP 重定向也有成功样本。
- 同一 XLSX URL 不带查询参数时 Provider 下载失败，加 `?download=1` 后成功。文件格式相同、内容相同，仅 URL 形态变化就改变结果，说明平台应先转存到自有稳定 URL，不能把任意第三方下载地址直接交给 Provider。
- 需要 HTTP Basic Auth 的网页在创建时仍返回 `PENDING`，运行约 6 分钟后才以 `InvalidParameter` 失败。公开可达性必须在平台提交前检查，不能依赖 Provider 后置拒绝。
- 内容保真差异很大。PDF/DOCX/重定向页接近源内容；Markdown、TXT、IANA 页面虽然主题正确，却生成了错误命令、错误域名、自创概念或拟制 UI。
- “无字幕、无二维码”不是硬约束。多项结果仍大量显示文字；此前官方 API 网页样本还自创了二维码。
- 每段视频都是 60 个不同 MD5 帧，但 DOCX、XLSX、IANA、重定向页仍出现 0.3 秒以上视觉冻结。唯一帧计数不能代替冻结检测和视觉 QA。

生产裁定：`file/link` 的接口合同已在线验证，但事实保真、下载稳定性、可达性预检和成片质量均未达到默认生产路由要求。

## 2. 测试矩阵

| Case | 输入 | 结果 | 端到端耗时 | 主要结论 |
|---|---|---|---:|---|
| `file_pdf` | W3C 单页 dummy PDF | `SUCCEEDED` | 8m 52.6s | 准确呈现 `Dummy PDF file` |
| `file_docx` | python-docx 测试 DOCX | `SUCCEEDED` | 17m 17.8s | 准确呈现两行源文字；约 1.37s 视觉冻结 |
| `file_xlsx` | Apache POI XLSX 原始 Raw URL | `FAILED` | 12m 05.7s | `Failed to download ...xlsx` |
| `file_xlsx_query` | 同一 XLSX，URL 加 `?download=1` | `SUCCEEDED` | 13m 42.3s | 表头、Foo/Bar、数值、链接、页脚均可见；部分乱码且长冻结 |
| `file_md` | 百炼 CLI 安装说明 Markdown | `SUCCEEDED` | 12m 05.7s | 理解 CLI 安装/鉴权主题，但生成错误命令和额外工具概念 |
| `file_txt` | RFC 2606 TXT | `SUCCEEDED` | 9m 40.4s | 理解保留域名主题，但把 `.localhost` 弱化成 `.local` 并自创概念 |
| `link_react` | React 官方首页 | `SUCCEEDED` | 17m 31.6s | React 标志和开发者社区主题相关，未体现页面核心“组件式 UI”信息 |
| `link_iana` | IANA Example Domains | `SUCCEEDED` | 11m 49.2s | 抓住保留示例域名主题，但自创源码和禁止符号；含黑段/冻结 |
| `link_redirect` | 302 重定向到 example.com | `SUCCEEDED` | 8m 29.1s | 跟随重定向，准确呈现 Example Domain 页面；约 1.2s 冻结 |
| `link_auth_negative` | HTTP Basic Auth 页面 | `FAILED` | 6m 07.2s | 运行后才报 URL 无效或无法解析 |

8 个成功任务按 `480P` 官方单价 `0.3 元/秒` 估算为 4.8 元。两个失败任务是否产生其他费用以百炼账单为准；报告不把创建受理视为计费成功。

## 3. 文件输入

### 3.1 PDF 与 DOCX：简单文本召回强

PDF 只有 `Dummy PDF file`，结果几乎逐字复现。DOCX 包含 `python-docx was here!` 和 `python-docx was here too!`，结果也准确复现。

这证明 Provider 能读取这两种容器内的文本，但不能据此推断复杂版式、长文档、多页关联或事实摘要能力。两个来源过于简单，属于格式与文本召回 smoke。

DOCX 结果从约 0.4 秒冻结到 1.77 秒。虽然编码层 60 帧哈希都不同，视觉变化不足，说明轻微压缩噪声会让“唯一帧”指标误判为持续运动。

### 3.2 XLSX：URL 取件不稳定，解析后仍有文字问题

原始 URL：

```text
https://raw.githubusercontent.com/apache/poi/trunk/test-data/openxml4j/ExcelWithHyperlinks.xlsx
```

Provider 在运行后报 `Failed to download`。同一文件仅增加 `?download=1` 后进入 `RUNNING` 并成功生成。两种 URL 对本地 `curl` 都返回 HTTP 200、相同大小与 `application/octet-stream`。

成功结果能呈现：

- A1/B1/C1 表头；
- `Foo`、`Bar Bar`、22.3、41.1、52.1、63.1 等单元格；
- `http://poi.apache.org/` 和 `Internal hyperlink to A2`；
- `This is the header on sheet 1`、`We have a footer`、`Torchbox commented`。

但第一段画面有明显乱码，且大部分时长是静态表格。因此，XLSX 可读不等于可直接做高质量数据视频；平台更适合先结构化解析与图表编译，再把明确视觉稿交给视频模型。

### 3.3 Markdown 与 TXT：主题召回可用，事实生成风险高

Markdown 源明确要求用 `npm install -g bailian-cli`，禁止用 pnpm/yarn 安装，并规定 `npx skills add modelstudioai/cli --all -g`。生成画面却出现 pnpm、yarn、错误的 skills 命令、拟制 Token Plan 和凭据界面。这不是单纯文字变形，而是可执行技术事实被改写。

RFC 2606 源明确列出 `.test / .example / .invalid / .localhost`。结果抓住 `RFC 2606 Reserved TLDs`，但画面显示 `.local`，并增加 `Code Escape`、`Data Conflict` 等源文没有的概念。

因此，文件输入适合生成“主题意象”，不适合未经审核地生成安装说明、API 教程、命令、法规、价格或精确参数视频。

## 4. 网页输入

### 4.1 动态与静态公开页

React 官方首页成功，结果先显示 React 标志，再进入开发者活动场景。品牌和社区语义相关，但页面核心信息是“用组件创建 Web/Native UI”，结果没有形成可验证的功能摘要。

IANA 页面成功，结果使用 example.com/example.org、RFC 2606 与禁止符号表达“保留示例域名”。主题相关，但源码画面和强禁止符号是模型自创；结尾还有 0.43 秒黑段和多次冻结。

### 4.2 重定向

HTTP 302 跳转到 `https://example.com/?wan30_test=redirect` 后成功。结果准确呈现 Example Domain 页面和其说明文字，证明 Provider 能跟随该类公开 HTTPS 重定向。

但这不应让平台放开任意重定向。平台仍需在每一跳重新做 scheme、DNS、IP、端口和目标域安全检查，避免 SSRF 与元数据地址跳转。

### 4.3 认证负例

HTTP Basic Auth 页面在请求创建时没有同步拒绝，而是：

```text
PENDING -> RUNNING -> FAILED
InvalidParameter: URL 无效或无法解析：未能从提供的 URL 提取有效内容
```

端到端浪费约 6 分钟。平台必须在创建任务前用无凭据请求确认最终 URL 为公开 2xx HTML，并禁止 Cookie、Authorization、userinfo 和一次性 Token。

## 5. 技术有效性

8 个成功结果均为 H.264、832x480、30fps、2.000 秒、无音轨，均可完整解码；每段都是 60 帧且帧 MD5 均不同。

质量检测仍发现：

| Case | 冻结/黑段 |
|---|---|
| `file_docx` | freeze 0.40-1.77s |
| `file_xlsx_query` | freeze 0.07-1.27s，并从 1.27s 再次开始冻结至结尾 |
| `link_iana` | freeze 0.80-1.27s；1.60s 起冻结；black 1.53-1.97s |
| `link_redirect` | freeze 0.80s 起至结尾 |

其余四项未命中 `blackdetect=d=0.10:pix_th=0.10` 或 `freezedetect=n=-50dB:d=0.3`。

## 6. 接入要求

1. 文件先由平台下载、校验扩展名/MIME/魔数、病毒扫描并转存到自有稳定 HTTPS URL，再交给 Wan；不要直传任意第三方 URL。
2. 网页提交前解析并验证每次重定向，确认最终响应为公开 2xx HTML；认证页、登录页和受限页零任务阻断。
3. 对技术文档、表格、法规、价格和参数类来源，默认禁止直接生成后交付；必须做 OCR、事实比对和人工/模型复核。
4. 检测输出中的二维码、URL、命令、价格、联系方式和品牌文本。这些属于高风险新增事实，不能只靠 prompt 的“不要生成”。
5. 媒体 QA 至少包括解码、时长、音轨、黑帧和冻结；不能只用唯一帧数判断运动有效性。
6. 异步超时需按文件理解场景设计。本轮成功任务端到端为 8m29s 至 17m32s，明显超过普通前台等待窗口。
7. `file/link` 继续独立 feature flag 与 Shadow Gate，不因 8/10 成功就加入默认生产路由。

## 7. 产物

所有任务元数据、成功 MP4 和三帧 contact sheet 位于：

```text
analysis/wan30-expanded-input-2026-08-13/
```

凭据、Authorization Header 和临时 `video_url` 未写入产物。

