
import 'dotenv/config';
import { db, pool } from "../server/db";
import { modules } from "../shared/schema";

async function main() {
    console.log("Starting DB check...");
    try {
        const allModules = await db.query.modules.findMany();
        console.log(`Found ${allModules.length} modules.`);
    } catch (error) {
        console.error("DB Error:", error);
    } finally {
        console.log("Closing pool...");
        await pool.end();
    }
}

main();
