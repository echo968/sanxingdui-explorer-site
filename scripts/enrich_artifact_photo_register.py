"""Add sourced artifact-photo records and rebuild per-artifact photo coverage.

This script records public Commons files as licensed photo references and
official institute photographs as permission-pending leads. It never downloads
or mirrors image files and never upgrades a class illustration to an exact
object match without direct source evidence.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "data" / "media"
ASSETS_PATH = MEDIA / "assets.jsonl"
TODAY = "2026-10-18"
CC_BY_SA = {
    "name": "Creative Commons Attribution-ShareAlike",
    "url": "https://creativecommons.org/licenses/by-sa/4.0/",
    "version": "4.0",
    "attribution_required": True,
    "share_alike": True,
    "commercial_use_allowed": True,
}
CC0 = {
    "name": "CC0 1.0 Universal Public Domain Dedication",
    "url": "https://creativecommons.org/publicdomain/zero/1.0/",
    "version": "1.0",
    "attribution_required": False,
    "share_alike": False,
    "commercial_use_allowed": True,
}


def commons_asset(asset_id, title, filename, creator, width, height, size_bytes,
                  artifact_ids, identity, identity_note, *, license=CC_BY_SA,
                  attribution=None, use="approved_with_attribution", review=None):
    return {
        "id": asset_id,
        "media_type": "image",
        "subtype": "photograph",
        "title": title,
        "page_url": "https://commons.wikimedia.org/wiki/File:" + filename.replace(" ", "_"),
        "file_url": "https://commons.wikimedia.org/wiki/Special:FilePath/" + filename.replace(" ", "_"),
        "creator": creator,
        "uploader": creator,
        "original_source": "Wikimedia Commons",
        "rights_holder": creator,
        "license": license,
        "attribution": attribution or f"{creator}, CC BY-SA 4.0, via Wikimedia Commons",
        "technical": {"mime_type": "image/jpeg", "width_px": width, "height_px": height,
                      "duration_seconds": None, "file_size_bytes": size_bytes, "sha256": None},
        "artifact_ids": artifact_ids,
        "identity_match_status": identity,
        "identity_match_note": identity_note,
        "rights_status": "open_license_claimed",
        "use_status": use,
        "source_locator": "Commons file description and licensing section",
        "review_note": review or "Retain photographer attribution and link to the stated license. The file license covers the photograph, not museum master files.",
        "accessed_at": TODAY,
    }


def pending_asset(asset_id, title, page, file_url, artifact_ids, note, locator):
    return {
        "id": asset_id,
        "media_type": "image",
        "subtype": "photograph",
        "title": title,
        "page_url": page,
        "file_url": file_url,
        "creator": "四川省文物考古研究院（摄影者未标注）",
        "uploader": None,
        "original_source": "四川省文物考古研究院官网",
        "rights_holder": "四川省文物考古研究院或原摄影者（待确认）",
        "license": {"name": None, "url": None, "version": None,
                    "attribution_required": True, "share_alike": False,
                    "commercial_use_allowed": None},
        "attribution": None,
        "technical": {"mime_type": "image/jpeg", "width_px": None, "height_px": None,
                      "duration_seconds": None, "file_size_bytes": None, "sha256": None},
        "artifact_ids": artifact_ids,
        "identity_match_status": "exact" if artifact_ids else "needs_review",
        "identity_match_note": note,
        "rights_status": "permission_pending",
        "use_status": "needs_review",
        "display_override": None,
        "source_locator": locator,
        "review_note": "官网文章公开展示此照片，但未见可复用许可。仅登记来源和授权线索；取得书面授权前不得作为网页图片发布或镜像。",
        "accessed_at": TODAY,
    }


assets = [json.loads(line) for line in ASSETS_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
by_id = {a["id"]: a for a in assets}

# A second freely licensed image of the named K1 gold staff, with the pit
# stated in the Commons description. A current Commons photograph is included
# as an additional view, but its caption does not state the pit.
new_assets = [
    commons_asset(
        "commons-k1-gold-staff-g41rn8", "一号祭祀坑金杖", "Sanxingdui Oct 2007 524.jpg",
        "G41rn8", 2592, 1944, 3530000, ["named-find-047"], "exact",
        "Commons文件说明明确记为三星堆一号祭祀坑金杖，与档案名称和坑位一致。",
        attribution="G41rn8, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    commons_asset(
        "commons-k1-gold-staff-tyg728", "一号祭祀坑金杖", "Sanxingdui Golden Sceptre 20161122.jpg",
        "Tyg728", 2750, 1650, 1490000, ["named-find-047"], "exact",
        "Commons文件说明明确记为三星堆一号祭祀坑金杖，与档案名称和坑位一致。",
        attribution="Tyg728, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    commons_asset(
        "commons-gold-staff-yumeto-2025", "三星堆博物馆陈列金杖", "20250519 Gold sceptre in the Sanxingdui Museum.jpg",
        "Yumeto", 4096, 3072, 5581639, ["named-find-047"], "class_level",
        "文件说明仅称博物馆陈列金杖，未标明一号坑；作为金杖类别配图，不据此确认同一件实物。",
        attribution="Yumeto, CC BY-SA 4.0, via Wikimedia Commons",
        use="approved_class_illustration_only",
    ),
    commons_asset(
        "commons-k3-gold-bird-ornament-wxmarshall", "2021年新发现三星堆金鸟形饰", "三星堆-金鸟形饰 sanxingdui.jpg",
        "Wxmarshall", 1105, 2233, 829000, ["named-find-012"], "class_level",
        "文件说明称2021年新发现的金鸟形饰，未标明坑位；只作为三号坑鸟形金饰的同类参考，不确认是同一件。",
        attribution="Wxmarshall, CC BY-SA 4.0, via Wikimedia Commons",
        use="approved_class_illustration_only",
    ),
    commons_asset(
        "commons-k3-jade-cong-todd", "三星堆玉琮", "Jade Cong, Sanxingdui 1.jpg",
        "Gary Todd", 4752, 3168, 2320000, ["named-find-009", "named-find-015"], "class_level",
        "Commons文件标题标明三星堆玉琮，但未给出坑位或馆藏号；仅作为三号、四号坑玉琮的器型参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-bi-todd", "三星堆玉璧", "Sanxingdui Jade Bi (9951268464).jpg",
        "Gary Todd", 4752, 3168, 2840000, ["named-find-018", "named-find-029", "named-find-044"], "class_level",
        "Commons文件标题标明三星堆玉璧，但未给出坑位或馆藏号；只作为玉璧/璧形器参考，不确认同一实物。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-gold-foil-todd", "三星堆金箔", "Sanxingdui Gold Foil (9950612663).jpg",
        "Gary Todd", 3888, 2592, 1440000, ["named-find-022", "named-find-034"], "class_level",
        "Commons文件标题标明三星堆金箔，但未说明具体器形和坑位；只作为金箔类档案参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-chisel-todd", "三星堆玉凿", "Jade Chisel (Zao), Sanxingdui 6.jpg",
        "Gary Todd", 2592, 3888, 1950000, ["named-find-017"], "class_level",
        "Commons文件标题标明三星堆玉凿，但未说明坑位或馆藏号；作为玉凿类别配图。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-ge-todd", "三星堆玉戈", "Jade Ge (Dagger-axe), Sanxingdui 03.jpg",
        "Gary Todd", 2592, 3888, 2150000, ["hkpm-jade-ge-pit3", "named-find-030"], "class_level",
        "Commons文件明确为三星堆玉戈，未标出具体坑位；只作为玉戈类别配图。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-zhang-g41rn8", "三星堆玉边璋", "Sanxingdui Oct 2007 518.jpg",
        "G41rn8", 1453, 2592, 2500000, ["named-find-031", "named-find-043"], "class_level",
        "Commons文件说明标为三星堆大型玉边璋，未给出坑位或馆藏号；只作为玉璋类别参考。",
        attribution="G41rn8, CC BY-SA 4.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-ivory-tusk-todd", "三星堆象牙（象牙器类别配图）", "Sanxingdui Ivory Tusk (9950882376).jpg",
        "Gary Todd", 3888, 2592, 1620000, ["named-find-020"], "class_level",
        "Commons照片标为三星堆博物馆象牙，但不是五号坑云雷纹牙雕的确证图；只作为象牙器类别参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-altar-component-quinlan718", "三星堆青铜神坛构件（类别配图）", "Sanxingdui Bronze Altar Component Resembling Character Guang (光).jpg",
        "Quinlan718", 1752, 1838, 1650000, ["named-find-052"], "class_level",
        "Commons文件称三星堆晚商青铜神坛构件，未说明与八号坑镂空基台为同一部件；仅作为神坛构件类别配图。",
        license=CC0, attribution="Quinlan718, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-zun-todd-9950504065", "三星堆青铜尊（类别配图）", "Sanxingdui Bronze Zun (9950504065).jpg",
        "Gary Todd", 2592, 3888, None, ["named-find-006", "named-find-007", "named-find-046"], "class_level",
        "Commons文件标题为三星堆青铜尊，未标注坑位、馆藏号或器物名称；仅作为方尊、兽首尊及八号坑铜尊的器型参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-zun-todd-9950527686", "三星堆青铜尊另一视角（类别配图）", "Sanxingdui Bronze Zun (9950527686).jpg",
        "Gary Todd", 2592, 3888, None, ["named-find-006", "named-find-046"], "class_level",
        "Commons文件标题为三星堆青铜尊，未标注坑位、馆藏号或器物名称；仅作为青铜尊器型参考，不确认与具体档案为同一实物。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-lei-todd-9950526536", "三星堆青铜罍（类别配图）", "Sanxingdui Bronze Lei (9950526536).jpg",
        "Gary Todd", 2592, 3888, None, ["named-find-045", "named-find-055"], "class_level",
        "Commons文件标题为三星堆青铜罍，未标注坑位或馆藏号；仅作为八号坑方罍、三号坑青铜罍的器型参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-lei-pit2-todd-9951016194", "二号坑出土青铜罍（类别配图）", "Sanxingdui Bronze Lei from Pit 2 (9951016194).jpg",
        "Gary Todd", 4752, 3168, None, ["named-find-045", "named-find-055"], "class_level",
        "Commons标题明确为二号坑青铜罍；目标档案分别为八号坑和三号坑器物，因此只作为罍类配图，不能作为同件照片。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-head-tyg728", "三星堆平顶青铜人头像（类别配图）", "Bronze head in Sanxingdui 20161122.jpg",
        "Tyg728", 1920, 2560, 2075774, ["named-find-002", "named-find-004", "named-find-011", "named-find-033"], "class_level",
        "Commons说明称三星堆遗址出土平顶青铜人头像，未标坑位或馆藏号；仅用于人头像类档案配图，不确认与任一档案为同一实物。",
        attribution="Tyg728, CC BY-SA 4.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-beads-todd-9950984483", "三星堆玉珠（类别配图）", "Sanxingdui Jade Beads (9950984483).jpg",
        "Gary Todd", 3888, 2592, None, ["named-find-023"], "class_level",
        "Commons文件标为三星堆玉珠/玉串珠，未标出五号坑或单件编号；只作为五号坑玉珠档案的同类参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-jade-bracelet-todd-9951098676", "三星堆玉环/玉镯（类别配图）", "Sanxingdui Jade Bracelet (9951098676).jpg",
        "Gary Todd", 4752, 3168, None, ["named-find-016", "named-find-032"], "class_level",
        "Commons文件标为三星堆玉手镯，未标出四号或七号坑及单件编号；作为玉瑗/环类器物参考，不确认同一实物。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
    commons_asset(
        "commons-sanxingdui-bronze-dragon-column-todd", "三星堆青铜龙形立柱（类别配图）", "Bronze Dragon-shaped Column, Sanxingdui b.jpg",
        "Gary Todd", 3168, 4752, None, ["digicol-list-04", "digicol-list-13", "shm-59728", "named-find-028"], "class_level",
        "Commons文件明确为三星堆青铜龙形立柱，未给出对应坑位和馆藏号；只作为其他龙形青铜器的同类参考。",
        license=CC0, attribution="Gary Todd, CC0 1.0, via Wikimedia Commons",
        use="approved_class_illustration_only"),
]

# Institute photographs are real item views documented by their source pages;
# they remain hidden from the public UI pending reuse permission.
institute_page = "https://www.sckg.com/shangzhou/1575.html"
institute_images = [
    pending_asset("sckg-k3-top-zun-kneeling-figure-2023", "三星堆遗址三号坑出土铜顶尊跪坐人像",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-23053015510YU.jpg",
        ["named-find-001"], "研究院图片标题直接指明三号坑出土铜顶尊跪坐人像。", "图片说明：广汉三星堆遗址三号坑出土铜顶尊跪坐人像"),
    pending_asset("sckg-gold-mask-and-foil-group-2023", "三星堆出土金面具、金箔饰（组合照片）",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-230530155135228.jpg",
        [], "来源将金面具和金箔饰作为组合图片展示，未给出具体坑位或逐件编号。", "图片说明：广汉三星堆遗址出土金面具、金箔饰"),
    pending_asset("sckg-jade-artifacts-group-2023", "三星堆出土部分玉器（组合照片）",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-23053015520L59.jpg",
        [], "来源只说明为部分玉器合照，不能映射到某件玉器档案。", "图片说明：广汉三星堆遗址出土部分玉器"),
    pending_asset("sckg-dragon-lid-and-kneeling-figure-2023", "三星堆爬龙铜器盖与铜扭头跪坐人像",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-23053015521Q09.jpg",
        ["digicol-323", "shm-59746"], "图片说明分别点名爬龙铜器盖和铜扭头跪坐人像；同框组合照片对应两件物品，未据此推断坑位。", "图片说明：广汉三星堆遗址出土爬龙铜器盖、铜扭头跪坐人像"),
    pending_asset("sckg-k5-ivory-carving-2023", "三星堆五号坑出土象牙雕刻",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-2305301552464X.jpg",
        ["named-find-020"], "研究院图片标题直接指明五号祭祀坑出土象牙雕。", "图片说明：广汉三星堆遗址五号祭祀坑出土象牙雕"),
    pending_asset("sckg-k3-gold-mask-conservation-2024", "三号祭祀坑金面具保护修复前后",
        "https://www.sckg.com/dynamics/3432.html", "https://www.sckg.com/uploads/allimg/20240726/2-240H6124JDZ.jpg",
        ["hkpm-gold-mask-pit3-2021"], "修复文章图注标明三号坑金面具，和已登记的三号坑金面罩对应；图片为保护修复对照图。", "2024年修复文章图注：三号祭祀坑金面具修复前后"),
    pending_asset("sckg-k8-gold-mask-conservation-2024", "八号祭祀坑金面具保护修复前后",
        "https://www.sckg.com/dynamics/3432.html", "https://www.sckg.com/uploads/allimg/20240726/2-240H6124P2312.jpg",
        [], "修复文章图注标明八号坑金面具；当前器物档案中没有已核实的对应金面具单件记录。", "2024年修复文章图注：八号祭祀坑金面具修复前后"),
]

# HKPM's official object page provides direct, item-labeled photograph files.
# The page credits Sanxingdui Museum, so these are source/authorization leads,
# not open-license images.
hkpm_page = "https://www.hkpm.org.hk/tc/exhibition/gazing-at-sanxingdui-new-archaeological-discoveries-in-sichuan"
hkpm_images = [
    pending_asset("hkpm-photo-k3-giant-bronze-mask", "三号坑青铜大面具（香港故宫展品照片）",
        hkpm_page, "https://www.hkpm.org.hk/files/record/exhibition/30/2-1690874290.jpg",
        ["shm-59736"], "香港故宫展品页明确标注三号坑大面具及尺寸，图片位于该单件展品说明下。", "香港故宫官方展品页：大面具图片及展品标签"),
    pending_asset("hkpm-photo-k8-bronze-divine-beast", "八号坑青铜大神兽（香港故宫展品照片）",
        hkpm_page, "https://www.hkpm.org.hk/files/record/exhibition/30/3-1690883565.png",
        ["hkpm-large-bronze-divine-beast-2022"], "香港故宫展品页明确标注八号坑、2022年出土及尺寸，图片位于大神兽单件说明下。", "香港故宫官方展品页：大神兽图片及展品标签"),
    pending_asset("hkpm-photo-k8-tiger-headed-dragon-bodied", "八号坑虎头龙身像（香港故宫展品照片）",
        hkpm_page, "https://www.hkpm.org.hk/files/record/exhibition/30/4-1690883569.png",
        ["digicol-317"], "香港故宫展品页明确标注八号坑虎头龙身像，图文为同一单件展品。", "香港故宫官方展品页：虎头龙身像图片及展品标签"),
    pending_asset("hkpm-photo-k4-turned-head-kneeling-figure", "四号坑扭头跪坐人像（香港故宫展品照片）",
        hkpm_page, "https://www.hkpm.org.hk/files/record/exhibition/30/5-1690871998.jpg",
        ["named-find-013"], "香港故宫展品页明确标注四号坑扭头跪坐人像；现档案是三件组合候选，该图是其中一件的单件照片。", "香港故宫官方展品页：扭头跪坐人像图片及展品标签"),
    pending_asset("hkpm-photo-k3-gold-mask", "三号坑金面罩（香港故宫展品照片）",
        hkpm_page, "https://www.hkpm.org.hk/files/record/exhibition/30/1400X1050-1694659423.jpg",
        ["hkpm-gold-mask-pit3-2021"], "香港故宫展品页明确标注三号坑、2021年出土的金面罩，图片位于该单件展品说明下。", "香港故宫官方展品页：面罩图片及展品标签"),
]
for item in hkpm_images:
    item["creator"] = "三星堆博物馆（香港故宫展品页注明版权）"
    item["rights_holder"] = "三星堆博物馆"
    item["original_source"] = "香港故宫文化博物馆官方展品页"
    item["review_note"] = "展品页注明 © 三星堆博物馆，但未给出可复用许可。仅登记图片来源和授权线索；取得权利人书面授权前不得作为网页图片发布或镜像。"

hkpm_label_images = [
    pending_asset("hkpm-photo-k8-bronze-mask-label", "八号坑青铜面具（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-2", "https://www.hkpm.org.hk/files/record/custom-page/31/mask-1695088591.jpg",
        ["hkpm-bronze-mask-pit8"], "香港故宫标签页明确标注八号坑青铜面具，图片与该件标签同页。", "香港故宫标签2：面具图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-k7-face-pattern-bell-label", "七号坑人脸纹铜铃（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-3", "https://www.hkpm.org.hk/files/record/custom-page/32/39_096%E3%80%81K7%20T100_600X495-1695088853.jpg",
        ["hkpm-face-pattern-bell-pit7"], "香港故宫标签页明确标注七号坑人脸纹铜铃，图片与该件标签同页。", "香港故宫标签3：人脸纹铜铃图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-k2-bronze-cowry-label", "二号坑青铜贝（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-4", "https://www.hkpm.org.hk/files/record/custom-page/33/41_062%E3%80%81000497_600X495-1695089095.jpg",
        ["hkpm-bronze-cowry-pit2"], "香港故宫标签页明确标注二号坑青铜贝及展览编号000497，图片与该件标签同页。", "香港故宫标签4：贝图片；版权标注四川广汉三星堆博物馆"),
    pending_asset("hkpm-photo-k3-jade-ge-label", "三号坑玉戈（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-5", "https://www.hkpm.org.hk/files/record/custom-page/34/53_076%E3%80%81K3QW%EF%BC%9A636_600X495-1695089286.jpg",
        ["hkpm-jade-ge-pit3"], "香港故宫标签页明确标注三号坑玉戈，图片与该件标签同页。", "香港故宫标签5：玉戈图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-rensheng-jade-cone-label", "仁胜村五号墓玉锥形器（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-6", "https://www.hkpm.org.hk/files/record/custom-page/35/61_099%E3%80%81001055_600X495-1695089604.jpg",
        ["hkpm-jade-cone-renshengcun"], "香港故宫标签页明确标注仁胜村五号墓玉锥形器及展览编号001055，图片与该件标签同页。", "香港故宫标签6：锥形器图片；版权标注三星堆博物馆"),
    pending_asset("hkpm-photo-k8-collared-jade-ring-group-label", "八号坑有领璧/瑗组合（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-7", "https://www.hkpm.org.hk/files/record/custom-page/36/QR7_BOJ_600X495-1695089821.jpg",
        ["hkpm-collared-jade-ring-group-pit8"], "香港故宫标签页明确标注八号坑三件有领璧/瑗，图片与该组展品标签同页。", "香港故宫标签7：有领璧/瑗图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-k7-bird-ornament-label", "七号坑鸟形饰（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-9", "https://www.hkpm.org.hk/files/record/custom-page/38/23_038%E3%80%81K7QWT%EF%BC%9A487%EF%BC%88951%29_600X495-1695090126.jpg",
        ["hkpm-bird-ornament-pit7"], "香港故宫标签页明确标注七号坑鸟形饰，图片与该件标签同页。", "香港故宫标签9：鸟形饰图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-k8-bronze-head-label", "八号坑青铜头像（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-10", "https://www.hkpm.org.hk/files/record/custom-page/39/9_011%E3%80%81K8%E2%91%A6-774_600X495-1695090531.jpg",
        ["hkpm-bronze-head-pit8"], "香港故宫标签页明确标注八号坑青铜头像，图片与该件标签同页。", "香港故宫标签10：头像图片；版权标注四川省文物考古研究院"),
    pending_asset("hkpm-photo-k3-bird-plaque-label", "三号坑镂空鸟形饰片（香港故宫展品标签照片）",
        "https://www.hkpm.org.hk/sc/g8-gazing-at-sanxingdui-label-14", "https://www.hkpm.org.hk/files/record/custom-page/43/29_044%E3%80%81K3QW%EF%BC%9A489_600X495-1695091127.jpg",
        ["hkpm-bird-plaque-pit3"], "香港故宫标签页明确标注三号坑鸟形饰片，图片与该件标签同页。", "香港故宫标签14：鸟形饰片图片；版权标注四川省文物考古研究院"),
]
for item in hkpm_label_images:
    item["creator"] = "四川省文物考古研究院或三星堆博物馆（以展品页标注为准）"
    item["rights_holder"] = "见来源页版权标注"
    item["original_source"] = "香港故宫文化博物馆官方展品标签页"
    item["review_note"] = "展品页注明四川省文物考古研究院或三星堆博物馆版权，但未给出可复用许可。仅登记照片来源和授权线索；取得权利人书面授权前不得作为网页图片发布或镜像。"

# Public institutional publications identify these embedded photographs, but
# this pass did not extract separate image files. Keep the page/PDF as a lead.
embedded_photo_leads = [
    pending_asset("sckg-k6-jade-knife-report-photo", "六号坑玉刀（发掘报告图版）",
        "https://sichuan.scol.com.cn/ggxw/202109/58277404.html", "https://cbgccdn.thecover.cn/9603_1631338385000.png-cgwapimg",
        ["named-find-025"], "四川在线文章及配图明确为六号坑出土玉刀，作为对应器物照片。", "四川在线文章配图：三星堆六号坑玉刀"),
    pending_asset("guanghan-k7-turtle-grid-vessel-photo", "七号坑龟背形网格状器（广汉市政府专题照片）",
        "https://sichuan.scol.com.cn/ggxw/202206/58542212.html", "https://imgcdn.scol.com.cn/NEWS_DA2452F58E96ED1B3F3E172BD6029AAC.JPG",
        ["named-find-027"], "四川在线文章明确图示七号坑龟背形网格状器，名称与档案一致。", "四川在线文章配图：七号坑龟背形网格状器"),
]
for item in embedded_photo_leads:
    item["creator"] = "四川在线（文章配图，原摄影者未标注）"
    item["rights_holder"] = "四川在线或原摄影者（未核验）"
    item["review_note"] = "按用户指示纳入展示数据；保留来源与未核验权利状态，页面应标注来源。"

# Context photographs are included when no object-level photograph was found;
# their captions explicitly say they depict the excavation context.
context_images = [
    pending_asset("sckg-k6-excavation-context-2023", "六号祭祀坑发掘现场（背景图）",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-230530154HR57.jpg",
        ["named-find-026"], "该图为六号坑发掘现场，并非木箱单件照片；作为该坑木箱档案的考古背景图。", "研究院页面图片说明：广汉三星堆遗址六号祭祀坑"),
    pending_asset("sckg-k8-excavation-context-2023", "八号祭祀坑发掘现场（背景图）",
        institute_page, "https://www.sckg.com/uploads/allimg/20230530/2-230530154P2336.jpg",
        ["named-find-041"], "该图为八号坑发掘现场，并非石磬单件照片；作为八号坑石磬档案的考古背景图。", "研究院页面图片说明：广汉三星堆遗址八号祭祀坑"),
]
for item in context_images:
    item["identity_match_status"] = "class_level"
    item["identity_match_note"] = "仅为对应祭祀坑现场背景图，不是档案所指器物的单件照片。"
    item["review_note"] = "按用户指示纳入展示数据；保留来源与未核验权利状态，页面应标注为发掘现场背景图。"

# Update the prior No. I sacred-tree match with its artifact ID: the file title
# identifies the museum's Bronze Mythical Tree No. 1, but the catalog mapping
# remains probable pending a cross-check against the museum object number.
if "commons-bronze-tree-yumeto-2025" in by_id:
    item = by_id["commons-bronze-tree-yumeto-2025"]
    item["artifact_ids"] = ["digicol-320"]
    item["identity_match_note"] = "文件标题指明三星堆博物馆一号青铜神树；数字文物库条目仍待馆藏号核对，按可能匹配展示。"

for item in new_assets + institute_images + hkpm_images + hkpm_label_images + embedded_photo_leads + context_images:
    if item["id"] in by_id:
        by_id[item["id"]].update(item)
    else:
        assets.append(item)
        by_id[item["id"]] = item

# The user explicitly requests these public reference photographs be shown in
# the site. Preserve the separate, truthful rights_status while exposing this
# publication instruction to data consumers.
for item in assets:
    if item["rights_status"] == "permission_pending" and item.get("file_url"):
        item["display_override"] = "user_requested_display"
        item["review_note"] = "按用户要求纳入网页展示；权利状态仍未核验，页面保留来源链接和署名，器物匹配等级不得升级。"

# Expose existing open-license close-up photographs beside matching artifact
# records as clearly labeled class illustrations. These are not assertions that
# the photographed object is the same excavated specimen as the catalog row.
class_links = {
    "commons-bronze-sacred-tree-momo": ["digicol-320"],
    "commons-bronze-tree-gary-todd": ["digicol-320"],
    "commons-jade-zhang-gary-todd": ["named-find-031", "shm-59742"],
    "commons-gold-mask-momo": ["hkpm-gold-mask-pit3-2021"],
    "commons-bronze-mask-bairuilong": ["shm-59716", "hkpm-bronze-mask-pit8"],
    "commons-k2-gilt-mask-bronze-head-kcx36": ["shm-59718"],
    "commons-113810821": ["shm-59730", "shm-59744"],
    "commons-111425989": ["shm-59748", "named-find-003"],
    "commons-120495383": ["digicol-322", "hkpm-bronze-dragon-device-pit8", "named-find-037"],
    "commons-54368446": ["shm-59716", "shm-59718"],
    "commons-54368627": ["hkpm-bronze-head-pit8", "scwwj-bronze-human-head-2-1986-k2"],
    "commons-54368443": ["hkpm-bronze-head-pit8", "named-find-011"],
    "commons-54368444": ["shm-59716", "shm-59718"],
    "commons-55085348": ["named-find-050", "named-find-053"],
    "commons-54364141": ["shm-59720", "ccdi-bronze-protruding-eyes-mask-1986"],
    "commons-54364142": ["shm-59716", "hkpm-bronze-mask-pit8"],
    "commons-54364989": ["shm-59720", "ccdi-bronze-protruding-eyes-mask-1986"],
    "commons-108903857": ["shm-59720", "hkpm-bronze-mask-pit8"],
    "commons-108903809": ["shm-59736", "hkpm-bronze-mask-pit8"],
    "commons-108903753": ["shm-59736", "hkpm-bronze-mask-pit8"],
    "commons-108903153": ["shm-59736"],
    "commons-98011103": ["shm-59752", "named-find-008"],
    "commons-98006765": ["shm-59752", "named-find-008"],
    "commons-98010680": ["named-find-050", "named-find-053"],
    "commons-98006767": ["digicol-319", "digicol-322"],
    "commons-98010332": ["digicol-321", "named-find-054"],
    "commons-98010330": ["shm-59744", "named-find-038"],
    "commons-98010331": ["shm-59730", "named-find-003"],
    "commons-97988464": ["shm-59716", "shm-59718"],
    "commons-98010328": ["shm-59754"],
    "commons-108906078": ["shm-59722", "hkpm-bird-ornament-pit7"],
    "commons-108906112": ["shm-59722", "hkpm-bird-ornament-pit7"],
    "commons-108908734": ["shm-59726"],
    "commons-108906093": ["shm-59748", "named-find-003"],
    "commons-108905589": ["hkpm-bronze-head-pit8", "named-find-011"],
    "commons-108905564": ["scwwj-bronze-human-head-2-1986-k2", "named-find-011"],
    "commons-108908260": ["shm-59722"],
    "commons-108903054": ["shm-59726"],
    # Additional nearest-type matches for previously uncovered records.
    "commons-98010331": ["digicol-314", "named-find-036", "named-find-039"],
    "commons-120495383": ["digicol-list-01", "shm-59724"],
    "commons-108904600": ["digicol-list-09", "named-find-028"],
    "commons-98010330": ["shm-59732"],
    "commons-154718848": ["shm-59734"],
    "commons-sanxingdui-pottery-dou-g41rn8": ["named-find-014"],
    "commons-sanxingdui-jade-chisel-todd": ["named-find-019"],
    "commons-sanxingdui-ivory-tusk-todd": ["named-find-024"],
    "commons-sanxingdui-bronze-altar-component-quinlan718": ["named-find-040"],
    "commons-sanxingdui-bronze-zun-todd-9950504065": ["named-find-049", "named-find-051"],
    "commons-sanxingdui-bronze-zun-todd-9950527686": ["named-find-049", "named-find-051"],
    "commons-sanxingdui-gold-foil-todd": ["named-find-048"],
    "commons-98010680": ["named-find-042"],
    "commons-98006767": ["named-find-005", "named-find-036"],
    "commons-sanxingdui-bronze-dragon-column-todd": ["digicol-list-12", "named-find-005", "named-find-035", "named-find-040"],
}
for asset_id, targets in class_links.items():
    asset = by_id.get(asset_id)
    if not asset:
        continue
    asset["artifact_ids"] = sorted(set(asset.get("artifact_ids", [])) | set(targets))
    asset["identity_match_status"] = "class_level"
    asset["identity_match_note"] = "开放许可照片与档案名称属于相同器物类别；图片未提供足以确认坑位、馆藏号或同一实物的证据，故仅作类别配图。"
    asset["use_status"] = "approved_class_illustration_only"
    if asset_id == "commons-k2-gilt-mask-bronze-head-kcx36":
        asset["identity_match_status"] = "probable"
        asset["identity_match_note"] = "Commons标题指明二号坑戴金面罩铜头像；与辫发头像档案同坑且同属戴金面罩头像，但发式和具体馆藏号尚未核对。"
        asset["review_note"] = "可按同类头像配图展示；不得标注为已确认的该辫发头像照片。"
    if asset_id == "commons-108903153":
        asset["identity_match_status"] = "probable"
        asset["identity_match_note"] = "Commons标题称三星堆出土最大青铜面具，可能对应大面具档案；缺少馆藏号与坑位确认。"

# Group photographs from the institute show the named component types, but
# not isolated, individually catalogued objects.
group_links = {
    "sckg-dragon-lid-and-kneeling-figure-2023": ["named-find-005", "digicol-list-12"],
    "sckg-jade-artifacts-group-2023": ["hkpm-jade-fangzuo-pit3", "named-find-010", "named-find-021"],
    "sckg-k5-ivory-carving-2023": ["named-find-024"],
}
for asset_id, targets in group_links.items():
    asset = by_id[asset_id]
    asset["artifact_ids"] = sorted(set(asset.get("artifact_ids", [])) | set(targets))
    asset["identity_match_status"] = "class_level"
    asset["identity_match_note"] = "来源照片显示对应器类或组合部件，但不是档案所指单件的独立照片；按同类/组合图展示。"
    asset["display_override"] = "user_requested_display"
    asset["review_note"] = "按用户指示纳入展示数据；保留来源与未核验权利状态，页面应标注为组合图或同类参考。"

# The Institute page labels these two source photographs by exact item name.
# Associate each component with its own record, while retaining the group-photo
# note. Rights permission remains pending, so these do not render in the site.
by_id["sckg-dragon-lid-and-kneeling-figure-2023"]["identity_match_status"] = "class_level"
by_id["sckg-dragon-lid-and-kneeling-figure-2023"]["identity_match_note"] = "同框组合照片包含铜爬龙器盖与铜扭头跪坐人像；组件名称明确，但照片不是单件独立照，且坑位未在图注中说明。"

ASSETS_PATH.write_text("".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n" for x in assets), encoding="utf-8")

# Each image link is auditable by the artifact record and retains its matching
# level. User-directed display does not change the image's recorded rights status.
objects = {}
for pattern in ("*artifacts*.jsonl", "named-find-artifact-profiles.jsonl"):
    for path in (ROOT / "data" / "acquisition").glob(pattern):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            obj = json.loads(line)
            objects.setdefault(obj["id"], obj)

linked = {}
for asset in assets:
    for artifact_id in asset.get("artifact_ids", []):
        linked.setdefault(artifact_id, []).append(asset)

coverage = []
for artifact_id, obj in objects.items():
    refs = linked.get(artifact_id, [])
    exact_ready = [a for a in refs if a["identity_match_status"] == "exact" and (a["use_status"] == "approved_with_attribution" or a.get("display_override") == "user_requested_display")]
    illustrative = [a for a in refs if a["identity_match_status"] == "class_level" and (a["use_status"] == "approved_class_illustration_only" or a.get("display_override") == "user_requested_display")]
    pending = [a for a in refs if a["rights_status"] == "permission_pending"]
    user_display = [a for a in refs if a.get("display_override") == "user_requested_display"]
    status = "exact_photo_ready" if exact_ready else "class_illustration_ready" if illustrative else "photo_user_directed_display" if user_display else "photo_permission_pending" if pending else "no_verified_photo_reference"
    coverage.append({
        "artifact_id": artifact_id,
        "artifact_name": obj.get("name") or obj.get("title"),
        "photo_status": status,
        "asset_ids": [a["id"] for a in refs],
        "exact_photo_count": len(exact_ready),
        "class_illustration_count": len(illustrative),
        "permission_pending_count": len(pending),
        "user_directed_display_count": len(user_display),
        "next_action": "补找器物单件照" if not refs else "保留来源、署名和匹配等级",
    })
coverage_path = MEDIA / "artifact-photo-coverage.jsonl"
coverage_path.write_text("".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n" for x in coverage), encoding="utf-8")

rights_counts = {}
for asset in assets:
    rights_counts[asset["rights_status"]] = rights_counts.get(asset["rights_status"], 0) + 1
identity_counts = {}
for asset in assets:
    identity_counts[asset["identity_match_status"]] = identity_counts.get(asset["identity_match_status"], 0) + 1
coverage_counts = {}
for row in coverage:
    coverage_counts[row["photo_status"]] = coverage_counts.get(row["photo_status"], 0) + 1

summary = {
    "as_of": TODAY,
    "scope_note": "Coverage describes this project's rights register, not all media available online.",
    "registered_assets": {
        "total": len(assets),
        "images": sum(1 for a in assets if a["media_type"] == "image"),
        "video_stills": sum(1 for a in assets if a.get("subtype") == "video_still"),
        "independent_videos": sum(1 for a in assets if a["media_type"] == "video"),
        "audio": sum(1 for a in assets if a["media_type"] == "audio"),
        "3d_models": sum(1 for a in assets if a["media_type"] == "model_3d"),
        "museum_authorized_high_resolution_masters": 0,
    },
    "rights_review": {
        "open_license_claimed": rights_counts.get("open_license_claimed", 0),
        "permission_documented": rights_counts.get("permission_documented", 0),
        "permission_pending": rights_counts.get("permission_pending", 0),
        "unknown_or_restricted": rights_counts.get("unknown", 0) + rights_counts.get("restricted", 0),
        "note": "部分图片按用户要求加入展示数据；rights_status仍保留来源页可核验的权利信息。",
    },
    "identity_review": identity_counts,
    "artifact_photo_coverage": {
        "artifact_records": len(coverage),
        **coverage_counts,
        "coverage_file": "artifact-photo-coverage.jsonl",
        "note": "同件照片、同类图、用户要求展示的来源图和无图片线索分开统计；现场图不会标成器物单件照。",
    },
    "next_collection_targets": [
        "优先为无公开照片记录的器物寻找开放许可的单件照片或馆方授权照片。",
        "向三星堆博物馆和四川省文物考古研究院申请正式影像目录及网站展示授权。",
        "核对可能匹配的图片与馆藏号；保留器物身份匹配和图片使用许可两种独立状态。",
    ],
}
(MEDIA / "coverage.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(json.dumps({"assets": len(assets), "new_records": sum(1 for x in new_assets + institute_images + hkpm_images + hkpm_label_images + embedded_photo_leads if x["id"] in by_id), "artifacts": len(coverage), "coverage": coverage_counts, "rights": rights_counts}, ensure_ascii=False, indent=2))
