import 'dotenv/config';
import { db } from './server/db';
import { testResults, users, modules } from './shared/schema';
import { eq, gte, and, desc } from 'drizzle-orm';

async function main() {
    console.log('Testing drizzle select...');
    const rs = await db.select().from(testResults).limit(2);
    console.log('Got', rs.length, 'results');
    if (rs.length) {
        console.log('First created_at:', rs[0].createdAt);
        console.log('Type of created_at:', typeof rs[0].createdAt, rs[0].createdAt instanceof Date);

        // Now test a gte query
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const rs2 = await db.select().from(testResults).where(gte(testResults.createdAt, d));
        console.log('Got', rs2.length, 'results after', d.toISOString());
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
