import axios from 'axios';

async function checkSequentialAI() {
  try {
    console.log('🔍 Ellenőrzés: AI várólista státusz');
    
    const queueResponse = await axios.get('http://localhost:5000/api/admin/ai-queue-status', {
      headers: {
        'Cookie': 'connect.sid=s%3AgWxvs_admin_session_12345.mock; admin-session=admin-borga'
      }
    });
    
    console.log('📊 Várólista állapot:', queueResponse.data);
    
    // Check module 2 content
    console.log('\n📖 Modul 2 tartalom ellenőrzése...');
    const moduleResponse = await axios.get('http://localhost:5000/api/modules/2');
    const module = moduleResponse.data;
    
    console.log('📋 Modul adatok:');
    console.log('- Cím:', module.title);
    console.log('- Van conciseContent:', !!module.conciseContent);
    console.log('- Van detailedContent:', !!module.detailedContent);
    console.log('- keyConceptsData típus:', typeof module.keyConceptsData);
    
    if (module.keyConceptsData) {
      const keyConceptsData = typeof module.keyConceptsData === 'string' 
        ? JSON.parse(module.keyConceptsData) 
        : module.keyConceptsData;
      
      console.log('🎯 Kulcsfogalmak száma:', keyConceptsData?.length || 0);
      
      if (Array.isArray(keyConceptsData)) {
        keyConceptsData.forEach((concept, index) => {
          console.log(`   ${index + 1}. ${concept.concept} - videók: ${concept.youtubeVideos?.length || 0}`);
          if (concept.youtubeVideos?.length > 0) {
            concept.youtubeVideos.forEach((video, videoIndex) => {
              console.log(`      ${videoIndex + 1}. ${video.title}`);
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Hiba az ellenőrzés során:', error.message);
    if (error.response) {
      console.error('Válasz státusz:', error.response.status);
    }
  }
}

// Run the check
checkSequentialAI();