import axios from 'axios';

async function testFinalFieldDetection() {
  try {
    console.log('=== TESTING FINAL FIELD DETECTION ===');
    
    const loginResponse = await axios.post('http://localhost:5000/api/admin/login', {
      username: 'Borga', password: 'Borga'
    }, { withCredentials: true });
    
    const sessionCookie = loginResponse.headers['set-cookie']
      .find(cookie => cookie.startsWith('connect.sid='));
    
    console.log('✅ Admin login successful');
    
    // Test paprikás krumpli - should be cooking, not welding
    console.log('\n2. Testing paprikás krumpli field detection...');
    const paprikasResponse = await axios.post('http://localhost:5000/api/admin/modules/16/regenerate-ai', {
      title: "Paprikás Krumpli - Magyar Specialitás",
      content: `# Paprikás Krumpli

A paprikás krumpli egy hagyományos magyar étel, amelyet burgonyából és paprikából készítünk.

## Alapanyagok:
- burgonya (krumpli)
- pirospaprika
- hagyma
- kolbász vagy szalámi
- tejföl

## Főzési technika:
A magyar konyha tradicionális módszereivel készítjük. 
Az élelmiszer-készítés során fontos a megfelelő alapanyag arányok betartása.
A szakács tudása kulcsfontosságú a gasztronómiai élmény szempontjából.`
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (paprikasResponse.data.success) {
      console.log('✅ Paprikás krumpli regeneration started');
      console.log('Expected: 🎯 Detected field: cooking (NOT welding)');
      console.log('Expected keywords: paprikás krumpli, burgonya, magyar konyha');
    }
    
    console.log('\n--- MONITOR LOGS FOR ---');
    console.log('✓ Field detection: cooking');
    console.log('✓ Wikipedia keywords: burgonya, paprika, magyar konyha related');
    console.log('✓ YouTube search: paprikás krumpli specific terms');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testFinalFieldDetection();