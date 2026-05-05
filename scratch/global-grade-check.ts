import { db } from "../server/db";
import { practicalGrades, modules, users, subjects, professions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function globalGradeCheck() {
  console.log("--- GLOBAL GRADE CHECK ---");

  // 1. Total counts
  const gradesCount = await db.execute(sql`SELECT count(*) FROM practical_grades`);
  console.log(`Total practical grades in DB: ${gradesCount.rows[0].count}`);

  const testResultsCount = await db.execute(sql`SELECT count(*) FROM test_results`);
  console.log(`Total test results in DB: ${testResultsCount.rows[0].count}`);

  // 2. Sample grades with names
  const samples = await db.execute(sql`
    SELECT 
      pg.id as grade_id,
      u.username as student_name,
      m.title as module_title,
      s.name as subject_name,
      p.name as profession_name,
      pg.grade,
      pg.created_at
    FROM practical_grades pg
    JOIN users u ON pg.student_id = u.id
    JOIN modules m ON pg.module_id = m.id
    JOIN subjects s ON m.subject_id = s.id
    JOIN professions p ON s.profession_id = p.id
    ORDER BY pg.created_at DESC
    LIMIT 10
  `);

  console.log("\nRecent 10 practical grades:");
  console.table(samples.rows);

  // 3. Orphaned grades (not linked to modules)
  const orphaned = await db.execute(sql`
    SELECT pg.id, pg.student_id, pg.module_id, u.username
    FROM practical_grades pg
    JOIN users u ON pg.student_id = u.id
    LEFT JOIN modules m ON pg.module_id = m.id
    WHERE m.id IS NULL
  `);
  console.log(`\nOrphaned Grades (module missing): ${orphaned.rows.length}`);
  if (orphaned.rows.length > 0) {
    console.log("Sample orphaned grade IDs:", orphaned.rows.slice(0, 5).map(r => r.id));
  }
}

globalGradeCheck().catch(console.error);
