import { db } from "../server/db";
import { professions, subjects, modules, testResults, users } from "../shared/schema";
import { eq, ilike, sql } from "drizzle-orm";

async function checkIntegrity() {
  console.log("=== SEARCHING FOR 'HEGESZTŐ' IN DATABASE ===\n");

  // 1. Search in Professions
  const profs = await db.select().from(professions).where(sql`${professions.name} ILIKE '%hegesztő%'`);
  console.log(`Professions matching 'hegesztő': ${profs.length}`);
  profs.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.name}`));

  // 2. Search in Subjects
  const subs = await db.select().from(subjects).where(sql`${subjects.name} ILIKE '%hegesztő%'`);
  console.log(`Subjects matching 'hegesztő': ${subs.length}`);
  subs.forEach(s => console.log(`  - ID: ${s.id}, Name: ${s.name}, ProfID: ${s.professionId}`));

  // 3. Search in Modules
  const mods = await db.select().from(modules).where(sql`${modules.title} ILIKE '%hegesztő%'`);
  console.log(`Modules matching 'hegesztő' in title: ${mods.length}`);
  mods.slice(0, 5).forEach(m => console.log(`  - ID: ${m.id}, Title: ${m.title}, SubjID: ${m.subjectId}`));

  // 4. List ALL professions to be 100% sure
  console.log("\n--- COMPLETE LIST OF ALL PROFESSIONS ---");
  const allProfs = await db.select().from(professions);
  allProfs.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.name}, Admin: ${p.schoolAdminId}`));

  console.log("\n=== SEARCH COMPLETE ===");
  process.exit(0);
}

checkIntegrity().catch(err => {
  console.error("Search failed:", err);
  process.exit(1);
});
