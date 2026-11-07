#!/usr/bin/env python3
"""Convert the selected 300 catalog entries and OCR captions to artifact records."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT.parent / "文物全记录300件提取"
SELECTION = EXTRACT / "三星堆重要文物300件_2009全记录.jsonl"
CANDIDATES = EXTRACT / "candidate_entries.jsonl"
OUT = ROOT / "data" / "artifacts" / "selected-book-300.jsonl"
BOOK_TITLE = "四川省文物考古研究院等编《三星堆出土文物全记录》（天地出版社，2009）"
SOURCE_URL = "https://www.sckg.com/"


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def norm(value: str | None) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value or "")).replace("：", ":")


def category_and_material(name: str, volume: str) -> tuple[str, list[str]]:
    name = unicodedata.normalize("NFKC", name)
    if "青铜" in volume or "铜器" in volume:
        return "青铜器", ["青铜"]
    if "陶器" in volume or "金器" in volume:
        if "金" in name:
            return "金器", ["金"]
        return "陶器", ["陶"]
    if "玉器" in volume or "石器" in volume:
        if "石" in name and "玉" not in name:
            return "石器", ["石"]
        return "玉器", ["玉石"]
    return "其他", []


def pit_from_inventory(inventory: str | None) -> str | None:
    match = re.search(r"K\s*([1-8])", inventory or "", flags=re.IGNORECASE)
    if not match:
        return None
    digits = "一二三四五六七八"
    return f"{digits[int(match.group(1)) - 1]}号祭祀坑"


def clean_caption(caption: str, catalog_number: str, name: str, inventory: str | None) -> str:
    text = unicodedata.normalize("NFKC", caption or "")
    text = text.replace("\r", "").replace("\n", "")
    text = re.sub(r"\s+", "", text)
    # Catalog captions begin "number.name，inventory，description". Remove
    # the two catalog fields; they are already represented as structured data.
    text = re.sub(r"^\d+[.、．]", "", text)
    text = re.sub(r"^[^，,]*[，,]", "", text, count=1)
    text = re.sub(r"^[^，,]*[，,]", "", text, count=1)
    measure = r"(?:通高|残高|高|宽|直径|口径|底径|长|径|厚|重)\s*[\d.]+"
    text = re.sub(rf"{measure}(?:[，、,；;]{measure})*(?:厘米|公分|毫米|克|千克|公斤)?", "", text)
    text = re.sub(r"[（(](?:正视|俯视|外观|内部)[）)]", "", text)
    text = text.replace("仅供个人科研教学使用", "")
    text = text.replace("!", "").replace("|", "")
    text = re.sub(r"\d{1,4}$", "", text)
    text = re.sub(r"^[，,。；;：:、\s]+|[，,。；;：:、\s]+$", "", text)
    text = text.replace(",", "，").replace(";", "；")
    text = re.sub(r"[，；]{2,}", "，", text)
    text = re.sub(r"[。]{2,}", "。", text)
    return text


def make_description(name: str, category: str, inventory: str | None, caption: str) -> str:
    facts = []
    if inventory:
        facts.append(f"图录所载出土编号为{inventory}")
    if caption:
        return f"{name}是三星堆遗址出土的{category}。" + ("；".join(facts) + "。" if facts else "") + caption + "。"
    return f"{name}是《三星堆出土文物全记录》著录的三星堆遗址{category}。" + ("图录所载出土编号为" + inventory + "。" if inventory else "") + "图注未识别到形态描述，建议对照原书扫描页核读。"


def main() -> None:
    selected = read_jsonl(SELECTION)
    candidates = read_jsonl(CANDIDATES)
    candidate_index: dict[tuple[str, str], list[dict]] = defaultdict(list)
    candidate_pages: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in candidates:
        candidate_index[(row["volume"], str(row["catalog_number"]))].append(row)
        candidate_pages[(row["volume"], str(row["pdf_page"]))].append(row)

    records = []
    missing_captions: list[str] = []
    for row in selected:
        volume = row["category_volume"]
        number = str(row["book_catalog_number"])
        numbers = number.split("/")
        matches = [item for item_number in numbers for item in candidate_index.get((volume, item_number), [])]
        if not matches:
            pages = str(row.get("pdf_page", "")).split("/")
            matches = [item for page in pages for item in candidate_pages.get((volume, page), [])]
        # Prefer a candidate that agrees with the selected spelling/inventory.
        candidate = next((item for item in matches if norm(item["name"]) == norm(row["name"])), None)
        if candidate is None:
            candidate = next((item for item in matches if norm(item.get("inventory_number")) == norm(row.get("inventory_number"))), None)
        if candidate is None and matches:
            candidate = matches[0]

        name = unicodedata.normalize("NFKC", row["name"]).strip()
        category, materials = category_and_material(name, volume)
        inventory = row.get("inventory_number")
        pit = pit_from_inventory(inventory)
        caption_parts = matches if len(numbers) > 1 else ([candidate] if candidate else [])
        caption = "；".join(dict.fromkeys(filter(None, (
            clean_caption(item.get("ocr_caption", ""), str(item.get("catalog_number", number)), item.get("name", name), item.get("inventory_number"))
            for item in caption_parts
        ))))
        if not caption:
            missing_captions.append(f"{volume}/{number}/{name}")

        dimensions = "、".join(row.get("dimensions_tokens") or []) or None
        page = row["printed_page"]
        pdf_page = row["pdf_page"]
        source_id = f"book-2009-{number}-{row['rank']:03d}"
        record = {
            "id": f"book-2009-{row['rank']:03d}",
            "slug": f"book-2009-{row['rank']:03d}",
            "name": name,
            "alternate_names": [],
            "museum_inventory_number": inventory or None,
            "collection_institution": None,
            "field_conflicts": [],
            "category": category,
            "period": {"label": None, "start_year": None, "end_year": None, "dating_basis": None},
            "materials_and_techniques": materials,
            "dimensions": {"value": dimensions, "unit": "厘米" if dimensions else None, "measurement_note": "按原书图注保留尺寸片段；扫描 OCR 结果需对照原页复核" if dimensions else None},
            "discovery": {
                "site_id": "sanxingdui-site",
                "context": "四川广汉三星堆遗址",
                "date_or_period": None,
                "excavation_unit": pit,
            },
            "description": make_description(name, category, inventory, caption),
            "interpretations": [],
            "catalog_motifs": [],
            "record_scope": "individual",
            "quantity": None,
            "sources": [{
                "source_id": source_id,
                "url": SOURCE_URL,
                "title": BOOK_TITLE,
                "publisher": "天地出版社",
                "published_at": "2009",
                "accessed_at": "2026-10-18",
                "locator": f"{volume}卷，图录编号{number}，书内第{page}页（扫描PDF第{pdf_page}页）；来源为本地扫描图录，官网链接仅作编者机构入口",
                "supports": ["name", "museum_inventory_number", "category", "materials_and_techniques", "dimensions", "discovery.context", "discovery.excavation_unit", "description"],
                "source_type": "academic_publication",
            }],
            "media": [],
            "record_status": "needs_review",
            "extraction_scope": "detail_page",
            "last_verified_at": None,
        }
        records.append(record)

    if len(records) != 300:
        raise ValueError(f"Expected 300 selected rows, got {len(records)}")
    if len({record["id"] for record in records}) != 300:
        raise ValueError("Generated artifact IDs are not unique")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    print(f"Wrote {len(records)} structured artifacts to {OUT}")
    print(f"Descriptions with catalog prose: {300 - len(missing_captions)}; fallback descriptions: {len(missing_captions)}")
    if missing_captions:
        print("Review OCR caption matches for:")
        for entry in missing_captions:
            print(f"- {entry}")


if __name__ == "__main__":
    main()
