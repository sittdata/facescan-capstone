#!/usr/bin/env python3
"""Downloads UTKFace 326MB shard from Hugging Face for Facial Aging & Sagging Tier classification."""

import urllib.request
from pathlib import Path
from tqdm import tqdm

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "dataset" / "utkface_subset"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "utkface_shard0.parquet"

URL = "https://huggingface.co/datasets/nu-delta/utkface/resolve/main/data/train-00000-of-00003.parquet"


class DownloadProgressBar(tqdm):
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)


def main():
    if OUTPUT_FILE.exists() and OUTPUT_FILE.stat().st_size > 300 * 1024 * 1024:
        print(f"UTKFace shard already exists at: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size / 1024**2:.1f} MB)")
        return

    print(f"Downloading UTKFace 326MB shard from: {URL}")
    print(f"Destination: {OUTPUT_FILE}")
    with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc="Downloading") as t:
        urllib.request.urlretrieve(URL, filename=OUTPUT_FILE, reporthook=t.update_to)
    print(f"Download complete: {OUTPUT_FILE.stat().st_size / 1024**2:.1f} MB")


if __name__ == "__main__":
    main()
