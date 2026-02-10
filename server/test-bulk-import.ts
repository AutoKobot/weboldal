
import { db } from "./db";
import { users, classes, professions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testBulkImport() {
    console.log("🧪 Starting Bulk Import Test (Randomized/Debug)...");

    try {
        console.log("  [1/6] Importing storage module...");
        const { storage } = await import("./storage");
        console.log("  ✅ Storage module imported.");

        const schoolAdminId = "school-admin-borga";
        const testClassName = `Test Import Class ${Date.now()}`;

        console.log("  [2/6] Fetching profession 'Hegesztő'...");
        try {
            const profession = await db.query.professions.findFirst({
                where: eq(professions.name, "Hegesztő")
            });
            if (!profession) throw new Error("Profession 'Hegesztő' not found");
            console.log(`  ✅ Profession found: ${profession.id}`);

            console.log(`  [3/6] Creating test class '${testClassName}'...`);
            const newClass = await storage.createClass({
                name: testClassName,
                schoolAdminId,
                professionId: profession.id,
                description: "Test Class for Bulk Import"
            });
            console.log(`  ✅ Created Class: ${newClass.id}`);

            console.log("  [4/6] Importing 2 students...");
            const studentsToImport = [
                { firstName: "Imp", lastName: "T1", username: `i.t1.${Date.now()}` },
                { firstName: "Imp", lastName: "T2", username: `i.t2.${Date.now()}` }
            ];

            const createdUsers = [];
            for (const s of studentsToImport) {
                console.log(`    Processing ${s.username}...`);

                console.log("      Creating user...");
                const user = await storage.createUser({
                    ...s,
                    role: "student",
                    password: "password123",
                    schoolAdminId,
                    email: `${s.username}@test.com`
                });
                createdUsers.push(user);
                console.log(`      User created: ${user.id}`);

                console.log("      Adding to class...");
                await storage.addStudentToClass(user.id, newClass.id);
                console.log("      Added to class.");

                if (newClass.professionId) {
                    console.log("      Updating profession...");
                    await storage.updateUserProfession(user.id, newClass.professionId);
                    console.log("      Profession updated.");
                }
            }

            console.log("  ✅ Import completed.");

            console.log("  [5/6] Verifying results...");
            // FIXED METHOD NAME: getStudentsByClass (was getStudentsByClassId)
            const classUsers = await storage.getStudentsByClass(newClass.id);
            console.log(`    Found ${classUsers.length} students in class.`);

            let success = true;
            for (const u of classUsers) {
                if (createdUsers.find(cu => cu.id === u.id)) {
                    console.log(`    - ${u.username}: Class=${u.classId}, Prof=${u.selectedProfessionId}`);
                    if (u.classId !== newClass.id) {
                        console.error("      ❌ Wrong ClassID");
                        success = false;
                    }
                    if (u.selectedProfessionId !== profession.id) {
                        console.error("      ❌ Wrong ProfessionID");
                        success = false;
                    }
                }
            }

            if (success) {
                console.log("\n✅ VERIFICATION PASSED!");
            } else {
                console.error("\n❌ VERIFICATION FAILED.");
            }

            console.log("  [6/6] Done (Skipping Cleanup).");
            process.exit(success ? 0 : 1);

        } catch (innerError) {
            console.error("\n❌ Error in logic block:", innerError);
            process.exit(1);
        }

    } catch (e) {
        console.error("\n❌ CRITICAL FATAL ERROR:", e);
        process.exit(1);
    }
}

testBulkImport();
