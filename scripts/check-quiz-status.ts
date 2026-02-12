
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const withQuizzes = await db.execute(sql`
      SELECT count(*) as count FROM modules 
      WHERE generated_quizzes IS NOT NULL 
      AND jsonb_array_length(generated_quizzes) > 0
    `);

        const totalModules = await db.execute(sql`SELECT count(*) as count FROM modules`);

        const withoutCount = await db.execute(sql`
      SELECT count(*) as count FROM modules 
      WHERE generated_quizzes IS NULL 
      OR generated_quizzes::text = '[]'
    `);

        console.log("TOTAL:", totalModules.rows[0]?.count);
        console.log("WITH QUIZZES:", withQuizzes.rows[0]?.count);
        console.log("WITHOUT:", withoutCount.rows[0]?.count);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await pool.end();
    }
}
main();
