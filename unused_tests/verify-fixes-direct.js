import { enhancedModuleGenerator } from './server/enhanced-module-generator.ts';

async function verifyFixesDirect() {
  try {
    console.log('=== DIRECT MODULE GENERATION TEST ===');
    
    // Test the enhanced module generator directly
    const testTitle = "Robotika alapjai";
    const testContent = `
# Robotika alapjai

A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik.

## Főbb területek:
- Mechanikai tervezés
- Programozás
- Szenzortechnika
- Mesterséges intelligencia

## Elfin robotok
Az Elfin robotok kollaboratív robotok, amelyek biztonságosan dolgozhatnak emberekkel együtt.

### Alkalmazási területek:
- Összeszerelés
- Csomagolás
- Minőségellenőrzés
`;

    console.log('Testing enhanced module generation...');
    const result = await enhancedModuleGenerator.generateEnhancedModule(
      1, // moduleId
      testTitle,
      testContent,
      'Robotika', // subjectName
      'Robotikai technikus' // professionName
    );
    
    console.log('\n=== GENERATION RESULTS ===');
    console.log('Concise length:', result.conciseVersion?.length || 0);
    console.log('Detailed length:', result.detailedVersion?.length || 0);
    
    // Check content differentiation
    const lengthDiff = Math.abs((result.detailedVersion?.length || 0) - (result.conciseVersion?.length || 0));
    console.log('Length difference:', lengthDiff);
    
    if (lengthDiff > 300) {
      console.log('✅ Content differentiation working');
    } else {
      console.log('⚠️ Content still too similar');
    }
    
    // Check Wikipedia links
    const detailedWikiLinks = (result.detailedVersion?.match(/\[.*?\]\(https:\/\/hu\.wikipedia\.org/g) || []).length;
    const conciseWikiLinks = (result.conciseVersion?.match(/\[.*?\]\(https:\/\/hu\.wikipedia\.org/g) || []).length;
    console.log('Wikipedia links - Detailed:', detailedWikiLinks, 'Concise:', conciseWikiLinks);
    
    if (detailedWikiLinks > 5 || conciseWikiLinks > 3) {
      console.log('✅ Wikipedia link generation improved');
    } else {
      console.log('⚠️ Still few Wikipedia links');
    }
    
    // Check YouTube videos
    const totalVideos = result.keyConceptsWithVideos?.reduce((sum, concept) => 
      sum + (concept.youtubeVideos?.length || 0), 0) || 0;
    console.log('YouTube videos found:', totalVideos);
    
    if (totalVideos > 3) {
      console.log('✅ YouTube video generation working');
    } else {
      console.log('⚠️ Still no YouTube videos');
    }
    
    // Show sample content
    console.log('\n=== SAMPLE CONTENT ===');
    console.log('Concise (first 200 chars):', result.conciseVersion?.substring(0, 200) + '...');
    console.log('Detailed (first 200 chars):', result.detailedVersion?.substring(0, 200) + '...');
    
    if (result.keyConceptsWithVideos && result.keyConceptsWithVideos.length > 0) {
      console.log('\n=== SAMPLE VIDEOS ===');
      result.keyConceptsWithVideos.slice(0, 2).forEach((concept, index) => {
        console.log(`Concept ${index + 1}:`, concept.concept);
        console.log('Videos:', concept.youtubeVideos?.length || 0);
        if (concept.youtubeVideos && concept.youtubeVideos.length > 0) {
          console.log('Sample video:', concept.youtubeVideos[0].title);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

verifyFixesDirect();