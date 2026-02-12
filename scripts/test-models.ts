
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

async function main() {
    console.log("Testing OpenAI quiz generation with gpt-3.5-turbo...");

    try {
        const result = await db.execute(sql`SELECT value FROM system_settings WHERE key='openai_api_key'`);
        const apiKey = (result.rows[0]?.value as string) || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("No API key found!");
            return;
        }

        console.log(`API Key found.`);
        const openai = new OpenAI({ apiKey });

        // Test 1: Simple call with gpt-3.5-turbo + json mode
        console.log("\n--- Test 1: gpt-3.5-turbo with json_object ---");
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Respond in JSON format only.' },
                    { role: 'user', content: 'Generate 2 quiz questions in JSON format: {"questions": [{"question": "text", "answer": "text"}]}' }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 500,
            });
            console.log("SUCCESS! Response:", response.choices[0]?.message?.content?.substring(0, 200));
        } catch (e: any) {
            console.error("FAILED:", e.message);
            console.error("Status:", e.status);
            console.error("Error type:", e.error?.type);
        }

        // Test 2: Same with gpt-4o-mini
        console.log("\n--- Test 2: gpt-4o-mini with json_object ---");
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Respond in JSON format only.' },
                    { role: 'user', content: 'Generate 2 quiz questions in JSON format: {"questions": [{"question": "text", "answer": "text"}]}' }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 500,
            });
            console.log("SUCCESS! Response:", response.choices[0]?.message?.content?.substring(0, 200));
        } catch (e: any) {
            console.error("FAILED:", e.message);
            console.error("Status:", e.status);
            console.error("Error type:", e.error?.type);
        }

        // Test 3: gpt-3.5-turbo WITHOUT json mode
        console.log("\n--- Test 3: gpt-3.5-turbo WITHOUT json_object ---");
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: 'Say hello in one word' }
                ],
                max_tokens: 10,
            });
            console.log("SUCCESS! Response:", response.choices[0]?.message?.content);
        } catch (e: any) {
            console.error("FAILED:", e.message);
            console.error("Status:", e.status);
        }

    } catch (error: any) {
        console.error("Script error:", error.message);
    } finally {
        await pool.end();
    }
}

main();
