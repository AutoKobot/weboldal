import 'dotenv/config';
import { pool } from "./server/db";

async function main() {
  console.log("🔍 Kapcsolódás a PostgreSQL adatbázishoz a méret diagnosztikához...\n");

  try {
    // 1. Teljes adatbázis mérete
    const dbSizeRes = await pool.query(
      "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS db_size, pg_database_size(pg_database.datname) AS db_size_bytes FROM pg_database WHERE pg_database.datname = current_database();"
    );
    const dbRow = dbSizeRes.rows[0];
    console.log(`📊 JELENLEGI ADATBÁZIS MÉRETE:`);
    console.log(`  - Név: ${dbRow.datname}`);
    console.log(`  - Méret: ${dbRow.db_size} (${dbRow.db_size_bytes} bájt)\n`);

    // 2. Felhasználói táblák mérete részletesen (táblaméret + indexek + TOAST adatok)
    console.log("📋 FELHASZNÁLÓI TÁBLÁK MÉRETE (méret szerint csökkenő sorrendben):");
    console.log("--------------------------------------------------------------------------------");
    
    const tablesSizeRes = await pool.query(`
      SELECT 
          schemaname AS schema,
          relname AS table_name,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          pg_size_pretty(pg_relation_size(relid)) AS table_size,
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
          pg_total_relation_size(relid) AS total_size_bytes
      FROM 
          pg_catalog.pg_statio_user_tables
      ORDER BY 
          total_size_bytes DESC;
    `);

    if (tablesSizeRes.rows.length === 0) {
      console.log("  Nem találhatóak felhasználói táblák.");
    } else {
      tablesSizeRes.rows.forEach((row: any, idx: number) => {
        console.log(`[${idx + 1}] Schema: ${row.schema} | Tábla: ${row.table_name}`);
        console.log(`    - Teljes méret (tábla + indexek): ${row.total_size}`);
        console.log(`    - Csak a tábla (adatok): ${row.table_size}`);
        console.log(`    - Indexek mérete: ${row.index_size}`);
      });
    }

    console.log("--------------------------------------------------------------------------------\n");

    // 3. Supabase és rendszer sémák mérete (pl. auth, storage, vault)
    console.log("⚙️ RENDSZER ÉS SUPABASE SÉMÁK MÉRETE:");
    console.log("--------------------------------------------------------------------------------");
    
    const schemasSizeRes = await pool.query(`
      SELECT 
          n.nspname AS schema_name,
          pg_size_pretty(sum(pg_total_relation_size(c.oid))) AS total_size,
          sum(pg_total_relation_size(c.oid)) AS total_size_bytes
      FROM 
          pg_catalog.pg_class c
      JOIN 
          pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE 
          c.relkind IN ('r', 'm') -- csak rendes táblák és materializált nézetek
      GROUP BY 
          n.nspname
      ORDER BY 
          total_size_bytes DESC;
    `);

    schemasSizeRes.rows.forEach((row: any, idx: number) => {
      console.log(`  [${idx + 1}] Séma: ${row.schema_name.padEnd(20)} | Méret: ${row.total_size}`);
    });
    
    console.log("--------------------------------------------------------------------------------\n");

    // 4. Rekordszámok a legfontosabb felhasználói táblákban
    console.log("📈 REKORDSZÁMOK A TÁBLÁKBAN:");
    console.log("--------------------------------------------------------------------------------");
    
    const tablesToCount = [
      'users', 'professions', 'modules', 'schools', 
      'chat_messages', 'community_projects', 'discussions', 
      'private_messages', 'subjects', 'flashcards', 'classes'
    ];

    for (const tableName of tablesToCount) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        console.log(`  - ${tableName.padEnd(20)}: ${countRes.rows[0].count} db rekord`);
      } catch (err: any) {
        // Ha a tábla nem létezik az adatbázisban, átugorjuk
        console.log(`  - ${tableName.padEnd(20)}: Hiba (nem létezik vagy nem lekérdezhető)`);
      }
    }
    console.log("--------------------------------------------------------------------------------");

  } catch (error: any) {
    console.error("❌ Hiba történt a lekérdezés során:", error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch(err => {
  console.error("❌ Végzetes hiba:", err);
  process.exit(1);
});
