import { db } from "../server/db";
import { professions, subjects, modules, testResults, users } from "../shared/schema";
import { eq, isNull, notInArray, sql } from "drizzle-orm";

async function checkIntegrity() {
  console.log("=== GLOBAL LEARNING SYSTEM - DETAILED DATA INTEGRITY CHECK ===\n");

  // 0. Count all core entities
  const profCount = await db.select({ count: sql<number>`count(*)` }).from(professions);
  const subCount = await db.select({ count: sql<number>`count(*)` }).from(subjects);
  const modCount = await db.select({ count: sql<number>`count(*)` }).from(modules);
  
  console.log(`Total Professions in DB: ${profCount[0].count}`);
  console.log(`Total Subjects in DB:    ${subCount[0].count}`);
  console.log(`Total Modules in DB:     ${modCount[0].count}`);
  console.log("");

  // 1. Check for orphaned Subjects (no profession)
  // Check if profession_id exists in professions table
  const orphanedSubjects = await db.execute(sql`
    SELECT s.id, s.name, s.profession_id 
    FROM subjects s 
    LEFT JOIN professions p ON s.profession_id = p.id 
    WHERE p.id IS NULL
  `);
  
  console.log(`Orphaned Subjects (pointing to non-existent profession): ${orphanedSubjects.rows.length}`);
  if (orphanedSubjects.rows.length > 0) {
    orphanedSubjects.rows.slice(0, 10).forEach(s => console.log(`  - ID: ${s.id}, Name: ${s.name}, TargetProfID: ${s.profession_id}`));
  }

  // 2. Sample Professions
  if (Number(profCount[0].count) > 0) {
    console.log("\nSample Professions (First 5):");
    const samples = await db.select().from(professions).limit(5);
    samples.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.name}, schoolAdminId: ${p.schoolAdminId}`));
  }

  // 3. User Role Check
  console.log("\nAdmin Users:");
  const admins = await db.select().from(users).where(sql`${users.role} IN ('admin', 'school_admin')`);
  admins.forEach(a => console.log(`  - Username: ${a.username}, Role: ${a.role}, schoolAdminId: ${a.schoolAdminId}, schoolId: ${a.schoolId}`));

  console.log("\n=== CHECK COMPLETE ===");
  process.exit(0);
}

checkIntegrity().catch(err => {
  console.error("Integrity check failed:", err);
  process.exit(1);
});
