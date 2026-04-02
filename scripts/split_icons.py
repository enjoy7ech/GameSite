import os
from PIL import Image, ImageOps

def split_and_transparent_icons(input_path, output_dir, rows=2, cols=4):
    """
    【V2 透明版】：分块、去文字、利用亮度通道自动抠图 (Luma Keying)。
    """
    if not os.path.exists(input_path): return
    
    names = ["station", "bookstore", "cafe", "dock", "school", "home", "tower", "lighthouse"]
    os.makedirs(output_dir, exist_ok=True)

    try:
        with Image.open(input_path) as img:
            # 转换为 RGBA 方便处理透明度
            img = img.convert("RGBA")
            w, h = img.size
            cell_w = w // cols
            cell_h = h // rows
            
            idx = 0
            for r in range(rows):
                for c in range(cols):
                    # 1. 初始定位
                    left, top = c * cell_w, r * cell_h
                    right, bottom = (c + 1) * cell_w, (r + 1) * cell_h
                    
                    # 2. 裁切（避开文字和边缘）
                    icon_box = (left + 60, top + 60, right - 60, bottom - 160)
                    icon_raw = img.crop(icon_box)
                    
                    # 3. 核心：亮色转换为 Alpha (抠除黑底)
                    # 将图标转为灰度图作为 Alpha 模板
                    alpha_mask = icon_raw.convert("L")
                    # 可调优：增强对比度，让白色更实，黑色更纯
                    alpha_mask = ImageOps.autocontrast(alpha_mask, cutoff=5)
                    icon_raw.putalpha(alpha_mask)
                    
                    # 4. 缩放
                    icon_final = icon_raw.resize((256, 256), Image.Resampling.LANCZOS)
                    
                    # 5. 保存（WebP 支持透明通道）
                    save_path = os.path.join(output_dir, f"{names[idx]}.webp")
                    icon_final.save(save_path, "WEBP", quality=95, lossless=False)
                    print(f"💎 Extracted [Transparent]: {save_path}")
                    idx += 1
            
            print(f"\n✅ All 8 Transparent Icons exported to {output_dir}")

    except Exception as e:
        print(f"❌ Splitter Error: {e}")

if __name__ == "__main__":
    RAW_PATH = r"d:\GameSite\public\games\tiny-story\assets\origin\Gemini_Generated_Image_8ollia8ollia8oll.png"
    OUT_DIR = r"d:\GameSite\public\games\tiny-story\assets\ui\icons"
    split_and_transparent_icons(RAW_PATH, OUT_DIR)
