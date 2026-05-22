import 'dotenv/config';
import { db } from "./server/db";
import { 
  users, 
  professions, 
  modules, 
  schools, 
  chatMessages, 
  communityProjects, 
  discussions, 
  privateMessages 
} from "./shared/schema";
import fs from "fs";
import path from "path";

async function main() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    console.log("❌ Nem található 'uploads' könyvtár.");
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  if (files.length === 0) {
    console.log("✅ Az 'uploads' könyvtár üres.");
    return;
  }

  console.log(`\n🔍 Összesen ${files.length} fájl található az 'uploads' könyvtárban...`);
  console.log("⏳ Adatbázis hivatkozások lekérdezése az éles PostgreSQL-ből...");

  // Query all potential tables that can reference media files
  const [
    allUsers,
    allProfessions,
    allModules,
    allSchools,
    allChatMessages,
    allProjects,
    allDiscussions,
    allPrivateMessages
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(professions),
    db.select().from(modules),
    db.select().from(schools),
    db.select().from(chatMessages),
    db.select().from(communityProjects),
    db.select().from(discussions),
    db.select().from(privateMessages)
  ]);

  // Convert everything to a unified string to do a robust full-text search
  const dbDump = JSON.stringify({
    users: allUsers,
    professions: allProfessions,
    modules: allModules,
    schools: allSchools,
    chatMessages: allChatMessages,
    projects: allProjects,
    discussions: allDiscussions,
    privateMessages: allPrivateMessages
  });

  const unusedFiles: { name: string; size: number; path: string }[] = [];
  const usedFiles: { name: string; size: number }[] = [];
  let totalSavedBytes = 0;
  let totalUsedBytes = 0;

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) return;

    // Check if the filename is referenced anywhere in our database records
    if (dbDump.includes(file)) {
      usedFiles.push({ name: file, size: stats.size });
      totalUsedBytes += stats.size;
    } else {
      unusedFiles.push({ name: file, size: stats.size, path: filePath });
      totalSavedBytes += stats.size;
    }
  });

  console.log(`\n📊 Elemzés eredménye:`);
  console.log(`- Használatban lévő fájlok: ${usedFiles.length} db (${(totalUsedBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- Felesleges (árva) fájlok: ${unusedFiles.length} db (${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB)`);

  if (unusedFiles.length === 0) {
    console.log("\n✅ Nincsenek felesleges fájlok az uploads könyvtárban. Minden fájl használatban van.");
    process.exit(0);
  }

  console.log(`\n❌ Felesleges fájlok listája:`);
  unusedFiles.forEach(f => {
    console.log(`  - ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
  });

  console.log(`\n🧹 Törlés elindítása...`);
  let deletedCount = 0;
  unusedFiles.forEach(f => {
    try {
      fs.unlinkSync(f.path);
      deletedCount++;
    } catch (e: any) {
      console.error(`❌ Nem sikerült törölni a fájlt: ${f.name} - ${e.message}`);
    }
  });

  console.log(`\n✨ Sikeresen törölve: ${deletedCount}/${unusedFiles.length} felesleges fájl.`);
  console.log(`💾 Összesen felszabadított tárhely: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB!`);
  process.exit(0);
}

main().catch(err => {
  console.error("Hiba történt a futtatás során:", err);
  process.exit(1);
});
