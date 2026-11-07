#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {spawn} = require("node:child_process");
const root = path.resolve(__dirname, "..");
const envPython = process.env.RAG_OCR_PYTHON;
const workspacePython = path.resolve(root, "..", ".tools", "venvs", "rag-ocr", "Scripts", "python.exe");
const python = envPython || (require("node:fs").existsSync(workspacePython) ? workspacePython : "python");
const child = spawn(python, [path.join(__dirname, "ocr_pdf_gaps.py"), ...process.argv.slice(2)], {stdio:"inherit", windowsHide:true, env:process.env});
child.on("error", error => {
  console.error(`无法启动 Python OCR：${error.message}`);
  process.exitCode = 1;
});
child.on("close", code => { process.exitCode = code || 0; });
