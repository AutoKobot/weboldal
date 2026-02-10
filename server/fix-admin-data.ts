
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fix() {
    console.log("Fixing school-admin-borga username...");

    await db.update(users)
        .set({ username: "Borga" })
        .where(eq(users.id, "school-admin-borga"));

    console.log("✅ Fixed.");
    process.exit(0);
}

fix();
