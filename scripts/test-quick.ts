
import 'dotenv/config';
import OpenAI from "openai";
import { writeFileSync } from "fs";

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    const log: string[] = [];

    log.push("Using key: " + (apiKey ? apiKey.substring(0, 10) + "..." : "NOT SET"));

    if (!apiKey) {
        log.push("ERROR: No key!");
        writeFileSync("test-result.log", log.join("\n"));
        return;
    }

    const openai = new OpenAI({ apiKey });

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 5,
        });
        log.push("SUCCESS: " + response.choices[0]?.message?.content);
    } catch (e: any) {
        log.push("FAILED! Status: " + e.status);
        log.push("Type: " + e.error?.type);
        log.push("Code: " + e.error?.code);
        log.push("Message: " + (e.message || "").substring(0, 300));
    }

    writeFileSync("test-result.log", log.join("\n"));
    console.log("Result saved to test-result.log");
}
main();
