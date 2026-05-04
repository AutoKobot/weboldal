
import { storage } from '../server/storage';
import * as fs from 'fs';

async function checkStatus() {
  let output = '';
  try {
    const jobs = await (storage as any).getBackgroundJobs();
    output += '--- Background Jobs ---\n';
    jobs.forEach((j: any) => {
      output += `ID: ${j.id}, Type: ${j.type}, Status: ${j.status}, Progress: ${j.progress}, Message: ${j.message}, Error: ${j.error}\n`;
    });

    const professions = await storage.getProfessions();
    output += '\n--- Professions ---\n';
    professions.forEach((p: any) => {
      output += `ID: ${p.id}, Name: ${p.name}\n`;
    });
  } catch (e: any) {
    output += `Error: ${e.message}\n`;
  }
  
  fs.writeFileSync('scratch/import-results.txt', output);
}

checkStatus().catch(e => fs.writeFileSync('scratch/import-results.txt', String(e)));
