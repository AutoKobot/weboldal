import 'dotenv/config';
import { runSmartBackup } from '../server/drive-backup';

async function test() {
  console.log("Starting manual Google Drive Backup test...");
  try {
    const result = await runSmartBackup();
    console.log("Finished running runSmartBackup! Result:", result);
  } catch (err: any) {
    console.error("Critical Test error:", err);
  }
}

test();
