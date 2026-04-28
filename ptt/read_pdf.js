import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// pdf-parse is in the project root node_modules
const require = createRequire(join(projectRoot, 'package.json'));
const pdf = require('pdf-parse');

async function main() {
  const buf1 = readFileSync(resolve(__dirname, 'Hegesztő-2020.07.30.-v1.pdf'));
  const data1 = await pdf(buf1);
  const text1 = data1.text;

  console.log("=== HEGESZTO PDF - ELSO 6000 KAR ===");
  console.log(text1.substring(0, 6000));

  console.log("\n\n=== HEGESZTO: Temakori resz (elso elofordulas) ===");
  const idx = text1.indexOf('témakörei');
  if (idx > -1) {
    console.log(text1.substring(Math.max(0, idx - 300), idx + 4000));
  } else {
    console.log("NEM TALALT 'temakorei' szot – elso 200 sor:");
    text1.split('\n').slice(0, 200).forEach((l, i) => console.log(i + ': ' + l));
  }

  writeFileSync(resolve(__dirname, 'hegeszto_text.txt'), text1, 'utf8');
  console.log("\n>> Mentve: ptt/hegeszto_text.txt (" + text1.length + " kar, " + data1.numpages + " oldal)");

  const buf2 = readFileSync(resolve(__dirname, 'Divatszabó-2020.06.29.-v1 (1).pdf'));
  const data2 = await pdf(buf2);
  writeFileSync(resolve(__dirname, 'divatszabo_text.txt'), data2.text, 'utf8');
  console.log(">> Mentve: ptt/divatszabo_text.txt (" + data2.text.length + " kar, " + data2.numpages + " oldal)");
}

main().catch(console.error);
