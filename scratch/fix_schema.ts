
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixSchema() {
  console.log("🚀 Manuális séma-javítás indítása...");
  
  const statements = [
    "ALTER TABLE professions ADD COLUMN IF NOT EXISTS total_hours INTEGER",
    "ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS module_title VARCHAR(255)",
    "ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255)",
    "ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS module_number INTEGER",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS module_title VARCHAR(255)",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255)",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS module_number INTEGER",
    "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_name VARCHAR(255)",
    "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR(255)",
    "ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS student_name VARCHAR(255)",
    "ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR(255)"
  ];

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
      console.log(`✅ Sikeres: ${statement}`);
    } catch (e: any) {
      console.error(`❌ Hiba: ${statement} -> ${e.message}`);
    }
  }

  console.log("✨ Séma-javítás kész.");
  process.exit(0);
}

fixSchema();
