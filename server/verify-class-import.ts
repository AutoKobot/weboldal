
import { db } from "./db";
import { users, classes, professions, groupMembers } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verify() {
    console.log("Verifying Class and Student Import Prerequisites...");


    // 1. Check School Admin
    const schoolAdmin = await db.query.users.findFirst({
        where: eq(users.id, "school-admin-borga")
    });

    if (!schoolAdmin) {
        console.error("❌ 'school-admin-borga' user NOT found!");
        // Let's list all users to see what's there
        const allUsers = await db.select().from(users);
        allUsers.forEach(u => console.log(`User: ${u.id} (${u.username}) - ${u.role}`));
    } else {
        console.log(`✅ 'school-admin-borga' found. Role: ${schoolAdmin.role}, Username: ${schoolAdmin.username}`);
        if (schoolAdmin.role !== 'school_admin') {
            console.error("❌ Role is incorrect!");
        }
    }

    // 2. Check Profession "Hegesztő"
    const welderProfession = await db.query.professions.findFirst({
        where: eq(professions.name, "Hegesztő")
    });

    if (!welderProfession) {
        console.log("⚠️ 'Hegesztő' profession NOT found. It needs to be created.");
    } else {
        console.log(`✅ 'Hegesztő' profession found (ID: ${welderProfession.id}).`);
    }

    // 3. Simulate Class Creation Check
    console.log("ℹ️ Class creation requires: name, schoolAdminId, professionId (optional)");

    // 4. Simulate Student Import Check
    console.log("ℹ️ Student import features:");
    console.log("   - Single student registration: AVAILABLE (/api/school-admin/register-student)");
    console.log("   - Add existing student to class: AVAILABLE (/api/school-admin/classes/:id/add-student)");
    console.log("   - Bulk CSV Import: ❌ NOT FOUND in routes.");

    process.exit(0);
}

verify().catch(console.error);
