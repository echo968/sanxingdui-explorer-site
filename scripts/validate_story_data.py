#!/usr/bin/env python3
"""Validate story references against the approved catalog and archaeology data."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_jsonl(relative: str) -> list[dict]:
    path = ROOT / relative
    records: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSON at {relative}:{line_number}: {error}") from error
        if not isinstance(value, dict):
            raise ValueError(f"Expected object at {relative}:{line_number}")
        records.append(value)
    return records


def source_records(records: list[dict]) -> dict[str, dict]:
    return {
        source["source_id"]: source
        for record in records
        for source in record.get("sources", [])
        if source.get("source_id")
    }


def main() -> None:
    artifacts = read_jsonl("data/artifacts/selected-book-300.jsonl")
    events = read_jsonl("data/archaeology/events.jsonl")
    contexts = read_jsonl("data/archaeology/contexts.jsonl")
    themes = read_jsonl("data/stories/themes.jsonl")

    artifact_ids = {value for item in artifacts for value in (item.get("id"), item.get("slug")) if value}
    event_ids = {item.get("id") for item in events if item.get("id")}
    context_ids = {item.get("id") for item in contexts if item.get("id")}
    sources = source_records(artifacts + events + contexts)
    errors: list[str] = []
    slugs: set[str] = set()

    for theme in themes:
        label = theme.get("slug") or theme.get("id") or "(unknown theme)"
        if theme.get("slug") in slugs:
            errors.append(f"duplicate theme slug: {label}")
        slugs.add(theme.get("slug"))
        cover_id = theme.get("cover", {}).get("artifact_id")
        if cover_id not in artifact_ids:
            errors.append(f"{label}: cover artifact does not resolve in selected-book-300: {cover_id}")
        for section in theme.get("sections", []):
            section_label = f"{label}/{section.get('id', '(unknown section)')}"
            for key, known in (("artifact_ids", artifact_ids), ("event_ids", event_ids), ("context_ids", context_ids)):
                for value in section.get(key, []):
                    if value not in known:
                        errors.append(f"{section_label}: unresolved {key} reference: {value}")
            for reference in section.get("sources", []) + theme.get("sources", []):
                source = sources.get(reference.get("source_id"))
                if not source:
                    errors.append(f"{section_label}: unknown source_id: {reference.get('source_id')}")
                    continue
                if source.get("url") != reference.get("url"):
                    errors.append(f"{section_label}: source URL differs from record: {reference.get('source_id')}")

    if errors:
        raise SystemExit("Story data validation failed:\n- " + "\n- ".join(errors))
    print(f"Validated {len(themes)} themes, {sum(len(item.get('sections', [])) for item in themes)} chapters, and all artifact/event/context/source references.")


if __name__ == "__main__":
    main()
