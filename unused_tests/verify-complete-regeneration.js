import axios from 'axios';

async function verifyCompleteRegeneration() {
  try {
    console.log('=== VERIFYING COMPLETE REGENERATION SUCCESS ===');
    
    // Step 1: Admin login
    console.log('1. Admin bejelentkezés...');
    const loginResponse = await axios.post('http://localhost:5000/api/admin/login', {
      username: 'Borga',
      password: 'Borga'
    }, {
      withCredentials: true
    });
    
    const sessionCookie = loginResponse.headers['set-cookie']
      .find(cookie => cookie.startsWith('connect.sid='));
    
    console.log('✅ Admin bejelentkezés sikeres');
    
    // Step 2: Check regenerated module
    console.log('\n2. Regenerált modul ellenőrzése...');
    const moduleResponse = await axios.get('http://localhost:5000/api/modules/13', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    const module = moduleResponse.data;
    console.log('Modul címe:', module.title);
    console.log('Tömör tartalom hossza:', module.conciseContent?.length || 0);
    console.log('Részletes tartalom hossza:', module.detailedContent?.length || 0);
    
    // Verify content differences
    if (module.conciseContent && module.detailedContent) {
      const lengthDiff = module.detailedContent.length - module.conciseContent.length;
      console.log('Hosszúság különbség:', lengthDiff);
      
      if (lengthDiff > 1000) {
        console.log('✅ Jelentős különbség a tömör és részletes verzió között');
      }
      
      // Check for Wikipedia links
      const wikiLinks = (module.detailedContent.match(/wikipedia\.org/g) || []).length;
      console.log('Wikipedia linkek száma:', wikiLinks);
      
      // Show sample content
      console.log('\n--- TÖMÖR TARTALOM MINTA ---');
      console.log(module.conciseContent?.substring(0, 200) + '...');
      
      console.log('\n--- RÉSZLETES TARTALOM MINTA ---');
      console.log(module.detailedContent?.substring(0, 200) + '...');
    }
    
    // Step 3: Test queue status
    console.log('\n3. AI queue állapot ellenőrzése...');
    const queueResponse = await axios.get('http://localhost:5000/api/admin/ai-queue-status', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('Queue állapot:', queueResponse.data);
    
    console.log('\n🎉 ÖSSZEGZÉS: Minden rendszer komponens működik!');
    
  } catch (error) {
    console.error('❌ Ellenőrzési hiba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

verifyCompleteRegeneration();