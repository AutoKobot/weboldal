import { enhancedModuleGenerator } from './server/enhanced-module-generator.ts';

async function testWikipediaGeneration() {
  console.log('Testing Wikipedia keywords generation with increased limits...');
  
  try {
    const testTitle = "Ipari robotika és automatizálás";
    const testContent = `
    Az ipari robotika területén számos szakmai fogalommal találkozunk. A mechanika, elektronika, 
    programozás, automatizálás, szenzortechnika, mesterséges intelligencia, gépi látás, pneumatika, 
    hidraulika, szervohajtások, PLC vezérlők, CNC gépek, CAD/CAM rendszerek, gyártástechnológia, 
    minőségbiztosítás, biztonságtechnika, ergonómia, munkavédelem, karbantartás, diagnosztika, 
    robotprogramozás, path planning, kinematika, dinamika, szabályozástechnika, folyamatautomatizálás, 
    ipari kommunikáció, fieldbus rendszerek, SCADA, MES rendszerek, cyber-physical systems, 
    Industry 4.0, IoT, big data, machine learning, deep learning, computer vision, collaborative robotics, 
    human-robot interaction mind-mind fontos szerepet játszanak a modern ipari környezetben.
    `;
    
    // Test the Wikipedia keywords generation directly
    const result = await enhancedModuleGenerator.generateEnhancedModule(
      testTitle,
      testContent,
      'Robotika',
      'Ipari automatizálás'
    );
    
    console.log('\n📊 Enhanced module generation result:');
    console.log(`Key concepts generated: ${result.keyConceptsWithVideos.length}`);
    
    let totalWikipediaLinks = 0;
    result.keyConceptsWithVideos.forEach((concept, index) => {
      const wikiCount = concept.wikipediaLinks ? concept.wikipediaLinks.length : 0;
      totalWikipediaLinks += wikiCount;
      console.log(`${index + 1}. "${concept.concept}" - ${wikiCount} Wikipedia links`);
      
      if (concept.wikipediaLinks && concept.wikipediaLinks.length > 0) {
        concept.wikipediaLinks.forEach((link, linkIndex) => {
          console.log(`   Wiki ${linkIndex + 1}: ${link.text}`);
        });
      }
    });
    
    console.log(`\n📈 Total Wikipedia links: ${totalWikipediaLinks}`);
    
    if (totalWikipediaLinks > 10) {
      console.log('✅ SUCCESS: Wikipedia limits have been properly increased!');
      console.log(`Generated ${totalWikipediaLinks} Wikipedia links instead of the previous 10-link limit.`);
    } else {
      console.log('⚠️ Still seems to be limited. Need further investigation.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWikipediaGeneration();