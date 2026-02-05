// Test script for API functionality validation
// Run this in browser console while logged in as admin

async function testVoiceNavigation() {
  console.log('Testing voice navigation support...');
  
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    console.log('✅ Speech recognition supported');
    
    if ('speechSynthesis' in window) {
      console.log('✅ Speech synthesis supported');
      
      // Test speech synthesis
      const utterance = new SpeechSynthesisUtterance('Bella hangnavigáció teszt');
      utterance.lang = 'hu-HU';
      speechSynthesis.speak(utterance);
    } else {
      console.log('❌ Speech synthesis not supported');
    }
  } else {
    console.log('❌ Speech recognition not supported');
  }
}

async function testEnhancedModuleGeneration() {
  console.log('Testing enhanced module generation...');
  
  try {
    const response = await fetch('/api/admin/modules/generate-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Hegesztési alapok',
        content: 'A hegesztés egy olyan eljárás, amely során két vagy több fémdarabot hő hatására összeolvasztanak. A folyamat során a hegesztőanyag megolvad és egyesül az alapanyaggal.',
        subjectId: 1
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Enhanced module generation successful:', result);
      return result;
    } else {
      const error = await response.text();
      console.log('❌ Enhanced module generation failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

async function testYouTubeSearch() {
  console.log('Testing YouTube search...');
  
  try {
    const response = await fetch('/api/search/youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'hegesztési technikák alapjai'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ YouTube search successful:', result);
      return result;
    } else {
      const error = await response.text();
      console.log('❌ YouTube search failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

async function testBellaTTS() {
  console.log('Testing Bella TTS...');
  
  try {
    const response = await fetch('/api/bella/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Üdvözöllek! Bella vagyok, a virtuális asszisztensed.'
      })
    });
    
    if (response.ok) {
      console.log('✅ Bella TTS successful - audio generated');
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Bella TTS failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

async function testAllAPIs() {
  console.log('🚀 Starting comprehensive API test...');
  
  await testVoiceNavigation();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testEnhancedModuleGeneration();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testYouTubeSearch();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testBellaTTS();
  
  console.log('✅ API testing completed!');
}

// Test individual components
console.log('Voice Navigation Test - Copy and paste: testVoiceNavigation()');
console.log('Enhanced Module Test - Copy and paste: testEnhancedModuleGeneration()');
console.log('Full Test Suite - Copy and paste: testAllAPIs()');

// Instructions for browser testing
console.log('HANGNAVIGÁCIÓ TESZT:');
console.log('1. Kattints a mikrofon ikonra a jobb alsó sarokban');
console.log('2. Mondj: "Bella, admin" vagy "Bella, kezdőlap"');
console.log('3. A rendszer ElevenLabs professzionális hangot használ');
console.log('');
console.log('AI MODUL GENERÁLÁS TESZT:');
console.log('1. Menj az Admin felületre');
console.log('2. Válaszd az "AI Modulok" fület');
console.log('3. Töltsd ki a címet és tartalmat');
console.log('4. Kattints az "AI Bővítés Generálása" gombra');
console.log('');

// Test ElevenLabs TTS directly in browser
async function testBellaTTSDirectly() {
  console.log('Testing Bella TTS...');
  
  try {
    const response = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Üdvözöllek! Bella vagyok, a hangnavigációs asszisztensed.',
        voice: 'Bella'
      })
    });
    
    if (response.ok) {
      console.log('✅ Bella TTS successful - playing audio');
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Bella TTS failed:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

console.log('KÖZVETLEN TTS TESZT - Futtatás: testBellaTTSDirectly()');

// Auto-run voice navigation test
testVoiceNavigation();