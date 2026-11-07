"""Build an evidence-backed graph using the selected 300-item catalog dataset."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
GRAPH = DATA / "graph"
ARTIFACTS_PATH = DATA / "artifacts" / "selected-book-300.jsonl"


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")


def stable_id(prefix: str, value: str) -> str:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}-{digest}"


def citations(record: dict, supported_fields: set[str] | None = None) -> list[dict]:
    result = []
    for source in record.get("sources", []):
        supports = source.get("supports", [])
        if supported_fields and not supported_fields.intersection(supports):
            continue
        result.append({
            "source_id": source["source_id"],
            "url": source["url"],
            "title": source.get("title"),
            "locator": source.get("locator"),
            "supports": supports,
        })
    return result


def main() -> None:
    # The selected catalog is the sole artifact source for this graph build.
    artifacts = read_jsonl(ARTIFACTS_PATH)
    sites = read_jsonl(DATA / "archaeology" / "sites.jsonl")
    contexts = read_jsonl(DATA / "archaeology" / "contexts.jsonl")
    events = read_jsonl(DATA / "archaeology" / "events.jsonl")

    exhibitions = [
        {
            "id": "exhibition-shm-star-china-2024",
            "record_type": "exhibition",
            "name": "星耀中国：三星堆·金沙古蜀文明展",
            "venue": "上海博物馆东馆",
            "date_start": "2024-02-02",
            "date_end": "2024-05-20",
            "object_count": 363,
            "scope_note": "三星堆与金沙联合展览；本版图谱不将未在300件图录记录中逐件核实的展品名称关联到器物节点。",
            "displayed_object_names": ["金面具笄发青铜人头像", "金面具辫发青铜人头像", "夔龙冠纵目青铜面具", "青铜鸡", "青铜猪鼻龙", "青铜太阳形器", "青铜爬龙权杖", "竖披发青铜人像", "兽首冠青铜人像", "镶嵌绿松石兽面纹青铜牌饰", "青铜大面具", "有领玉璧", "十节玉琮", "玉牙璋", "高冠立发青铜人像", "青铜长发跪坐人像", "尖帽青铜人像", "青铜虎头龙身像", "青铜神兽", "青铜蛇"],
            "sources": [{"source_id": "shm-star-china-sanxingdui-2024", "url": "https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/E00004170", "title": "星耀中国：三星堆·金沙古蜀文明展", "publisher": "上海博物馆", "locator": "展期与展品名单", "supports": ["name", "date_start", "date_end", "object_count", "displayed_object_names"]}],
            "record_status": "needs_review",
        },
        {
            "id": "exhibition-hkpm-gazing-sanxingdui-2023",
            "record_type": "exhibition",
            "name": "凝视三星堆——四川考古新发现",
            "venue": "香港故宫文化博物馆展厅8",
            "date_start": "2023-09-27",
            "date_end": "2024-01-08",
            "object_count": 120,
            "scope_note": "香港故宫展览页称近半数展品为2020—2022年三星堆新发掘成果；本版不把展览整体说明当作300件图录中单件展出证据。",
            "displayed_object_names": [],
            "sources": [{"source_id": "hkpm-gazing-sanxingdui-2023", "url": "https://www.hkpm.org.hk/sc/exhibition/gazing-at-sanxingdui-new-archaeological-discoveries-in-sichuan", "title": "凝视三星堆——四川考古新发现", "publisher": "香港故宫文化博物馆", "locator": "展期、展厅及展览概述", "supports": ["name", "date_start", "date_end", "object_count"]}],
            "record_status": "needs_review",
        },
    ]

    nodes: dict[tuple[str, str], dict] = {}
    edges: dict[str, dict] = {}

    def node(kind: str, identifier: str, label: str, **extra: object) -> None:
        key = (kind, identifier)
        nodes.setdefault(key, {"id": identifier, "entity_type": kind, "label": label, **extra})

    def edge(subject_type: str, subject_id: str, subject_label: str, predicate: str,
             object_type: str, object_id: str, object_label: str,
             evidence: list[dict], basis: str = "source_explicit", qualifiers: dict | None = None) -> None:
        if not evidence:
            return
        qualifiers = qualifiers or {}
        key = json.dumps([subject_type, subject_id, predicate, object_type, object_id, qualifiers], ensure_ascii=False, sort_keys=True)
        edge_id = stable_id("edge", key)
        node(subject_type, subject_id, subject_label)
        node(object_type, object_id, object_label)
        edges[edge_id] = {
            "id": edge_id,
            "subject": {"type": subject_type, "id": subject_id, "label": subject_label},
            "predicate": predicate,
            "object": {"type": object_type, "id": object_id, "label": object_label},
            "assertion_basis": basis,
            "qualifiers": qualifiers,
            "evidence": evidence,
            "record_status": "needs_review",
        }

    for record in sites + contexts + events:
        record_type = record["record_type"]
        path_name = "sites" if record_type == "site" else "contexts" if record_type == "context" else "events"
        node(record_type, record["id"], record["name"], record_path=f"data/archaeology/{path_name}.jsonl")

    context_by_id = {item["id"]: item for item in contexts}
    site_by_id = {item["id"]: item for item in sites}
    for site in sites:
        for context_id in site.get("context_ids", []):
            context = context_by_id.get(context_id)
            if context:
                edge("site", site["id"], site["name"], "contains_context", "context", context_id, context["name"], citations(site, {"context_ids"}))
    for context in contexts:
        site = site_by_id.get(context.get("site_id"))
        if site:
            edge("context", context["id"], context["name"], "part_of", "site", site["id"], site["name"], citations(context, {"site_id"}))
    for event in events:
        for context_id in event.get("context_ids", []):
            context = context_by_id.get(context_id)
            if context:
                edge("event", event["id"], event["name"], "covers_context", "context", context_id, context["name"], citations(event, {"context_ids"}))

    # Preserve original excavation labels while mapping only explicit K1-K8 aliases.
    pit_aliases = {f"{i}号祭祀坑": f"sanxingdui-k{i}" for i in range(1, 9)}
    pit_aliases.update({f"{i}号坑": f"sanxingdui-k{i}" for i in range(1, 9)})
    pit_aliases.update({f"K{i}": f"sanxingdui-k{i}" for i in range(1, 9)})
    chinese_numbers = {1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八"}
    for number, chinese in chinese_numbers.items():
        pit_aliases[f"{chinese}号祭祀坑"] = f"sanxingdui-k{number}"
        pit_aliases[f"{chinese}号坑"] = f"sanxingdui-k{number}"

    for artifact in artifacts:
        aid, name = artifact["id"], artifact["name"]
        node("artifact", aid, name, record_path="data/artifacts/selected-book-300.jsonl", resolution_status=artifact.get("record_status", "needs_review"))
        discovery = artifact.get("discovery") or {}

        site_id = discovery.get("site_id")
        site = site_by_id.get(site_id)
        if site:
            edge("artifact", aid, name, "associated_with_site", "site", site["id"], site["name"], citations(artifact, {"discovery.context"}), basis="normalized_from_source_label", qualifiers={"source_label": discovery.get("context"), "normalization": "catalog site description mapped to site record"})

        raw_context = discovery.get("excavation_unit")
        context_id = pit_aliases.get(raw_context)
        source_evidence = citations(artifact, {"discovery.excavation_unit"})
        if context_id and context_id in context_by_id:
            target = context_by_id[context_id]
            edge("artifact", aid, name, "found_in", "context", context_id, target["name"], source_evidence, basis="normalized_from_source_label", qualifiers={"source_label": raw_context})
        elif raw_context:
            unknown_id = stable_id("unresolved-context", raw_context)
            node("unresolved_context", unknown_id, raw_context, resolution_status="not_in_context_catalog")
            edge("artifact", aid, name, "found_in_unresolved_context", "unresolved_context", unknown_id, raw_context, source_evidence, basis="normalized_from_source_label", qualifiers={"source_label": raw_context, "normalization": "preserved verbatim; no K1-K8 mapping"})

        for motif in artifact.get("catalog_motifs", []):
            mid = stable_id("motif", motif)
            edge("artifact", aid, name, "has_catalog_motif", "motif", mid, motif, citations(artifact, {"catalog_motifs", "motifs"}), qualifiers={"term_source_field": "catalog_motifs", "interpretive_status": "source_catalog_label"})
        for term in artifact.get("materials_and_techniques", []):
            tid = stable_id("material-technique", term)
            edge("artifact", aid, name, "has_material_or_technique_label", "material_or_technique", tid, term, citations(artifact, {"materials_and_techniques"}), qualifiers={"term_source_field": "materials_and_techniques", "source_label_preserved": True})

    for exhibition in exhibitions:
        node("exhibition", exhibition["id"], exhibition["name"], record_path="data/graph/exhibitions.jsonl")

    write_jsonl(GRAPH / "exhibitions.jsonl", exhibitions)
    write_jsonl(GRAPH / "nodes.jsonl", sorted(nodes.values(), key=lambda x: (x["entity_type"], x["id"])))
    write_jsonl(GRAPH / "edges.jsonl", sorted(edges.values(), key=lambda x: x["id"]))
    print(f"built {len(nodes)} nodes and {len(edges)} sourced edges from {len(artifacts)} selected catalog artifact records")


if __name__ == "__main__":
    main()
