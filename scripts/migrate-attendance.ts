/**
 * Migration: Jelenlét rendszer tábláinak létrehozása
 * Futtatás: npx tsx scripts/migrate-attendance.ts
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('📋 Jelenlét rendszer migration indítása...');

    // 1. lesson_schedules tábla
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_schedules (
        id SERIAL PRIMARY KEY,
        school_admin_id VARCHAR NOT NULL REFERENCES users(id),
        period_number INTEGER NOT NULL,
        start_hour INTEGER NOT NULL,
        start_minute INTEGER NOT NULL DEFAULT 0,
        end_hour INTEGER NOT NULL,
        end_minute INTEGER NOT NULL DEFAULT 45,
        label VARCHAR,
        schedule_group VARCHAR NOT NULL DEFAULT 'morning',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(school_admin_id, period_number, schedule_group)
      );
    `);
    
    // Frissítés: ha már létezik a tábla, adjuk hozzá a mezőt és a kényszert
    await client.query(`
      ALTER TABLE lesson_schedules ADD COLUMN IF NOT EXISTS schedule_group VARCHAR NOT NULL DEFAULT 'morning';
      
      -- Meglévő unique kényszer törlése és új létrehozása (ha kell)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_schedules_school_admin_id_period_number_schedule_group_key') THEN
          ALTER TABLE lesson_schedules ADD CONSTRAINT lesson_schedules_school_admin_id_period_number_schedule_group_key UNIQUE(school_admin_id, period_number, schedule_group);
        END IF;
      END $$;
    `);
    console.log('✅ lesson_schedules tábla frissítve');

    // classes tábla frissítése schedule_group mezővel
    await client.query(`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_group VARCHAR NOT NULL DEFAULT 'morning';
    `);
    console.log('✅ classes tábla frissítve');

    // 2. attendance tábla
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        teacher_id VARCHAR REFERENCES users(id),
        date VARCHAR NOT NULL,
        period_number INTEGER NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'present',
        recorded_at TIMESTAMP DEFAULT NOW(),
        recorded_by VARCHAR NOT NULL DEFAULT 'auto',
        login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, class_id, date, period_number)
      );
    `);
    console.log('✅ attendance tábla létrehozva');

    // Index a gyors lekérdezésekhez
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
      CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, date);
    `);
    console.log('✅ attendance indexek létrehozva');

    // 3. student_daily_notes tábla
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_daily_notes (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        teacher_id VARCHAR NOT NULL REFERENCES users(id),
        class_id INTEGER REFERENCES classes(id),
        date VARCHAR NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, teacher_id, date)
      );
    `);
    console.log('✅ student_daily_notes tábla létrehozva');

    await client.query('COMMIT');
    console.log('\n🎉 Migration sikeresen befejezve!');
    console.log('📌 Következő lépés: Az iskolai adminok beállíthatják az órarendet a dashboardon a délelőtti és délutáni műszakokhoz.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration hiba:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
