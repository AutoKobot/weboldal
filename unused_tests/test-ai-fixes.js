import axios from 'axios';

async function testAIFixes() {
  console.log('=== TESTING AI GENERATION IMPROVEMENTS ===');
  
  try {
    // Test 1: Concise content generation with strict limits
    console.log('\n1. Testing concise content generation...');
    const conciseTest = await axios.post('http://localhost:5000/api/chat', {
      message: `Készíts tömör, lényegre törő tananyagot maximum 250-300 szóban:

Cím: Robotika alapjai
Eredeti tartalom: A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik. Az Elfin robotok kollaboratív robotok, amelyek biztonságosan dolgozhatnak emberekkel együtt. Főbb területek: mechanikai tervezés, programozás, szenzortechnika, mesterséges intelligencia. Alkalmazási területek: összeszerelés, csomagolás, minőségellenőrzés.

KÖVETELMÉNYEK:
- MAXIMUM 250-300 szó
- Csak a legfontosabb információk
- Egyszerű, érthető nyelvezet
- Markdown formázás
- Gyakorlati fókusz
- NE ismételd meg a részletes verziót

Válasz:`
    });
    
    console.log('Concise response:', JSON.stringify(conciseTest.data, null, 2));
    const conciseLength = conciseTest.data.message?.length || 0;
    console.log(`Concise content length: ${conciseLength} characters`);
    console.log(`Word count: ~${Math.round(conciseLength / 5)} words`);
    
    if (conciseLength < 800) {
      console.log('✅ Concise generation working - proper length');
    } else {
      console.log('⚠️ Still too long for concise version');
    }
    
    // Test 2: Enhanced Wikipedia keyword generation
    console.log('\n2. Testing Wikipedia keyword generation...');
    const wikiTest = await axios.post('http://localhost:5000/api/chat', {
      message: `Elemezd ezt a tartalmat és adj vissza 12-15 magyar kulcsszót JSON array formátumban, amelyekhez Wikipedia linkeket kell készíteni.

Cím: Robotika alapjai
Tartalom: A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik. Az Elfin robotok kollaboratív robotok.
Szakma: Robotikai technikus
Tantárgy: Robotika

KÖVETELMÉNYEK:
- 12-15 releváns kulcsszó
- Szakmai kifejezések és fogalmak
- Gyakorlati és elméleti fogalmak egyaránt
- Magyar Wikipedia-ban elérhető fogalmak
- Például ehhez a területhez: ["robotika", "automatizálás", "szenzor", "aktuátor", "programozás"]

Válasz csak JSON array formátumban:`
    });
    
    const wikiMatch = wikiTest.data.message.match(/\[[\s\S]*?\]/);
    if (wikiMatch) {
      try {
        const keywords = JSON.parse(wikiMatch[0]);
        console.log(`Wikipedia keywords generated: ${keywords.length}`);
        console.log('Sample keywords:', keywords.slice(0, 5));
        
        if (keywords.length >= 10) {
          console.log('✅ Wikipedia keyword generation improved');
        } else {
          console.log('⚠️ Still generating few keywords');
        }
      } catch (e) {
        console.log('⚠️ Wikipedia keyword parsing failed');
      }
    } else {
      console.log('⚠️ No JSON array found in Wikipedia response');
    }
    
    // Test 3: YouTube search functionality
    console.log('\n3. Testing YouTube search...');
    const youtubeQueries = ['robotika oktatás magyar', 'robot programozás', 'automatizálás'];
    
    for (const query of youtubeQueries) {
      try {
        const youtubeTest = await axios.post('http://localhost:5000/api/multi/route-task', {
          userMessage: query,
          taskType: 'youtube'
        });
        
        if (Array.isArray(youtubeTest.data) && youtubeTest.data.length > 0) {
          console.log(`✅ YouTube search for "${query}": ${youtubeTest.data.length} videos found`);
          console.log(`   Sample: ${youtubeTest.data[0].snippet?.title || 'No title'}`);
        } else {
          console.log(`⚠️ YouTube search for "${query}": No results or wrong format`);
        }
      } catch (error) {
        console.log(`❌ YouTube search for "${query}" failed:`, error.message);
      }
    }
    
    // Test 4: YouTube search terms generation
    console.log('\n4. Testing YouTube search terms generation...');
    const searchTermsTest = await axios.post('http://localhost:5000/api/chat', {
      message: `Készíts 2-3 YouTube keresési kifejezést JSON array formátumban ehhez a tartalomhoz:

Cím: Robotika alapjai
Tartalom: A robotika egy interdiszciplináris tudományág, amely a robotok tervezésével, építésével és működtetésével foglalkozik.
Szakma: Robotikai technikus
Tantárgy: Robotika

FONTOS: A keresési kifejezések tükrözzék a TÉNYLEGES tartalmat, ne általános kategóriákat!

JSON válasz (2-3 kifejezés):`
    });
    
    const searchTermsMatch = searchTermsTest.data.message.match(/\[[\s\S]*?\]/);
    if (searchTermsMatch) {
      try {
        const searchTerms = JSON.parse(searchTermsMatch[0]);
        console.log(`YouTube search terms generated: ${searchTerms.length}`);
        console.log('Search terms:', searchTerms);
        
        if (searchTerms.length >= 2) {
          console.log('✅ YouTube search terms generation working');
        }
      } catch (e) {
        console.log('⚠️ Search terms parsing failed');
      }
    }
    
    console.log('\n=== AI FIXES VERIFICATION COMPLETE ===');
    console.log('Core AI functions tested. Ready for module regeneration.');
    
  } catch (error) {
    console.error('❌ AI test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status);
    }
  }
}

testAIFixes();