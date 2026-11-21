import os
import glob
from PIL import Image

BRAIN_DIR = r"C:\Users\sitti\.gemini\antigravity\brain\6ae16777-6477-4fc0-8567-811f3e34120a"
DEST_DIR = r"c:\Users\sitti\OneDrive\Desktop\facescan-capstone\web\public\hairstyles"

KEYS = [
    "comma_hair",
    "slick_back",
    "modern_crew",
    "pompadour_quiff",
    "french_crop",
    "chin_goatee",
    "stubble_jawline",
    "clean_shave",
    "curtain_bangs",
    "long_layers",
    "collarbone_lob",
    "soft_waves",
    "pixie_bob"
]

os.makedirs(DEST_DIR, exist_ok=True)

processed = []
for key in KEYS:
    pattern = os.path.join(BRAIN_DIR, f"{key}_*.jpg")
    matches = glob.glob(pattern)
    if not matches:
        print(f"Waiting for {key}...")
        continue
    # Pick latest
    latest_file = max(matches, key=os.path.getmtime)
    dest_path = os.path.join(DEST_DIR, f"{key}.webp")
    
    with Image.open(latest_file) as img:
        # Resize if overly large, e.g. 800x800 for web display
        img = img.convert("RGB")
        img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        img.save(dest_path, "WEBP", quality=88)
        print(f"Saved {dest_path} ({os.path.getsize(dest_path)} bytes)")
        processed.append(key)

print(f"Total processed: {len(processed)} / {len(KEYS)}")
