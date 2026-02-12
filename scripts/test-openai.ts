
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

async function main() {
    console.log("Testing OpenAI with DB key... using gpt-3.5-turbo");

    try {
        const result = await db.execute(sql`SELECT value FROM system_settings WHERE key='openai_api_key'`);
        const dbKey = result.rows[0]?.value;
        const envKey = process.env.OPENAI_API_KEY;
        const apiKey = dbKey || envKey;

        if (!apiKey) {
            console.error("No API key found in DB or ENV.");
            return;
        }

        console.log(`Key found! Length: ${apiKey.length}. Starts with: ${apiKey.substring(0, 7)}...`);

        const openai = new OpenAI({ apiKey });

        console.log("Calling OpenAI with gpt-3.5-turbo...");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Say hello" }],
            max_tokens: 10
        });

        console.log("Success! Response:", response.choices[0].message.content);

    } catch (error: any) {
        console.error("OpenAI Error:", error.message || error);
        if (error.status) console.error("Status:", error.status);
        if (error.error) console.error("Details:", JSON.stringify(error.error, null, 2));
    } finally {
        process.exit(0);
    }
}

main();
