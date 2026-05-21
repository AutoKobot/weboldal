const { Client } = require("pg");

const connectionString = 'postgresql://postgres.epbyruyoblszmbcgpfvh:TiszaloK123@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkDbTables() {
    if (!connectionString) {
        console.error("DATABASE_URL környezeti változó nincs beállítva.");
        return;
    }
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log("Sikeresen csatlakoztunk az adatbázishoz!");
        const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';");
        if (res.rows.length > 0) {
            console.log("Az alábbi táblák találhatók az adatbázisban:");
            res.rows.forEach(row => console.log(`- ${row.tablename}`));
        } else {
            console.log("Nem található tábla az adatbázisban.");
        }
    } catch (err) {
        console.error("Hiba történt az adatbázis csatlakozás vagy lekérdezés során:", err.message);
    } finally {
        await client.end();
    }
}

checkDbTables();