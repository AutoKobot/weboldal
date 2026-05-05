import { db } from './server/db';
import { professions, subjects, modules } from './shared/schema';

async function checkDatabase() {
  console.log("--- ADATBÁZIS ELLENŐRZÉS ---");
  try {
    const p = await db.select().from(professions);
    console.log(`Szakmák száma: ${p.length}`);
    if (p.length > 0) {
      console.log("Szakmák listája:");
      p.forEach(prof => console.log(` - ID: ${prof.id}, Név: ${prof.name}`));
    }

    const s = await db.select().from(subjects);
    console.log(`Tantárgyak száma: ${s.length}`);

    const m = await db.select().from(modules);
    console.log(`Modulok száma: ${m.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Hiba az ellenőrzés során:", error);
    process.exit(1);
  }
}

checkDatabase();
