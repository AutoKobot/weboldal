import { db } from "../server/db";
import { users, testResults, practicalGrades, modules } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function restore() {
  console.log("=== DIÁKOK MODUL HOZZÁFÉRÉSÉNEK JAVÍTÁSA ÉS ANALÍZISE ===\n");
  try {
    // 1. Get all published modules
    const allPublishedModules = await db.select().from(modules);
    const totalModuleCount = allPublishedModules.length;
    console.log(`Összes modul száma a rendszerben: ${totalModuleCount}`);

    // 2. Fetch all student users
    const students = await db.select().from(users).where(eq(users.role, "student"));
    console.log(`Összes diák száma: ${students.length}\n`);

    console.log("--------------------------------------------------------------------------------");
    console.log("DIÁK JELENTÉS (Aktuális állapot vs. Valós teljesítések)");
    console.log("--------------------------------------------------------------------------------");

    // We set DRY_RUN to false to immediately fix the database for the user as requested.
    const DRY_RUN = false; 

    for (const student of students) {
      const currentCompleted = student.completedModules || [];
      
      // Fetch passed tests
      const passedTests = await db.select().from(testResults).where(
        and(
          eq(testResults.userId, student.id),
          eq(testResults.passed, true)
        )
      );
      const passedTestModuleIds = passedTests
        .map(t => t.moduleId)
        .filter((id): id is number => id !== null);

      // Fetch practical grades
      const practicals = await db.select().from(practicalGrades).where(
        eq(practicalGrades.studentId, student.id)
      );
      const practicalModuleIds = practicals
        .map(p => p.moduleId)
        .filter((id): id is number => id !== null);

      // Combine and get unique actual completed module IDs
      const actualCompletedSet = new Set([...passedTestModuleIds, ...practicalModuleIds]);
      const actualCompletedModuleIds = Array.from(actualCompletedSet);

      const isAllUnlockedAccidentally = currentCompleted.length >= totalModuleCount && totalModuleCount > 0;
      
      console.log(`Tanuló: ${student.lastName} ${student.firstName} (${student.username})`);
      console.log(` - Jelenleg adatbázisban tárolt teljesített modulok száma: ${currentCompleted.length}`);
      console.log(` - Valós teljesítések (tesztek + gyakorlatok): ${actualCompletedModuleIds.length}`);
      console.log(`   * Sikeres tesztek moduljai: [${Array.from(new Set(passedTestModuleIds)).join(", ")}]`);
      console.log(`   * Gyakorlati jegyek moduljai: [${Array.from(new Set(practicalModuleIds)).join(", ")}]`);
      
      if (isAllUnlockedAccidentally) {
        console.log(` ⚠️  FIGYELEM: Ennél a diáknál valószínűleg VÉLETLENÜL be lett kapcsolva az összes modul!`);
      }

      if (currentCompleted.length !== actualCompletedModuleIds.length) {
        if (!DRY_RUN) {
          console.log(` 🔄  HELYREÁLLÍTÁS: Modulok listájának frissítése a valós teljesítésekre...`);
          await db.update(users)
            .set({ 
              completedModules: actualCompletedModuleIds,
              updatedAt: new Date()
            })
            .where(eq(users.id, student.id));
          console.log(` ✅  Sikeresen helyreállítva!`);
        } else {
          console.log(`  [DRY RUN] Helyreállítható lenne a következőre: [${actualCompletedModuleIds.join(", ")}]`);
        }
      } else {
        console.log(` ✨  Minden rendben, nincs szükség módosításra.`);
      }
      console.log("--------------------------------------------------------------------------------");
    }

  } catch (error) {
    console.error("Hiba történt a helyreállítás során:", error);
  }
  process.exit(0);
}

restore();
