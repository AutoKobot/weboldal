import { db } from "../server/db";
import { modules } from "../shared/schema";
import { isNotNull } from "drizzle-orm";

async function checkAudioUrls() {
  const allModules = await db.select({
    id: modules.id,
    title: modules.title,
    narrationAudioUrl: modules.narrationAudioUrl
  }).from(modules).where(isNotNull(modules.narrationAudioUrl));

  console.log("Audio URLs Check:");
  allModules.forEach(m => {
    console.log(`ID: ${m.id} | Title: ${m.title} | URL: ${m.narrationAudioUrl}`);
  });
  
  process.exit(0);
}

checkAudioUrls().catch(err => {
  console.error(err);
  process.exit(1);
});
