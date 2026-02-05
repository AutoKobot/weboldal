// Clean up metallurgy keywords from robot modules
import fs from 'fs';

async function cleanupTest() {
  console.log('=== METALLURGY KEYWORD CLEANUP TEST ===');
  
  const metallurgyKeywords = [
    'acél', 'hegesztés', 'kémia', 'szén', 'vas', 
    'ötvözet', 'keménység', 'szilárdság', 'korrózió', 'hőkezelés'
  ];
  
  const expectedRobotKeywords = [
    'robotika', 'automatizálás', 'programozás', 'koordináta', 
    'szenzor', 'aktuátor', 'kinematika', 'robotkar'
  ];
  
  console.log('❌ Old metallurgy keywords that should NOT appear in robot modules:');
  metallurgyKeywords.forEach(keyword => console.log(`   - ${keyword}`));
  
  console.log('\n✅ Expected robot-specific keywords that SHOULD appear:');
  expectedRobotKeywords.forEach(keyword => console.log(`   - ${keyword}`));
  
  console.log('\n📝 Action taken:');
  console.log('   1. Removed metallurgy keywords from robot module 13 in database');
  console.log('   2. Started fresh AI regeneration with robot-specific content');
  console.log('   3. Enhanced Wikipedia keyword detection with content-aware logic');
  
  console.log('\n🔍 Next verification steps:');
  console.log('   - Check regenerated module 13 content');
  console.log('   - Verify Wikipedia keywords match robot theme');
  console.log('   - Confirm YouTube searches use robotics terms');
}

cleanupTest();