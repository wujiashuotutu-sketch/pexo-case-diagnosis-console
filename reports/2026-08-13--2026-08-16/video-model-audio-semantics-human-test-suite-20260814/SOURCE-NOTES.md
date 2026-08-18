# 真人测试与隐私探针说明

- `inputs/presenter.jpg`：Pexels 图片 415829 的本地副本。
- 来源页面：https://www.pexels.com/photo/woman-wearing-black-spaghetti-strap-top-415829/
- 图片 CDN：https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg
- 用途：仅用于验证原生接口是否接受授权真人参考图，不用于核心生成矩阵、身份识别或人物复刻。
- 选择理由：正面、闭唇、脸部和唇齿边界清楚，适合作为统一视觉输入。
- Pexels 许可说明：https://www.pexels.com/license/

Seedance 2.0 与 Seedance 2.5 均返回
`InputImageSensitiveContentDetected.PrivacyInformation`。因此四模型核心矩阵不上传
任何真实人物照片。

核心矩阵使用 `inputs/synthetic-presenter-000.jpg`：先由 Seedance 2.5 纯文本生成
一位不对应特定真实身份的写实真人主持人，再从视频首帧提取。除这条 Bootstrap
样本外，其余任务统一以该首帧作为视觉输入。
