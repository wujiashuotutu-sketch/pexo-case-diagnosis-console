# 2026-08-16 每日线上 Bad Case 分析

> 本报告只覆盖当天收到用户 Bad 反馈的项目，不是全量线上项目质量评分，也不能外推为全线上质量。

## 一、分析范围与数据来源

- 分析日期：2026-08-16（Asia/Shanghai）
- 精确 UTC 窗口：2026-08-15T16:00:00Z（含）至 2026-08-16T16:00:00Z（不含）
- Bad 反馈行数：10
- 去重项目数：10
- 选择条件：asset_subtype = STAGE_FINAL_VIDEO、feedback_label = Bad，且 feedback_submitted_at 落在上述窗口
- 单项目数据：优先使用 production Postgres database 3
- 完整性：9 个项目通过 database 3 completeness gate；02450658045 在 database 3 和 database 5 都找不到，标记为 unscored
- Langfuse：本轮未调用。Metabase/production Postgres 已足够的项目没有走 Langfuse 回退

反馈 issue 分布如下。它们只作为用户报告的现象和上下文，不能单独作为根因证据：

- Request misunderstood：4
- Other：3
- Bad pacing：1
- Wrong visual style：1
- Revision made it worse：1
- Audio issue：1
- Text/logo issue：1

## 二、最终定级

### P1：5 个

1. **43623995145｜局部毛发运动失败**
   - 用户意图：狗保持静止，肩部黑色毛发从慢到快沿手臂运动。
   - 证据：多次视觉 QA 指出线条是人工网格、越出手臂；shih_tzu_hair_fast 的最终检查明确说没有从第一帧快速运动、狗没有完全静止、线条没有全程快速移动。
   - 根因归因：mixed。矩形 overlay/clip-path 没有绑定身体轮廓，且已知 QA 失败没有阻断发布。
   - 影响：主体移动、线条越界、速度不符合，核心效果不可用。

2. **61439774499｜人物情绪没有按需求呈现**
   - 用户意图：左侧女孩愤怒质问，中间角色困惑/担忧，右侧角色内疚/紧张/羞愧/不适，同时严格保留原图人物和位置。
   - 证据：最终 QA 确认三名角色和位置保留，但左侧表现平静，中间没有困惑或担忧，右侧没有内疚、紧张、羞愧或回避视线。
   - 根因归因：mixed。参考保真检查覆盖了人物身份，却没有把情绪、视线和反应关系变成硬验收项。
   - 影响：画面保留了人物，但没有传达“严肃对质”的剧情。

3. **40727889270｜Logo 关键结构与参考不稳定**
   - 用户意图：划痕居中，透明外环在结尾消失，环带拆分后以不同 3D 轨道旋转并复位。
   - 证据：参考分析确认了外环和结尾要求；中间版本 QA 指出划痕偏向左下且环带整体变形；后续版本又给出环带拆分和外环消失的相反结论。
   - 根因归因：mixed。版本级验收没有锁定中心对齐、环带独立运动和最终帧状态，导致 QA 互相矛盾后仍交付。
   - 影响：品牌识别元素可能与参考不一致，不能作为稳定的 Logo motion 交付。

4. **43979777597｜螳螂变形不是有机变形**
   - 用户意图：水晶螳螂被吸收后，外骨骼从身体中生长，头部逐步虫化，手臂自然变成生物镰刀。
   - 证据：pro QA 指出 3.5-6.5 秒变形过快；4.0-6.0 秒外骨骼像直接替换胸甲；6.5-7.5 秒头部一秒跳变；镰刀像机械护甲；最终仍是人类身体比例。
   - 根因归因：model/skill mixed。路线保留人类基体并叠加虫族配件，没有中间形态和材料连续性门禁。
   - 影响：结果像人类穿上虫甲，不是用户要求的生物变形。

5. **74106891613｜已知无音频仍交付**
   - 用户意图：历史主题标题卡和猿人动作需要完整的视听交付，项目经历了多轮节奏、角色和素材修订。
   - 证据：多次 lint 返回 MOTION_CONTRACT_COVERAGE_NO_AUDIO；seq 132 的 v8 渲染明确带着该 finding 被确认，seq 135 随后展示 v8；后续版本仍沿用 no-audio 路径。
   - 根因归因：mixed。把静音提示当成普通可豁免项，没有确认用户是否确实要求静音，也没有 final audio presence/loudness gate。
   - 影响：即使画面完成，成片也可能缺少预期音乐、环境声或动作节奏，因此属于交付级问题。

### P2：1 个

**81692410854｜Macha Episode 2 中间版本存在交付缺陷**

- Bad 版本的最终 QA 记录了场景顺序不正确、转场不是平滑 crossfade、30.2 秒结尾出现黑帧。
- 工具链还记录音频重叠问题；后续生成 notitle 版本和另一集西瓜版本，说明已有修订活动。
- 由于这是明确的 Bad 版本缺陷，但后续存在修复链，定为 P2，不用后续版本掩盖原始问题，也不升级为 P1。

### 未评分：4 个

- **02450658045**：production 和 test Postgres 都没有项目记录，只有 BigQuery 反馈行，无法重建意图和工具链。
- **11052949256**：内部 QA 反而确认奔跑、停下、吃草顺序正确；用户所说遗漏无法复现，且 Bad 二进制已过期。
- **27282704810**：v2 的主体、动作、美甲和媒体基础检查通过；水印究竟来自视频像素、预览代理还是产品策略，现有证据无法区分。
- **80300882465**：早期帧有 Logo 不可见和偏右问题，中后段帧确认 Logo 可见；静态帧不足以判断最终动画是否缺少运动，Bad 二进制也无法复检。

## 三、重复趋势

最明确的重复趋势是发布控制，而不是某一个模型单点失败：

1. 多个 P1 在交付前已经有工具 QA 证据，指出缺少关键 beat、结构偏移、情绪不符、变形语义失败或无音频，但流程仍继续 show_final_video。
2. P2 显示中间 render 没有被标记为不可交付，顺序、转场和黑帧问题在版本尚未稳定时就暴露给用户。
3. 共同的 Phase B 方向是把用户明确要求转成版本级 hard gate，并在 gate 未通过时停止最终展示；本轮不修改 Skill、Runtime、Admin 或 Release。

## 四、媒体检查与限制

- 27282704810 和 43979777597 有可下载媒体，均可播放；本地检查记录了 ffprobe、黑屏、冻结、音频/静音和九帧接触表结果。
- 其他被选中的 Bad 最终资产缓存 URL 已失效，无法对原始 Bad 二进制重复执行 ffprobe、blackdetect、freezedetect、音频和九帧像素检查。
- 所有逐案报告都记录了具体证据限制；证据不足的项目保持 unscored，不猜分。

## 五、逐案报告

- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/02450658045/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/11052949256/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/27282704810/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/80300882465/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/43623995145/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/61439774499/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/40727889270/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/43979777597/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/74106891613/analysis.md
- /Users/wellswu/pexo-skills/analysis/daily-bad-case-analysis/runs/2026-08-16/cases/81692410854/analysis.md

P1 汇总子任务使用日期级幂等键 2026-08-16:p1，当前状态和正式 thread_id 见 p1-subtask.json。子任务仍是只读 Phase A，不进入 Phase C。
