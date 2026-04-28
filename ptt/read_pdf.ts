import pdf from 'pdf-parse';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=== HEGESZTO PDF feldolgozas ===");
  const buf1 = readFileSync(resolve(__dirname, 'Hegesztő-2020.07.30.-v1.pdf'));
  const data1 = await pdf(buf1);
  const text1 = data1.text;

  console.log("ELSO 6000 KAR:");
  console.log(text1.substring(0, 6000));

  console.log("\n\n=== TEMAKORI RESZ KERESESE ===");
  const idx = text1.indexOf('témakörei');
  if (idx > -1) {
    console.log("TALALT 'temakorei' szót a(z) " + idx + ". pozicioban:");
    console.log(text1.substring(Math.max(0, idx - 300), idx + 4000));
  } else {
    console.log("NEM TALALT 'temakorei' szot!");
    // Print line by line to see what's in the doc
    const lines = text1.split('\n');
    console.log("Sorok szama: " + lines.length);
    lines.slice(0, 150).forEach((l: string, i: number) => console.log(i + ': ' + l));
  }

  writeFileSync(resolve(__dirname, 'hegeszto_text.txt'), text1, 'utf8');
  console.log("\n>> Mentve: ptt/hegeszto_text.txt (" + text1.length + " kar, " + data1.numpages + " oldal)");

  console.log("\n=== DIVATSZABO PDF feldolgozas ===");
  const buf2 = readFileSync(resolve(__dirname, 'Divatszabó-2020.06.29.-v1 (1).pdf'));
  const data2 = await pdf(buf2);
  writeFileSync(resolve(__dirname, 'divatszabo_text.txt'), data2.text, 'utf8');
  console.log(">> Mentve: ptt/divatszabo_text.txt (" + data2.text.length + " kar, " + data2.numpages + " oldal)");
}

main().catch(console.error);
