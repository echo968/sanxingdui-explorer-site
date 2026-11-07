"""Extract the tree-shaped third OBJ object from the supplied mixed bronze-assets model.

The source labels all six objects generically. The extracted object's form is tree-like,
but its exact museum-object identity is not established; the UI must retain that caveat.
"""
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\三星堆\984-三星堆青铜器3D素材\三星堆青铜器OBJ\三星堆青铜器.obj")
OUTPUT = PROJECT / "dist" / "assets" / "ai-exhibition" / "sanxingdui-tree-candidate.obj"
TARGET_OBJECT = 2  # Zero-based: the third generic object has a tree-like upright form in the supplied OBJ.

vertices: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)]
faces: list[list[int]] = []
object_index = -1
inside_target = False

with SOURCE.open("r", encoding="utf-8", errors="ignore") as source:
    for line in source:
        if line.startswith("v "):
            vertices.append(tuple(map(float, line.split()[1:4])))
        elif line.startswith("o "):
            object_index += 1
            inside_target = object_index == TARGET_OBJECT
        elif inside_target and line.startswith("f "):
            indices = []
            for token in line.split()[1:]:
                raw = int(token.split("/", 1)[0])
                index = raw if raw > 0 else len(vertices) + raw
                indices.append(index)
            if len(indices) >= 3:
                faces.append(indices)

if object_index < TARGET_OBJECT or not faces:
    raise SystemExit("Could not find the expected tree-shaped object group in the source OBJ.")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
vertex_map: dict[int, int] = {}
with OUTPUT.open("w", encoding="ascii", newline="\n") as out:
    out.write("# Extracted tree-shaped candidate from the supplied mixed bronze OBJ asset.\n")
    out.write("# Source object label: generic object 3; exact artifact identity requires verification.\n")
    out.write("o SanxingduiTreeCandidate\n")
    for face in faces:
        remapped = []
        for old_index in face:
            new_index = vertex_map.get(old_index)
            if new_index is None:
                point = vertices[old_index]
                new_index = len(vertex_map) + 1
                vertex_map[old_index] = new_index
                out.write(f"v {point[0]:.8f} {point[1]:.8f} {point[2]:.8f}\n")
            remapped.append(new_index)
        out.write("f " + " ".join(map(str, remapped)) + "\n")

print(f"Extracted {len(faces)} faces, {len(vertex_map)} vertices -> {OUTPUT}")
