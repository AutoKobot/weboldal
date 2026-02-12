
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

async function main() {
    console.log("Testing OpenAI connection (robust version)...");

    try {
        // 1. Get API Key
        let apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.log("Checking DB for API key...");
            try {
                const result = await db.execute(sql`SELECT value FROM system_settings WHERE key='openai_api_key'`);
                apiKey = result.rows[0]?.value;
            } catch (dbErr) {
                console.error("Failed to read from DB:", dbErr);
            }
        }

        if (!apiKey) {
            console.error("No API key found!");
            return;
        }

        console.log(`API Key found (starts with: ${apiKey.substring(0, 5)}...)`);

        // 2. Test OpenAI
        const openai = new OpenAI({ apiKey });
        console.log("Sending request to OpenAI (gpt-3.5-turbo)...");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hello, are you working?" }],
            max_tokens: 10
        });

        console.log("OpenAI Response:", response.choices[0].message.content);

    } catch (error: any) {
        console.error("Error during test:", error.message || error);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    } finally {
        // Ensure accurate closure
        console.log("Closing database pool...");
        await pool.end();
        console.log("Done.");
    }
}

main();
