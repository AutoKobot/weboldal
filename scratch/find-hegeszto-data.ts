import { db } from "../server/db";
import { modules, subjects, practicalGrades, professions } from "../shared/schema";
import { eq, ilike, sql, and } from "drizzle-orm";

async function findHegesztoData() {
  console.log("--- HEGESZTŐ DATA CHECK ---");
  
  // 1. Find the profession
  const hegesztoProfs = await db.select().from(professions).where(ilike(professions.name, '%hegesztő%'));
  console.log(`Found ${hegesztoProfs.length} Hegesztő professions:`);
  hegesztoProfs.forEach(p => console.log(`  ID: ${p.id}, Name: ${p.name}, Description: ${p.description}`));

  for (const prof of hegesztoProfs) {
    console.log(`\nAnalyzing Profession ID: ${prof.id} (${prof.name})`);
    
    // 2. Find subjects
    const profSubjects = await db.select().from(subjects).where(eq(subjects.professionId, prof.id));
    console.log(`  Found ${profSubjects.length} subjects.`);
    
    for (const sub of profSubjects) {
      const subModules = await db.select().from(modules).where(eq(modules.subjectId, sub.id));
      console.log(`    Subject: "${sub.name}" (ID: ${sub.id}, Type: ${sub.type}) - ${subModules.length} modules`);
      
      // 3. Check for grades in these modules
      for (const mod of subModules) {
        const grades = await db.select().from(practicalGrades).where(eq(practicalGrades.moduleId, mod.id));
        if (grades.length > 0) {
          console.log(`      MODULE: "${mod.title}" (ID: ${mod.id}, Num: ${mod.moduleNumber}) - ${grades.length} GRADES FOUND!`);
        }
      }
    }
  }

  // 4. Check for orphaned grades (already done in other script but let's be specific)
  const orphanedGrades = await db.execute(sql`
    SELECT pg.id, pg.student_id, pg.module_id, u.username
    FROM practical_grades pg
    JOIN users u ON pg.student_id = u.id
    LEFT JOIN modules m ON pg.module_id = m.id
    WHERE m.id IS NULL
  `);
  console.log(`\nOrphaned Grades (module missing): ${orphanedGrades.rows.length}`);
  if (orphanedGrades.rows.length > 0) {
     console.log("Sample orphaned grade:", orphanedGrades.rows[0]);
  }
}

findHegesztoData().catch(console.error);
