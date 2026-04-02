import cv2
import numpy as np
import os
import glob

def remove_green_screen_precise(input_path, output_path):
    if not os.path.exists(input_path):
        return
        
    img = cv2.imread(input_path)
    if img is None: return
    
    # 转换到 HSV 色彩空间进行精准色号提取
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # --- 核心锁定：纯正绿幕色号 (#00FF00) ---
    # 在 OpenCV 的 HSV 空间中，纯绿色 Hue 为 60
    # 缩小 Hue 范围 (58-62) 以保证不误伤角色的正常绿色配饰
    # 同时过滤较低饱和度(150+)和较低亮度(100+)的杂色
    lower_green = np.array([58, 150, 100]) 
    upper_green = np.array([62, 255, 255])
    
    # 获取精准屏蔽遮罩
    mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # --- 边缘锐利度处理 ---
    # 轻微闭运算，保证边缘完整性
    kernel = np.ones((3,3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # 极轻微高斯模糊，消除锯齿
    mask = cv2.GaussianBlur(mask, (3, 3), 0)
    
    # 反转遮罩
    mask_inv = cv2.bitwise_not(mask)
    
    # --- 边缘去绿边 (Spill Suppression) ---
    b, g, r = cv2.split(img)
    # 抑制溢出的绿色光晕
    g = np.minimum(g, np.maximum(r, b))
    
    # 合并为 RGBA (WebP 专用透明通道)
    rgba = cv2.merge([b, g, r, mask_inv])
    
    # 推荐保存为 .webp，更小的体积，更好的透明度支持
    output_path_webp = output_path.replace('.png', '.webp')
    cv2.imwrite(output_path_webp, rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
    print(f"✨ Precise-Key [00FF00]: {os.path.basename(output_path_webp)}")

def batch_process():
    # 路径匹配
    # 指向本地待处理的资源池
    origin_dir = r"d:\GameSite\public\games\tiny-story\assets\origin"
    output_dir = r"d:\GameSite\public\games\tiny-story\assets\char"
    
    os.makedirs(output_dir, exist_ok=True)
    if not os.path.exists(origin_dir): return

    # 处理所有包含 _green 后缀的文件
    files = glob.glob(os.path.join(origin_dir, "*_green.png"))
    for f in files:
        basename = os.path.basename(f)
        new_name = basename.replace('_green.png', '.png')
        output_path = os.path.join(output_dir, new_name)
        remove_green_screen_precise(f, output_path)

if __name__ == "__main__":
    batch_process()
