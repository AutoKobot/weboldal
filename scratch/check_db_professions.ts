
import { db } from "../server/db";
import { professions, users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  const allProfessions = await db.select().from(professions);
  console.log("Professions in DB:", allProfessions.length);
  allProfessions.forEach(p => console.log(`- [${p.id}] ${p.name} (schoolId: ${p.schoolId}, schoolAdminId: ${p.schoolAdminId})`));

  const allUsers = await db.select().from(users);
  console.log("\nUsers in DB:", allUsers.length);
  // Show first few or relevant ones
  allUsers.slice(0, 5).forEach(u => console.log(`- [${u.id}] ${u.username} (${u.role}, schoolId: ${u.schoolId}, schoolAdminId: ${u.schoolAdminId})`));

  const allSchools = await db.select().from(schools);
  console.log("\nSchools in DB:", allSchools.length);
  allSchools.forEach(s => console.log(`- [${s.id}] ${s.name}`));
}

checkData().catch(console.error);
