
import { storage } from "../server/storage";

async function checkJobs() {
  try {
    const jobs = await (storage as any).getBackgroundJobsByTag('ikk_import');
    console.log("Recent IKK Import Jobs:");
    jobs.slice(0, 5).forEach((j: any) => {
      console.log(`ID: ${j.id}, Status: ${j.status}, Progress: ${j.progress}%, Error: ${j.error || 'none'}`);
    });
  } catch (err) {
    console.error("Error checking jobs:", err);
  }
}

checkJobs();
