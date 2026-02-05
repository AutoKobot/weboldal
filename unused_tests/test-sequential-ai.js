import axios from 'axios';

async function testSequentialAIGeneration() {
  try {
    console.log('🚀 Szekvenciális AI generálás teszt indítása...');
    console.log('================================================');
    
    // Test module regeneration for module ID 3
    const moduleId = 3;
    const title = "Acél hőkezelési folyamatok";
    const content = "Az acél különböző hőkezelési módjai és azok hatása a mechanikai tulajdonságokra.";
    
    console.log(`📋 Teszt modul: ${moduleId} - ${title}`);
    console.log(`📝 Eredeti tartalom: ${content}`);
    console.log('');
    
    // Start AI regeneration
    console.log('🔄 AI újragenerálás indítása...');
    const response = await axios.post(`http://localhost:5000/api/modules/${moduleId}/regenerate-ai`, {
      title: title,
      content: content
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'admin-session=test'
      }
    });
    
    console.log('✅ AI újragenerálás sikeresen elindítva');
    console.log('Válasz:', response.data);
    
    // Wait a moment then check queue status
    console.log('\n⏳ Várólista állapot ellenőrzése 5 másodperc múlva...');
    setTimeout(async () => {
      try {
        // Check the module content after processing
        console.log('\n📖 Frissített modul tartalom ellenőrzése...');
        const moduleResponse = await axios.get(`http://localhost:5000/api/modules/${moduleId}`);
        const updatedModule = moduleResponse.data;
        
        console.log('📊 Frissített modul adatok:');
        console.log('- Eredeti content hossz:', updatedModule.content?.length || 0);
        console.log('- Concise content hossz:', updatedModule.conciseContent?.length || 0);
        console.log('- Detailed content hossz:', updatedModule.detailedContent?.length || 0);
        console.log('- keyConceptsData típus:', typeof updatedModule.keyConceptsData);
        
        if (updatedModule.keyConceptsData) {
          let keyConceptsData;
          try {
            keyConceptsData = typeof updatedModule.keyConceptsData === 'string' 
              ? JSON.parse(updatedModule.keyConceptsData) 
              : updatedModule.keyConceptsData;
          } catch (parseError) {
            console.log('❌ Hiba a keyConceptsData parse-olás során:', parseError.message);
            return;
          }
          
          console.log('🎯 Kulcsfogalmak száma:', keyConceptsData?.length || 0);
          
          if (Array.isArray(keyConceptsData) && keyConceptsData.length > 0) {
            console.log('\n📹 YouTube videók részletei:');
            keyConceptsData.forEach((concept, index) => {
              console.log(`\n   ${index + 1}. Fogalom: "${concept.concept}"`);
              console.log(`      Definíció: ${concept.definition}`);
              console.log(`      YouTube videók száma: ${concept.youtubeVideos?.length || 0}`);
              
              if (concept.youtubeVideos && concept.youtubeVideos.length > 0) {
                concept.youtubeVideos.forEach((video, videoIndex) => {
                  console.log(`         ${videoIndex + 1}. ${video.title}`);
                  console.log(`            Video ID: ${video.videoId}`);
                  console.log(`            URL: ${video.url}`);
                });
              }
            });
          }
        }
        
        // Check for Wikipedia links in content
        const detailedContent = updatedModule.detailedContent || updatedModule.content;
        const wikipediaLinks = (detailedContent.match(/\[([^\]]+)\]\(https:\/\/hu\.wikipedia\.org\/wiki\/[^)]+\)/g) || []).length;
        console.log('\n🔗 Wikipedia linkek száma a tartalomban:', wikipediaLinks);
        
        if (wikipediaLinks > 0) {
          console.log('✅ Szekvenciális lépés 2 (Wikipedia linkek) - SIKERES');
        } else {
          console.log('❌ Szekvenciális lépés 2 (Wikipedia linkek) - HIÁNYZIK');
        }
        
        if (keyConceptsData && keyConceptsData.length > 0) {
          console.log('✅ Szekvenciális lépés 3 (YouTube videók) - SIKERES');
        } else {
          console.log('❌ Szekvenciális lépés 3 (YouTube videók) - HIÁNYZIK');
        }
        
      } catch (checkError) {
        console.error('❌ Hiba a modul ellenőrzése során:', checkError.message);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Hiba a teszt során:', error.message);
    if (error.response) {
      console.error('Válasz státusz:', error.response.status);
      console.error('Válasz adatok:', error.response.data);
    }
  }
}

// Run the test
testSequentialAIGeneration();