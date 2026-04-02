---
description: 提取、算法去图标并分发 Gemini 图像资产
---

// turbo-all
1. 扫描 artifacts 目录中的最新大图。
2. 调用 `scripts/asset_cleaner.py` 对图像进行 OpenCV Inpainting (Navier-Stokes) 抹除悬浮图标及 UI 残留。
3. 执行 Alpha 透明通道提取 (Background Removal)，只有人物图需要扣。
4. 转换 WebP (85% 压缩) 分发至assets目录。