import cv2
import numpy as np
import os

def remove_green_screen_plus(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    # 读取图片 (保持高精度)
    img = cv2.imread(input_path)
    # 将 BGR 转为 HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # 精细化绿幕色值范围
    lower_green = np.array([35, 45, 45])
    upper_green = np.array([85, 255, 255])
    
    # 创建掩膜
    mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # 形态学去噪 (去除细小杂色点)
    kernel = np.ones((1, 1), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=1)
    mask_inv = cv2.bitwise_not(mask)
    
    # 转换为带透明通道的图
    b, g, r = cv2.split(img)
    rgba = [b, g, r, mask_inv]
    result = cv2.merge(rgba, 4)
    
    # 导出文件
    cv2.imwrite(output_path, result)
    print(f"✨ 导出成功！透明立绘已保存至: {output_path}")

if __name__ == "__main__":
    remove_green_screen_plus(r'd:\GameSite\public\games\tiny-story\assets\haruno_greenscreen_test.png', 
                             r'd:\GameSite\public\games\tiny-story\assets\haruno_no_bg.png')
