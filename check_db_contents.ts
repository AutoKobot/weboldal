import 'dotenv/config';
import { db } from "./server/db";
import { modules, users } from "./shared/schema";

async function main() {
  console.log("🔍 Éles adatbázis adatainak lekérdezése diagnosztikához...");
  
  try {
    const allModules = await db.select().from(modules);
    console.log(`\n📦 Összesen ${allModules.length} modul található az adatbázisban.`);
    
    if (allModules.length > 0) {
      console.log("\n📄 Első 3 modul fontosabb mezői:");
      allModules.slice(0, 3).forEach((m, idx) => {
        console.log(`\n[${idx + 1}] ID: ${m.id} | Cím: ${m.title}`);
        console.log(`  - audioUrl: ${m.audioUrl || 'Nincs'}`);
        console.log(`  - imageUrl: ${m.imageUrl || 'Nincs'}`);
        console.log(`  - videoUrl: ${m.videoUrl || 'Nincs'}`);
        console.log(`  - presentationUrl: ${m.presentationUrl || 'Nincs'}`);
        
        const hasPresData = m.presentationData ? 'Igen' : 'Nem';
        console.log(`  - presentationData létezik-e: ${hasPresData}`);
        if (m.presentationData) {
          const str = JSON.stringify(m.presentationData);
          console.log(`    - presentationData hossza: ${str.length} karakter`);
          console.log(`    - Első 300 karakter: ${str.substring(0, 300)}...`);
        }
      });

      // Keressünk rá, hogy az adatbázis tartalmaz-e Supabase-es hivatkozást egyáltalán
      const dbDump = JSON.stringify(allModules);
      const hasSupabase = dbDump.includes("supabase.co") || dbDump.includes("presentations");
      console.log(`\n☁️ Tartalmaz az adatbázis Supabase vagy presentations hivatkozást? ${hasSupabase ? 'IGEN' : 'NEM'}`);
    } else {
      console.log("⚠️ Nincsenek modulok az adatbázisban!");
    }
  } catch (err: any) {
    console.error("❌ Hiba a modulok lekérdezése közben:", err.message);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
