import axios from 'axios';

async function testMultipleFieldDetection() {
  try {
    console.log('=== TESTING MULTIPLE PROFESSIONAL FIELD DETECTION ===');
    
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/admin/login', {
      username: 'Borga', password: 'Borga'
    }, { withCredentials: true });
    
    const sessionCookie = loginResponse.headers['set-cookie']
      .find(cookie => cookie.startsWith('connect.sid='));
    
    console.log('✅ Admin bejelentkezés sikeres');
    
    // Test robotics field detection (should work correctly)
    console.log('\n2. Robotika modul tesztelése...');
    const roboticsResponse = await axios.post('http://localhost:5000/api/admin/modules/13/regenerate-ai', {
      title: "Elfin Robot Programozás Teszt",
      content: `# Elfin Robot Programozás

Az Elfin robotok kollaboratív robotok, amelyek precíz mozgásra képesek.

## Főbb jellemzők:
- 6 tengelyes kinematika
- Szenzor alapú vezérlés
- Koordináta rendszer programozás
- Automatizált folyamatok

A robot programozása során figyelembe kell venni a kinematikai korlátokat.`
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (roboticsResponse.data.success) {
      console.log('✅ Robotika modul regenerálás elindítva');
      console.log('Várható: 🎯 Detected field: robotics');
    }
    
    // Test cooking field (newly fixed)
    console.log('\n3. Főzés modul újratesztelése...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const cookingResponse = await axios.post('http://localhost:5000/api/admin/modules/15/regenerate-ai', {
      title: "Magyar Gasztronómia Specialitások",
      content: `# Magyar Gasztronómia Specialitások

A magyar konyha gazdag tradicionális ételekben.

## Klasszikus fogások:
- Lecsó paprikával és paradicsommal
- Hagyma alapú receptek
- Kolbászos változatok
- Tradicionális főzési technikák

A gasztronómia alapja a helyes alapanyag kezelés.`
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (cookingResponse.data.success) {
      console.log('✅ Főzés modul regenerálás elindítva');
      console.log('Várható: 🎯 Detected field: cooking');
    }
    
    console.log('\n--- FIGYELD A CONSOLE LOGOKAT ---');
    console.log('Robotika módulnál: "robotics" mező felismerés');
    console.log('Főzés modulnál: "cooking" mező felismerés');
    console.log('Wikipedia kulcsszavak: nem üres lista');
    
  } catch (error) {
    console.error('❌ Teszt hiba:', error.message);
  }
}

testMultipleFieldDetection();