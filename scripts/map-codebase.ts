import fs from 'fs';
import path from 'path';

interface CodeLocation {
  name: string;
  type: 'class' | 'function' | 'method' | 'interface' | 'type' | 'const';
  line: number;
  file: string;
}

const IGNORE_DIRS = ['node_modules', '.git', 'dist', '.replit', 'attached_assets'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];

function scanFile(filePath: string, relativePath: string): CodeLocation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const locations: CodeLocation[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Classes
    const classMatch = trimmed.match(/^export\s+class\s+(\w+)/);
    if (classMatch) {
      locations.push({ name: classMatch[1], type: 'class', line: lineNumber, file: relativePath });
    }

    // Functions
    const funcMatch = trimmed.match(/^export\s+async\s+function\s+(\w+)|^export\s+function\s+(\w+)/);
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2];
      locations.push({ name, type: 'function', line: lineNumber, file: relativePath });
    }

    // Interfaces & Types
    const interfaceMatch = trimmed.match(/^export\s+interface\s+(\w+)|^export\s+type\s+(\w+)/);
    if (interfaceMatch) {
      const name = interfaceMatch[1] || interfaceMatch[2];
      locations.push({ name, type: 'interface', line: lineNumber, file: relativePath });
    }

    // Const (often components or handlers)
    const constMatch = trimmed.match(/^export\s+const\s+(\w+)\s*=/);
    if (constMatch) {
      locations.push({ name: constMatch[1], type: 'const', line: lineNumber, file: relativePath });
    }

    // Methods inside classes (simplified)
    const methodMatch = trimmed.match(/^(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>[\]]+)?\s*{/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      // Avoid false positives from common keywords
      locations.push({ name: methodMatch[1], type: 'method', line: lineNumber, file: relativePath });
    }
  });

  return locations;
}

function scanDir(dir: string, rootDir: string): CodeLocation[] {
  let results: CodeLocation[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(rootDir, fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        results = results.concat(scanDir(fullPath, rootDir));
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(file))) {
      results = results.concat(scanFile(fullPath, relativePath));
    }
  }

  return results;
}

const rootDir = process.cwd();
console.log(`🔍 Scanning codebase in ${rootDir}...`);

const serverResults = scanDir(path.join(rootDir, 'server'), rootDir);
const clientResults = scanDir(path.join(rootDir, 'client', 'src'), rootDir);
const sharedResults = scanDir(path.join(rootDir, 'shared'), rootDir);

const allResults = [...serverResults, ...clientResults, ...sharedResults];

const outputPath = path.join(rootDir, 'scripts', 'code-map.json');
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));

console.log(`✅ Codebase mapped! Found ${allResults.length} definitions.`);
console.log(`📄 Map saved to: scripts/code-map.json`);
