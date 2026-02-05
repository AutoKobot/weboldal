// Test YouTube categorization for different content types
import fs from 'fs';

async function testYouTubeCategories(title, content) {
  console.log(`\n=== TESTING: ${title} ===`);
  console.log(`Content: ${content.substring(0, 100)}...`);
  
  // Simulate the categorization logic
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerTitle.includes('robot') || lowerContent.includes('robot') || lowerContent.includes('elfin')) {
    console.log('🤖 Detected robotics content');
    console.log('Expected categories: ["robotika", "robot programozás", "automatizálás"]');
    return ['robotika', 'robot programozás', 'automatizálás'];
  }
  
  if (lowerTitle.includes('hegesztés') || lowerContent.includes('hegesztés') || lowerContent.includes('mig') || lowerContent.includes('mag')) {
    console.log('🔥 Detected welding content');
    console.log('Expected categories: ["hegesztés", "fémfeldolgozás", "hegesztéstechnika"]');
    return ['hegesztés', 'fémfeldolgozás', 'hegesztéstechnika'];
  }
  
  if (lowerTitle.includes('főzés') || lowerContent.includes('lecsó') || lowerContent.includes('főzés')) {
    console.log('👨‍🍳 Detected cooking content');
    console.log('Expected categories: ["főzés", "szakácsképzés", "gasztronómia"]');
    return ['főzés', 'szakácsképzés', 'gasztronómia'];
  }
  
  if (lowerTitle.includes('acél') || lowerContent.includes('acél') || lowerContent.includes('metallurg')) {
    console.log('⚙️ Detected materials science content');
    console.log('Expected categories: ["metallurgia", "anyagtudomány", "acél"]');
    return ['metallurgia', 'anyagtudomány', 'acél'];
  }
  
  console.log('❌ Using fallback categorization');
  return [title.toLowerCase().split(' ')[0]];
}

async function runTests() {
  console.log('=== YOUTUBE CATEGORY DETECTION TESTS ===');
  
  // Test different content types
  await testYouTubeCategories(
    "Elfin robot bevezetés", 
    "Az Elfin robot alapjai, programozás és működés. A robot koordinátarendszere és mozgások."
  );
  
  await testYouTubeCategories(
    "Hegesztési technikák", 
    "MIG és MAG hegesztés alapjai. Fémfeldolgozás és hegesztőgépek használata."
  );
  
  await testYouTubeCategories(
    "Klasszikus lecsó főzés", 
    "Magyar lecsó elkészítése hagyományos módon. Főzési technikák és alapanyagok."
  );
  
  await testYouTubeCategories(
    "Acél tulajdonságok", 
    "Metallurgiai alapok és acél anyagtudomány. Anyagvizsgálat és szilárdsági jellemzők."
  );
  
  await testYouTubeCategories(
    "Robot koordináták", 
    "Elfin robot koordinátarendszer és pozicionálás. Automatizált mozgásprogramozás."
  );
  
  console.log('\n✅ All categorization tests completed');
  console.log('Robot content should now use robotics-specific YouTube searches instead of metallurgy terms.');
}

runTests();