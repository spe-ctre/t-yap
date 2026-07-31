const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.resolve(__dirname, 'src');
const APPLY = process.argv.includes('--apply');

function stripExt(name) {
  return name.replace(/\.d\.ts$/, '').replace(/\.tsx?$/, '');
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = walk(SRC_ROOT);

const fileIndex = {};
for (const f of allFiles) {
  const base = stripExt(path.basename(f));
  if (!fileIndex[base]) fileIndex[base] = [];
  fileIndex[base].push(f);
}

function resolvesToRealFile(fromDir, importPath) {
  const base = path.resolve(fromDir, importPath);
  const candidates = [base, base + '.ts', base + '.tsx', base + '.d.ts', path.join(base, 'index.ts')];
  return candidates.some(c => fs.existsSync(c));
}

function toImportPath(fromDir, targetFile) {
  let rel = path.relative(fromDir, targetFile).replace(/\.d\.ts$/, '').replace(/\.tsx?$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.split(path.sep).join('/');
}

const patterns = [
  { regex: /(from\s+)(['"])(\.\.?\/[^'"]+)\2/g, prefixGroup: 1, quoteGroup: 2, pathGroup: 3 },
  { regex: /(require\(\s*)(['"])(\.\.?\/[^'"]+)\2(\s*\))/g, prefixGroup: 1, quoteGroup: 2, pathGroup: 3, suffixGroup: 4 },
  { regex: /(import\(\s*)(['"])(\.\.?\/[^'"]+)\2(\s*\))/g, prefixGroup: 1, quoteGroup: 2, pathGroup: 3, suffixGroup: 4 },
  { regex: /(\/\/\/\s*<reference path=)(['"])(\.\.?\/[^'"]+)\2(\s*\/>)/g, prefixGroup: 1, quoteGroup: 2, pathGroup: 3, suffixGroup: 4 },
];

let changedFiles = 0;
let changedImports = 0;
const warnings = [];

for (const file of allFiles) {
  const dir = path.dirname(file);
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;

  for (const p of patterns) {
    content = content.replace(p.regex, (match, ...groups) => {
      const importPath = groups[p.pathGroup - 1];
      if (resolvesToRealFile(dir, importPath)) return match;

      const base = stripExt(path.basename(importPath));
      let matches = fileIndex[base] || [];

      if (matches.length === 1) {
        const newPath = toImportPath(dir, matches[0]);
        changedImports++;
        fileChanged = true;
        const prefix = groups[p.prefixGroup - 1];
        const quote = groups[p.quoteGroup - 1];
        const suffix = p.suffixGroup ? groups[p.suffixGroup - 1] : '';
        return `${prefix}${quote}${newPath}${quote}${suffix}`;
      } else {
        warnings.push({
          file: path.relative(__dirname, file),
          importPath,
          matches: matches.length,
          candidates: matches.map(m => path.relative(__dirname, m))
        });
        return match;
      }
    });
  }

  if (fileChanged) {
    changedFiles++;
    if (APPLY) fs.writeFileSync(file, content, 'utf8');
  }
}

console.log(`\nMode: ${APPLY ? 'APPLY (files written)' : 'DRY RUN (no files written)'}`);
console.log(`Files that would change: ${changedFiles}`);
console.log(`Import/reference statements fixed: ${changedImports}`);
console.log(`Warnings (need manual fix): ${warnings.length}\n`);

if (warnings.length > 0) {
  console.log('--- WARNINGS ---');
  for (const w of warnings) {
    console.log(`${w.file}\n  import: "${w.importPath}"  (${w.matches} candidate matches)`);
    if (w.candidates.length) console.log(`  candidates: ${w.candidates.join(', ')}`);
  }
}
