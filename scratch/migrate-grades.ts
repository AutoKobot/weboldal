import { db } from "../server/db";
import { modules, subjects, practicalGrades, professions, testResults } from "../shared/schema";
import { eq, sql, and, ne } from "drizzle-orm";

async function migrateGrades() {
  console.log("--- STARTING GRADE MIGRATION ---");

  // 1. Find subjects with duplicate module numbers
  const subjectsWithDuplicates = await db.execute(sql`
    SELECT subject_id, module_number, count(*) as count
    FROM modules
    GROUP BY subject_id, module_number
    HAVING count(*) > 1
  `);

  console.log(`Found ${subjectsWithDuplicates.rows.length} subject-module combinations with duplicates.`);

  for (const row of (subjectsWithDuplicates.rows as any)) {
    const subjectId = row.subject_id;
    const moduleNumber = row.module_number;

    // Get all modules for this subject and number
    const mods = await db.select().from(modules).where(
      and(
        eq(modules.subjectId, subjectId),
        eq(modules.moduleNumber, moduleNumber)
      )
    ).orderBy(modules.id); // Oldest first

    if (mods.length < 2) continue;

    const oldMod = mods[0];
    const newMod = mods[mods.length - 1];

    console.log(`\nMapping Subject ID ${subjectId}, Module #${moduleNumber}:`);
    console.log(`  OLD: "${oldMod.title}" (ID: ${oldMod.id})`);
    console.log(`  NEW: "${newMod.title}" (ID: ${newMod.id})`);

    // 2. Find practical grades on old module
    const oldGrades = await db.select().from(practicalGrades).where(eq(practicalGrades.moduleId, oldMod.id));
    if (oldGrades.length > 0) {
      console.log(`  Found ${oldGrades.length} practical grades to migrate.`);
      for (const grade of oldGrades) {
        // Check if a grade already exists on the new module for this student
        const existing = await db.select().from(practicalGrades).where(
          and(
            eq(practicalGrades.studentId, grade.studentId),
            eq(practicalGrades.moduleId, newMod.id)
          )
        );

        if (existing.length === 0) {
          await db.insert(practicalGrades).values({
            studentId: grade.studentId,
            teacherId: grade.teacherId,
            moduleId: newMod.id,
            grade: grade.grade,
            comment: (grade.comment || "") + " (Migrálva régi modulról: " + oldMod.title + ")",
            createdAt: grade.createdAt
          });
          console.log(`    Migrated practical grade for student ${grade.studentId}`);
        }
      }
    }

    // 3. Find test results on old module
    const oldResults = await db.select().from(testResults).where(eq(testResults.moduleId, oldMod.id));
    if (oldResults.length > 0) {
       console.log(`  Found ${oldResults.length} test results to migrate.`);
       for (const res of oldResults) {
         const existing = await db.select().from(testResults).where(
           and(
             eq(testResults.userId, res.userId),
             eq(testResults.moduleId, newMod.id)
           )
         );
         
         if (existing.length === 0) {
           await db.insert(testResults).values({
             userId: res.userId,
             moduleId: newMod.id,
             score: res.score,
             maxScore: res.maxScore,
             passed: res.passed,
             details: res.details,
             createdAt: res.createdAt
           });
           console.log(`    Migrated test result for user ${res.userId}`);
         }
       }
    }
  }

  console.log("\n--- MIGRATION FINISHED ---");
}

migrateGrades().catch(console.error);
