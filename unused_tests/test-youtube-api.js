import axios from 'axios';

async function testYouTubeAPI() {
  try {
    console.log('=== TESTING YOUTUBE API CONNECTION ===');
    
    // Test direct YouTube API call
    const response = await axios.post('http://localhost:5000/api/multi/route-task', {
      userMessage: 'robotika oktatás',
      taskType: 'youtube'
    });
    
    console.log('YouTube API Response Status:', response.status);
    console.log('YouTube API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.length > 0) {
      console.log('✅ YouTube API is working! Found', response.data.length, 'videos');
      response.data.slice(0, 2).forEach((video, index) => {
        console.log(`Video ${index + 1}:`, {
          title: video.snippet?.title || 'No title',
          videoId: video.id?.videoId || 'No ID',
          url: `https://www.youtube.com/watch?v=${video.id?.videoId}`
        });
      });
    } else {
      console.log('⚠️ YouTube API returned empty results');
    }
    
  } catch (error) {
    console.error('❌ YouTube API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testYouTubeAPI();