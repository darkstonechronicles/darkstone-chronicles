const fs = require("fs");
const path = require("path");

function resolveSharp() {
  const candidates = [
    process.env.WEBP_TOOL_ROOT ? path.join(process.env.WEBP_TOOL_ROOT, "node_modules", "sharp") : "",
    "sharp",
    "C:/codex-webp-tool/node_modules/sharp"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }

  throw new Error(
    "Unable to resolve 'sharp'. Install it locally or set WEBP_TOOL_ROOT to a tool workspace that contains node_modules/sharp."
  );
}

const sharp = resolveSharp();
const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const OVERWRITE = args.has("--overwrite");
const QUALITY = Number(process.env.WEBP_QUALITY || 82);
const MIN_BYTES = Number(process.env.WEBP_MIN_BYTES || 0);
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const targetDirs = targets.length ? targets : ["images/items/sets"];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

async function convertFile(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, ".webp");
  const pngStat = fs.statSync(pngPath);
  if (pngStat.size < MIN_BYTES) {
    return { skipped: true, reason: "min-bytes", pngBytes: pngStat.size, webpBytes: 0 };
  }
  if (!OVERWRITE && fs.existsSync(webpPath)) {
    return { skipped: true, reason: "exists", pngBytes: pngStat.size, webpBytes: fs.statSync(webpPath).size };
  }
  if (DRY_RUN) {
    return { skipped: true, reason: "dry-run", pngBytes: pngStat.size, webpBytes: 0 };
  }

  await sharp(pngPath)
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(webpPath);

  const webpStat = fs.statSync(webpPath);
  return { skipped: false, pngBytes: pngStat.size, webpBytes: webpStat.size };
}

async function main() {
  const pngFiles = targetDirs.flatMap((dir) =>
    walk(path.join(ROOT, dir)).filter((file) => /\.png$/i.test(file))
  );

  let converted = 0;
  let skipped = 0;
  let pngBytes = 0;
  let webpBytes = 0;

  for (const file of pngFiles) {
    const result = await convertFile(file);
    pngBytes += result.pngBytes || 0;
    webpBytes += result.webpBytes || 0;
    if (result.skipped) {
      skipped += 1;
      console.log(`SKIP\t${result.reason}\t${rel(file)}`);
    } else {
      converted += 1;
      console.log(`OK\t${rel(file)}\t${(result.pngBytes / 1024).toFixed(1)} KB -> ${(result.webpBytes / 1024).toFixed(1)} KB`);
    }
  }

  const savings = Math.max(0, pngBytes - webpBytes);
  console.log(`FILES\t${pngFiles.length}`);
  console.log(`CONVERTED\t${converted}`);
  console.log(`SKIPPED\t${skipped}`);
  console.log(`PNG_MB\t${(pngBytes / 1024 / 1024).toFixed(2)}`);
  console.log(`WEBP_MB\t${(webpBytes / 1024 / 1024).toFixed(2)}`);
  console.log(`SAVED_MB\t${(savings / 1024 / 1024).toFixed(2)}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
