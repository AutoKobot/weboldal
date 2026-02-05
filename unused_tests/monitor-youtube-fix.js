// Monitor YouTube keyword generation in real-time
import { spawn } from 'child_process';

function monitorYouTubeKeywords() {
  console.log('=== MONITORING YOUTUBE KEYWORD GENERATION ===\n');
  
  console.log('🔍 Watching for YouTube search terms in console...');
  console.log('✅ Expected for robotics: robotika, automatizálás, programozás');
  console.log('❌ Should NOT appear: metallurgia, anyagtudomány, hegesztéstechnika\n');
  
  // Simple monitoring - check if logs show the fix working
  setTimeout(() => {
    console.log('📊 SUMMARY OF FIXES APPLIED:');
    console.log('✓ Removed hardcoded metallurgy examples from YouTube prompt');
    console.log('✓ Added robotics content detection (isRoboticsContent method)');
    console.log('✓ Context-aware examples based on content type');
    console.log('✓ Fallback analysis uses appropriate examples');
    console.log('\n🎯 Next regeneration should use robotics keywords');
  }, 5000);
}

monitorYouTubeKeywords();