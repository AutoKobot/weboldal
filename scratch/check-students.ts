import { db } from "../server/db";
import { users, classes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const classId = 1; // Próbáljuk meg az 1-es ID-val, vagy amit találtunk
    const date = '2026-04-30';
    
    console.log(`Checking attendance for class ${classId} on ${date}...`);
    
    const rows = await db.execute(sql`
      SELECT
        u.id as student_id,
        u.first_name,
        u.last_name,
        u.username,
        da.id as daily_id,
        da.date,
        da.status
      FROM users u
      LEFT JOIN daily_attendance da ON da.student_id = u.id AND da.date = ${date}
      WHERE u.class_id = ${classId} AND u.role = 'student'
      ORDER BY u.last_name, u.first_name
    `);
    
    console.log("Rows returned:", rows.rows.length);
    console.log("First 3 rows:", rows.rows.slice(0, 3));
    
    const allUsersInClass = await db.select().from(users).where(and(eq(users.classId, classId), eq(users.role, 'student')));
    console.log(`Users in class ${classId} from simple select:`, allUsersInClass.length);

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

import { sql, and, eq } from "drizzle-orm";
check();
