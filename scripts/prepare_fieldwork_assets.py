"""Copy and gzip the six supplied OBJ model sets for on-demand browser loading."""

from __future__ import annotations

import argparse
import gzip
import json
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(r"D:\三星堆\3D模型拆分解析\三星堆青铜器_6组"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "dist" / "assets" / "archaeology" / "models",
    )
    parser.add_argument("--proxy-grid", type=int, default=12, help="Voxel grid resolution for low-detail reveal proxies")
    args = parser.parse_args()
    if not args.source.is_dir():
        raise SystemExit(f"Model source directory not found: {args.source}")

    rows = []
    for index in range(1, 7):
        group = f"artifact_group_{index:02d}"
        source_dir = args.source / group
        required = [source_dir / "model.obj", source_dir / "material.mtl", source_dir / "1.jpg"]
        missing = [path.name for path in required if not path.is_file()]
        if missing:
            raise SystemExit(f"{group} missing: {', '.join(missing)}")
        target_dir = args.output / group
        target_dir.mkdir(parents=True, exist_ok=True)
        with required[0].open("rb") as src, (target_dir / "model.obj.gz").open("wb") as raw_dst:
            with gzip.GzipFile(fileobj=raw_dst, mode="wb", compresslevel=6, mtime=0) as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)
        proxy_vertices, proxy_faces = build_proxy(required[0], args.proxy_grid)
        proxy_path = target_dir / "proxy.json"
        proxy_path.write_text(json.dumps({"vertices": proxy_vertices, "faces": proxy_faces}, separators=(",", ":")), encoding="utf-8")
        shutil.copy2(required[1], target_dir / "material.mtl")
        shutil.copy2(required[2], target_dir / "1.jpg")
        rows.append((group, required[0].stat().st_size, (target_dir / "model.obj.gz").stat().st_size, len(proxy_faces)))

    print("group, original_bytes, gzip_bytes, proxy_triangles")
    for row in rows:
        print(f"{row[0]}, {row[1]}, {row[2]}, {row[3]}")
    print(f"Prepared {len(rows)} model sets in {args.output}")


def build_proxy(obj_path: Path, resolution: int) -> tuple[list[list[float]], list[list[int]]]:
    """Create a compact vertex-clustered mesh for the buried reveal silhouette."""
    source_vertices: list[tuple[float, float, float]] = []
    with obj_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if line.startswith("v "):
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        source_vertices.append((float(parts[1]), float(parts[2]), float(parts[3])))
                    except ValueError:
                        continue
    if not source_vertices:
        raise SystemExit(f"No OBJ vertices found: {obj_path}")

    mins = [min(point[i] for point in source_vertices) for i in range(3)]
    spans = [max(point[i] for point in source_vertices) - mins[i] for i in range(3)]
    cells: dict[tuple[int, int, int], list[float]] = {}
    vertex_cells: list[tuple[int, int, int]] = []
    for point in source_vertices:
        key = tuple(min(resolution - 1, max(0, int((point[i] - mins[i]) / spans[i] * resolution))) if spans[i] else 0 for i in range(3))
        vertex_cells.append(key)
        cell = cells.setdefault(key, [0.0, 0.0, 0.0, 0.0])
        for axis in range(3):
            cell[axis] += point[axis]
        cell[3] += 1
    keys = list(cells)
    key_indices = {key: index for index, key in enumerate(keys)}
    vertices = [[round(cells[key][axis] / cells[key][3], 5) for axis in range(3)] for key in keys]
    remapped = [key_indices[key] for key in vertex_cells]
    faces: list[list[int]] = []
    seen: set[tuple[int, int, int]] = set()
    with obj_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.startswith("f "):
                continue
            refs = line.split()[1:]
            indices = []
            for ref in refs:
                raw = ref.split("/", 1)[0]
                try:
                    value = int(raw)
                except ValueError:
                    continue
                source_index = value - 1 if value > 0 else len(source_vertices) + value
                if 0 <= source_index < len(remapped):
                    indices.append(remapped[source_index])
            for offset in range(1, len(indices) - 1):
                tri = (indices[0], indices[offset], indices[offset + 1])
                if len(set(tri)) != 3:
                    continue
                key = tuple(sorted(tri))
                if key in seen:
                    continue
                seen.add(key)
                faces.append(list(tri))
    return vertices, faces


if __name__ == "__main__":
    main()
