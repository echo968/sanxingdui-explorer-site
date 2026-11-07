#!/usr/bin/env python
"""OCR only PDF pages that have no extracted or existing OCR text."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from rapidocr import RapidOCR


ROOT = Path(__file__).resolve().parents[1]
RAG_DIR = ROOT / "rag"
PDF_DIR = Path(os.environ.get("RAG_PDF_DIR", ROOT.parent / "pdf")).resolve()
PAGES_PATH = RAG_DIR / "pdf_pages.jsonl"
DOCUMENTS_PATH = RAG_DIR / "pdf_documents.jsonl"
OCR_PATH = RAG_DIR / "ocr_pages.jsonl"
TMP_DIR = ROOT / "tmp" / "pdf_ocr"
PDFTOPPM = os.environ.get("PDFTOPPM_PATH", "pdftoppm")
MODEL_ID = "RapidOCR PP-OCRv6 small"
MIN_CHARS = 25
RENDER_DPI = int(os.environ.get("RAG_OCR_DPI", "200"))


def read_jsonl(file_path):
    if not file_path.exists():
        return []
    rows = []
    with file_path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise RuntimeError(f"Invalid JSONL at {file_path}:{line_number}: {error}") from error
    return rows


def write_jsonl_atomic(file_path, rows):
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = file_path.with_suffix(file_path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp_path, file_path)


def cluster_pages(numbers, max_span=12, max_gap=2):
    groups = []
    for number in sorted(numbers):
        if not groups or number - groups[-1][-1] > max_gap or number - groups[-1][0] >= max_span:
            groups.append([number])
        else:
            groups[-1].append(number)
    return groups


def page_number_from_image(file_path):
    match = re.search(r"-(\d+)\.png$", file_path.name, re.IGNORECASE)
    if not match:
        raise RuntimeError(f"Cannot parse rendered PDF page number from {file_path.name}")
    return int(match.group(1))


def recognize(engine, image_path):
    output = engine(str(image_path))
    texts = list(output.txts or [])
    scores = list(output.scores or [])
    content = "\n".join(text.strip() for text in texts if text and text.strip()).strip()
    confidence = sum(float(value) for value in scores) / len(scores) if scores else None
    return content, confidence, len(scores)


def main():
    parser = argparse.ArgumentParser(description="OCR missing text pages in the local Sanxingdui PDF corpus.")
    parser.add_argument("--force", action="store_true", help="Re-run OCR for all current OCR-required pages.")
    parser.add_argument("--dpi", type=int, default=RENDER_DPI, help="PDF rendering DPI (default: 200).")
    parser.add_argument("--limit", type=int, default=0, help="Process at most this many pages; 0 means all pending pages.")
    args = parser.parse_args()

    page_rows = read_jsonl(PAGES_PATH)
    documents = {row["document_id"]: row for row in read_jsonl(DOCUMENTS_PATH)}
    existing_ocr_rows = [] if args.force else read_jsonl(OCR_PATH)
    ocr_results = {(row["document_id"], int(row["pdf_page"])): row for row in existing_ocr_rows}
    targets_by_document = {}
    for row in page_rows:
        if row.get("extraction_status") != "ocr_required":
            continue
        key = (row["document_id"], int(row["pdf_page"]))
        if key in ocr_results:
            continue
        targets_by_document.setdefault(row["document_id"], []).append(key[1])

    pending_count = sum(len(numbers) for numbers in targets_by_document.values())
    if args.limit > 0:
        remaining = args.limit
        for document_id in list(targets_by_document):
            selected = targets_by_document[document_id][:remaining]
            targets_by_document[document_id] = selected
            remaining -= len(selected)
            if remaining <= 0:
                for later_id in list(targets_by_document)[list(targets_by_document).index(document_id) + 1:]:
                    targets_by_document[later_id] = []
                break
        pending_count = sum(len(numbers) for numbers in targets_by_document.values())

    if not pending_count:
        print("没有待处理的 OCR 页面。")
        return
    if shutil.which(PDFTOPPM) is None:
        raise RuntimeError(f"找不到 Poppler pdftoppm：{PDFTOPPM}。请设置 PDFTOPPM_PATH。")

    print(f"待 OCR 页面：{pending_count}；渲染分辨率：{args.dpi} DPI；输出：{OCR_PATH}", flush=True)
    engine = RapidOCR()
    done = 0
    started = time.time()

    for document_id, numbers in targets_by_document.items():
        if not numbers:
            continue
        document = documents.get(document_id)
        if not document:
            raise RuntimeError(f"pdf_documents.jsonl 缺少 document_id：{document_id}")
        pdf_path = (ROOT / document["local_pdf_path"]).resolve()
        if not pdf_path.is_file():
            raise RuntimeError(f"找不到源 PDF：{pdf_path}")
        for group in cluster_pages(numbers):
            first_page, last_page = group[0], group[-1]
            work_dir = TMP_DIR / document_id / f"p{first_page:04d}-{last_page:04d}"
            if work_dir.exists():
                shutil.rmtree(work_dir)
            work_dir.mkdir(parents=True, exist_ok=True)
            prefix = work_dir / "page"
            command = [PDFTOPPM, "-f", str(first_page), "-l", str(last_page), "-r", str(args.dpi), "-png", "-forcenum", str(pdf_path), str(prefix)]
            rendered = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
            if rendered.returncode != 0:
                raise RuntimeError(f"pdftoppm failed for {pdf_path.name} pages {first_page}-{last_page}: {rendered.stderr[-1200:]}")
            images = {}
            for image_path in work_dir.glob("page-*.png"):
                images[page_number_from_image(image_path)] = image_path
            for page_number in group:
                image_path = images.get(page_number)
                content, confidence, boxes = recognize(engine, image_path) if image_path else ("", None, 0)
                usable = len(re.sub(r"\s", "", content)) >= MIN_CHARS
                ocr_results[(document_id, page_number)] = {
                    "document_id": document_id,
                    "pdf_page": page_number,
                    "content": content if usable else "",
                    "extraction_method": "machine_ocr",
                    "extraction_status": "machine_ocr_unreviewed" if usable else "ocr_no_text",
                    "record_status": "needs_review",
                    "confidence": round(confidence, 5) if confidence is not None else None,
                    "detected_regions": boxes,
                    "engine": MODEL_ID,
                    "render_dpi": args.dpi,
                    "source_pdf": document["local_pdf_path"],
                }
                done += 1
                if done % 25 == 0 or done == pending_count:
                    print(f"OCR 进度 {done}/{pending_count}；可用文本页 {sum(row['extraction_status'] == 'machine_ocr_unreviewed' for row in ocr_results.values())}", flush=True)
                if done % 25 == 0 or done == pending_count:
                    write_jsonl_atomic(OCR_PATH, sorted(ocr_results.values(), key=lambda row: (row["document_id"], row["pdf_page"])))
            shutil.rmtree(work_dir, ignore_errors=True)

    write_jsonl_atomic(OCR_PATH, sorted(ocr_results.values(), key=lambda row: (row["document_id"], row["pdf_page"])))
    shutil.rmtree(TMP_DIR, ignore_errors=True)
    recognized = sum(row["extraction_status"] == "machine_ocr_unreviewed" for row in ocr_results.values())
    print(f"完成 OCR：{done}/{pending_count} 页；本次累计可用文本页 {recognized}；耗时 {time.time() - started:.1f}s。", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("收到中断；已完成批次保存在 OCR JSONL 中，下次运行会续做。", file=sys.stderr, flush=True)
        raise SystemExit(130)
    except Exception as error:
        print(f"PDF OCR 失败：{error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
