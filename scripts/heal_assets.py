import os
from PIL import Image, ImageFilter, ImageDraw

def heal_ui_pins(input_path, output_path, quality=90):
    """
    专门针对图标集的去标与压缩。
    """
    if not os.path.exists(input_path): return

    try:
        with Image.open(input_path) as img:
            img = img.convert("RGBA")
            w, h = img.size
            
            # 定位右下角图标
            # 基于这张图的布局，水印大致在 (w-100, h-80) 位置
            target_pos = (w - 120, h - 120)
            box_size = (100, 100)
            
            # 采样：向上偏移 100px (纯黑背景区域)
            source_box = (target_pos[0], target_pos[1] - 150, 
                          target_pos[0] + box_size[0], target_pos[1] - 150 + box_size[1])
            patch = img.crop(source_box)
            
            # 建立羽化遮罩
            mask = Image.new('L', box_size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((5, 5, box_size[0]-5, box_size[1]-5), fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(radius=8))
            
            # 缝补
            img.paste(patch, target_pos, mask)
            
            # 转换为 RGB 并保存为 WebP (UI 需要高质量)
            # NOTE: 如果将来需要透明，可以保存为 RGBA WebP
            img.save(output_path, "WEBP", quality=quality, method=6)
            print(f"✨ UI Pins Healed & Compressed: {output_path}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    RAW_PATH = r"d:\GameSite\public\games\tiny-story\assets\origin\Gemini_Generated_Image_8ollia8ollia8oll.png"
    FINAL_PATH = r"d:\GameSite\public\games\tiny-story\assets\ui\pins.webp"
    
    os.makedirs(os.path.dirname(FINAL_PATH), exist_ok=True)
    heal_ui_pins(RAW_PATH, FINAL_PATH)
