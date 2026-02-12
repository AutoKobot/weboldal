
import 'dotenv/config';
import { db, pool } from "../server/db";
import { modules } from "../shared/schema";
import { EnhancedModuleGenerator } from "../server/enhanced-module-generator";
import { eq } from "drizzle-orm";

console.log("Script loaded.");

// Helper: sleep for ms
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Starting quiz RE-generation for ALL modules (10 questions per set)...");

    const generator = new EnhancedModuleGenerator();

    try {
        console.log("Fetching modules...");
        const allModules = await db.query.modules.findMany();
        console.log(`Found ${allModules.length} total modules.`);

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < allModules.length; i++) {
            const module = allModules[i];
            const content = module.detailedContent || module.content || module.conciseContent || '';

            if (!content || content.length < 50) {
                console.warn(`⏭️ [${i + 1}/${allModules.length}] Skipping module ${module.id} "${module.title}" - insufficient content.`);
                skipped++;
                continue;
            }

            // Retry up to 3 times with exponential backoff
            let retries = 0;
            const maxRetries = 3;
            let succeeded = false;

            while (retries < maxRetries && !succeeded) {
                try {
                    console.log(`\n📝 [${i + 1}/${allModules.length}] Module ${module.id}: "${module.title}"${retries > 0 ? ` (retry ${retries})` : ''}...`);
                    const quizSets = await generator.generateMultipleQuizSets(module.title, content);

                    if (quizSets && quizSets.length > 0) {
                        const validSets = quizSets.filter(set => Array.isArray(set) && set.length >= 5);

                        if (validSets.length > 0) {
                            await db.update(modules)
                                .set({ generatedQuizzes: validSets })
                                .where(eq(modules.id, module.id));

                            const questionCounts = validSets.map(s => s.length).join(', ');
                            console.log(`✅ Module ${module.id}: ${validSets.length} sets (questions per set: ${questionCounts})`);
                            success++;
                            succeeded = true;
                        } else {
                            console.warn(`⚠️ Module ${module.id}: All quiz sets were invalid.`);
                            failed++;
                            succeeded = true; // don't retry, it's a content issue
                        }
                    } else {
                        console.warn(`⚠️ Module ${module.id}: No quiz sets generated.`);
                        failed++;
                        succeeded = true; // don't retry
                    }

                } catch (err: any) {
                    if (err?.status === 429 || (err?.message && err.message.includes('429'))) {
                        retries++;
                        const waitTime = Math.pow(2, retries) * 10000; // 20s, 40s, 80s
                        console.warn(`⏳ Rate limited! Waiting ${waitTime / 1000}s before retry...`);
                        await sleep(waitTime);
                    } else {
                        console.error(`❌ Error processing module ${module.id}:`, err?.message || err);
                        failed++;
                        succeeded = true; // don't retry non-rate-limit errors
                    }
                }
            }

            if (!succeeded) {
                console.error(`❌ Module ${module.id}: All retries exhausted.`);
                failed++;
            }

            // Pause 3s between modules to avoid rate limits
            await sleep(3000);
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`RESULTS:`);
        console.log(`  ✅ Success: ${success}`);
        console.log(`  ⏭️ Skipped: ${skipped}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  Total: ${allModules.length}`);

    } catch (error) {
        console.error("Script error:", error);
    } finally {
        console.log("\nClosing database connection...");
        await pool.end();
        process.exit(0);
    }
}

main();
