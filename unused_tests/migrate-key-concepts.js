import { db } from './server/db.ts';
import { modules } from './shared/schema.ts';
import { eq, isNotNull } from 'drizzle-orm';

async function migrateKeyConceptsData() {
  console.log('Migrating keyConceptsData to include Wikipedia links...');
  
  try {
    // Get all modules with keyConceptsData
    const modulesWithData = await db.select().from(modules).where(isNotNull(modules.keyConceptsData));
    
    console.log(`Found ${modulesWithData.length} modules with keyConceptsData`);
    
    for (const module of modulesWithData) {
      if (module.keyConceptsData && Array.isArray(module.keyConceptsData)) {
        let needsUpdate = false;
        const updatedData = module.keyConceptsData.map(concept => {
          // Check if concept already has wikipediaLinks
          if (!concept.wikipediaLinks) {
            needsUpdate = true;
            // Generate Wikipedia link for this concept
            const encodedConcept = encodeURIComponent(concept.concept.replace(/\s+/g, '_'));
            return {
              ...concept,
              wikipediaLinks: [{
                text: concept.concept,
                url: `https://hu.wikipedia.org/wiki/${encodedConcept}`,
                description: `Wikipedia cikk: ${concept.concept}`
              }]
            };
          }
          return concept;
        });
        
        if (needsUpdate) {
          await db.update(modules)
            .set({ keyConceptsData: updatedData })
            .where(eq(modules.id, module.id));
          console.log(`Updated module ${module.id}: ${module.title}`);
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateKeyConceptsData();