"""Regenerate compact buried-display proxies from the photo-reconstructed jade OBJ meshes."""
import json
from pathlib import Path

from prepare_fieldwork_assets import build_proxy

MODEL_DIR = Path(__file__).resolve().parents[1] / "dist" / "assets" / "archaeology" / "models" / "jade-approx"

for name in ("jade-cong", "jade-zhang"):
    source = MODEL_DIR / f"{name}.obj"
    vertices, faces = build_proxy(source, resolution=24)
    target = MODEL_DIR / f"{name}-proxy.json"
    target.write_text(json.dumps({"vertices": vertices, "faces": faces}, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(vertices)} proxy vertices, {len(faces)} proxy triangles")
