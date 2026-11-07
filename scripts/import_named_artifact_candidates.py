#!/usr/bin/env python3
"""Add source-backed named finds as reviewable, non-catalogue artifact profiles."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "acquisition" / "named-find-artifact-profiles.jsonl"
SCKG_URL = "https://www.sckg.com/dynamics/2921.html"
PKU_URL = "https://csca.pku.edu.cn/info/1008/1289.htm"
CSSN_URL = "https://www.cssn.cn/kgxc/kgxc_kgxl/202209/t20220930_5545311.shtml"

# name, pit/context, kind, group count, source key
ROWS = [
    ("铜顶尊跪坐人像", "三号祭祀坑", "铜器", None, "pku"),
    ("铜顶尊人头像", "三号祭祀坑", "铜器", None, "cssn"),
    ("铜戴尖帽小立人像", "三号祭祀坑", "铜器", None, "pku"),
    ("戴立冠铜头像", "三号祭祀坑", "铜器", None, "cssn"),
    ("铜盘龙器盖", "三号祭祀坑", "铜器", None, "cssn"),
    ("铜圆口方尊", "三号祭祀坑", "铜器", None, "pku"),
    ("铜兽首衔鸟圆尊", "三号祭祀坑", "铜器", None, "cssn"),
    ("铜小神兽", "三号祭祀坑", "铜器", None, "cssn"),
    ("神树纹玉琮", "三号祭祀坑", "玉器", None, "pku"),
    ("刻纹玉器座", "三号祭祀坑", "玉器", None, "cssn"),
    ("三号祭祀坑铜人头像", "三号祭祀坑", "铜器", None, "pku"),
    ("三号祭祀坑鸟形金饰", "三号祭祀坑", "金器", None, "cssn"),
    ("四号祭祀坑铜扭头跪坐人像组合", "四号祭祀坑", "铜器", 3, "pku"),
    ("四号祭祀坑尖底盏", "四号祭祀坑", "陶器", 2, "pku"),
    ("四号祭祀坑玉琮", "四号祭祀坑", "玉器", 2, "pku"),
    ("四号祭祀坑玉瑗", "四号祭祀坑", "玉器", 1, "pku"),
    ("四号祭祀坑玉凿", "四号祭祀坑", "玉器", 4, "pku"),
    ("四号祭祀坑玉璧", "四号祭祀坑", "玉器", 1, "pku"),
    ("四号祭祀坑玉锛", "四号祭祀坑", "玉器", 1, "pku"),
    ("五号祭祀坑象牙雕刻", "五号祭祀坑", "象牙器", None, "pku"),
    ("五号祭祀坑橄榄形玉器", "五号祭祀坑", "玉器", None, "pku"),
    ("五号祭祀坑圆形金箔", "五号祭祀坑", "金器", None, "pku"),
    ("五号祭祀坑玉珠", "五号祭祀坑", "玉器", None, "pku"),
    ("五号祭祀坑云雷纹牙雕", "五号祭祀坑", "象牙器", None, "pku"),
    ("六号祭祀坑玉刀", "六号祭祀坑", "玉器", None, "pku"),
    ("六号祭祀坑木箱", "六号祭祀坑", "木器", None, "pku"),
    ("七号祭祀坑龟背形网格状器", "七号祭祀坑", "铜器", None, "cssn"),
    ("七号祭祀坑铜顶璋龙形饰", "七号祭祀坑", "铜器", None, "cssn"),
    ("七号祭祀坑三孔玉璧形器", "七号祭祀坑", "玉器", None, "cssn"),
    ("七号祭祀坑玉石戈", "七号祭祀坑", "玉石器", None, "pku"),
    ("七号祭祀坑玉璋", "七号祭祀坑", "玉器", None, "pku"),
    ("七号祭祀坑玉瑗", "七号祭祀坑", "玉器", None, "pku"),
    ("七号祭祀坑带黑彩铜人头像", "七号祭祀坑", "铜器", None, "pku"),
    ("七号祭祀坑鱼形金箔片", "七号祭祀坑", "金器", None, "pku"),
    ("七号祭祀坑龟背形挂饰", "七号祭祀坑", "铜器", None, "pku"),
    ("八号祭祀坑顶尊蛇身铜人像", "八号祭祀坑", "铜器", None, "cssn"),
    ("八号祭祀坑铜龙", "八号祭祀坑", "铜器", None, "cssn"),
    ("八号祭祀坑铜着裙立人像", "八号祭祀坑", "铜器", None, "cssn"),
    ("八号祭祀坑铜戴象牙立人像", "八号祭祀坑", "铜器", None, "cssn"),
    ("八号祭祀坑铜神殿形器盖", "八号祭祀坑", "铜器", None, "cssn"),
    ("八号祭祀坑石磬", "八号祭祀坑", "石器", None, "pku"),
    ("八号祭祀坑小型铜凸目鸟身人像", "八号祭祀坑", "铜器", None, "pku"),
    ("八号祭祀坑玉璋", "八号祭祀坑", "玉器", None, "pku"),
    ("八号祭祀坑玉有领璧", "八号祭祀坑", "玉器", None, "pku"),
    ("八号祭祀坑铜方罍", "八号祭祀坑", "铜器", None, "pku"),
    ("八号祭祀坑铜尊", "八号祭祀坑", "铜器", None, "pku"),
    ("一号祭祀坑金杖", "一号祭祀坑", "金器", None, "sckg"),
    ("一号祭祀坑金虎饰", "一号祭祀坑", "金器", None, "chiculture"),
    ("一号祭祀坑龙虎尊", "一号祭祀坑", "铜器", None, "chiculture"),
    ("二号祭祀坑青铜鸟足人像", "二号祭祀坑", "铜器", None, "baoji"),
    ("二号祭祀坑青铜尊口沿", "二号祭祀坑", "铜器", None, "baoji"),
    ("八号祭祀坑青铜神坛镂空基台", "八号祭祀坑", "铜器", None, "baoji"),
    ("八号祭祀坑青铜鸟足神像杖形器", "八号祭祀坑", "铜器", None, "baoji"),
    ("八号祭祀坑青铜神坛小型人像", "八号祭祀坑", "铜器", 13, "baoji"),
    ("三号祭祀坑青铜罍", "三号祭祀坑", "铜器", None, "baoji"),
]

SOURCES = {
    "pku": (PKU_URL, "三星堆遗址祭祀区三、四号坑阶段性重大考古成果发布", "北京大学中国考古学研究中心", "academic_publication"),
    "cssn": (CSSN_URL, "三星堆遗址祭祀区考古发掘阶段性工作进展及主要成果", "中国社会科学网（据考古成果发布整理）", "other"),
    "sckg": ("https://www.sckg.com/uploads/soft/20230509/2-230509160203361.pdf", "三星堆遗址的发现与研究", "四川省文物考古研究院", "excavation_report"),
    "scu": ("https://www.scu.edu.cn/info/1892/35133.htm", "川大人与三星堆考古", "四川大学", "academic_publication"),
    "chiculture": ("https://chiculture.org.hk/en/node/601", "一号祭祀坑有何宝物？", "中国文化研究院", "other"),
    "baoji": ("https://wwj.baoji.gov.cn/zzzb/wbyw/202307/t20230728_857179.html", "三星堆博物馆新馆：新设计新展览新技术", "宝鸡市文物局", "government"),
}


def main() -> None:
    rows = []
    for name, pit, category, quantity, source_key in ROWS:
        url, title, publisher, source_type = SOURCES[source_key]
        source_id = f"named-find-{source_key}"
        is_group = (quantity is not None and quantity > 1) or any(token in name for token in ("雕刻", "玉珠"))
        supports = ["name", "discovery.context", "discovery.excavation_unit", "category"]
        if quantity is not None:
            supports.append("quantity")
        record = {
            "id": "named-find-" + str(len(rows) + 1).zfill(3),
            "name": name,
            "alternate_names": [],
            "museum_inventory_number": None,
            "category": category,
            "period": {"label": None, "start_year": None, "end_year": None, "dating_basis": None},
            "materials_and_techniques": [],
            "dimensions": {"value": None, "unit": None, "measurement_note": None},
            "discovery": {
                "site_id": "sanxingdui-site",
                "context": "四川广汉三星堆遗址",
                "date_or_period": None,
                "excavation_unit": pit,
            },
            "collection_institution": None,
            "description": "考古成果阶段性报道中列名的器物档案候选。来源仅支持名称、器类及坑位；尚未核对单件馆藏编号、尺寸、材质细节或实物对应关系，发布前需据正式发掘报告/馆方目录复核。",
            "interpretations": [],
            "catalog_motifs": [],
            "record_scope": "group" if is_group else "individual",
            "quantity": quantity if is_group else None,
            "sources": [{
                "source_id": source_id,
                "url": url,
                "title": title,
                "publisher": publisher,
                "published_at": None,
                "accessed_at": "2026-10-18",
                "locator": "器物名称及对应坑位的考古成果摘要/器物清单",
                "supports": supports,
                "source_type": source_type,
            }],
            "media": [],
            "record_status": "needs_review",
            "last_verified_at": None,
            "extraction_scope": "search_result_listing",
        }
        rows.append(record)
    OUT.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} named-find profiles to {OUT}")


if __name__ == "__main__":
    main()
