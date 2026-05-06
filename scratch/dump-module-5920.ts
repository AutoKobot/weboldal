import { storage } from '../server/storage';
import * as fs from 'fs';

async function dump() {
  try {
    const module = await storage.getModule(5920);
    if (module) {
      fs.writeFileSync('scratch/module-5920.txt', `=== TITLE ===\n${module.title}\n\n=== CONTENT ===\n${module.content}\n\n=== CONCISE ===\n${module.conciseContent}\n\n=== DETAILED ===\n${module.detailedContent}`);
      console.log("Module 5920 dumped successfully!");
    } else {
      console.log("Module 5920 not found in database.");
    }
  } catch (e: any) {
    console.error("Error dumping module:", e);
  }
  process.exit(0);
}

dump();
