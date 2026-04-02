import os
import re

# 物理统一耗时 (基于 Home 为起点的 10px=1min)
TIME_MAP = {
    "Bookstore": 45,
    "Station": 55,
    "Cafe": 60,
    "Dock": 65,
    "School": 25,
    "Tower": 90,
    "Lighthouse": 70
}

def fix_travel_times(directory):
    files = [f"day{i}.md" for i in range(1, 8)]
    
    for filename in files:
        path = os.path.join(directory, filename)
        if not os.path.exists(path): continue
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 检测是否为暴雨天 (Day 3)
        multiplier = 1.0
        if filename == "day3.md":
            multiplier = 1.5
            
        new_content = content
        
        # 逐个替换地点的 TimeCost
        # 查找模式: [Jump @ Location: XXX | TimeCost: +YYmin
        for loc, base_time in TIME_MAP.items():
            final_time = int(base_time * multiplier)
            # 正则匹配并替换该地点的所有 TimeCost
            pattern = rf'(Jump @ Location: {loc} \| TimeCost:\s*\+)(\d+)(min)'
            new_content = re.sub(pattern, rf'\g<1>{final_time}\g<3>', new_content)
            
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"🔧 Synchronized travel times in {filename} (Multiplier: {multiplier})")

if __name__ == "__main__":
    STORY_DIR = r"d:\GameSite\public\games\tiny-story\design\story"
    fix_travel_times(STORY_DIR)
