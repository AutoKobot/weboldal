
import 'dotenv/config';
import { db, pool } from "../server/db";
import { users, professions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function repair() {
    console.log("🛠️ Starting database repair for stale profession IDs...");
    try {
        // 1. Get all valid profession IDs
        const allProfessions = await db.select({ id: professions.id }).from(professions);
        const validIds = allProfessions.map(p => p.id);
        console.log(`✅ Found ${validIds.length} valid professions.`);

        // 2. Update all users using a SQL query to filter the JSONB array
        // This is safer than doing it in JS if there are many users
        console.log("🧹 Cleaning up stale IDs from user assigned lists...");
        
        // We use a complex SQL to rebuild the array only with valid IDs
        // Note: This works for Postgres (Neon)
        const result = await db.execute(sql`
            UPDATE users 
            SET assigned_profession_ids = (
                SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                FROM jsonb_array_elements(assigned_profession_ids) elem 
                WHERE elem::int IN (${sql.join(validIds, sql`, `)})
            )
            WHERE jsonb_array_length(assigned_profession_ids) > 0
            AND NOT (assigned_profession_ids <@ ${JSON.stringify(validIds)}::jsonb)
        `);

        console.log("🎉 Repair completed successfully.");
    } catch (error) {
        console.error("❌ Repair failed:", error);
    } finally {
        await pool.end();
    }
}

repair();
