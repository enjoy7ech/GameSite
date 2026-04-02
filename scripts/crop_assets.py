import os
from PIL import Image

def process_and_compress_map(input_path, output_path, crop_pixels=120, quality=80):
    """
    【V4 深度裁切版】
    crop_pixels: 增加到 120 像素以彻底抹除该区域的四角星图标。
    """
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return

    try:
        with Image.open(input_path) as img:
            w, h = img.size
            # 深度裁切底部
            img_cropped = img.crop((0, 0, w, h - crop_pixels))
            
            # 保存为 WebP
            img_cropped.save(output_path, "WEBP", quality=quality, method=6)
            
            print(f"✅ Deep Crop Success: {output_path}")
            print(f"   Removed {crop_pixels} pixels from the bottom.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    RAW_PATH = r"d:\GameSite\public\games\tiny-story\assets\origin\Gemini_Generated_Image_ihkx6iihkx6iihkx.png"
    FINAL_PATH = r"d:\GameSite\public\games\tiny-story\assets\bg\qingfeng_map_final.webp"
    
    os.makedirs(os.path.dirname(FINAL_PATH), exist_ok=True)
    
    # 执行 120px 深度裁切
    process_and_compress_map(RAW_PATH, FINAL_PATH, crop_pixels=120, quality=80)
