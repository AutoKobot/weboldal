import { db } from "../server/db";
import { practicalGrades, modules, users, subjects } from "../shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

async function analyzeGrades() {
  console.log("--- GRADES ANALYSIS ---");
  
  // 1. Check all grades
  const allGrades = await db.select().from(practicalGrades);
  console.log(`Total practical grades in DB: ${allGrades.length}`);

  // 2. Check for grades where moduleId might not point to an existing module
  const orphanedGrades = await db.execute(sql`
    SELECT pg.* 
    FROM practical_grades pg
    LEFT JOIN modules m ON pg.module_id = m.id
    WHERE m.id IS NULL
  `);
  console.log(`Orphaned grades (module deleted): ${orphanedGrades.rows.length}`);

  // 3. Check current modules
  const allModules = await db.select().from(modules);
  console.log(`Current modules count: ${allModules.length}`);

  // 4. Try to find if we can map them back by some property
  // If we have orphaned grades, we might have their "data" somewhere? 
  // Wait, practical_grades table doesn't store module title/number. 
  // It ONLY stores module_id. If module is gone, we don't know which module it was!
  
  // UNLESS... we have a backup or logs?
  
  // 5. Check test_results too
  const { testResults } = await import('../shared/schema');
  const allTestResults = await db.select().from(testResults);
  console.log(`Total test results (theoretical grades): ${allTestResults.length}`);
  
  const orphanedResults = await db.execute(sql`
    SELECT tr.* 
    FROM test_results tr
    LEFT JOIN modules m ON tr.module_id = m.id
    WHERE m.id IS NULL
  `);
  console.log(`Orphaned test results: ${orphanedResults.rows.length}`);
}

analyzeGrades().catch(console.error);
