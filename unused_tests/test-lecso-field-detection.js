import axios from 'axios';

async function testLecsoProfessionalFieldDetection() {
  try {
    console.log('=== TESTING LECSÓ PROFESSIONAL FIELD DETECTION ===');
    
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
    
    // Step 2: Test lecsó module regeneration with proper field detection
    console.log('\n2. Lecsó modul regenerálása szakmai terület teszttel...');
    const regenResponse = await axios.post('http://localhost:5000/api/admin/modules/15/regenerate-ai', {
      title: "Klasszikus Magyar Lecsó - Szakmai Terület Teszt",
      content: `# Klasszikus Magyar Lecsó

A lecsó az egyik legismertebb magyar étel, amelyet paprikából, paradicsomból és hagymából készítünk.

## Alapanyagok:
- paprika
- paradicsom  
- hagyma
- kolbász (opcionális)
- só, bors

## Főzési technika:
A magyar konyha tradicionális módszereivel készítjük el ezt a gasztronómiai különlegességet.

Ezt az ételt generációk óta főzik a magyar családok.`
    }, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (regenResponse.data.success) {
      console.log('✅ Lecsó modul regenerálás elindítva');
      console.log('Figyeld a console logokat - most a "cooking" területet kell felismernie, nem "welding"-et');
      
      // Wait a moment then check result
      setTimeout(async () => {
        try {
          const moduleResponse = await axios.get('http://localhost:5000/api/modules/15', {
            headers: {
              'Cookie': sessionCookie
            }
          });
          
          const module = moduleResponse.data;
          console.log('\n--- REGENERÁLT LECSÓ MODUL EREDMÉNY ---');
          console.log('Cím:', module.title);
          console.log('Tömör tartalom hossza:', module.conciseContent?.length || 0);
          console.log('Részletes tartalom hossza:', module.detailedContent?.length || 0);
          
          console.log('\n--- ELLENŐRZÉS ---');
          console.log('A console logokban keress rá:');
          console.log('🎯 Detected field for Wikipedia: cooking (HELYES)');
          console.log('NEM: 🎯 Detected field for Wikipedia: welding (HIBÁS)');
          
        } catch (error) {
          console.error('Modul ellenőrzési hiba:', error.message);
        }
      }, 30000); // 30 másodperc várakozás
      
    } else {
      console.log('❌ Lecsó modul regenerálás sikertelen');
    }
    
  } catch (error) {
    console.error('❌ Teszt hiba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testLecsoProfessionalFieldDetection();