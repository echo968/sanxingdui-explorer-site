#!/usr/bin/env node
"use strict";

// Build a private, provenance-preserving page/chunk corpus from D:\三星堆\pdf.
// Text PDFs are extracted with Poppler. The three 2009 catalog volumes reuse
// the project's existing page OCR. Image-only pages remain explicit OCR tasks.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {spawn} = require("node:child_process");
const {StringDecoder} = require("node:string_decoder");
const {once} = require("node:events");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.resolve(process.env.RAG_PDF_DIR || path.join(ROOT, "..", "pdf"));
const OCR_DIR = path.resolve(ROOT, "..", "文物全记录300件提取");
const OUT_DIR = path.join(ROOT, "rag");
const OCR_GAPS_PATH = path.join(OUT_DIR, "ocr_pages.jsonl");
const PDFINFO = process.env.PDFINFO_PATH || "pdfinfo";
const PDFTOTEXT = process.env.PDFTOTEXT_PATH || "pdftotext";
const MAX_CHARS = 900;
const OVERLAP_CHARS = 100;

const PDF_METADATA = [
  {match: "2-230HQ059124Q.pdf", id: "sxd-paper-k5-gold-mask-2022", title: "三星堆遗址祭祀区五号坑出土金面具", type: "archaeological_research_article", year: 2022},
  {match: "2-240514103U5564.pdf", id: "sxd-report-k4-2024", title: "四川广汉市三星堆遗址祭祀区四号坑发掘简报", type: "excavation_report", year: 2024},
  {match: "2-240924145943M8.pdf", id: "sxd-report-k3-2024", title: "四川广汉市三星堆遗址祭祀区三号坑发掘简报", type: "excavation_report", year: 2024},
  {match: "2-240924150035413.pdf", id: "sxd-report-k8-2024", title: "四川广汉市三星堆遗址祭祀区八号坑发掘简报", type: "excavation_report", year: 2024},
  {match: "2-250612153P91T.pdf", id: "sxd-report-k7-2025", title: "四川广汉市三星堆遗址祭祀区七号坑发掘简报", type: "excavation_report", year: 2025},
  {match: "33357_三星堆之惑.pdf", id: "sxd-book-xu-hong-2022", title: "三星堆之惑", type: "archaeological_monograph", year: 2022},
  {match: "三星堆出土文物全记录（青铜器）", id: "sxd-book-2009-bronze", title: "三星堆出土文物全记录·青铜器", type: "illustrated_artifact_catalog", year: 2009, volume: "青铜器", ocr: "ocr_青铜器.jsonl"},
  {match: "三星堆出文物全记录（陶器", id: "sxd-book-2009-pottery-gold", title: "三星堆出土文物全记录·陶器、金器", type: "illustrated_artifact_catalog", year: 2009, volume: "陶器·金器", ocr: "ocr_陶器_金器.jsonl"},
  {match: "三星堆出文物全记录（玉器", id: "sxd-book-2009-jade-stone", title: "三星堆出土文物全记录·玉器、石器", type: "illustrated_artifact_catalog", year: 2009, volume: "玉器·石器", ocr: "ocr_玉器_石器.jsonl"},
  {match: "三星堆祭祀坑.pdf", id: "sxd-book-sacrificial-pits-local-scan", title: "三星堆祭祀坑（书目信息待核）", type: "excavation_catalog_or_monograph", year: null, ocr: null},
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {windowsHide: true, ...options});
    const stdout = [];
    const stderr = [];
    child.stdout?.on("data", chunk => stdout.push(chunk));
    child.stderr?.on("data", chunk => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", code => {
      const result = {code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8")};
      if (code !== 0) reject(new Error(`${command} exited with ${code}: ${result.stderr.trim()}`));
      else resolve(result);
    });
  });
}

function fingerprint(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function pageCount(file) {
  const {stdout} = await run(PDFINFO, [file]);
  const match = stdout.match(/^Pages:\s+(\d+)\s*$/m);
  if (!match) throw new Error(`Cannot read page count from pdfinfo output: ${file}`);
  return Number(match[1]);
}

async function readOcrPages(file) {
  const text = await fs.promises.readFile(file, "utf8");
  const pages = new Map();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); }
    catch (error) { throw new Error(`Invalid OCR JSONL at ${file}:${index + 1}: ${error.message}`); }
    if (Number.isInteger(Number(row.page)) && Number(row.page) > 0) pages.set(Number(row.page), String(row.text || ""));
  }
  return pages;
}

async function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const text = await fs.promises.readFile(file, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${error.message}`); }
  });
}

function hasUsableText(text) {
  return String(text || "").replace(/\s/g, "").length >= 25;
}

function splitPage(text) {
  const normalized = String(text || "").replace(/[\t\r\f\v ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];
  if (normalized.length <= MAX_CHARS) return [normalized];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + MAX_CHARS, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const boundary = Math.max(window.lastIndexOf("\n"), window.lastIndexOf("。"), window.lastIndexOf("；"), window.lastIndexOf("！"), window.lastIndexOf("？"));
      if (boundary > MAX_CHARS / 2) end = start + boundary + 1;
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - OVERLAP_CHARS);
  }
  return chunks;
}

async function writeJsonl(file, rows) {
  const temp = `${file}.tmp`;
  const stream = fs.createWriteStream(temp, {encoding: "utf8"});
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, "drain");
  }
  stream.end();
  await once(stream, "close");
  await fs.promises.rename(temp, file);
}

async function* extractTextPages(file) {
  const child = spawn(PDFTOTEXT, ["-layout", "-enc", "UTF-8", file, "-"], {windowsHide: true, stdio: ["ignore", "pipe", "pipe"]});
  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  const decoder = new StringDecoder("utf8");
  let pending = "";
  let processError = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { processError += chunk; });
  try {
    for await (const buffer of child.stdout) {
      pending += decoder.write(buffer);
      const pages = pending.split("\f");
      pending = pages.pop();
      for (const page of pages) yield page;
    }
    pending += decoder.end();
    if (pending.length) yield pending;
    const code = await closed;
    if (code !== 0) throw new Error(`${PDFTOTEXT} exited with ${code}: ${processError.trim()}`);
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

function relativeToRoot(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

async function main() {
  const files = (await fs.promises.readdir(SOURCE_DIR, {withFileTypes: true}))
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map(entry => path.join(SOURCE_DIR, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-CN"));
  if (!files.length) throw new Error(`No PDF files found in ${SOURCE_DIR}`);

  const documents = [];
  const pages = [];
  const chunks = [];
  const generatedOcr = new Map((await readJsonl(OCR_GAPS_PATH)).map(row => [`${row.document_id}:${row.pdf_page}`, row]));
  for (const file of files) {
    const filename = path.basename(file);
    const metadata = PDF_METADATA.find(item => filename.includes(item.match));
    if (!metadata) throw new Error(`PDF is not registered in PDF_METADATA: ${filename}`);
    const [count, sha256] = await Promise.all([pageCount(file), fingerprint(file)]);
    const ocrPath = metadata.ocr ? path.join(OCR_DIR, metadata.ocr) : null;
    const hasExistingOcr = Boolean(ocrPath && fs.existsSync(ocrPath));
    const ocrPages = hasExistingOcr ? await readOcrPages(ocrPath) : new Map();
    let extractedPages = 0;
    let ocrRequiredPages = 0;
    let sourceTextPages = 0;
    let sourceMethod = hasExistingOcr ? "existing_page_ocr" : "pdf_text_layer";
    const pageRows = new Map();

    if (hasExistingOcr) {
      for (let number = 1; number <= count; number += 1) {
        let content = ocrPages.get(number) || "";
        let confidence = null;
        if (!hasUsableText(content)) {
          const scanned = generatedOcr.get(`${metadata.id}:${number}`);
          if (scanned && hasUsableText(scanned.content)) {
            content = scanned.content;
            confidence = scanned.confidence ?? null;
          }
        }
        const hasText = hasUsableText(content);
        pageRows.set(number, {content, confidence, method: hasText ? "machine_ocr" : "none", status: hasText ? "machine_ocr_unreviewed" : "ocr_required"});
      }
    } else {
      let number = 0;
      for await (const rawPage of extractTextPages(file)) {
        number += 1;
        if (number > count) break;
        const content = rawPage.replace(/\u0000/g, "").trim();
        const hasText = content.replace(/\s/g, "").length >= 25;
        pageRows.set(number, {content, method: hasText ? "pdf_text_layer" : "none", status: hasText ? "text_extracted_unreviewed" : "ocr_required"});
      }
      for (let number = 1; number <= count; number += 1) {
        if (!pageRows.has(number)) pageRows.set(number, {content: "", method: "none", status: "ocr_required"});
        const current = pageRows.get(number);
        if (!hasUsableText(current.content)) {
          const scanned = generatedOcr.get(`${metadata.id}:${number}`);
          if (scanned && hasUsableText(scanned.content)) {
            pageRows.set(number, {content:scanned.content, confidence:scanned.confidence ?? null, method:"machine_ocr", status:"machine_ocr_unreviewed"});
          }
        }
      }
    }

    for (let number = 1; number <= count; number += 1) {
      const page = pageRows.get(number) || {content: "", method: "none", status: "ocr_required"};
      const content = page.content;
      if (hasUsableText(content)) extractedPages += 1;
      else if (page.status === "ocr_required") ocrRequiredPages += 1;
      if (page.method === "pdf_text_layer" && content.trim()) sourceTextPages += 1;
      const pageId = `${metadata.id}-p${String(number).padStart(4, "0")}`;
      const row = {
        page_id: pageId,
        document_id: metadata.id,
        pdf_page: number,
        printed_page: null,
        content,
        extraction_method: page.method,
        extraction_status: page.status,
        record_status: "needs_review",
        extraction_confidence: page.confidence ?? null,
        caveats: page.method === "machine_ocr" ? [
          "页面文本来自机器 OCR，需对照 PDF 原页核对。",
          ...(typeof page.confidence === "number" && page.confidence < 0.8 ? ["OCR 平均置信度低于 0.80，引用前优先人工核对。"] : []),
        ] : page.method === "pdf_text_layer" ? ["页面文字已提取，尚未人工核对。"] : ["此页未提取到文字，需要 OCR 后才能进入正文检索。"],
      };
      pages.push(row);
      for (const [part, chunkText] of splitPage(content).entries()) {
        if (chunkText.replace(/\s/g, "").length < 25) continue;
        chunks.push({
          chunk_id: `${pageId}-c${String(part + 1).padStart(2, "0")}`,
          chunk_type: "pdf_page_text",
          document_id: metadata.id,
          content: chunkText,
          source_locator: `${metadata.title}，PDF第${number}页`,
          page: {pdf_page: number, printed_page: null},
          extraction_status: page.status,
          extraction_method: page.method,
          extraction_confidence: page.confidence ?? null,
          record_status: "needs_review",
          retrieval_tier: page.method === "machine_ocr" ? "fallback_ocr" : "pdf_text",
          caveats: row.caveats,
        });
      }
    }

    const textLayerStatus = sourceTextPages > 0 ? "text_layer_present" : hasExistingOcr ? "image_only_with_existing_ocr" : "image_only_no_extractable_text";
    documents.push({
      document_id: metadata.id,
      title: metadata.title,
      document_type: metadata.type,
      publisher: null,
      publication_year: metadata.year,
      local_pdf_path: relativeToRoot(file),
      pdf_url: null,
      availability: "local_pdf",
      pdf_page_count: count,
      file_size_bytes: (await fs.promises.stat(file)).size,
      sha256,
      text_layer_status: textLayerStatus,
      ingestion_method: hasExistingOcr ? "existing_page_ocr_plus_gap_ocr" : "pdf_text_layer_plus_gap_ocr",
      extracted_page_count: extractedPages,
      ocr_required_page_count: ocrRequiredPages,
      ocr_status: ocrRequiredPages ? (hasExistingOcr ? "partial_ocr_required" : "ocr_required") : hasExistingOcr ? "machine_ocr_unreviewed" : "not_required",
      ocr_source_path: hasExistingOcr ? relativeToRoot(ocrPath) : null,
      rights_status: "unknown",
      record_status: "needs_review",
      citation_policy: "Cite the PDF page; add a printed page only after verifying its mapping. Treat OCR as unreviewed evidence.",
    });
    console.log(`${filename}: ${count} pages; text=${extractedPages}; OCR needed=${ocrRequiredPages}`);
  }

  const artifactRows = await readJsonl(path.join(ROOT, "data", "artifacts", "selected-book-300.jsonl"));
  const categoryToDocument = {
    "青铜器":"sxd-book-2009-bronze",
    "陶器":"sxd-book-2009-pottery-gold",
    "金器":"sxd-book-2009-pottery-gold",
    "玉器":"sxd-book-2009-jade-stone",
    "石器":"sxd-book-2009-jade-stone",
  };
  for (const record of artifactRows) {
    const documentId = categoryToDocument[record.category];
    if (!documentId) continue;
    const period = record.period || {};
    const discovery = record.discovery || {};
    const dimensions = record.dimensions || {};
    const lines = [
      `器名：${record.name}`,
      record.category ? `类别：${record.category}` : null,
      record.alternate_names?.length ? `别名：${record.alternate_names.join("、")}` : null,
      record.museum_inventory_number ? `出土编号：${record.museum_inventory_number}` : null,
      record.materials_and_techniques?.length ? `材质/工艺：${record.materials_and_techniques.join("、")}` : null,
      period.label ? `年代：${period.label}` : null,
      dimensions.value ? `尺寸：${dimensions.value} ${dimensions.unit || ""}` : null,
      discovery.context ? `出土地：${discovery.context}` : null,
      discovery.excavation_unit ? `出土单位：${discovery.excavation_unit}` : null,
      record.description ? `记录说明：${record.description}` : null,
    ].filter(Boolean);
    const source = record.sources?.[0] || {};
    const locator = source.locator || "图录页码待核";
    const pdfMatch = locator.match(/(?:扫描)?PDF第\s*(\d+)页/);
    const printedMatch = locator.match(/书内第\s*(\d+)页/);
    chunks.push({
      chunk_id: `artifact-${record.id}`,
      chunk_type: "structured_catalog_entry",
      document_id: documentId,
      content: lines.join("\n"),
      source_locator: locator,
      page: {pdf_page: pdfMatch ? Number(pdfMatch[1]) : null, printed_page: printedMatch ? Number(printedMatch[1]) : null},
      extraction_status: "curated_from_catalog_ocr_needs_page_review",
      extraction_method: "structured_catalog_record",
      record_status: record.record_status || "needs_review",
      retrieval_tier: "structured_reference",
      caveats: ["图录精选记录尚待逐页对照扫描 PDF 复核。", "未知字段不补造。"],
    });
  }

  await fs.promises.mkdir(OUT_DIR, {recursive: true});
  await writeJsonl(path.join(OUT_DIR, "pdf_documents.jsonl"), documents);
  await writeJsonl(path.join(OUT_DIR, "pdf_pages.jsonl"), pages);
  await writeJsonl(path.join(OUT_DIR, "pdf_chunks.jsonl"), chunks);
  console.log(`PDFs: ${documents.length}; pages: ${pages.length}; searchable chunks: ${chunks.length}`);
  console.log(`OCR needed pages: ${documents.reduce((sum, item) => sum + item.ocr_required_page_count, 0)}`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch(error => {
  console.error(`PDF corpus ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
