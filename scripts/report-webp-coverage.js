const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DEFAULT_DIRS = [
  "images/alchemy/potions",
  "images/charms",
  "images/dungeons",
  "images/heroes",
  "images/items/forge_crafted",
  "images/items/sets",
  "images/mobs/dungeons",
  "images/pets",
  "images/ui",
  "images/wood/logs"
];

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

function countCoverage(dir) {
  const abs = path.join(ROOT, dir);
  const files = walk(abs);
  const pngFiles = files.filter((file) => /\.png$/i.test(file));
  const webpFiles = files.filter((file) => /\.webp$/i.test(file));
  const pairedPngFiles = pngFiles.filter((file) => fs.existsSync(file.replace(/\.png$/i, ".webp")));
  const pngBytes = pngFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const pairedWebpBytes = pairedPngFiles.reduce((sum, file) => sum + fs.statSync(file.replace(/\.png$/i, ".webp")).size, 0);
  return {
    dir,
    png: pngFiles.length,
    webp: webpFiles.length,
    paired: pairedPngFiles.length,
    pngBytes,
    pairedWebpBytes
  };
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function main() {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS;
  const rows = targets.map(countCoverage);
  for (const row of rows) {
    const coverage = row.png > 0 ? row.paired / row.png : 0;
    const pairedSavings = Math.max(0, row.pngBytes - row.pairedWebpBytes);
    console.log(
      [
        row.dir,
        `png=${row.png}`,
        `webp=${row.webp}`,
        `paired=${row.paired}`,
        `coverage=${formatPct(coverage)}`,
        `pngBytes=${formatMB(row.pngBytes)}`,
        `pairedWebpBytes=${formatMB(row.pairedWebpBytes)}`,
        `pairedSavings=${formatMB(pairedSavings)}`
      ].join("\t")
    );
  }
}

main();
