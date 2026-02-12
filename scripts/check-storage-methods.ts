
import 'dotenv/config';
import { storage } from "../server/storage";
import { db } from "../server/db";
import { testResults } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Storage methods available:");
    // Get all property names from the prototype of the storage instance
    const proto = Object.getPrototypeOf(storage);
    const methods = Object.getOwnPropertyNames(proto);

    methods.filter(m => m.toLowerCase().includes('result') || m.toLowerCase().includes('grade')).forEach(m => console.log(' - ' + m));

    // Also check if we can query testResults directly
    try {
        const results = await db.select().from(testResults).limit(1);
        console.log(`Test results table queryable: ${results.length} records found (limit 1)`);
    } catch (e) {
        console.error("Error querying testResults table:", e);
    }
}

main().catch(console.error);
