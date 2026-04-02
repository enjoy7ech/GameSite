import re
import json
import os

def parse_md_to_flat_story(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 强化型节点正则：捕获 **[ID: xxx]** 元数据与正文
    # 截止于下一个 [ID: 或 --- 或 # 
    node_pattern = r"\*\*\[ID:\s*(?P<id>.*?)\]\*\*(?P<node_body>(?:.|\n)*?)(?=\n- \*\*\[ID:|\n---|\n#|$)"
    
    nodes = []
    for match in re.finditer(node_pattern, content):
        node_id = match.group('id').strip()
        body = match.group('node_body').strip()
        
        # 1. 提取核心剧情文本
        # 匹配形如 - **核心剧情 (Plot)**：文字 的行
        plot_matches = re.findall(r"\*\*核心剧情 \(Plot\)\*\*：(?P<text>.*)", body)
        
        display_frames = []
        bg_current = get_smart_bg(node_id)
        
        for p_text in plot_matches:
            # 将长文本按句子拆分，每一句视为一帧
            sentences = [s.strip() for s in re.split(r'([。！？…])', p_text.strip()) if s.strip()]
            
            # 重新合并标点
            current_s = ""
            for s in sentences:
                current_s += s
                if s in "。！？…":
                    # --- 帧封装逻辑 ---
                    frame = { "screen": None, "dialog": None, "choice": [] }
                    
                    # 语义识别：对话 vs 场景
                    dialogue_match = re.match(r"^(?P<speaker>[^：:]+)[：:](?P<content>.*)", current_s)
                    if dialogue_match:
                        frame["dialog"] = {
                            "char": dialogue_match.group('speaker').strip(),
                            "text": current_s # 保持全文本
                        }
                    else:
                        frame["screen"] = {
                            "bg": bg_current,
                            "text": current_s
                        }
                    
                    display_frames.append(frame)
                    current_s = ""

        # 2. 提取地图抉择
        choices = []
        choice_block = re.search(r"\*\*抉择 \(Map Selection\)\*\*：\n(?P<list>(?:.|\n)*?)(?=\n-|$)", body)
        if choice_block:
            for l in choice_block.group('list').split('\n'):
                m = re.search(r"\d+\.\s*(?P<label>.*?)\s*->\s*(?:.*?)跳转\s*(?P<target>\w+)", l)
                if m:
                    choices.append({ "label": m.group('label').strip(), "target": m.group('target').strip() })

        # 挂载选项到最后一帧
        if display_frames and choices:
            display_frames[-1]["choice"] = choices

        if display_frames:
            nodes.append({
                "id": node_id,
                "display": display_frames,
                "priority": 1 
            })

    return nodes

def get_smart_bg(node_id):
    if "station" in node_id: return "bg_station_day"
    if "cafe" in node_id: return "bg_cafe_day"
    if "bookstore" in node_id: return "bg_bookstore_day"
    return "bg_station_day"

# 全域扫描
if __name__ == "__main__":
    story_dir = "./public/games/tiny-story/design/story"
    all_nodes = []
    
    for file in sorted(os.listdir(story_dir)):
        if file.startswith("day") and file.endswith(".md"):
            day_nodes = parse_md_to_flat_story(os.path.join(story_dir, file))
            all_nodes.extend(day_nodes)
    
    manifest = {
        "meta": { "name": "Tiny Story", "version": "1.2-V12.1-FlatDisplay-Fixed" },
        "world": { "Station": [347, 193], "Cafe": [650, 480], "Bookstore": [470, 520] },
        "story": all_nodes
    }
    
    with open('./public/games/tiny-story/data/story.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print("✅ Story Manifest V12.0 [Flat & Sequential] Synchronized Successfully.")
