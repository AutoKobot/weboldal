import { storage } from "../server/storage";
import 'dotenv/config';

async function run() {
  const { db } = await import("../server/db");
  const { modules } = await import("../shared/schema");
  
  const allModules = await db.select().from(modules);
  console.log(`Loaded ${allModules.length} modules.`);
  
  let count = 0;
  for (const m of allModules) {
    if (m.generatedQuizzes && Array.isArray(m.generatedQuizzes)) {
      const orderingQuestions = m.generatedQuizzes.filter((q: any) => q.type === 'ordering');
      if (orderingQuestions.length > 0) {
        console.log(`\nModule: ${m.title} (ID: ${m.id})`);
        for (const q of orderingQuestions) {
          console.log(`  Question: ${q.question}`);
          console.log(`  Options:`, q.options);
          console.log(`  correctOrder:`, q.correctOrder);
          console.log(`  explanation:`, q.explanation);
        }
        count++;
        if (count >= 5) break;
      }
    }
  }
}

run().catch(console.error);
