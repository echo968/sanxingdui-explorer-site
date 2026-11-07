#!/usr/bin/env python3
"""Copy the project's research data into the static site's public data folder."""

from __future__ import annotations

import json
import shutil
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data"
DESTINATION = ROOT / "dist" / "data"


def count_jsonl_records(path: Path) -> int | None:
    if path.suffix.lower() != ".jsonl":
        return None
    count = 0
    with path.open("r", encoding="utf-8-sig") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            try:
                json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {error}") from error
            count += 1
    return count


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f"Source data directory not found: {SOURCE}")

    DESTINATION.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    for source_path in sorted(SOURCE.rglob("*")):
        if not source_path.is_file():
            continue
        relative_path = source_path.relative_to(SOURCE)
        destination_path = DESTINATION / relative_path
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination_path)
        entry: dict[str, object] = {
            "path": relative_path.as_posix(),
            "url": f"/data/{relative_path.as_posix()}",
            "format": source_path.suffix.lower().lstrip(".") or "binary",
            "bytes": source_path.stat().st_size,
        }
        record_count = count_jsonl_records(source_path)
        if record_count is not None:
            entry["records"] = record_count
        entries.append(entry)

    manifest = {
        "title": "三星堆数字探索平台公开数据目录",
        "version": 1,
        "generated_at": date.today().isoformat(),
        "description": "网站静态数据镜像。保留研究数据目录的相对路径；JSONL按行读取，JSON按整体读取。采集原始记录与待复核资料不等同于已核实或可直接公开的单件档案。",
        "access": {
            "base_url": "/data/",
            "jsonl_encoding": "UTF-8",
            "jsonl_record_separator": "newline",
            "suggested_fetch": "fetch('/data/manifest.json').then(r => r.json())",
        },
        "collections": [
            {"path": "artifacts/", "label": "三星堆出土文物全记录精选300条结构化档案", "review_state": "needs_review; OCR-derived from 2009 catalog"},
            {"path": "artifacts/pit-report-finds.jsonl", "label": "K3、K4、K5、K7、K8考古简报出土器物专项档案", "review_state": "needs_review; report-page images require rights review"},
            {"path": "acquisition/", "label": "公开网页采集记录与页面快照", "review_state": "mixed; inspect each record"},
            {"path": "archaeology/", "label": "遗址、祭祀坑、考古事件与发掘报告"},
            {"path": "graph/", "label": "知识图谱节点、关系与展览"},
            {"path": "media/", "label": "媒体来源、许可和使用状态台账"},
            {"path": "pottery/", "label": "陶器器型档案"},
            {"path": "stories/", "label": "编辑策划的专题叙事及结构规范"},
            {"path": "learning/", "label": "研学主题与互动资料配置"},
            {"path": "qa/", "label": "可追溯研究问答知识条目"},
            {"path": "sources.json", "label": "来源清单与使用边界"},
            {"path": "artifact.schema.json", "label": "器物档案结构规范"},
        ],
        "files": entries,
    }
    (DESTINATION / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Published {len(entries)} source files to {DESTINATION}")
    print(f"Manifest: {DESTINATION / 'manifest.json'}")


if __name__ == "__main__":
    main()
