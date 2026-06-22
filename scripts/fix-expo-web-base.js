const fs = require("node:fs");
const path = require("node:path");

const outputDir = process.argv[2] || "dist";
const indexPath = path.join(outputDir, "index.html");

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run expo export first.`);
}

const html = fs.readFileSync(indexPath, "utf8");
const fixed = html
  .replaceAll('src="/_expo/', 'src="./_expo/')
  .replaceAll('href="/_expo/', 'href="./_expo/');

fs.writeFileSync(indexPath, fixed);
console.log(`Fixed Expo web asset paths in ${indexPath}`);
