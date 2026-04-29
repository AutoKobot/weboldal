
import { storage } from './server/storage';

async function checkJobs() {
  try {
    const jobs = await (storage as any).getBackgroundJobs?.() || [];
    console.log('Recent Jobs:');
    console.log(JSON.stringify(jobs.slice(0, 5), null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error checking jobs:', error);
    process.exit(1);
  }
}

checkJobs();
