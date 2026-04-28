const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const IMAGES_DIR = path.join(ROOT, "images");
const MIN_BYTES = Number(process.argv[2] || 300 * 1024);
const QUALITY = Number(process.argv[3] || 82);
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".ts"]);

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

function relWebPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function convertPng(filePath) {
  const webpPath = filePath.replace(/\.png$/i, ".webp");
  const result = spawnSync("magick", [
    filePath,
    "-strip",
    "-quality",
    String(QUALITY),
    webpPath
  ], { stdio: "pipe", encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`ImageMagick failed for ${relWebPath(filePath)}\n${result.stderr || result.stdout}`);
  }

  return webpPath;
}

function replaceImageRefs(converted) {
  const convertedSet = new Set(converted.map((file) => relWebPath(file).toLowerCase()));
  const textFiles = walk(ROOT, (file) => {
    const rel = relWebPath(file);
    if (rel.startsWith("node_modules/") || rel.startsWith(".git/")) return false;
    return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
  });

  let changedFiles = 0;
  let replacements = 0;

  for (const file of textFiles) {
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(/images\/[^"'`\s)<>]+?\.png/gi, (match) => {
      const webp = match.replace(/\.png$/i, ".webp");
      if (!convertedSet.has(webp.toLowerCase())) return match;
      replacements += 1;
      return webp;
    });

    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      changedFiles += 1;
    }
  }

  return { changedFiles, replacements };
}

function bytes(n) {
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  const pngFiles = walk(IMAGES_DIR, (file) => /\.png$/i.test(file));
  const targets = pngFiles
    .map((file) => ({ file, size: fs.statSync(file).size }))
    .filter((entry) => entry.size >= MIN_BYTES);

  let sourceBytes = 0;
  let webpBytes = 0;
  const converted = [];

  console.log(`PNG files found: ${pngFiles.length}`);
  console.log(`Converting ${targets.length} PNG files >= ${bytes(MIN_BYTES)} at WebP quality ${QUALITY}...`);

  targets.forEach((entry, index) => {
    const webp = convertPng(entry.file);
    const nextSize = fs.statSync(webp).size;
    sourceBytes += entry.size;
    webpBytes += nextSize;
    converted.push(webp);
    if ((index + 1) % 25 === 0 || index + 1 === targets.length) {
      console.log(`Converted ${index + 1}/${targets.length}`);
    }
  });

  const refs = replaceImageRefs(converted);

  console.log(`Source PNG bytes converted: ${bytes(sourceBytes)}`);
  console.log(`Generated WebP bytes: ${bytes(webpBytes)}`);
  console.log(`Estimated savings for converted assets: ${bytes(sourceBytes - webpBytes)}`);
  console.log(`Text files updated: ${refs.changedFiles}`);
  console.log(`Image references updated: ${refs.replacements}`);
}

main();
