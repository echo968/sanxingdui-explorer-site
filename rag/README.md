# 三星堆 PDF RAG 检索数据

`documents.jsonl` 与 `chunks.jsonl` 是早期本地 RAG 资料清单。当前问答服务使用下面的 `pdf_documents.jsonl`、`pdf_pages.jsonl` 和 `pdf_chunks.jsonl`，只检索 `D:\三星堆\pdf` 中登记的 PDF 及其对应图录结构化记录。

## 早期资料范围

- 2009 年《三星堆出土文物全记录》青铜器、陶器/金器、玉器/石器三册：本地扫描 PDF、逐页机器 OCR，以及精选300件结构化档案。
- 《三星堆祭祀坑》本地扫描 PDF：已完成 633 页 RapidOCR 扫描，其中 609 页有可用文字进入检索语料；其余页面仍标记为 `ocr_required`。整本书的书目信息和页码对应仍需核对。
- archaeology/reports.jsonl 中的考古报告：登记公开 PDF 或题录链接；远程 PDF 尚未下载或抽取全文。K2目前只有题录页，不能当作全文来源。
- qa/knowledge.jsonl 中的17条证据型问答：保留答案类型、来源定位、关联坑位和回答限制。

## 提高精度的建议

1. 优先检索 `high_precision_answer_unit` 和 `structured_reference`，再用 `fallback_ocr` 补召回；OCR 不能单独作为最终事实依据。
2. 使用 BM25 + 向量召回，再按问题中的坑位、器名、报告类型和文档年份过滤并重排；同一页的相邻块合并后再生成回答。
3. 任何回答都要保留 `document_id`、`source_locator` 或 evidence 中的印刷页/PDF页、标题和 URL。版本或统计口径不同的报告应并列呈现。
4. `needs_review` 表示数据待人工复核。不得因检索相似度高而把待核事实改写成确定结论；回答时保留 `caveats`。
5. 图录页 OCR 是图注和版面文字的机器识别，可能漏字或错字。尤其是器名、编号、尺寸、年代和出土单位，要回到扫描 PDF 页核验。

## 权利与文件边界

本目录只保存定位信息、结构化记录和有限长度的逐页 OCR 检索文本，不复制原始 PDF。图录扫描件在当前台账中权利状态为 `unknown`；原始 PDF 位于项目目录之外。不要将本地路径或未核验 OCR 作为可公开下载的 PDF 链接。

`documents.jsonl` 与 `chunks.jsonl` 故意放在顶层 `rag/`，不放入静态网站 `data/`，避免静态数据打包时无意公开 OCR 文本。

## `pdf/` 本地文档入库

问答检索只使用用户本机 `D:\三星堆\pdf` 中的 PDF。运行 `npm run ingest:pdf` 会读取该目录并重建以下服务端私有文件：

- `pdf_documents.jsonl`：每份 PDF 的稳定 ID、标题、文件校验值、页数、提取状态和权利状态。
- `pdf_pages.jsonl`：逐页正文、PDF 页码、提取方式及复核状态；空白扫描页也保留为 `ocr_required` 记录。
- `pdf_chunks.jsonl`：用于 RAG 检索的短文本片段，保留文档 ID 和页码。

脚本优先复用已存在的三册图录 OCR；其余 PDF 通过 Poppler 的 `pdfinfo` 和 `pdftotext` 提取文字层。需在命令行可找到这两个工具；也可用 `PDFINFO_PATH` 和 `PDFTOTEXT_PATH` 指定可执行文件路径。脚本不会覆盖旧的 `documents.jsonl` / `chunks.jsonl`，也不会把 PDF 或 OCR 内容复制到 `dist/`。

尚未提取到有效文字的扫描页会在页清单里标成 `ocr_required`，不进入可检索文本块。当前全语料仍有 167 页处于此状态，主要分布在三册图录及少量图版页。PDF 文本层和机器 OCR 都标为待复核，回答引用一律显示 PDF 页码。

运行 `npm run ocr:pdf` 会对当前 `pdf_pages.jsonl` 中标记为 `ocr_required` 的页调用本地 RapidOCR。识别记录增量保存在 `rag/ocr_pages.jsonl`；中断后重跑会跳过已处理页，`npm run ocr:pdf -- --force` 会重新识别全部缺页，`--limit 20` 可限制页数。脚本使用 Poppler `pdftoppm` 以 200 DPI 渲染并逐批清理临时图片。OCR 置信度低于 0.80 的页面在页记录中标注优先复核。先安装 `requirements-ocr.txt` 中的包；当前工作区用 `.tools/venvs/rag-ocr` 隔离环境运行。

服务端用 LangChain `Document`、`BaseRetriever`、提示链和 `ChatOpenAI` 兼容接口组织 PDF-only RAG；运行 `npm install` 安装项目依赖。文本回答使用智谱 API：设置 `ZHIPU_API_KEY`、`ZHIPU_TEXT_MODEL`，可用 `ZHIPU_BASE_URL` 覆盖默认地址 `https://open.bigmodel.cn/api/paas/v4`。`POST /api/guide/query` 使用 SSE：先逐 token 发送模型回答，回答完成后再发送检索来源、引用片段与 caveats。对话页将每条引用作为可切换证据卡展示。密钥只放服务端环境变量，勿写入 `dist/`。

Embedding 使用已从 Hugging Face 下载到 `D:\三星堆\models\bge-m3` 的 `BAAI/bge-m3` 权重。Node 启动时会在后台自动启动本机 Python 服务，由 `sentence-transformers` 加载本地模型，并运行一次轻量 query embedding 预热；用 `RAG_EMBEDDING_MODEL_PATH` 可指定其他模型目录，CUDA 不可用时回退 CPU。向量保存在 `pdf_vector_index.jsonl`；索引脚本支持中断续跑。PDF 内容或模型版本变化后运行 `npm run index:pdf -- --force` 重建。服务启动会核对模型、文本语料指纹和向量数量；不匹配时跳过预热并回退 BM25。查询时本地模型生成问题向量，向量余弦检索与 BM25 结果使用 RRF 合并；问答文本由智谱模型生成，与本地 embedding 相互独立。
