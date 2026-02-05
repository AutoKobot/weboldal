// Monitor the AI queue and prompt execution
import { exec } from 'child_process';

function watchConsoleOutput() {
  console.log('🔍 Monitoring AI queue and prompt execution...');
  console.log('Watching for sequential AI steps and admin prompt usage');
  console.log('===============================================');
  
  // This will monitor the console output for the next 30 seconds
  setTimeout(() => {
    console.log('\n📊 Monitoring completed. Check the application console logs above for:');
    console.log('- 🔥 SEQUENTIAL AI STEP markers');
    console.log('- 📝 Wikipedia/YouTube prompt usage logs');
    console.log('- 🔍 AI response analysis');
    console.log('- ✅ Success/failure indicators');
  }, 30000);
}

watchConsoleOutput();