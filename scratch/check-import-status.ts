
import { storage } from '../server/storage';

async function checkJobs() {
  const jobs = await (storage as any).getBackgroundJobs();
  console.log('--- Background Jobs ---');
  jobs.forEach((j: any) => {
    console.log(`ID: ${j.id}, Type: ${j.type}, Status: ${j.status}, Progress: ${j.progress}, Message: ${j.message}, Error: ${j.error}`);
  });

  const professions = await storage.getProfessions();
  console.log('--- Professions ---');
  professions.forEach((p: any) => {
    console.log(`ID: ${p.id}, Name: ${p.name}`);
  });
}

checkJobs().catch(console.error);
