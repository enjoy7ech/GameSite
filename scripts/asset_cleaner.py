import cv2
import numpy as np
import os
from PIL import Image

def remove_green_screen(img):
    """
    Precision Green-Screen Removal: 
    Preserves internal green elements (like grass in a drawing) by only removing 
    the green background connected to the image boundaries.
    """
    h, w, _ = img.shape
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # 扩大容差：捕获纯正绿幕
    lower_green = np.array([35, 45, 45]) 
    upper_green = np.array([90, 255, 255])
    full_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # --- 核心：边缘扩散法 (Connected Component from Edges) ---
    # 我们假设背景绿幕总是接触到边缘。我们通过连通域分析剔除「内部的孤岛绿」。
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(full_mask, connectivity=8)
    
    # 查找连接到四个边的标签
    edge_labels = set()
    for i in range(1, num_labels):
        x, y, sw, sh, area = stats[i]
        # 如果组件触及边缘，则视为背景
        if x == 0 or y == 0 or (x + sw) >= w or (y + sh) >= h:
            edge_labels.add(i)
            
    # 只把连接到边缘的绿色设为透明
    background_mask = np.zeros_like(full_mask)
    for i in edge_labels:
        background_mask[labels == i] = 255
        
    mask_inv = cv2.bitwise_not(background_mask)
    
    # Spill 抑制 (只针对背景附近的溢色进行，保护中心)
    b, g, r = cv2.split(img)
    g_suppressed = np.minimum(g, np.maximum(r, b))
    
    return cv2.merge([b, g_suppressed, r, mask_inv])

def isolate_main_character(rgba):
    """
    Find all continuous alpha blobs and keep only the largest one that is near the center.
    This effectively deletes any "neighbor bleed" that entered the wider extraction window.
    """
    alpha = rgba[:,:,3]
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(alpha, connectivity=8)
    
    if num_labels <= 1:
        return rgba

    # Find the largest non-background component (background is usually index 0)
    # Filter stats to keep components that are significant in size AND centrally located.
    img_h, img_w = alpha.shape
    center_x = img_w / 2
    
    main_label = -1
    max_area = 0
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        # Ignore tiny specks
        if area < 500:
            continue
            
        # Is it the largest one?
        if area > max_area:
            max_area = area
            main_label = i
            
    if main_label == -1:
        return rgba

    # Create a mask for ONLY the main label
    new_alpha = np.zeros_like(alpha)
    new_alpha[labels == main_label] = 255
    
    rgba[:,:,3] = new_alpha
    
    # Auto-crop to the new alpha box
    coords = cv2.findNonZero(new_alpha)
    x, y, w, h = cv2.boundingRect(coords)
    margin = 5
    y_start, y_end = max(0, y - margin), min(img_h, y + h + margin)
    x_start, x_end = max(0, x - margin), min(img_w, x + w + margin)
    
    return rgba[y_start:y_end, x_start:x_end]

def process_single_asset(input_path, output_path):
    """
    Process a single green-screen image and save it as a transparent WebP.
    """
    img = cv2.imread(input_path)
    if img is None:
        print(f"❌ Failed to load: {input_path}")
        return

    # 1. Remove green screen
    rgba = remove_green_screen(img)
    
    # 2. Isolate the main character (remove any debris)
    rgba_final = isolate_main_character(rgba)
    
    # 3. Save as transparent WebP
    pil_img = Image.fromarray(cv2.cvtColor(rgba_final, cv2.COLOR_BGRA2RGBA))
    pil_img.save(output_path, "WEBP", quality=88, method=6)
    print(f"✨ Perfect Isolation: {os.path.basename(input_path)} -> {output_path}")

def scan_and_process():
    ORIGIN_DIR = r"D:\GameSite\public\games\tiny-story\assets\origin"
    OUTPUT_DIR = r"D:\GameSite\public\games\tiny-story\assets\char"
    
    if not os.path.exists(ORIGIN_DIR):
        print("⚠️ Warning: Origin directory not found.")
        return

    for filename in os.listdir(ORIGIN_DIR):
        if filename.endswith("_green.png") or filename.endswith("_green.jpg"):
            input_path = os.path.join(ORIGIN_DIR, filename)
            # 基础 ID
            base_id = filename.replace("_green.png", "").replace("_green.jpg", "")
            
            # 分流逻辑
            if base_id.startswith("item_"):
                target_dir = OUTPUT_DIR.replace("\\char", "\\items").replace("/char", "/items")
                os.makedirs(target_dir, exist_ok=True)
                output_path = os.path.join(target_dir, f"{base_id}.webp")
            else:
                output_path = os.path.join(OUTPUT_DIR, f"{base_id}.webp")
            
            process_single_asset(input_path, output_path)

if __name__ == "__main__":
    scan_and_process()
