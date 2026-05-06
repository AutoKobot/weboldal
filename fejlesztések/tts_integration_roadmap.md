# 🎙️ TTS (Text-to-Speech) Integrációs Útmutató és Fejlesztési Terv

Ez a dokumentum rögzíti az **InteractiveLearning** rendszer hangalapú oktatási prezentációinak jövőbeli fejlesztési irányait, konkrét kód-sablonokkal és technikai útmutatásokkal a **Google Cloud TTS (Neural2)** és az **ElevenLabs** rendszerekhez.

---

## 📊 Összehasonlító Táblázat és Árazás

| Szolgáltató | Modell / Típus | Minőség / Természetesség | Magyar nyelv támogatása | Költség / 1000 karakter | Ingyenes keret (havonta) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAI (Aktív)** | `tts-1` (Standard) | Kiemelkedő (shimmer hang) | Nagyon jó | **0,015 $** (kb. 5,5 Ft) | Nincs |
| **Google Cloud** | `hu-HU-Neural2-F` | Kiváló (emberi tónus) | Kiváló (magyaros hangsúly) | **0,016 $** (kb. 6 Ft) | **1 millió karakter** (0 Ft!) |
| **ElevenLabs** | Multilingual v2 | Világelső (érzelmes, klónozott) | Páratlan (lélegzetvételekkel) | **0,15 - 0,24 $** (kb. 55-88 Ft) | **10 000 karakter** (0 Ft) |

---

## 🛠️ 1. Lépés: Google Cloud TTS (Neural2) Integráció
A Google Cloud óriási előnye a **havi 1 000 000 ingyenes karakter**, amivel szinte teljesen nullázható a tesztelési és induló éles fázis költsége.

### Környezeti változók (`.env`)
```env
GOOGLE_APPLICATION_CREDENTIALS="google-key.json"
```

### Kód Blueprint (`server/google-tts.ts`)
```typescript
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Inicializálás a Google Key JSON alapján
const client = new TextToSpeechClient();

export async function generateGoogleSpeech(text: string): Promise<Buffer> {
  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: text },
      voice: { 
        languageCode: 'hu-HU', 
        name: 'hu-HU-Neural2-F', // Legújabb neurális női hang (vagy Neural2-C a férfi hanghoz)
        ssmlGender: 'FEMALE' 
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0, // Normál sebesség
        pitch: 0.0         // Normál hangszín
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio content returned from Google Cloud TTS");
    }

    return Buffer.from(response.audioContent as Uint8Array);
  } catch (error) {
    console.error("Google Cloud TTS Error:", error);
    throw error;
  }
}
```

---

## 👑 2. Lépés: ElevenLabs Integráció
Az ElevenLabs nyújtja a piac legélethűbb beszédhangjait, amelyek képesek a lélegzetvétel, az intonáció és a hanglejtés tökéletes leutánzására.

### Környezeti változók (`.env`)
```env
ELEVENLABS_API_KEY="your_api_key_here"
ELEVENLABS_VOICE_ID="EXAVITQu4vr4xnSDxMaL" // Sablon hang ID (pl. Bella, Rachel vagy egyedi klónozott hang)
```

### Kód Blueprint (`server/elevenlabs-tts.ts`)
```typescript
import axios from 'axios';

export async function generateElevenLabsSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

  if (!apiKey) {
    throw new Error("Missing ElevenLabs API key");
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      data: {
        text: text,
        model_id: "eleven_multilingual_v2", // Magyar nyelvet támogató modell
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error("ElevenLabs TTS Error:", error.response ? error.response.data.toString() : error.message);
    throw error;
  }
}
```

---

## 🔀 Egységesített Vezérlő Struktúra (Későbbi beépítéshez)
Az `ai-queue-manager.ts` fájlban egyszerűen beépíthető egy választó logika a környezeti változó alapján:

```typescript
const ttsProvider = process.env.TTS_PROVIDER || 'openai'; // 'openai' | 'google' | 'elevenlabs'

let audioBuffer: Buffer;
if (ttsProvider === 'google') {
  const { generateGoogleSpeech } = await import('./google-tts');
  audioBuffer = await generateGoogleSpeech(slideAny.narration);
} else if (ttsProvider === 'elevenlabs') {
  const { generateElevenLabsSpeech } = await import('./elevenlabs-tts');
  audioBuffer = await generateElevenLabsSpeech(slideAny.narration);
} else {
  audioBuffer = await generateSpeech(slideAny.narration);
}
```

Ezzel a struktúrával a jövőben **egyetlen sor megváltoztatásával a `.env` fájlban** átkapcsolható lesz a teljes rendszer beszédgenerálása az új motorokra!
