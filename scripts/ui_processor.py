import os
import sys
from PIL import Image

def compress_image(image_path, quality=70):
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' not found.")
        return

    name, ext = os.path.splitext(image_path)
    output_path = f"{name}.webp"

    try:
        with Image.open(image_path) as img:
            # 转换为 RGB (如果是 PNG 带有透明度，则保留 RGBA)
            original_size = os.path.getsize(image_path)
            
            # 使用 Pillow 保存为 WebP
            # method=6 是最高压缩级别 (slower but smaller files)
            img.save(output_path, "WEBP", quality=quality, method=6)
            
            new_size = os.path.getsize(output_path)
            print(f"压缩成功: {image_path}")
            print(f"  原始大小: {original_size / 1024:.2f} KB")
            print(f"  压缩后大小: {new_size / 1024:.2f} KB")
            print(f"  压缩率: {(1 - new_size / original_size) * 100:.1f}%")
            print(f"已生成文件: {output_path}")

    except Exception as e:
        print(f"发生错误: {e}")

def process_path(target_path, quality=70):
    if os.path.isdir(target_path):
        print(f"扫描目录: {target_path}")
        for file in os.listdir(target_path):
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                compress_image(os.path.join(target_path, file), quality)
    else:
        compress_image(target_path, quality)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: py scripts/ui_processor.py <path> [quality]")
    else:
        path = sys.argv[1]
        q = int(sys.argv[2]) if len(sys.argv) > 2 else 70
        process_path(path, q)
