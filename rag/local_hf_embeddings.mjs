import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Embeddings} from "@langchain/core/embeddings";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_SCRIPT = path.join(ROOT, "scripts", "local_bge_embedding_server.py");
const DEFAULT_BASE_URL = "http://127.0.0.1:11435";
const MODEL = "BAAI/bge-m3@694b61558aea4ae2512ed8d0e189d5cf8adc2259";
const MODEL_PATH = process.env.RAG_EMBEDDING_MODEL_PATH || path.resolve(ROOT, "..", "models", "bge-m3");
let serverProcess;
let startup;

async function checkService(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`, {signal:AbortSignal.timeout(1200)});
    if (!response.ok) return null;
    const data = await response.json();
    return data.ready && data.model === MODEL ? data : null;
  } catch { return null; }
}

async function ensureService(baseUrl) {
  const running = await checkService(baseUrl);
  if (running) return running;
  if (!startup) {
    startup = (async () => {
      const python = process.env.PYTHON_PATH || "python";
      serverProcess = spawn(python, [SERVER_SCRIPT], {
        windowsHide:true,
        stdio:"ignore",
        env:{...process.env, RAG_EMBEDDING_MODEL_PATH:MODEL_PATH},
      });
      serverProcess.unref();
      const startedAt = Date.now();
      while (Date.now() - startedAt < Number(process.env.RAG_EMBEDDING_STARTUP_TIMEOUT_MS || 180000)) {
        const health = await checkService(baseUrl);
        if (health) return health;
        if (serverProcess.exitCode !== null) throw new Error(`本地 BGE-M3 服务启动失败，退出码 ${serverProcess.exitCode}。`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      throw new Error("本地 BGE-M3 加载超时。请检查 Python、PyTorch/CUDA 和模型路径配置。");
    })().catch(error => {
      startup = null;
      throw error;
    });
  }
  return startup;
}

export class LocalHuggingFaceEmbeddings extends Embeddings {
  constructor({baseUrl = process.env.RAG_EMBEDDING_URL || DEFAULT_BASE_URL, ...params} = {}) {
    super(params);
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async embedDocuments(texts) {
    if (!texts.length) return [];
    await ensureService(this.baseUrl);
    const response = await fetch(`${this.baseUrl}/embed`, {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({input:texts}),
      signal:AbortSignal.timeout(Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || 120000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`本地 BGE-M3 embedding 失败：${payload.error || response.statusText}`);
    if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== texts.length) {
      throw new Error("本地 BGE-M3 返回的 embedding 数量与输入文本数量不一致。");
    }
    const dimension = payload.embeddings[0]?.length;
    if (!Number.isInteger(dimension) || dimension < 1 || payload.embeddings.some(vector =>
      !Array.isArray(vector) || vector.length !== dimension || vector.some(value => !Number.isFinite(value)))) {
      throw new Error("本地 BGE-M3 返回了格式无效的 embedding 向量。");
    }
    return payload.embeddings;
  }

  async embedQuery(text) {
    return (await this.embedDocuments([text]))[0];
  }
}

export function corpusFingerprint(chunks) {
  const hash = createHash("sha256");
  for (const chunk of chunks) {
    hash.update(JSON.stringify([chunk.chunk_id, chunk.content, chunk.source_locator || ""]));
    hash.update("\n");
  }
  return hash.digest("hex");
}

export {MODEL as LOCAL_EMBEDDING_MODEL};
