import { db } from './server/db.ts';
import { testResults, users, modules } from './shared/schema.ts';
import { eq, gte, and, desc, sql } from 'drizzle-orm';

async function test() {
    const classId = 1; // Assuming a class exists
    const startDateStr = new Date();
    startDateStr.setDate(startDateStr.getDate() - 30);

    const conditions = [eq(users.classId, classId)];
    conditions.push(gte(testResults.createdAt, startDateStr));

    const query = db
        .select({
            id: testResults.id,
            createdAt: testResults.createdAt,
        })
        .from(testResults)
        .innerJoin(users, eq(testResults.userId, users.id))
        .innerJoin(modules, eq(testResults.moduleId, modules.id))
        .where(and(...conditions))
        .orderBy(desc(testResults.createdAt));

    console.log(query.toSQL());
    process.exit(0);
}
test();
