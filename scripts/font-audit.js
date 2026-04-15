#!/usr/bin/env node

/*
  Font Audit Script
  Scans a React/Next/Tailwind-style app for font usage and writes:
  - terminal summary
  - font-audit-report.md

  Run:
    node scripts/font-audit.js

  Optional:
    node scripts/font-audit.js .
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || process.cwd());

const INCLUDED_DIRS = new Set([
  "app",
  "src",
  "components",
  "pages",
  "styles",
  "lib",
  "theme",
  "ui",
]);

const INCLUDED_FILES = new Set([
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.cjs",
  "postcss.config.js",
  "postcss.config.cjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
]);

const INCLUDED_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".mdx",
  ".mjs",
  ".cjs",
  ".json",
]);

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  "out",
]);

const results = {
  fontFamilies: new Map(),
  classTokens: new Map(),
  imports: new Map(),
  definitions: new Map(),
  unresolved: [],
  filesScanned: 0,
};

function addUsage(map, key, file, snippet, type = "usage") {
  if (!key) return;
  const cleanKey = key.trim();
  if (!cleanKey) return;

  if (!map.has(cleanKey)) {
    map.set(cleanKey, {
      count: 0,
      files: new Map(),
      snippets: [],
      type,
    });
  }

  const entry = map.get(cleanKey);
  entry.count += 1;
  entry.files.set(file, (entry.files.get(file) || 0) + 1);

  if (snippet && entry.snippets.length < 8) {
    entry.snippets.push({ file, snippet: snippet.trim() });
  }
}

function walk(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      const rel = path.relative(ROOT, fullPath);
      const top = rel.split(path.sep)[0];

      if (dir === ROOT) {
        if (!INCLUDED_DIRS.has(entry.name)) continue;
      } else if (top && IGNORED_DIRS.has(top)) {
        continue;
      }

      out.push(...walk(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (
        INCLUDED_EXTS.has(ext) ||
        INCLUDED_FILES.has(entry.name)
      ) {
        out.push(fullPath);
      }
    }
  }

  if (dir === ROOT) {
    for (const file of INCLUDED_FILES) {
      const full = path.join(ROOT, file);
      if (fs.existsSync(full)) out.push(full);
    }
  }

  return [...new Set(out)];
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function normalizeRel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function extract(content, file) {
  const rel = normalizeRel(file);

  // 1) CSS / style font-family declarations
  const fontFamilyRegexes = [
    /font-family\s*:\s*([^;]+);/gi,
    /fontFamily\s*:\s*["'`]([^"'`]+)["'`]/gi,
    /fontFamily\s*:\s*([^,\n}]+)/gi,
  ];

  for (const regex of fontFamilyRegexes) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const raw = (m[1] || "").trim();
      if (!raw) continue;

      const parts = raw
        .split(",")
        .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
        .filter(Boolean);

      if (parts.length === 0) {
        results.unresolved.push({
          file: rel,
          kind: "font-family",
          snippet: m[0].trim(),
        });
        continue;
      }

      for (const part of parts) {
        addUsage(results.fontFamilies, part, rel, m[0], "font-family");
      }
    }
  }

  // 2) Tailwind/common class tokens in className
  const classAttrRegex = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
  let classMatch;
  while ((classMatch = classAttrRegex.exec(content)) !== null) {
    const classes = classMatch[1].split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      if (
        cls === "font-sans" ||
        cls === "font-serif" ||
        cls === "font-mono" ||
        cls.startsWith("font-")
      ) {
        addUsage(results.classTokens, cls, rel, classMatch[0], "class-token");
      }
    }
  }

  // 3) Generic class attr in HTML/MDX/CSS-ish
  const genericClassRegex = /class\s*=\s*["'`]([^"'`]+)["'`]/g;
  let genericClassMatch;
  while ((genericClassMatch = genericClassRegex.exec(content)) !== null) {
    const classes = genericClassMatch[1].split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      if (
        cls === "font-sans" ||
        cls === "font-serif" ||
        cls === "font-mono" ||
        cls.startsWith("font-")
      ) {
        addUsage(results.classTokens, cls, rel, genericClassMatch[0], "class-token");
      }
    }
  }

  // 4) next/font imports
  const nextFontImportRegex =
    /import\s*\{?\s*([A-Za-z0-9_,\s]+)\s*\}?\s*from\s*["']next\/font\/(google|local)["']/g;
  let imp;
  while ((imp = nextFontImportRegex.exec(content)) !== null) {
    const names = imp[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of names) {
      addUsage(results.imports, `${name} (next/font/${imp[2]})`, rel, imp[0], "import");
    }
  }

  // 5) Custom font variable / token definitions
  const variableRegexes = [
    /(--font-[A-Za-z0-9-_]+)\s*:\s*([^;]+);/g,
    /fontFamily\s*:\s*\{([\s\S]*?)\}/g,
  ];

  // CSS variable definitions
  let varMatch;
  while ((varMatch = variableRegexes[0].exec(content)) !== null) {
    addUsage(results.definitions, varMatch[1], rel, varMatch[0], "definition");
    const value = varMatch[2]
      .split(",")
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
      .filter(Boolean);
    for (const v of value) {
      addUsage(results.fontFamilies, v, rel, varMatch[0], "font-family");
    }
  }

  // Tailwind theme.fontFamily object rough parse
  let ffObjMatch;
  while ((ffObjMatch = variableRegexes[1].exec(content)) !== null) {
    const block = ffObjMatch[1];
    const lineRegex = /([A-Za-z0-9_-]+)\s*:\s*\[([^\]]+)\]/g;
    let line;
    while ((line = lineRegex.exec(block)) !== null) {
      addUsage(results.definitions, `fontFamily.${line[1]}`, rel, line[0], "definition");
      const fonts = line[2]
        .split(",")
        .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
        .filter(Boolean);
      for (const font of fonts) {
        addUsage(results.fontFamilies, font, rel, line[0], "font-family");
      }
    }
  }

  // 6) Dynamic/unresolved font usages
  const unresolvedPatterns = [
    /fontFamily\s*:\s*[A-Za-z_$][A-Za-z0-9_$.\[\]]+/g,
    /className\s*=\s*\{[^}]*font-[^}]*\}/g,
    /className\s*=\s*\{[^}]*\}/g,
  ];

  for (const regex of unresolvedPatterns) {
    let u;
    while ((u = regex.exec(content)) !== null) {
      results.unresolved.push({
        file: rel,
        kind: "dynamic",
        snippet: u[0].trim(),
      });
    }
  }
}

function sortMap(map) {
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
}

function filesList(entry, limit = 10) {
  return [...entry.files.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([file, count]) => `- ${file} (${count})`)
    .join("\n");
}

function classify(entry) {
  if (entry.count >= 15) return "Likely system-wide / core";
  if (entry.count >= 5) return "Moderately used";
  if (entry.count >= 2) return "Light usage";
  return "Rare outlier";
}

function buildReport() {
  const fontFamilies = sortMap(results.fontFamilies);
  const classTokens = sortMap(results.classTokens);
  const imports = sortMap(results.imports);
  const definitions = sortMap(results.definitions);

  const maybeUnusedImports = imports.filter(([name]) => {
    const short = name.split(" ")[0].toLowerCase();
    const mentionedInClasses = classTokens.some(([cls]) => cls.toLowerCase().includes(short));
    const mentionedInFamilies = fontFamilies.some(([fam]) => fam.toLowerCase().includes(short));
    return !mentionedInClasses && !mentionedInFamilies;
  });

  const rareFonts = fontFamilies.filter(([, data]) => data.count === 1);
  const inlineSuspects = results.unresolved.filter((u) => u.snippet.includes("fontFamily"));
  const rareClassTokens = classTokens.filter(([, data]) => data.count === 1);

  let md = `# Font Audit Report

Project root: \`${ROOT}\`

Files scanned: **${results.filesScanned}**

## Executive Summary

- Distinct font families found: **${fontFamilies.length}**
- Distinct font-related class/tokens found: **${classTokens.length}**
- Distinct font imports found: **${imports.length}**
- Potential dynamic/unresolved usages: **${results.unresolved.length}**

## Fonts Ranked Most Used -> Least Used

`;

  if (fontFamilies.length === 0) {
    md += "_No direct font-family usage found._\n\n";
  } else {
    for (const [font, data] of fontFamilies) {
      md += `### ${font}\n`;
      md += `- Count: **${data.count}**\n`;
      md += `- Status: **${classify(data)}**\n`;
      md += `- Top files:\n${filesList(data)}\n\n`;
    }
  }

  md += `## Font-Related Classes / Tokens

`;
  if (classTokens.length === 0) {
    md += "_No font-related classes found._\n\n";
  } else {
    for (const [token, data] of classTokens) {
      md += `### ${token}\n`;
      md += `- Count: **${data.count}**\n`;
      md += `- Status: **${classify(data)}**\n`;
      md += `- Top files:\n${filesList(data)}\n\n`;
    }
  }

  md += `## Imported Fonts

`;
  if (imports.length === 0) {
    md += "_No next/font imports found._\n\n";
  } else {
    for (const [imp, data] of imports) {
      md += `### ${imp}\n`;
      md += `- Import count: **${data.count}**\n`;
      md += `- Files:\n${filesList(data)}\n\n`;
    }
  }

  md += `## Font Definitions / Theme Tokens

`;
  if (definitions.length === 0) {
    md += "_No explicit font definitions/tokens found._\n\n";
  } else {
    for (const [def, data] of definitions) {
      md += `### ${def}\n`;
      md += `- Count: **${data.count}**\n`;
      md += `- Files:\n${filesList(data)}\n\n`;
    }
  }

  md += `## Likely Problems To Inspect First

### Fonts used only once
`;
  if (rareFonts.length === 0) {
    md += "- None found.\n";
  } else {
    for (const [font, data] of rareFonts.slice(0, 20)) {
      md += `- **${font}** -> ${[...data.files.keys()].join(", ")}\n`;
    }
  }

  md += `

### Font-related classes used only once
`;
  if (rareClassTokens.length === 0) {
    md += "- None found.\n";
  } else {
    for (const [token, data] of rareClassTokens.slice(0, 20)) {
      md += `- **${token}** -> ${[...data.files.keys()].join(", ")}\n`;
    }
  }

  md += `

### Inline / dynamic font usage to manually inspect
`;
  if (inlineSuspects.length === 0) {
    md += "- None found.\n";
  } else {
    for (const item of inlineSuspects.slice(0, 20)) {
      md += `- **${item.file}** -> \`${item.snippet}\`\n`;
    }
  }

  md += `

### Imported fonts that may be underused
`;
  if (maybeUnusedImports.length === 0) {
    md += "- None found.\n";
  } else {
    for (const [imp, data] of maybeUnusedImports) {
      md += `- **${imp}** -> ${[...data.files.keys()].join(", ")}\n`;
    }
  }

  md += `

## Unresolved / Dynamic Usages

These may need a human look because they are computed or indirect.

`;
  if (results.unresolved.length === 0) {
    md += "- None found.\n";
  } else {
    for (const item of results.unresolved.slice(0, 40)) {
      md += `- **${item.file}** [${item.kind}] -> \`${item.snippet}\`\n`;
    }
  }

  return md;
}

function printTerminalSummary() {
  const topFonts = sortMap(results.fontFamilies).slice(0, 10);
  const topClasses = sortMap(results.classTokens).slice(0, 10);
  const rareFonts = sortMap(results.fontFamilies).filter(([, data]) => data.count === 1).slice(0, 10);

  console.log("\nFONT AUDIT SUMMARY");
  console.log("==================");
  console.log(`Files scanned: ${results.filesScanned}`);
  console.log(`Distinct font families: ${results.fontFamilies.size}`);
  console.log(`Distinct font class/tokens: ${results.classTokens.size}`);
  console.log(`Distinct font imports: ${results.imports.size}`);
  console.log(`Dynamic/unresolved usages: ${results.unresolved.length}`);

  console.log("\nTop font families:");
  if (topFonts.length === 0) {
    console.log("  None found");
  } else {
    for (const [font, data] of topFonts) {
      console.log(`  - ${font}: ${data.count}`);
    }
  }

  console.log("\nTop font-related classes/tokens:");
  if (topClasses.length === 0) {
    console.log("  None found");
  } else {
    for (const [token, data] of topClasses) {
      console.log(`  - ${token}: ${data.count}`);
    }
  }

  console.log("\nRare outlier fonts:");
  if (rareFonts.length === 0) {
    console.log("  None found");
  } else {
    for (const [font, data] of rareFonts) {
      console.log(`  - ${font}: ${[...data.files.keys()].join(", ")}`);
    }
  }

  console.log("\nWrote: font-audit-report.md\n");
}

function main() {
  const files = walk(ROOT);
  const uniqueFiles = [...new Set(files)];

  for (const file of uniqueFiles) {
    const content = readFile(file);
    if (!content) continue;
    results.filesScanned += 1;
    extract(content, file);
  }

  const report = buildReport();
  const outPath = path.join(ROOT, "font-audit-report.md");
  fs.writeFileSync(outPath, report, "utf8");
  printTerminalSummary();
}

main();
