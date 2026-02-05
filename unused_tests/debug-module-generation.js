// Debug module generation issues
import axios from 'axios';
import fs from 'fs';

async function debugModuleGeneration() {
  console.log('=== DEBUGGING MODULE GENERATION ISSUES ===\n');
  
  console.log('🔍 Checking module 13 current state...');
  
  try {
    const sessionCookie = fs.readFileSync('admin-session.txt', 'utf8');
    
    // Get current module state
    const moduleResponse = await axios.get('http://localhost:5000/api/modules/13', {
      headers: { 'Cookie': sessionCookie }
    });
    
    const module = moduleResponse.data;
    
    console.log('\n📋 Current Module 13 State:');
    console.log('Title:', module.title);
    console.log('Content length:', module.content?.length || 0);
    console.log('Concise content length:', module.concise_content?.length || 0);
    console.log('Detailed content length:', module.detailed_content?.length || 0);
    console.log('Has videos:', module.video_content ? 'YES' : 'NO');
    
    // Check if concise and detailed are the same
    if (module.concise_content && module.detailed_content) {
      const isSame = module.concise_content === module.detailed_content;
      console.log('Concise == Detailed:', isSame ? 'PROBLEM!' : 'OK');
    }
    
    // Count Wikipedia links
    const wikiLinks = (module.detailed_content || '').match(/\[([^\]]+)\]\(https:\/\/hu\.wikipedia\.org\/wiki\/([^)]+)\)/g);
    console.log('Wikipedia links count:', wikiLinks ? wikiLinks.length : 0);
    
    // Check for videos in content
    const hasVideoContent = module.video_content && module.video_content.length > 0;
    console.log('Video content available:', hasVideoContent);
    
    if (!hasVideoContent) {
      console.log('\n❌ IDENTIFIED PROBLEMS:');
      console.log('1. No videos generated');
      console.log('2. Concise and detailed versions likely identical');
      console.log('3. Insufficient Wikipedia links');
      
      console.log('\n🔧 REGENERATING WITH DEBUG...');
      
      // Start regeneration with debug
      const regenResponse = await axios.post(`http://localhost:5000/api/admin/modules/13/regenerate-ai`, {
        title: "Robot koordináta rendszer debug teszt",
        content: "Elfin robot koordináta rendszer programozás és kinematika alapjai"
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
      
      console.log('✅ Regeneration started - watch console for debug info');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugModuleGeneration();