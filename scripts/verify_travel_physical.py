import os
import re
import math

# 1. 物理底图坐标定义 (基于 world.md)
COORDS = {
    "Home": (800, 250),
    "Station": (850, 780),
    "Bookstore": (470, 520),
    "Cafe": (400, 650),
    "Dock": (200, 480),
    "Tower": (100, 800),
    "School": (600, 150),
    "Lighthouse": (100, 200) # 假设灯塔坐标
}

# 映射名称 (中文到 ID)
NAME_MAP = {
    "姑姑家": "Home",
    "清风站": "Station",
    "风月书屋": "Bookstore",
    "潮汐咖啡厅": "Cafe",
    "咖啡馆": "Cafe",
    "咖啡厅": "Cafe",
    "旧码头": "Dock",
    "码头": "Dock",
    "后山塔楼": "Tower",
    "废弃中学": "School",
    "废弃灯塔": "Lighthouse"
}

def get_distance(l1, l2):
    p1 = COORDS.get(l1)
    p2 = COORDS.get(l2)
    if not p1 or not p2: return 0
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

def audit_travel_logic(directory):
    files = [f"day{i}.md" for i in range(1, 8)]
    
    print("📍 [Physical Travel Audit Report]\n")
    print(f"{'Source':<10} | {'Destination':<15} | {'Dist':<6} | {'TimeCost':<8} | {'Ratio(D/T)':<10}")
    print("-" * 65)

    for filename in files:
        path = os.path.join(directory, filename)
        if not os.path.exists(path): continue
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # 找到抉择块 (假设从 Home 出发，或检测之前的 Location)
            # 逻辑：前往【xxx】 -> TimeCost: +YYmin
            matches = re.findall(r'前往【(.*?)】.*?TimeCost:\s*\+(\d+)min', content)
            
            for target_name, time_cost in matches:
                target_id = NAME_MAP.get(target_name.strip())
                if not target_id: continue
                
                # 基准起始点：大部分抉择是从 Home 或是该日开头确定的地点开始
                start_id = "Home" 
                dist = get_distance(start_id, target_id)
                ratio = dist / int(time_cost) if int(time_cost) > 0 else 0
                
                status = ""
                if ratio > 15: status = "⚠️  Too Fast?"
                if ratio < 5: status = "🐌 Too Slow?"
                
                print(f"{start_id:<10} | {target_id:<15} | {int(dist):<6} | {time_cost:<8} | {ratio:<10.2f} {status}")

if __name__ == "__main__":
    STORY_DIR = r"d:\GameSite\public\games\tiny-story\design\story"
    audit_travel_logic(STORY_DIR)
