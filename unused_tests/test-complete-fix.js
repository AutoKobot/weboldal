import axios from 'axios';

async function testCompleteFix() {
  try {
    console.log('=== TESTING COMPLETE MODULE GENERATION FIX ===');
    
    // Test module regeneration with all fixes
    console.log('Regenerating module 13 with complete fixes...');
    const response = await axios.post('http://localhost:5000/api/admin/modules/13/regenerate-ai', {}, {
      headers: {
        'Cookie': 'admin-session=admin-borga'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Success:', response.data.success);
    
    if (response.data.success) {
      console.log('✅ Module regeneration started successfully');
      
      // Wait for processing and check the result
      setTimeout(async () => {
        try {
          const moduleResponse = await axios.get('http://localhost:5000/api/modules/13', {
            headers: {
              'Cookie': 'admin-session=admin-borga'
            }
          });
          
          const module = moduleResponse.data;
          console.log('\n=== REGENERATED MODULE ANALYSIS ===');
          console.log('Title:', module.title);
          console.log('Concise length:', module.conciseContent?.length || 0);
          console.log('Detailed length:', module.detailedContent?.length || 0);
          
          // Check for differences
          if (module.conciseContent && module.detailedContent) {
            const lengthDiff = Math.abs(module.detailedContent.length - module.conciseContent.length);
            console.log('Length difference:', lengthDiff);
            
            if (lengthDiff > 200) {
              console.log('✅ Content differentiation working - significant length difference');
            } else {
              console.log('⚠️ Content still too similar');
            }
          }
          
          // Check for Wikipedia links
          const wikiLinks = (module.detailedContent?.match(/\[.*?\]\(https:\/\/hu\.wikipedia\.org/g) || []).length;
          console.log('Wikipedia links found:', wikiLinks);
          
          if (wikiLinks > 5) {
            console.log('✅ Wikipedia link generation improved');
          } else {
            console.log('⚠️ Still few Wikipedia links');
          }
          
          // Check for YouTube videos
          const videos = module.keyConceptsWithVideos || [];
          const totalVideos = videos.reduce((sum, concept) => sum + (concept.youtubeVideos?.length || 0), 0);
          console.log('YouTube videos found:', totalVideos);
          
          if (totalVideos > 3) {
            console.log('✅ YouTube video generation working');
          } else {
            console.log('⚠️ Still no YouTube videos');
          }
          
        } catch (checkError) {
          console.error('Error checking regenerated module:', checkError.message);
        }
      }, 15000); // Wait 15 seconds for processing
      
    } else {
      console.log('❌ Module regeneration failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCompleteFix();