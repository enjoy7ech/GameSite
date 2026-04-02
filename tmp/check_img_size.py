from PIL import Image
try:
    img = Image.open(r"C:\Users\Denzel\.gemini\antigravity\brain\5e9715f5-954c-45f3-b984-ce4055a54fd0\media__1774937845294.jpg")
    print(f"Size: {img.size}")
except Exception as e:
    print(e)
