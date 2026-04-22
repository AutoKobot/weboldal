
import { storage } from '../server/storage';

async function checkSettings() {
  const url = await storage.getSystemSetting("SUPABASE_URL");
  const key = await storage.getSystemSetting("SUPABASE_ANON_KEY");
  console.log("DB SUPABASE_URL:", url?.value);
  console.log("DB SUPABASE_ANON_KEY:", key?.value ? "PRESIDENT (exists)" : "MISSING");
  process.exit(0);
}

checkSettings().catch(console.error);
