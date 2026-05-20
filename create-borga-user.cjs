const { Pool } = require('pg');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

const pool = new Pool({
    connectionString: 'postgresql://postgres.epbyruyoblszmbcgpfvh:TiszaloK123@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString('hex')}.${salt}`;
}

async function main() {
    try {
        // Hash the default password 'diák'
        const hashedPassword = await hashPassword('diák');
        console.log('Hash elkészült a "diák" jelszóhoz');

        // Check if user already exists
        const existing = await pool.query("SELECT id, username, role FROM users WHERE id = $1 OR username = $2", ['borga-universal-74', 'BorgaI74']);

        if (existing.rows.length > 0) {
            console.log('BorgaI74 felhasználó már létezik:', existing.rows[0]);
            // Update password to be sure
            await pool.query(
                "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
                [hashedPassword, existing.rows[0].id]
            );
            console.log('Jelszó frissítve.');
        } else {
            // Insert new user
            const result = await pool.query(
                `INSERT INTO users (id, username, password, email, first_name, last_name, auth_type, role, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                 RETURNING id, username, role`,
                [
                    'borga-universal-74',
                    'BorgaI74',
                    hashedPassword,
                    'borga@test.com',
                    'Imre',
                    'Borga',
                    'local',
                    'student'
                ]
            );
            console.log('BorgaI74 felhasználó létrehozva:', result.rows[0]);
        }

        // Verify
        const verify = await pool.query("SELECT id, username, role FROM users WHERE username = $1", ['BorgaI74']);
        console.log('\nEllenőrzés - users tábla:', verify.rows.length, 'sor');
        verify.rows.forEach(r => console.log(' -', r.id, '|', r.username, '|', r.role));

    } catch (e) {
        console.error('HIBA:', e.message);
        console.error(e.stack);
    } finally {
        await pool.end();
    }
}

main();
