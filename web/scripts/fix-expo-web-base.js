const fs = require("node:fs");
const path = require("node:path");

const outputDir = process.argv[2] || "dist";
const indexPath = path.join(outputDir, "index.html");

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run expo export first.`);
}

const html = fs.readFileSync(indexPath, "utf8");
let fixed = html
  .replaceAll('src="/_expo/', 'src="./_expo/')
  .replaceAll('href="/_expo/', 'href="./_expo/');

const headTags = [
  '<meta name="theme-color" content="#151515" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="trade-tool" />',
  '<link rel="manifest" href="./manifest.webmanifest" />',
  '<link rel="icon" href="./icon.svg" type="image/svg+xml" />',
];

if (!fixed.includes('rel="manifest"')) {
  fixed = fixed.replace("</head>", `    ${headTags.join("\n    ")}\n  </head>`);
}

for (const asset of ["manifest.webmanifest", "icon.svg"]) {
  const source = path.join(process.cwd(), asset);
  const target = path.join(outputDir, asset);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
  }
}

fs.writeFileSync(indexPath, fixed);
console.log(`Fixed Expo web asset paths and PWA metadata in ${indexPath}`);
