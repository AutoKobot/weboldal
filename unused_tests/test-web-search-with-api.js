import { multiApiService } from './server/multiApiService.js';

async function testWebSearchWithAPI() {
  console.log('=== TESTING WEB SEARCH WITH REAL API ===\n');
  
  try {
    console.log('Testing DataForSEO web search...');
    
    const searchQuery = "robotika automatizálás programozás";
    console.log(`Search query: ${searchQuery}`);
    
    const searchResults = await multiApiService.searchInternet(searchQuery);
    
    console.log(`Search results count: ${searchResults ? searchResults.length : 0}`);
    
    if (searchResults && searchResults.length > 0) {
      console.log('✅ Web search successful!');
      console.log('Sample result:', {
        title: searchResults[0].title,
        snippet: searchResults[0].snippet?.substring(0, 100) + '...',
        url: searchResults[0].url
      });
    } else {
      console.log('❌ No search results found');
    }
    
  } catch (error) {
    console.error('❌ Web search failed:', error.message);
  }
}

testWebSearchWithAPI();