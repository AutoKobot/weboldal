// Test AI regeneration with proper admin authentication to debug bold links
import axios from 'axios';

async function testBoldLinksDebug() {
  try {
    console.log('🚀 Testing AI regeneration with bold links debug...');
    
    // First login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/admin/auth', {
      email: 'admin@globalsystem.com',
      password: 'admin123'
    });
    
    if (loginResponse.status !== 200) {
      console.log('❌ Admin login failed');
      return;
    }
    
    console.log('✅ Admin login successful');
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies[0] : '';
    
    // Test AI regeneration with simple content containing bold words
    const testContent = `# Biztonsági Ügyek Teszt

Ez egy teszt tartalom **robotika** és **automatizálás** témákkal.

A **munkavédelem** és **kockázatértékelés** fontos elemei a modern iparnak.

További bold szavak: **biztonság**, **szabványok**, **technológia**.`;

    console.log('🔄 Starting AI regeneration with test content...');
    console.log('Test content contains bold words: robotika, automatizálás, munkavédelem, kockázatértékelés, biztonság, szabványok, technológia');
    
    const regenResponse = await axios.post('http://localhost:5000/api/admin/modules/35/regenerate-ai', {
      title: 'Teszt - Biztonsági ügyek bold linkekkel',
      content: testContent
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      timeout: 180000 // 3 minute timeout
    });
    
    console.log('✅ AI regeneration initiated:', regenResponse.data);
    
    // Monitor the console logs for debug messages
    console.log('📋 Watch the server console for debug messages showing:');
    console.log('- "🔗 Starting optimized bold keyword linking"');
    console.log('- "🔍 Processing bold keyword"');
    console.log('- "✅ Linking [keyword] to: [url]"');
    console.log('- "🔗 DEBUG: Content has X bold links"');
    console.log('- "🔗 FINAL DEBUG: Content has X bold links"');
    console.log('- "🔗 QUEUE DEBUG: Before/After DB update"');
    
    // Wait for processing and check result
    setTimeout(async () => {
      try {
        console.log('\n📖 Checking module content after processing...');
        
        const moduleResponse = await axios.get('http://localhost:5000/api/modules/35', {
          headers: { 'Cookie': sessionCookie }
        });
        
        const module = moduleResponse.data;
        
        // Check for bold links in all content versions
        const checkBoldLinks = (content, name) => {
          if (!content) {
            console.log(`${name}: No content`);
            return 0;
          }
          
          const boldLinks = content.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || [];
          const regularBold = content.match(/\*\*[^*\[]+\*\*/g) || [];
          
          console.log(`${name}:`);
          console.log(`  - Length: ${content.length} characters`);
          console.log(`  - Bold links: ${boldLinks.length}`);
          console.log(`  - Regular bold: ${regularBold.length}`);
          
          if (boldLinks.length > 0) {
            console.log(`  - Sample link: ${boldLinks[0]}`);
          }
          if (regularBold.length > 0) {
            console.log(`  - Sample bold: ${regularBold[0]}`);
          }
          
          return boldLinks.length;
        };
        
        console.log('\n🔗 Bold links analysis:');
        const contentLinks = checkBoldLinks(module.content, 'Main content');
        const conciseLinks = checkBoldLinks(module.conciseContent, 'Concise content');  
        const detailedLinks = checkBoldLinks(module.detailedContent, 'Detailed content');
        
        const totalLinks = contentLinks + conciseLinks + detailedLinks;
        
        if (totalLinks > 0) {
          console.log(`\n✅ SUCCESS: Found ${totalLinks} bold links in module content!`);
        } else {
          console.log('\n❌ PROBLEM: No bold links found in any content version');
          console.log('Check server console for debug messages to see where they were lost');
        }
        
      } catch (error) {
        console.log('Error checking module:', error.message);
      }
    }, 15000); // Wait 15 seconds for processing
    
  } catch (error) {
    console.log('Test failed:', error.response?.data || error.message);
  }
}

testBoldLinksDebug();