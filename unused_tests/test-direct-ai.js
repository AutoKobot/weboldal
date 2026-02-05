// Direct AI testing without authentication
import { enhancedModuleGenerator } from './server/enhanced-module-generator.js';

async function testDirectAI() {
  try {
    console.log('🚀 Közvetlen AI teszt indítása...');
    
    const title = "Acél hőkezelési folyamatok";
    const content = "Az acél különböző hőkezelési módjai és azok hatása a mechanikai tulajdonságokra. Edzés, megeresztés, lágyítás.";
    
    console.log('📋 Teszt modul:', title);
    console.log('📝 Eredeti tartalom:', content);
    console.log('');
    
    const result = await enhancedModuleGenerator.generateEnhancedModule(
      1, // moduleId
      title,
      content,
      "1", // subjectId
      "Anyagismeret", // subjectName
      "Hegesztő", // professionName
      1 // moduleNumber
    );
    
    console.log('✅ AI generálás befejezve!');
    console.log('📊 Eredmények:');
    console.log('- Concise verzió hossz:', result.conciseVersion.length);
    console.log('- Detailed verzió hossz:', result.detailedVersion.length);
    console.log('- YouTube videós fogalmak:', result.keyConceptsWithVideos.length);
    
    result.keyConceptsWithVideos.forEach((concept, index) => {
      console.log(`\n${index + 1}. Fogalom: ${concept.concept}`);
      console.log(`   Videók száma: ${concept.youtubeVideos.length}`);
      concept.youtubeVideos.forEach((video, videoIndex) => {
        console.log(`   ${videoIndex + 1}. ${video.title}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    console.error(error.stack);
  }
}

testDirectAI();