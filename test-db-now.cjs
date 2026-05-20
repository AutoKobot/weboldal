const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.epbyruyoblszmbcgpfvh:TiszaloK123@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
        console.log('Táblák száma:', r.rows.length);
        console.log('Táblák:', r.rows.map(x => x.table_name).join(', '));

        // users tábla tartalmának ellenőrzése
        try {
            const u = await pool.query("SELECT id, username, role FROM users LIMIT 5");
            console.log('\nUsers tábla:', u.rows.length, 'sor');
            u.rows.forEach(row => console.log(' -', row.id, '|', row.username, '|', row.role));
        } catch (e) {
            console.error('users tábla hiba:', e.message);
        }
    } catch (e) {
        console.error('DB HIBA:', e.message);
    } finally {
        await pool.end();
    }
}

main();
