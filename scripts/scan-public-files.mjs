import { readFileSync } from "node:fs";

const publicFiles = [
  "index.html",
  "config.js",
  "assets/api.js",
  "assets/app.js",
  "assets/render.js",
  "assets/styles.css",
  "assets/validation.js",
];

const forbidden = [
  {
    label: "source spreadsheet ID",
    pattern: /1DcaMWFCivunMTJZjyH3DFedzuS4N8H1-new1dCPRQZ0/,
  },
  {
    label: "embedded Google Sheets CSV endpoint",
    pattern: /docs\.google\.com\/spreadsheets\/.+\/(?:export|gviz)/i,
  },
  {
    label: "CSV-shaped student record",
    pattern: /^\s*[0-9]{4,10},[^\r\n]+,[^\r\n]+,[^\r\n]+,(?:ร|0)\s*$/m,
  },
];

const findings = [];
for (const file of publicFiles) {
  const content = readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) {
      findings.push(`${file}: ${rule.label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Public-data scan failed:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Public-data scan passed (${publicFiles.length} files)`);
}
