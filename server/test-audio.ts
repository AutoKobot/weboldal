import 'dotenv/config';
import { generateSpeech } from './openai.js';
import { uploadToSupabase } from './supabase.js';

async function testAudioGen() {
  console.log('🎙️ AI Hang generálása (TTS)...');
  try {
    const audioBuffer = await generateSpeech('Ez egy rövid AI generált teszt hang a Supabase feltöltés ellenőrzésére.');
    console.log('✅ Hang sikeresen generálva! (Méret:', audioBuffer.length, 'bájt)');
    
    console.log('\n☁️ Feltöltés a Supabase-re...');
    const fileName = `test_upload_${Date.now()}.mp3`;
    const cloudUrl = await uploadToSupabase(
      "presentations",
      fileName,
      Buffer.from(audioBuffer),
      "audio/mpeg"
    );
    
    if (cloudUrl) {
      console.log('✅ Sikeres Supabase feltöltés!');
      console.log('🌐 Publikus URL:', cloudUrl);
    } else {
      console.log('❌ Hiba történt a Supabase feltöltés során! A cloudUrl null lett.');
    }
  } catch (error) {
    console.error('Kritikus hiba a folyamatban:', error);
  }
}

testAudioGen().catch(console.error);
