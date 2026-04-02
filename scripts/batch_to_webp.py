import os
from PIL import Image

def batch_convert():
    ASSETS_DIR = r"D:\GameSite\public\games\tiny-story\assets"
    
    for root, dirs, files in os.walk(ASSETS_DIR):
        for file in files:
            if file.lower().endswith('.png'):
                input_path = os.path.join(root, file)
                output_path = os.path.splitext(input_path)[0] + '.webp'
                
                try:
                    with Image.open(input_path) as img:
                        # 85% conversion
                        img.save(output_path, "WEBP", quality=85, method=6)
                        print(f"✅ Converted: {file} -> {os.path.basename(output_path)}")
                except Exception as e:
                    print(f"❌ Error converting {file}: {e}")

if __name__ == "__main__":
    batch_convert()
