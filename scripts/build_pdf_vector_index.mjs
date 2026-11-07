#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {LocalHuggingFaceEmbeddings, corpusFingerprint, LOCAL_EMBEDDING_MODEL} from "../rag/local_hf_embeddings.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAG_DIR = path.join(ROOT, "rag");
const CHUNKS_PATH = path.join(RAG_DIR, "pdf_chunks.jsonl");
const INDEX_PATH = path.join(RAG_DIR, "pdf_vector_index.jsonl");
const PARTIAL_PATH = `${INDEX_PATH}.partial`;
const BUILD_PATH = `${INDEX_PATH}.building.json`;
const MODEL = LOCAL_EMBEDDING_MODEL;
const BATCH_SIZE = Math.max(1, Number(process.env.RAG_EMBEDDING_BATCH_SIZE || 24));

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${error.message}`); }
  });
}

function sameBuild(a, b) {
  return a?.provider === b.provider && a?.model === b.model && a?.corpusFingerprint === b.corpusFingerprint;
}

const chunks = readJsonl(CHUNKS_PATH).filter(chunk => typeof chunk.content === "string" && chunk.content.trim());
if (!chunks.length) throw new Error(`没有可向量化的文本块：${CHUNKS_PATH}`);
const build = {
  schemaVersion:1,
  provider:"huggingface-local",
  model:MODEL,
  corpusFingerprint:corpusFingerprint(chunks),
  chunkCount:chunks.length,
  createdAt:new Date().toISOString(),
};

const existingIndex = readJsonl(INDEX_PATH);
if (existingIndex.length && sameBuild(existingIndex[0], build)) {
  console.log(`向量索引已是最新：${existingIndex.length - 1} 个文本块，模型 ${MODEL}`);
  process.exit(0);
}

let state = fs.existsSync(BUILD_PATH) ? JSON.parse(fs.readFileSync(BUILD_PATH, "utf8")) : null;
if (state && !sameBuild(state, build)) {
  if (!process.argv.includes("--force")) {
    throw new Error("语料或模型配置已变化。请使用 npm run index:pdf -- --force 重新开始构建。");
  }
  state = null;
}
if (fs.existsSync(INDEX_PATH) && !sameBuild(existingIndex[0], build) && !process.argv.includes("--force")) {
  throw new Error("现有向量索引与当前语料或模型不匹配。请先确认后使用 npm run index:pdf -- --force 重建。");
}

if (!state) {
  fs.writeFileSync(PARTIAL_PATH, "", "utf8");
  fs.writeFileSync(BUILD_PATH, JSON.stringify(build, null, 2), "utf8");
  state = build;
} else if (!fs.existsSync(PARTIAL_PATH)) {
  fs.writeFileSync(PARTIAL_PATH, "", "utf8");
}

const indexed = new Set(readJsonl(PARTIAL_PATH).map(row => row.chunk_id));
const pending = chunks.filter(chunk => !indexed.has(chunk.chunk_id));
const embeddings = new LocalHuggingFaceEmbeddings({maxConcurrency:1});
console.log(`本地向量化：${pending.length}/${chunks.length} 个文本块，模型 ${MODEL}`);

for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
  const batch = pending.slice(offset, offset + BATCH_SIZE);
  const vectors = await embeddings.embedDocuments(batch.map(chunk => chunk.content));
  const lines = batch.map((chunk, index) => JSON.stringify({chunk_id:chunk.chunk_id, embedding:vectors[index]})).join("\n") + "\n";
  fs.appendFileSync(PARTIAL_PATH, lines, "utf8");
  console.log(`完成 ${Math.min(offset + batch.length, pending.length)}/${pending.length}；索引累计 ${indexed.size + offset + batch.length}/${chunks.length}`);
}

const partialRows = readJsonl(PARTIAL_PATH);
if (partialRows.length !== chunks.length) throw new Error(`向量数量不完整：${partialRows.length}/${chunks.length}`);
const partialIds = new Set(partialRows.map(row => row.chunk_id));
if (chunks.some(chunk => !partialIds.has(chunk.chunk_id))) throw new Error("向量索引缺少文本块，未发布索引文件。");

const tempPath = `${INDEX_PATH}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify({...build, status:"ready", dimensions:partialRows[0]?.embedding?.length || 0})}\n${partialRows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf8");
fs.renameSync(tempPath, INDEX_PATH);
fs.rmSync(PARTIAL_PATH, {force:true});
fs.rmSync(BUILD_PATH, {force:true});
console.log(`向量索引已保存：${INDEX_PATH}；${partialRows.length} 个向量，${partialRows[0]?.embedding?.length || 0} 维。`);
