#!/usr/bin/env python3
"""Build a provenance-preserving, local RAG corpus from available Sanxingdui sources.

The source PDFs are scanned images. This builder uses the existing per-page OCR for
the 2009 catalog volumes, plus structured artifact and evidence records. It does not
copy PDFs or treat unreviewed OCR as verified fact.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "rag"
OCR_ROOT = ROOT.parent / "文物全记录300件提取"
CATALOG_ROOT = ROOT.parent / "三星堆出土文物全记录（全3册）：四川省文物考古研究院等编，天地出版社2009"

VOLUMES = {
    "bronze": {
        "title": "三星堆出土文物全记录·青铜器",
        "volume": "青铜器",
        "pdf_name_contains": "青铜器",
        "ocr_file": "ocr_青铜器.jsonl",
        "pdf_pages": 302,
    },
    "pottery-gold": {
        "title": "三星堆出土文物全记录·陶器、金器",
        "volume": "陶器·金器",
        "pdf_name_contains": "陶器",
        "ocr_file": "ocr_陶器_金器.jsonl",
        "pdf_pages": 211,
    },
    "jade-stone": {
        "title": "三星堆出土文物全记录·玉器、石器",
        "volume": "玉器·石器",
        "pdf_name_contains": "玉器",
        "ocr_file": "ocr_玉器_石器.jsonl",
        "pdf_pages": 280,
    },
}

CATEGORY_TO_VOLUME = {
    "青铜器": "bronze",
    "陶器": "pottery-gold",
    "金器": "pottery-gold",
    "玉器": "jade-stone",
    "石器": "jade-stone",
}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {error}") from error
    return rows


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def relative_path(path: Path) -> str:
    return Path(os.path.relpath(path, ROOT)).as_posix()


def volume_pdf(volume_id: str) -> Path | None:
    token = VOLUMES[volume_id]["pdf_name_contains"]
    matches = [path for path in CATALOG_ROOT.glob("*.pdf") if token in path.name]
    return matches[0] if matches else None


def catalog_source_documents() -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    for volume_id, meta in VOLUMES.items():
        pdf = volume_pdf(volume_id)
        ocr_path = OCR_ROOT / meta["ocr_file"]
        documents.append({
            "document_id": f"sxd-book-2009-{volume_id}",
            "title": meta["title"],
            "document_type": "illustrated_artifact_catalog",
            "publisher": "天地出版社；四川省文物考古研究院等编",
            "publication_year": 2009,
            "local_pdf_path": relative_path(pdf) if pdf else None,
            "pdf_url": None,
            "landing_page_url": None,
            "availability": "local_scanned_pdf" if pdf else "missing_local_pdf",
            "pdf_page_count": meta["pdf_pages"],
            "text_layer_status": "image_only_no_extractable_text",
            "ocr_status": "machine_ocr_unreviewed" if ocr_path.exists() else "ocr_missing",
            "ocr_source_path": relative_path(ocr_path) if ocr_path.exists() else None,
            "citation_policy": "Cite printed page when mapped; always retain PDF page. OCR is discovery text, verify against scan before asserting.",
            "rights_status": "unknown",
            "record_status": "needs_review",
        })

    sacrificial_pdf = ROOT.parent / "59700-三星堆祭祀坑" / "三星堆祭祀坑.pdf"
    documents.append({
        "document_id": "sxd-book-sacrificial-pits-local-scan",
        "title": "三星堆祭祀坑（本地扫描 PDF；书目信息待核）",
        "document_type": "excavation_catalog_or_monograph",
        "publisher": None,
        "publication_year": None,
        "local_pdf_path": relative_path(sacrificial_pdf) if sacrificial_pdf.exists() else None,
        "pdf_url": None,
        "landing_page_url": None,
        "availability": "local_scanned_pdf" if sacrificial_pdf.exists() else "missing_local_pdf",
        "pdf_page_count": 633 if sacrificial_pdf.exists() else None,
        "text_layer_status": "image_only_no_extractable_text",
        "ocr_status": "ocr_not_available",
        "ocr_source_path": None,
        "citation_policy": "Do not retrieve until OCR is created and checked; confirm title page, publisher, year, and printed-to-PDF page mapping first.",
        "rights_status": "unknown",
        "record_status": "needs_review",
    })
    return documents


def report_documents() -> list[dict[str, Any]]:
    rows = read_jsonl(ROOT / "data" / "archaeology" / "reports.jsonl")
    documents = []
    for report in rows:
        documents.append({
            "document_id": report["id"],
            "title": report["name"],
            "document_type": report.get("report_type", "archaeological_report"),
            "publisher": next((source.get("publisher") for source in report.get("sources", []) if source.get("publisher")), None),
            "publication_year": (report.get("publication") or {}).get("year"),
            "local_pdf_path": None,
            "pdf_url": report.get("full_text_url"),
            "landing_page_url": report.get("landing_page_url"),
            "availability": "remote_pdf_not_ingested" if report.get("full_text_url") else "landing_page_only",
            "pdf_page_count": None,
            "text_layer_status": "not_checked",
            "ocr_status": "not_ingested",
            "ocr_source_path": None,
            "citation_policy": "Use the report's printed page and PDF page from verified extraction; preserve report edition and statistical scope.",
            "rights_status": "unknown",
            "record_status": report.get("record_status", "needs_review"),
        })
    return documents


def artifact_chunks() -> list[dict[str, Any]]:
    records = read_jsonl(ROOT / "data" / "artifacts" / "selected-book-300.jsonl")
    chunks = []
    for record in records:
        period = record.get("period") or {}
        discovery = record.get("discovery") or {}
        dimensions = record.get("dimensions") or {}
        source = (record.get("sources") or [{}])[0]
        values = [
            f"器名：{record.get('name')}",
            f"类别：{record.get('category')}" if record.get("category") else None,
            f"别名：{'、'.join(record.get('alternate_names') or [])}" if record.get("alternate_names") else None,
            f"出土编号：{record.get('museum_inventory_number')}" if record.get("museum_inventory_number") else None,
            f"材质/工艺：{'、'.join(record.get('materials_and_techniques') or [])}" if record.get("materials_and_techniques") else None,
            f"年代：{period.get('label') or '待核实'}" if any(period.get(k) for k in ("label", "start_year", "end_year")) else None,
            f"尺寸：{dimensions.get('value')} {dimensions.get('unit') or ''}" if dimensions.get("value") else None,
            f"出土地：{discovery.get('context')}" if discovery.get("context") else None,
            f"出土单位：{discovery.get('excavation_unit')}" if discovery.get("excavation_unit") else None,
            f"记录说明：{record.get('description')}" if record.get("description") else None,
        ]
        volume_id = CATEGORY_TO_VOLUME.get(record.get("category"))
        chunks.append({
            "chunk_id": f"artifact-{record['id']}",
            "chunk_type": "structured_catalog_entry",
            "document_id": f"sxd-book-2009-{volume_id}" if volume_id else None,
            "content": "\n".join(value for value in values if value),
            "source_locator": source.get("locator"),
            "source_id": source.get("source_id"),
            "artifact_ids": [record["id"]],
            "context_ids": [],
            "record_status": record.get("record_status", "needs_review"),
            "extraction_status": "curated_from_catalog_ocr_needs_page_review",
            "retrieval_tier": "structured_reference",
            "caveats": ["300件图录精选记录均待逐页复核。", "未知字段不补造；图录页截图不等同于馆藏实物照片。"],
        })
    return chunks


def printed_page_map(records: list[dict[str, Any]]) -> dict[tuple[str, int], int]:
    result: dict[tuple[str, int], int] = {}
    locator_pattern = re.compile(r"(?:扫描)?PDF第\s*(\d+)页")
    printed_pattern = re.compile(r"书内第\s*(\d+)页")
    for record in records:
        volume_id = CATEGORY_TO_VOLUME.get(record.get("category"))
        if not volume_id:
            continue
        for source in record.get("sources", []):
            locator = source.get("locator") or ""
            pdf_match = locator_pattern.search(locator)
            printed_match = printed_pattern.search(locator)
            if pdf_match and printed_match:
                result[(volume_id, int(pdf_match.group(1)))] = int(printed_match.group(1))
    return result


def split_page(text: str, limit: int = 900, overlap: int = 100) -> list[str]:
    text = re.sub(r"[ \t\r\f\v]+", " ", text).strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    if len(text) <= limit:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + limit, len(text))
        if end < len(text):
            boundary = max(text.rfind("\n", start, end), text.rfind("。", start, end), text.rfind("；", start, end))
            if boundary > start + limit // 2:
                end = boundary + (1 if text[boundary] in "。；" else 0)
        part = text[start:end].strip()
        if part:
            chunks.append(part)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def ocr_chunks(artifacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    page_map = printed_page_map(artifacts)
    chunks = []
    for volume_id, meta in VOLUMES.items():
        rows = read_jsonl(OCR_ROOT / meta["ocr_file"])
        for row in rows:
            page = int(row.get("page", 0))
            raw_text = row.get("text") or ""
            parts = split_page(raw_text)
            if not parts or sum(len(part) for part in parts) < 25:
                continue
            related_ids = []
            for record in artifacts:
                if CATEGORY_TO_VOLUME.get(record.get("category")) != volume_id:
                    continue
                for source in record.get("sources", []):
                    match = re.search(r"(?:扫描)?PDF第\s*(\d+)页", source.get("locator") or "")
                    if match and int(match.group(1)) == page:
                        related_ids.append(record["id"])
                        break
            for part_index, content in enumerate(parts, start=1):
                printed_page = page_map.get((volume_id, page))
                locator = f"{meta['volume']}卷，PDF第{page}页"
                if printed_page is not None:
                    locator = f"{meta['volume']}卷，书内第{printed_page}页（PDF第{page}页）"
                chunks.append({
                    "chunk_id": f"ocr-{volume_id}-p{page:04d}-c{part_index:02d}",
                    "chunk_type": "raw_ocr_page",
                    "document_id": f"sxd-book-2009-{volume_id}",
                    "content": content,
                    "source_locator": locator,
                    "page": {"pdf_page": page, "printed_page": printed_page},
                    "artifact_ids": related_ids,
                    "context_ids": [],
                    "record_status": "needs_review",
                    "extraction_status": "machine_ocr_unreviewed",
                    "retrieval_tier": "fallback_ocr",
                    "ocr_char_count": len(content),
                    "caveats": ["扫描图版 OCR 可能误识、漏字或混入图注；仅用于召回线索，回答前应核对 PDF 原页。"],
                })
    return chunks


def qa_chunks() -> list[dict[str, Any]]:
    records = read_jsonl(ROOT / "data" / "qa" / "knowledge.jsonl")
    report_rows = read_jsonl(ROOT / "data" / "archaeology" / "reports.jsonl")
    source_to_doc = {
        source.get("source_id"): report["id"]
        for report in report_rows
        for source in report.get("sources", [])
    }
    chunks = []
    for record in records:
        evidence = []
        document_ids = []
        for item in record.get("evidence", []):
            doc_id = source_to_doc.get(item.get("source_id"))
            if doc_id:
                document_ids.append(doc_id)
            evidence.append({
                **item,
                "document_id": doc_id,
            })
        content = f"问题：{record['question']}\n答案：{record['answer']}"
        if record.get("caveats"):
            content += "\n回答限制：" + "；".join(record["caveats"])
        chunks.append({
            "chunk_id": f"qa-{record['id']}",
            "chunk_type": "evidence_grounded_qa",
            "document_id": document_ids[0] if document_ids else None,
            "document_ids": sorted(set(document_ids)),
            "content": content,
            "evidence": evidence,
            "artifact_ids": record.get("related_artifact_ids", []),
            "context_ids": record.get("related_context_ids", []),
            "record_status": record.get("status", "needs_review"),
            "extraction_status": "editorial_paraphrase_with_page_citations",
            "retrieval_tier": "high_precision_answer_unit",
            "answer_kind": record.get("answer_kind"),
            "caveats": record.get("caveats", []),
        })
    return chunks


def main() -> None:
    artifacts = read_jsonl(ROOT / "data" / "artifacts" / "selected-book-300.jsonl")
    documents = catalog_source_documents() + report_documents()
    chunks = artifact_chunks() + qa_chunks() + ocr_chunks(artifacts)
    write_jsonl(OUT / "documents.jsonl", documents)
    write_jsonl(OUT / "chunks.jsonl", chunks)
    print(f"Documents: {len(documents)}")
    print(f"Chunks: {len(chunks)} (artifacts={len(artifacts)}, qa={len(read_jsonl(ROOT / 'data' / 'qa' / 'knowledge.jsonl'))}, OCR pages={sum(chunk['chunk_type'] == 'raw_ocr_page' for chunk in chunks)})")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
