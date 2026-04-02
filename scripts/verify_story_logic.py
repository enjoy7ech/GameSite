import os
import re

def verify_story_logic(directory):
    id_pattern = re.compile(r'\[ID:\s*([a-zA-Z0-9_/]+)\]')
    jump_pattern = re.compile(r'跳转\s+([a-zA-Z0-9_/]+)')
    
    defined_ids = set()
    referenced_jumps = []
    
    files = [f for f in os.listdir(directory) if f.endswith('.md')]
    
    for filename in files:
        path = os.path.join(directory, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # 找到所有定义
            ids = id_pattern.findall(content)
            for i in ids:
                if i in defined_ids:
                    print(f"⚠️  Duplicated ID: {i} in {filename}")
                defined_ids.add(i)
            # 找到所有引用
            jumps = jump_pattern.findall(content)
            for j in jumps:
                referenced_jumps.append((j, filename))

    # 交叉检查
    missing_ids = []
    for jump, source_file in referenced_jumps:
        if jump not in defined_ids:
            missing_ids.append((jump, source_file))
            
    if not missing_ids:
        print("✅ Success: No dead jumps found!")
    else:
        print(f"❌ Found {len(missing_ids)} Dead Jumps:")
        for missing, source in missing_ids:
            print(f"   Missing ID: [{missing}] referenced in {source}")

if __name__ == "__main__":
    STORY_DIR = r"d:\GameSite\public\games\tiny-story\design\story"
    verify_story_logic(STORY_DIR)
