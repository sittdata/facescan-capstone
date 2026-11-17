#!/usr/bin/env python3
"""Downloads CelebAMask-HQ 5,000 image benchmark subset (475MB) from Hugging Face."""

import urllib.request
from pathlib import Path
from tqdm import tqdm

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "dataset" / "celebamask_subset"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "celeba_5k_shard.parquet"

URL = "https://huggingface.co/datasets/v-xchen-v/celebamask_hq/resolve/main/data/train-00000-of-00006.parquet"


class DownloadProgressBar(tqdm):
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)


def main():
    if OUTPUT_FILE.exists() and OUTPUT_FILE.stat().st_size > 400 * 1024 * 1024:
        print(f"Dataset shard already exists at: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size / 1024**2:.1f} MB)")
        return

    print(f"Downloading CelebAMask-HQ 5,000 sample shard from: {URL}")
    print(f"Destination: {OUTPUT_FILE}")
    with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc="Downloading") as t:
        urllib.request.urlretrieve(URL, filename=OUTPUT_FILE, reporthook=t.update_to)
    print(f"Download complete: {OUTPUT_FILE.stat().st_size / 1024**2:.1f} MB")


if __name__ == "__main__":
    main()
