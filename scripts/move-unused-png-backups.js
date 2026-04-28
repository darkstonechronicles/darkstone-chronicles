const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, "_png_backup_unused");
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".ts"]);

// These folders still have runtime-built .png paths in the code. Keep them in place.
const DYNAMIC_PNG_PREFIXES = [
  "images/alchemy/potions/",
  "images/charms/",
  "images/dungeons/",
  "images/heroes/",
  "images/items/forge_crafted/",
  "images/items/sets/",
  "images/mobs/dungeons/",
  "images/wood/logs/"
];

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = relPath(full);
    if (entry.isDirectory()) {
      if (rel === ".git" || rel === "node_modules" || rel === "_png_backup_unused") continue;
      walk(full, predicate, out);
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function relPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function collectLiteralPngRefs() {
  const refs = new Set();
  const textFiles = walk(ROOT, (file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  for (const file of textFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/images\/[^"'`)<> \t\r\n]+?\.png/gi)) {
      refs.add(match[0].toLowerCase());
    }
  }
  return refs;
}

function hasWebpSibling(pngPath) {
  return fs.existsSync(pngPath.replace(/\.png$/i, ".webp"));
}

function isProtectedDynamicPath(rel) {
  const lower = rel.toLowerCase();
  return DYNAMIC_PNG_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function moveFileToBackup(filePath) {
  const rel = relPath(filePath);
  const target = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(filePath, target);
  return target;
}

function bytes(n) {
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  const literalRefs = collectLiteralPngRefs();
  const pngFiles = walk(path.join(ROOT, "images"), (file) => /\.png$/i.test(file));

  const candidates = pngFiles.filter((file) => {
    const rel = relPath(file);
    if (!hasWebpSibling(file)) return false;
    if (literalRefs.has(rel.toLowerCase())) return false;
    if (isProtectedDynamicPath(rel)) return false;
    return true;
  });

  let movedBytes = 0;
  for (const file of candidates) {
    movedBytes += fs.statSync(file).size;
    moveFileToBackup(file);
  }

  console.log(`PNG files scanned: ${pngFiles.length}`);
  console.log(`PNG files moved to _png_backup_unused: ${candidates.length}`);
  console.log(`Moved bytes: ${bytes(movedBytes)}`);
  console.log(`Protected dynamic PNG paths: ${DYNAMIC_PNG_PREFIXES.length}`);
}

main();
