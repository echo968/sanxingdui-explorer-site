#!/usr/bin/env python3
"""Fetch an explicit allowlisted set of public pages into a provenance archive.

This intentionally does not call undocumented or signed museum APIs, bypass
access controls, download media, or infer artifact facts from page shells.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "sources.json"
OUT_DIR = ROOT / "data" / "acquisition"
USER_AGENT = "SanxingduiResearchCollector/0.1 (+https://www.sxd.cn/; contact: configure before production use)"


class TextExtractor(HTMLParser):
    SKIP_TAGS = {"script", "style", "noscript", "svg"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.SKIP_TAGS:
            self.skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.skip_depth and data.strip():
            self.parts.append(data.strip())


def extract_title(source: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title\s*>", source, flags=re.I | re.S)
    return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip()) if match else None


def extract_text(source: str) -> str:
    parser = TextExtractor()
    parser.feed(source)
    return "\n".join(parser.parts)


def is_spa_shell(source: str) -> bool:
    return bool(re.search(r'<div[^>]+id=["\']app["\']', source, flags=re.I)) and len(extract_text(source)) < 400


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delay", type=float, default=2.0, help="minimum seconds between requests (default: 2)")
    parser.add_argument("--limit", type=int, default=20, help="maximum manifest entries to fetch")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    allowed_hosts = set(manifest["allowed_hosts"])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    last_request = 0.0

    for item in manifest["sources"][: args.limit]:
        url = item["url"]
        host = (urlparse(url).hostname or "").lower()
        result: dict[str, object] = {
            "source_id": item["id"], "url": url, "kind": item["kind"],
            "title": item.get("title"), "rights_note": item.get("rights_note"),
            "fetched_at": datetime.now(timezone.utc).isoformat(), "status": "pending"
        }
        if urlparse(url).scheme != "https" or host not in allowed_hosts:
            result.update(status="rejected", error="URL is not HTTPS on an allowlisted host")
            results.append(result)
            continue

        delay = max(0.0, args.delay - (time.monotonic() - last_request))
        if delay:
            time.sleep(delay)
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
        last_request = time.monotonic()
        try:
            with urlopen(request, timeout=30) as response:
                body = response.read(8_000_000)
                charset = response.headers.get_content_charset() or "utf-8"
                source = body.decode(charset, errors="replace")
                status_code = response.status
                final_url = response.geturl()
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            result.update(status="fetch_error", error=str(exc))
            results.append(result)
            continue

        digest = hashlib.sha256(body).hexdigest()
        raw_path = OUT_DIR / f"{item['id']}-{digest[:12]}.html"
        raw_path.write_bytes(body)
        text = extract_text(source)
        result.update(
            status="fetched",
            status_code=status_code,
            final_url=final_url,
            sha256=digest,
            raw_file=str(raw_path.relative_to(ROOT)).replace("\\", "/"),
            page_title=extract_title(source),
            extracted_text=text,
            extraction_status="requires_render_or_authorized_export" if is_spa_shell(source) else "static_html",
        )
        results.append(result)
        print(f"{item['id']}: {result['status_code']} {result['extraction_status']}")

    archive_path = OUT_DIR / "crawl_manifest.jsonl"
    with archive_path.open("a", encoding="utf-8", newline="\n") as archive:
        for result in results:
            archive.write(json.dumps(result, ensure_ascii=False) + "\n")
    print(f"Saved {len(results)} source results to {archive_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
