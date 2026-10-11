import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const svg = readFileSync(join(publicDir, "favicon.svg"));

const sizes = [
  ["pwa-192.png", 192],
  ["pwa-512.png", 512],
  ["logo-email.png", 128],
];

for (const [name, size] of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(publicDir, name));
}

const ogSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f6f1e8"/>
  <rect x="80" y="120" width="120" height="120" rx="28" fill="#0d6b5c"/>
  <text x="240" y="210" font-family="system-ui,sans-serif" font-size="72" font-weight="600" fill="#1c1917">FinLLM</text>
  <text x="240" y="280" font-family="system-ui,sans-serif" font-size="36" fill="#57534e">Self-hosted personal ledger</text>
</svg>`,
);

await sharp(ogSvg).png().toFile(join(publicDir, "og-image.png"));
