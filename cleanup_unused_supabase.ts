import 'dotenv/config';
import { db } from "./server/db";
import { storage } from "./server/storage";
import { createClient } from '@supabase/supabase-js';
import { 
  users, 
  professions, 
  modules, 
  schools, 
  chatMessages, 
  communityProjects, 
  discussions, 
  privateMessages,
  subjects,
  flashcards,
  classes
} from "./shared/schema";

async function listAllFiles(supabase: any, bucketId: string, folder = ""): Promise<{ name: string; path: string; size: number }[]> {
  let files: { name: string; path: string; size: number }[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.storage.from(bucketId).list(folder || undefined, {
      limit,
      offset
    });

    if (error) {
      console.error(`❌ Hiba a(z) ${bucketId}/${folder} könyvtár listázásakor:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;
      
      if (item.name === '.emptyFolderPlaceholder') {
        continue;
      }
      
      // Megnézzük, hogy mappa-e (id hiányzik, vagy metadata null/méret hiányzik)
      const isFolder = !item.id || item.metadata === null || typeof item.metadata.size === 'undefined';
      
      if (isFolder) {
        const subFiles = await listAllFiles(supabase, bucketId, itemPath);
        files = files.concat(subFiles);
      } else {
        files.push({
          name: item.name,
          path: itemPath,
          size: item.metadata?.size || 0
        });
      }
    }

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return files;
}

function isFileUsed(fileName: string, filePath: string, dbDump: string): boolean {
  const encName = encodeURIComponent(fileName);
  const spaceName = fileName.replace(/ /g, '%20');
  
  const encPath = encodeURIComponent(filePath);
  const spacePath = filePath.replace(/ /g, '%20');
  
  return (
    dbDump.includes(fileName) ||
    dbDump.includes(encName) ||
    dbDump.includes(spaceName) ||
    dbDump.includes(filePath) ||
    dbDump.includes(encPath) ||
    dbDump.includes(spacePath)
  );
}

async function safeQuery(table: any, tableName: string): Promise<any[]> {
  try {
    return await db.select().from(table);
  } catch (error: any) {
    console.warn(`⚠️ Figyelem: A(z) '${tableName}' táblát nem sikerült lekérdezni (séma eltérés vagy hiányzó oszlop). Hiba: ${error.message}`);
    return [];
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log("🔍 SZIMULÁCIÓS MÓD (--dry-run aktív) - Nem történik tényleges törlés.");
  }

  // 1. Supabase kliens konfiguráció beolvasása (DB prioritás, fallback .env)
  console.log("⏳ Supabase konfiguráció beolvasása...");
  const dbUrlSetting = await storage.getSystemSetting("SUPABASE_URL");
  const dbKeySetting = await storage.getSystemSetting("SUPABASE_ANON_KEY");
  
  const supabaseUrl = dbUrlSetting?.value || process.env.SUPABASE_URL;
  const supabaseKey = dbKeySetting?.value || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Hiba: Hiányoznak a Supabase kulcsok a DB beállításokból és a .env fájlból is!");
    process.exit(1);
  }

  console.log(`[SUPABASE] Kliens inicializálása: ${supabaseUrl.substring(0, 25)}...`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Adatbázis hivatkozások lekérdezése
  console.log("⏳ Adatbázis rekordok lekérdezése az éles PostgreSQL-ből...");
  const [
    allUsers,
    allProfessions,
    allModules,
    allSchools,
    allChatMessages,
    allProjects,
    allDiscussions,
    allPrivateMessages,
    allSubjects,
    allFlashcards,
    allClasses
  ] = await Promise.all([
    safeQuery(users, 'users'),
    safeQuery(professions, 'professions'),
    safeQuery(modules, 'modules'),
    safeQuery(schools, 'schools'),
    safeQuery(chatMessages, 'chatMessages'),
    safeQuery(communityProjects, 'communityProjects'),
    safeQuery(discussions, 'discussions'),
    safeQuery(privateMessages, 'privateMessages'),
    safeQuery(subjects, 'subjects'),
    safeQuery(flashcards, 'flashcards'),
    safeQuery(classes, 'classes')
  ]);

  // Sorosítjuk az összes adatbázis adatot egyetlen nagy szöveggé a biztonságos teljes szövegű kereséshez
  const dbDump = JSON.stringify({
    users: allUsers,
    professions: allProfessions,
    modules: allModules,
    schools: allSchools,
    chatMessages: allChatMessages,
    projects: allProjects,
    discussions: allDiscussions,
    privateMessages: allPrivateMessages,
    subjects: allSubjects,
    flashcards: allFlashcards,
    classes: allClasses
  });

  console.log(`\n📊 Adatbázis statisztika:`);
  console.log(`  - Felhasználók (users): ${allUsers.length} db`);
  console.log(`  - Szakmák (professions): ${allProfessions.length} db`);
  console.log(`  - Modulok (modules): ${allModules.length} db`);
  console.log(`  - Iskolák (schools): ${allSchools.length} db`);
  console.log(`  - Tantárgyak (subjects): ${allSubjects.length} db`);
  console.log(`  - Osztályok (classes): ${allClasses.length} db`);
  console.log(`  - Letöltött adatok mérete: ${(dbDump.length / 1024).toFixed(2)} KB`);

  // Biztonsági ellenőrzés: ha az adatbázis dump túl kicsi, vagy a kritikus táblák (pl. modules) teljesen üresek, megállítjuk
  if (dbDump.length < 2000) {
    console.error(`\n❌ BIZTONSÁGI HIBA: Az adatbázis dump túl kicsi (${dbDump.length} karakter).`);
    console.error("Valószínűleg hiba történt a táblák lekérdezésekor, vagy az adatbázis üres.");
    console.error("A fájlok védelme érdekében a szkript leáll!");
    process.exit(1);
  }

  if (allModules.length === 0) {
    console.error(`\n❌ BIZTONSÁGI HIBA: A 'modules' tábla teljesen üres.`);
    console.error("Mivel a prezentációk és hanganyagok a modulokhoz kapcsolódnak, üres tábla esetén minden fájl törlésre kerülne.");
    console.error("A fájlok védelme érdekében a szkript leáll!");
    process.exit(1);
  }

  // 3. Supabase vödrök listázása
  console.log("⏳ Supabase vödrök (buckets) lekérdezése...");
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.error("❌ Nem sikerült lekérdezni a vödröket:", bucketError.message);
    process.exit(1);
  }
  
  if (!buckets || buckets.length === 0) {
    console.log("ℹ️ Nem található egyetlen Supabase vödör sem.");
    process.exit(0);
  }

  console.log(`📂 Talált vödrök: ${buckets.map(b => `'${b.name}' (id: ${b.id})`).join(", ")}`);

  let totalFilesChecked = 0;
  let totalUnusedFiles = 0;
  let totalSavedBytes = 0;

  // 4. Elemzés végrehajtása vödrönként
  for (const bucket of buckets) {
    console.log(`\n🔍 '${bucket.name}' (id: ${bucket.id}) vödör elemzése...`);
    const files = await listAllFiles(supabase, bucket.id);
    
    if (files.length === 0) {
      console.log(`  ✅ A(z) '${bucket.name}' vödör üres vagy nem tartalmaz fájlokat.`);
      continue;
    }

    console.log(`  📄 Talált fájlok száma: ${files.length} db`);
    totalFilesChecked += files.length;

    const unusedFiles: typeof files = [];
    const usedFiles: typeof files = [];

    for (const file of files) {
      if (isFileUsed(file.name, file.path, dbDump)) {
        usedFiles.push(file);
      } else {
        unusedFiles.push(file);
        totalUnusedFiles++;
        totalSavedBytes += file.size;
      }
    }

    console.log(`  📊 Eredmény:`);
    console.log(`    - Használatban lévő fájlok: ${usedFiles.length} db`);
    console.log(`    - Felesleges (árva) fájlok: ${unusedFiles.length} db (${(unusedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB)`);

    if (unusedFiles.length > 0) {
      console.log(`  ❌ Felesleges fájlok listája a(z) '${bucket.name}' vödörben:`);
      unusedFiles.forEach(f => {
        console.log(`    - ${f.path} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
      });

      if (!dryRun) {
        console.log(`  🧹 Felesleges fájlok törlése a(z) '${bucket.name}' vödörből...`);
        // Csoportos törlés a hatékonyság érdekében (max 100 fájl egyszerre a biztonság kedvéért)
        const batchSize = 50;
        let deletedCount = 0;

        for (let i = 0; i < unusedFiles.length; i += batchSize) {
          const batch = unusedFiles.slice(i, i + batchSize).map(f => f.path);
          const { data: deleteData, error: deleteError } = await supabase.storage.from(bucket.id).remove(batch);
          
          if (deleteError) {
            console.error(`    ❌ Hiba a törlés során (index: ${i}-${i + batch.length}):`, deleteError.message);
          } else {
            deletedCount += deleteData?.length || 0;
            console.log(`    ✨ Sikeresen törölve: ${deletedCount}/${unusedFiles.length} fájl.`);
          }
        }
      }
    } else {
      console.log(`  ✅ Nincsenek felesleges fájlok ebben a vödörben.`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 ÖSSZESÍTETT EREDMÉNY:`);
  console.log(`- Megvizsgált fájlok összesen: ${totalFilesChecked} db`);
  console.log(`- Ebből felesleges fájl: ${totalUnusedFiles} db`);
  console.log(`- ${dryRun ? 'Szimuláltan felszabadítható' : 'Felszabadított'} tárhely: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`======================================================`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Végzetes hiba történt a futtatás során:", err);
  process.exit(1);
});
