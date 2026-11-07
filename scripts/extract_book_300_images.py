#!/usr/bin/env python3
"""Render and organize page images for the 300 selected catalog artifacts."""

from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
INPUT_ROOT = ROOT.parent / "三星堆出土文物全记录（全3册）：四川省文物考古研究院等编，天地出版社2009"
EXTRACT_ROOT = ROOT.parent / "文物全记录300件提取"
SELECTION = EXTRACT_ROOT / "三星堆重要文物300件_2009全记录.jsonl"
CANDIDATES = EXTRACT_ROOT / "candidate_entries.jsonl"
RECORDS = ROOT / "data" / "artifacts" / "selected-book-300.jsonl"
IMAGE_ROOT = ROOT / "data" / "artifacts" / "images"
PAGE_CACHE = ROOT / "tmp" / "book-page-renders"
INDEX = ROOT / "data" / "artifacts" / "image-index.csv"
BOOK_NAME = "四川省文物考古研究院等编《三星堆出土文物全记录》（天地出版社，2009）"

VOLUME_FILES = {
    "青铜器": "*（青铜器）*.pdf",
    "陶器_金器": "*（陶器*金器）*.pdf",
    "玉器_石器": "*（玉器*石器）*.pdf",
}
VOLUME_SLUGS = {"青铜器": "bronze", "陶器_金器": "pottery-gold", "玉器_石器": "jade-stone"}


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def split_pages(value: object) -> list[int]:
    return [int(page) for page in str(value).split("/") if page.strip().isdigit()]


def numeric_catalog(value: str) -> tuple[int, int]:
    match = re.search(r"\d+", value)
    return (int(match.group()), len(value)) if match else (10**9, len(value))


def page_crop(image: Image.Image, volume: str, page: int, catalog_number: str, candidates: list[dict]) -> tuple[Image.Image, str]:
    # A single-entry catalog page is cropped to the photographed panel, leaving
    # the printed caption outside the image area. Pages with 2–3 entries are
    # laid out as horizontal bands; dense plate pages remain full-page images
    # so that no crop is assigned to the wrong artifact.
    page_rows = [row for row in candidates if row["volume"] == volume and int(row["pdf_page"]) == page]
    unique_numbers = {str(row["catalog_number"]) for row in page_rows}
    w, h = image.size
    if len(page_rows) <= 1:
        return image.crop((0, 0, w, round(h * 0.90))), "photo_panel"
    if len(page_rows) <= 3 and len(unique_numbers) <= 3:
        ordered = sorted(page_rows, key=lambda row: numeric_catalog(str(row["catalog_number"])))
        same_number_count = sum(str(row["catalog_number"]) == catalog_number for row in ordered)
        if same_number_count > 1:
            return image.crop((0, 0, w, round(h * 0.92))), "multiple_views_same_entry"
        positions = [i for i, row in enumerate(ordered) if str(row["catalog_number"]) == catalog_number]
        if positions:
            n = len(ordered)
            top_margin = 0.04 if n == 3 else 0.03
            top = 0 if positions[0] == 0 else round(h * (0.92 * positions[0] / n + top_margin))
            bottom = round(h * 0.92 * (positions[0] + 1) / n) if positions[0] < n - 1 else round(h * 0.92)
            return image.crop((0, top, w, bottom)), "vertical_entry_panel"
    return image.crop((0, 0, w, round(h * 0.96))), "full_catalog_plate"


def main() -> None:
    pdftoppm = shutil.which("pdftoppm")
    if not pdftoppm:
        raise SystemExit("Poppler pdftoppm was not found on PATH")
    selection = read_jsonl(SELECTION)
    candidates = read_jsonl(CANDIDATES)
    records = read_jsonl(RECORDS)
    record_by_id = {row["id"]: row for row in records}
    selected_by_id = {f"book-2009-{row['rank']:03d}": row for row in selection}
    candidates_by_page: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for row in candidates:
        candidates_by_page[(row["volume"], int(row["pdf_page"]))].append(row)

    pdfs = {}
    for volume, pattern in VOLUME_FILES.items():
        matches = list(INPUT_ROOT.glob(pattern))
        if len(matches) != 1:
            raise ValueError(f"Expected one source PDF for {volume}, found {len(matches)}")
        pdfs[volume] = matches[0]

    pages_by_volume: dict[str, set[int]] = defaultdict(set)
    for row in selection:
        pages_by_volume[row["category_volume"]].update(split_pages(row["pdf_page"]))
    PAGE_CACHE.mkdir(parents=True, exist_ok=True)
    IMAGE_ROOT.mkdir(parents=True, exist_ok=True)

    rendered: dict[tuple[str, int], Path] = {}
    for volume, pages in pages_by_volume.items():
        slug = VOLUME_SLUGS[volume]
        prefix = PAGE_CACHE / slug
        ordered = sorted(pages)
        spans: list[list[int]] = []
        for page in ordered:
            if spans and page == spans[-1][1] + 1:
                spans[-1][1] = page
            else:
                spans.append([page, page])
        for start, end in spans:
            expected = [PAGE_CACHE / f"{slug}-{page}.jpg" for page in range(start, end + 1)]
            if not all(path.exists() for path in expected):
                subprocess.run([
                    pdftoppm, "-f", str(start), "-l", str(end), "-r", "150",
                    "-jpeg", "-jpegopt", "quality=90", str(pdfs[volume]), str(prefix),
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for page in range(start, end + 1):
                output = PAGE_CACHE / f"{slug}-{page}.jpg"
                if not output.exists():
                    output = PAGE_CACHE / f"{slug}-{page:03}.jpg"
                if not output.exists():
                    raise FileNotFoundError(f"Rendered PDF page not found: {volume} page {page}")
                rendered[(volume, page)] = output

    rows_out = []
    for selection_row in selection:
        artifact_id = f"book-2009-{selection_row['rank']:03d}"
        record = record_by_id[artifact_id]
        volume = selection_row["category_volume"]
        catalog_number = str(selection_row["book_catalog_number"])
        pages = split_pages(selection_row["pdf_page"])
        page_crops = []
        crop_methods = []
        for page in pages:
            with Image.open(rendered[(volume, page)]) as image:
                crop, method = page_crop(image, volume, page, catalog_number, candidates)
                page_crops.append(crop.copy())
                crop_methods.append(method)
        if len(page_crops) == 1:
            final_image = page_crops[0]
        else:
            height = max(image.height for image in page_crops)
            resized = []
            for image in page_crops:
                width = round(image.width * height / image.height)
                resized.append(image.resize((width, height), Image.Resampling.LANCZOS))
            final_image = Image.new("RGB", (sum(image.width for image in resized), height), "white")
            x = 0
            for image in resized:
                final_image.paste(image, (x, 0))
                x += image.width
        if final_image.mode != "RGB":
            final_image = final_image.convert("RGB")
        filename = f"{artifact_id}.jpg"
        destination = IMAGE_ROOT / filename
        final_image.save(destination, "JPEG", quality=88, optimize=True, progressive=True)
        pages_text = "/".join(str(page) for page in pages)
        printed_text = str(selection_row["printed_page"])
        url = f"/data/artifacts/images/{filename}"
        record["media"] = [{
            "media_type": "image",
            "url": url,
            "creator": "图录扫描页截图（本地 PDF）",
            "rights_holder": None,
            "license": "待核实",
            "rights_status": "unknown",
            "attribution": (
                f"来源：{BOOK_NAME}，{volume}卷，书内第{printed_text}页，扫描PDF第{pages_text}页。"
                + ("整页图版截图，画面含同页其他器物。" if "full_catalog_plate" in crop_methods else "图片为图录页面截取。")
            ),
        }]
        rows_out.append({
            "artifact_id": artifact_id,
            "name": record["name"],
            "category": record["category"],
            "image_path": url,
            "source_volume": volume,
            "printed_page": printed_text,
            "pdf_page": pages_text,
            "crop_method": "+".join(crop_methods),
            "note": "单件图录页裁图" if all(method != "full_catalog_plate" for method in crop_methods) else "整页图版截图，含同页其他器物，便于回查定位",
        })

    RECORDS.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in records), encoding="utf-8")
    with INDEX.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows_out[0]))
        writer.writeheader()
        writer.writerows(rows_out)
    total_bytes = sum(path.stat().st_size for path in IMAGE_ROOT.glob("*.jpg"))
    page_only = sum("full_catalog_plate" in row["crop_method"] for row in rows_out)
    print(f"Saved {len(rows_out)} images to {IMAGE_ROOT}")
    print(f"Full catalog plate screenshots (dense pages): {page_only}")
    print(f"Total image size: {total_bytes / (1024 * 1024):.1f} MiB")
    print(f"Index: {INDEX}")


if __name__ == "__main__":
    main()
