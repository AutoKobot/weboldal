import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function optimizeDatabase() {
  console.log("🚀 Kezdődik az adatbázis optimalizálása...");

  const queries = [
    // Felhasználók (users) indexek
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_class_id ON users (class_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_school_admin_id ON users (school_admin_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_assigned_teacher_id ON users (assigned_teacher_id)`,
    
    // Modulok (modules) indexek
    `CREATE INDEX IF NOT EXISTS idx_modules_subject_id ON modules (subject_id)`,
    // Megjegyzés: school_admin_id lehet hogy camelCase drizzle-ben de SQL-ben snake case a definíció alapján
    `CREATE INDEX IF NOT EXISTS idx_modules_school_admin_id ON modules (school_admin_id)`,
    
    // Tantárgyak (subjects) indexek
    `CREATE INDEX IF NOT EXISTS idx_subjects_profession_id ON subjects (profession_id)`,
    
    // Jelenlét (attendance) indexek
    `CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance (class_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date)`,
    
    // Teszt eredmények (test_results) indexek
    `CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_test_results_module_id ON test_results (module_id)`,
    
    // Chat üzenetek (chat_messages) indexek
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_module_id ON chat_messages (related_module_id)`
  ];

  for (const query of queries) {
    try {
      process.stdout.write(`⏳ Futtatás: ${query.substring(0, 50)}... `);
      await db.execute(sql.raw(query));
      console.log(`✅ KÉSZ`);
    } catch (err: any) {
      console.log(`❌ HIBA`);
      // Csak akkor naplózzuk részletesen ha nem létező oszlop hiba (gyakori drizzle-nél ha elnézzük a nevet)
      if (err.code === '42703') {
        console.warn(`   ⚠️ Oszlop hiba: Ellenőrizd az oszlop nevet ebben a lekérdezésben!`);
      } else {
        console.error(`   ⚠️ ${err.message}`);
      }
    }
  }

  console.log("\n✨ Az adatbázis optimalizálása befejeződött!");
}

optimizeDatabase().catch(err => {
  console.error("Critical error during optimization:", err);
  process.exit(1);
});
