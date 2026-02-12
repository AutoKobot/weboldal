
import 'dotenv/config';
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating test_results table...");
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "test_results" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" varchar NOT NULL,
        "module_id" integer NOT NULL,
        "score" integer NOT NULL,
        "max_score" integer DEFAULT 100 NOT NULL,
        "passed" boolean DEFAULT false NOT NULL,
        "details" jsonb,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
        CONSTRAINT "test_results_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action
      );
    `);
        console.log("Table test_results created successfully!");
    } catch (error) {
        console.error("Error creating table:", error);
    }
    process.exit(0);
}

main();
