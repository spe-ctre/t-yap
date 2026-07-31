const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.resolve(__dirname, 'src');
const APPLY = process.argv.includes('--apply');

// Collect all .ts files under src/
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

// Build index: basename (no extension) -> list of full paths
const fileIndex = {};
for (const f of allFiles) {
  const base = path.basename(f).replace(/\.tsx?$/, '');
  if (!fileIndex[base]) fileIndex[base] = [];
  fileIndex[base].push(f);
}

// Build index: directory basename -> list of dirs containing an index.ts
const dirIndex = {};
for (const f of allFiles) {
  if (path.basename(f).match(/^index\.tsx?$/)) {
    const dir = path.dirname(f);
    const dirBase = path.basename(dir);
    if (!dirIndex[dirBase]) dirIndex[dirBase] = [];
    dirIndex[dirBase].push(dir);
  }
}

function resolvesToRealFile(fromDir, importPath) {
  const base = path.resolve(fromDir, importPath);
  const candidates = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')];
  return candidates.some(c => fs.existsSync(c));
}

function toImportPath(fromDir, targetFile) {
  let rel = path.relative(fromDir, targetFile).replace(/\.tsx?$/, '');
  rel = rel.replace(/\/index$/, ''); // barrel files import the dir, not /index
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.split(path.sep).join('/'); // normalize for Windows just in case
}

const importRegex = /(from\s+|require\(\s*)(['"])(\.\.?\/[^'"]+)\2/g;

let changedFiles = 0;
let changedImports = 0;
const warnings = [];

for (const file of allFiles) {
  const dir = path.dirname(file);
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;

  content = content.replace(importRegex, (match, prefix, quote, importPath) => {
    if (resolvesToRealFile(dir, importPath)) return match; // already fine, leave it

    const base = path.basename(importPath);

    // Try file match first
    let matches = fileIndex[base] || [];
    // Try directory/barrel match if no file match
    if (matches.length === 0 && dirIndex[base]) {
      matches = dirIndex[base];
    }

    if (matches.length === 1) {
      const newPath = toImportPath(dir, matches[0]);
      changedImports++;
      fileChanged = true;
      return `${prefix}${quote}${newPath}${quote}`;
    } else {
      warnings.push({
        file: path.relative(__dirname, file),
        importPath,
        matches: matches.length,
        candidates: matches.map(m => path.relative(__dirname, m))
      });
      return match; // leave unchanged, needs manual fix
    }
  });

  if (fileChanged) {
    changedFiles++;
    if (APPLY) fs.writeFileSync(file, content, 'utf8');
  }
}

console.log(`\nMode: ${APPLY ? 'APPLY (files written)' : 'DRY RUN (no files written)'}`);
console.log(`Files that would change: ${changedFiles}`);
console.log(`Import statements fixed: ${changedImports}`);
console.log(`Warnings (need manual fix): ${warnings.length}\n`);

if (warnings.length > 0) {
  console.log('--- WARNINGS ---');
  for (const w of warnings) {
    console.log(`${w.file}\n  import: "${w.importPath}"  (${w.matches} candidate matches)`);
    if (w.candidates.length) console.log(`  candidates: ${w.candidates.join(', ')}`);
  }
}
