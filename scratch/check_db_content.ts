
import { db } from "../server/db";
import { professions, subjects, modules, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  try {
    const profs = await db.select().from(professions);
    const subjs = await db.select().from(subjects);
    const mods = await db.select().from(modules);
    const allUsers = await db.select().from(users);

    console.log(`Professions: ${profs.length}`);
    profs.forEach(p => console.log(` - [${p.id}] ${p.name} (schoolAdminId: ${p.schoolAdminId})`));

    console.log(`Subjects: ${subjs.length}`);
    console.log(`Modules: ${mods.length}`);
    
    console.log(`Admins:`);
    allUsers.filter(u => u.role === 'admin' || u.role === 'school_admin').forEach(u => {
      console.log(` - [${u.id}] ${u.username} (${u.role}) (schoolAdminId: ${u.schoolAdminId})`);
    });

  } catch (err) {
    console.error(err);
  }
}

checkData();
