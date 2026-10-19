#!/usr/bin/env node
/**
 * Parse Banamex credit card PDF statements (estado de cuenta) into import CSV.
 * Usage: node scripts/parse-banamex-tdc-pdf.mjs <pdf-dir> [out.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const MONTHS = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

function parseBanamexDate(token) {
  const m = token.toLowerCase().match(/^(\d{2})-([a-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mm = MONTHS[m[2]];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]}`;
}

function normalizeDescription(raw) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s[A-Z]{3}\s[\dA-Z]{10,}\s*$/i, "")
    .trim()
    .slice(0, 500);
}

export function parseBanamexStatementText(text, sourceFile) {
  const rows = [];
  const parts = text.split(/(?=\d{2}-[a-z]{3}-\d{4}\s+\d{2}-[a-z]{3}-\d{4})/i);
  for (const part of parts) {
    const dates = part.match(/^(\d{2}-[a-z]{3}-\d{4})\s+(\d{2}-[a-z]{3}-\d{4})/i);
    const amt = part.match(/\+\s*\$\s*([\d,]+\.\d{2})/);
    if (!dates || !amt) continue;
    const txnDate = parseBanamexDate(dates[1]);
    if (!txnDate) continue;
    const amountNum = amt[1].replace(/,/g, "");
    const descStart = dates[0].length;
    const descEnd = part.indexOf(amt[0]);
    const description = normalizeDescription(part.slice(descStart, descEnd));
    if (!description || description.length < 3) continue;
    const hash = createHash("sha256")
      .update(`${txnDate}|${amountNum}|${description}`)
      .digest("hex")
      .slice(0, 16);
    rows.push({
      date: txnDate,
      amount: `-${amountNum}`,
      description,
      externalRef: `banamex:${sourceFile}:${hash}`,
    });
  }
  return rows;
}

async function loadPdfJs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    const tmp = "/tmp/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
    return await import(pathToFileURL(tmp).href);
  }
}

async function extractPdfText(filePath, getDocument) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await getDocument({ data }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += `${content.items.map((it) => it.str).join(" ")} `;
  }
  return text;
}

function listStatementPdfs(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^[A-Za-z]+EstadodeCuenta\.pdf$/i.test(f))
    .sort();
}

async function main() {
  const pdfDir = process.argv[2];
  const outPath = process.argv[3] ?? path.join(pdfDir, "banamex-tdc-2026.csv");
  if (!pdfDir) {
    console.error("Usage: node parse-banamex-tdc-pdf.mjs <pdf-dir> [out.csv]");
    process.exit(1);
  }

  const { getDocument } = await loadPdfJs();
  const files = listStatementPdfs(pdfDir);
  if (files.length === 0) {
    console.error(`No *EstadodeCuenta.pdf files in ${pdfDir}`);
    process.exit(1);
  }

  const byRef = new Map();
  for (const file of files) {
    const full = path.join(pdfDir, file);
    const text = await extractPdfText(full, getDocument);
    const rows = parseBanamexStatementText(text, file);
    for (const row of rows) {
      byRef.set(row.externalRef, row);
    }
    console.error(`${file}: ${rows.length} rows`);
  }

  const all = [...byRef.values()].sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
  const lines = ["date,amount,description,externalRef", ...all.map((r) => `${r.date},${r.amount},"${r.description.replace(/"/g, '""')}",${r.externalRef}`)];
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
  console.error(`Wrote ${all.length} unique rows -> ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
