import axios from 'axios';

async function testAuthFix() {
  try {
    console.log('=== TESTING FIXED AUTHENTICATION ===');
    
    // Step 1: Admin login
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/admin/login', {
      username: 'Borga',
      password: 'Borga'
    }, {
      withCredentials: true
    });
    
    console.log('Login successful:', loginResponse.data.id);
    
    // Extract session cookie
    const cookies = loginResponse.headers['set-cookie'];
    let sessionCookie = '';
    if (cookies) {
      sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'))?.split(';')[0] || '';
    }
    
    console.log('Session cookie:', sessionCookie ? 'Found' : 'Not found');
    
    // Step 2: Test AI chat with admin session
    console.log('\n2. Testing AI chat with admin session...');
    const chatResponse = await axios.post('http://localhost:5000/api/chat', {
      message: 'Készíts rövid magyarázatot a robotikáról'
    }, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('Chat response length:', chatResponse.data.message?.length || 0);
    
    if (chatResponse.data.message && chatResponse.data.message.length > 0) {
      console.log('✅ AI chat working with admin auth');
      console.log('Sample response:', chatResponse.data.message.substring(0, 100) + '...');
    } else {
      console.log('❌ AI chat still not working');
    }
    
    // Step 3: Test module regeneration with proper content
    console.log('\n3. Testing module regeneration...');
    const regenResponse = await axios.post('http://localhost:5000/api/admin/modules/13/regenerate-ai', {
      title: "Robotika alapjai - AI javított verzió",
      content: `# Robotika alapjai

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
- Minőségellenőrzés`
    }, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (regenResponse.data.success) {
      console.log('✅ Module regeneration started successfully');
      console.log('Module ID:', regenResponse.data.moduleId);
    } else {
      console.log('❌ Module regeneration failed');
    }
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAuthFix();