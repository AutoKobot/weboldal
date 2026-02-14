
import { storage } from '../server/storage';

async function checkModuleContent() {
    try {
        // Get the most recently updated module
        // Since we don't track update time, we'll fetch all and find the one with the highest ID (assuming sequential IDs)
        // Or users can specify an ID if needed. For now, let's grab the module with ID 124 or 104 as mentioned.

        // You can change this ID to the one you just regenerated
        const testModuleId = 124;

        console.log(`Fetching content for module ID: ${testModuleId}...`);
        const module = await storage.getModule(testModuleId);

        if (!module) {
            console.log(`Module ${testModuleId} not found.`);
            return;
        }

        console.log(`\n--- MODULE TITLE: ${module.title} ---\n`);

        console.log(`--- DETAILED CONTENT (First 500 chars) ---`);
        console.log(module.content.substring(0, 500));
        console.log(`...\n`);

        console.log(`--- CONCISE CONTENT (First 500 chars) ---`);
        console.log((module.conciseContent || '').substring(0, 500));
        console.log(`...\n`);

        // Check for Mermaid diagrams
        const mermaidRegex = /```mermaid/g;
        const detailedMatch = module.content.match(mermaidRegex);
        const conciseMatch = (module.conciseContent || '').match(mermaidRegex);

        console.log(`\n--- MERMAID ANALYSIS ---`);
        if (detailedMatch) {
            console.log(`✅ FOUND Mermaid diagram in Detailed Content! Count: ${detailedMatch.length}`);
            // Print the actual mermaid block
            const fullMatch = module.content.match(/```mermaid[\s\S]*?```/);
            if (fullMatch) {
                console.log('\n--- MERMAID BLOCK START ---');
                console.log(fullMatch[0]);
                console.log('--- MERMAID BLOCK END ---\n');
            }
        } else {
            console.log(`❌ NO Mermaid diagram found in Detailed Content.`);
        }

        if (conciseMatch) {
            console.log(`✅ FOUND Mermaid diagram in Concise Content! Count: ${conciseMatch.length}`);
        } else {
            console.log(`❌ NO Mermaid diagram found in Concise Content.`);
        }

    } catch (error) {
        console.error("Error checking module content:", error);
    } finally {
        process.exit(0);
    }
}

checkModuleContent();
