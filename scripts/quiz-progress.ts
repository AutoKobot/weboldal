
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import { writeFileSync } from "fs";

async function main() {
    const total = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM modules`);
    const withNew = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM modules WHERE generated_quizzes IS NOT NULL AND jsonb_array_length(generated_quizzes) >= 3 AND jsonb_array_length(generated_quizzes->0) >= 8`);
    const withOld = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM modules WHERE generated_quizzes IS NOT NULL AND jsonb_array_length(generated_quizzes) >= 1 AND jsonb_array_length(generated_quizzes->0) < 8`);
    const without = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM modules WHERE generated_quizzes IS NULL OR jsonb_array_length(generated_quizzes) = 0`);

    const result = `Total modules: ${total.rows[0].cnt}
With new 10q quizzes: ${withNew.rows[0].cnt}
With old 5-8q quizzes: ${withOld.rows[0].cnt}
Without quizzes: ${without.rows[0].cnt}`;

    console.log(result);
    writeFileSync("quiz-status.log", result);
    await pool.end();
}
main();
