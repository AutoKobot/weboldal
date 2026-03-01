import { db } from './server/db.ts';
import { testResults } from './shared/schema.ts';

async function test() {
    const results = await db.select().from(testResults).limit(5);
    console.log("TEST RESULTS:", results);
    process.exit();
}

test().catch(console.error);
