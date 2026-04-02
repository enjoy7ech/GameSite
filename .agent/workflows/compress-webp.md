---
description: 压缩图片为 WebP (Python)
---

这个工作流用于使用 Python (Pillow) 将图像资产压缩为极小的 WebP 格式。

### 准备环境
// turbo
1. 安装依赖：
```powershell
py -m pip install Pillow
```

### 执行压缩
// turbo
2. 运行脚本：
```powershell
py scripts/ui_processor.py <image_path>
```

> [!TIP]
> 脚本将默认使用 75 质量进行无损/有损转换，你可以修改 `scripts/ui_processor.py` 中的 `quality` 参数来进一步压缩。
