import { db } from "../server/db";
import { subjects, professions, classes, modules, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  console.log("--- CLASSES ---");
  const allClasses = await db.select().from(classes);
  allClasses.forEach(c => console.log(`Class: ${c.name}, ID: ${c.id}, ProfessionID: ${c.professionId}`));

  console.log("\n--- SUBJECTS (Practical) ---");
  const practicalSubjects = await db.select().from(subjects).where(eq(subjects.type, 'practical'));
  practicalSubjects.forEach(s => console.log(`Subject: ${s.name}, ID: ${s.id}, ProfessionID: ${s.professionId}`));

  console.log("\n--- MODULES (Practical) ---");
  const practicalModules = await db.select().from(modules).where(eq(modules.type, 'practical'));
  console.log(`Total practical modules: ${practicalModules.length}`);

  console.log("\n--- STUDENTS ---");
  const studentCount = await db.select().from(users).where(eq(users.role, 'student'));
  console.log(`Total students: ${studentCount.length}`);
}

checkData().catch(console.error);
