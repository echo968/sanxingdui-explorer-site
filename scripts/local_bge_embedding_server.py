#!/usr/bin/env python
"""Local-only HTTP adapter for the downloaded BAAI/bge-m3 sentence-transformers model."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.environ.get("RAG_EMBEDDING_MODEL_PATH", ROOT.parent / "models" / "bge-m3")).resolve()
HOST = "127.0.0.1"
PORT = int(os.environ.get("RAG_EMBEDDING_PORT", "11435"))
DEVICE = os.environ.get("RAG_EMBEDDING_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")


if not MODEL_PATH.is_dir() or not (MODEL_PATH / "model.safetensors").is_file():
    raise SystemExit(f"本地 BGE-M3 模型文件不完整：{MODEL_PATH}")

print(f"加载本地 BGE-M3：{MODEL_PATH}（{DEVICE}）", flush=True)
model = SentenceTransformer(str(MODEL_PATH), device=DEVICE, local_files_only=True)
dimension = model.get_sentence_embedding_dimension()


class Handler(BaseHTTPRequestHandler):
    server_version = "LocalBgeEmbedding/1.0"

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            return self.send_json(404, {"error": "not found"})
        return self.send_json(200, {
            "ready": True,
            "model": "BAAI/bge-m3@694b61558aea4ae2512ed8d0e189d5cf8adc2259",
            "dimension": dimension,
            "device": str(model.device),
        })

    def do_POST(self):
        if self.path != "/embed":
            return self.send_json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 2_000_000:
                return self.send_json(413, {"error": "request body too large or empty"})
            payload = json.loads(self.rfile.read(length))
            texts = payload.get("input") if isinstance(payload, dict) else None
            if not isinstance(texts, list) or not texts or len(texts) > 64 or any(not isinstance(item, str) for item in texts):
                return self.send_json(400, {"error": "input must be a list of 1 to 64 strings"})
            vectors = model.encode(
                texts,
                batch_size=min(8, len(texts)),
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            if not np.isfinite(vectors).all():
                return self.send_json(500, {"error": "model returned non-finite embeddings"})
            return self.send_json(200, {"model": "BAAI/bge-m3", "dimension": dimension, "embeddings": vectors.tolist()})
        except Exception as error:
            return self.send_json(500, {"error": str(error)[:500]})

    def log_message(self, fmt, *args):
        print(f"BGE {self.address_string()} {fmt % args}", flush=True)


print(f"本地 embedding 服务就绪：http://{HOST}:{PORT}；维度 {dimension}", flush=True)
ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
