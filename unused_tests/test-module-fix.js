import axios from 'axios';

async function testModuleFix() {
  try {
    console.log('=== TESTING MODULE GENERATION FIXES ===');
    
    // First, get current module 13 state
    const currentModule = await axios.get('http://localhost:5000/api/public/modules/13');
    console.log('Current module 13:', {
      title: currentModule.data.title,
      conciseLength: currentModule.data.conciseContent?.length || 0,
      detailedLength: currentModule.data.detailedContent?.length || 0,
      videos: currentModule.data.keyConceptsWithVideos?.reduce((sum, c) => sum + (c.youtubeVideos?.length || 0), 0) || 0
    });
    
    // Now test AI generation directly via API
    console.log('\nTesting AI generation with improved prompts...');
    
    // Test concise content generation
    const conciseTest = await axios.post('http://localhost:5000/api/chat', {
      message: `Készíts tömör, lényegre törő tananyagot maximum 250-300 szóban:

Cím: Robotika alapjai
Eredeti tartalom: A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik. Az Elfin robotok kollaboratív robotok.

KÖVETELMÉNYEK:
- MAXIMUM 250-300 szó
- Csak a legfontosabb információk
- Egyszerű, érthető nyelvezet
- Markdown formázás
- Gyakorlati fókusz

Válasz:`
    });
    
    console.log('Concise generation test length:', conciseTest.data.message.length);
    
    // Test Wikipedia keyword generation
    const wikiTest = await axios.post('http://localhost:5000/api/chat', {
      message: `Elemezd ezt a tartalmat és adj vissza 12-15 magyar kulcsszót JSON array formátumban:

Cím: Robotika alapjai
Tartalom: A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik.
Szakma: Robotikai technikus

KÖVETELMÉNYEK:
- 12-15 releváns kulcsszó
- Szakmai kifejezések és fogalmak
- Magyar Wikipedia-ban elérhető fogalmak

Válasz csak JSON array formátumban:`
    });
    
    const wikiKeywords = wikiTest.data.message.match(/\[[\s\S]*?\]/);
    if (wikiKeywords) {
      try {
        const keywords = JSON.parse(wikiKeywords[0]);
        console.log('Wikipedia keywords generated:', keywords.length);
        console.log('Sample keywords:', keywords.slice(0, 5));
      } catch (e) {
        console.log('Wikipedia keyword parsing failed');
      }
    }
    
    // Test YouTube search
    console.log('\nTesting YouTube search...');
    const youtubeTest = await axios.post('http://localhost:5000/api/multi/route-task', {
      userMessage: 'robotika oktatás magyar',
      taskType: 'youtube'
    });
    
    if (Array.isArray(youtubeTest.data) && youtubeTest.data.length > 0) {
      console.log('✅ YouTube API working, found', youtubeTest.data.length, 'videos');
      console.log('Sample video:', youtubeTest.data[0].snippet?.title || 'No title');
    } else {
      console.log('⚠️ YouTube API issue or no results');
    }
    
    console.log('\n=== FIX VERIFICATION COMPLETE ===');
    console.log('All core functions tested. The improvements should now work when regenerating modules.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testModuleFix();