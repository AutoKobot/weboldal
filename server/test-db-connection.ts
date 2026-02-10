

import { db } from "./db";
import { users } from "../shared/schema";

async function test() {
    console.log("Testing DB connection (Relational Query)...");
    try {
        const res = await db.query.users.findFirst();
        console.log("DB Connection OK. User found:", res ? res.id : "None");
        process.exit(0);
    } catch (e) {
        console.error("DB Connection FAILED:", e);
        process.exit(1);
    }
}
test();
