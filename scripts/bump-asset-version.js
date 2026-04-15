const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = process.argv[2] || createVersion();

function createVersion() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds())
  ].join("");
}

function isLocalAsset(url) {
  if (!url) return false;
  if (/^(https?:|mailto:|data:|#)/i.test(url)) return false;
  const base = url.split("#")[0].split("?")[0];
  return base.endsWith(".js") || base.endsWith(".css");
}

function withVersion(url) {
  const [withoutHash, hash = ""] = url.split("#");
  const base = withoutHash.split("?")[0];
  return `${base}?v=${VERSION}${hash ? `#${hash}` : ""}`;
}

function updateHtml(content) {
  return content.replace(
    /((?:src|href)\s*=\s*")([^"]+)(")/gi,
    (full, before, url, after) => {
      if (!isLocalAsset(url)) return full;
      return `${before}${withVersion(url)}${after}`;
    }
  );
}

function main() {
  const htmlFiles = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
    .map((entry) => entry.name)
    .sort();

  const changed = [];

  for (const fileName of htmlFiles) {
    const filePath = path.join(ROOT, fileName);
    const previous = fs.readFileSync(filePath, "utf8");
    const next = updateHtml(previous);
    if (next !== previous) {
      fs.writeFileSync(filePath, next, "utf8");
      changed.push(fileName);
    }
  }

  console.log(`Asset version: ${VERSION}`);
  if (!changed.length) {
    console.log("No HTML files needed updating.");
    return;
  }

  console.log("Updated files:");
  for (const fileName of changed) {
    console.log(`- ${fileName}`);
  }
}

main();
