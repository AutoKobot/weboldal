import WebSocket from 'ws';
import crypto from 'crypto';

/**
 * Ingyenes Microsoft Edge Neural TTS motor megvalósítása.
 * Kiváló minőségű, természetes magyar hangokkal (pl. hu-HU-NoemiNeural).
 */
export async function generateEdgeSpeech(text: string, voice: string = 'hu-HU-NoemiNeural'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // GUID generálása a kapcsolathoz (Microsoft Edge TTS követelmény)
    const connectionId = crypto.randomUUID().replace(/-/g, '');
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`;
    
    // Létrehozzuk a WebSocket kapcsolatot a megfelelő fejlécekkel, mintha egy Edge böngésző lenne
    const ws = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Origin': 'chrome-extension://jdjiibocoglejkbnoocojbaghomejplm'
      }
    });

    const audioBuffers: Buffer[] = [];
    let isClosed = false;

    // Biztonsági időtúllépés (15 másodperc)
    const timeout = setTimeout(() => {
      if (!isClosed) {
        isClosed = true;
        try { ws.close(); } catch (e) {}
        reject(new Error('Edge TTS timeout - nem érkezett válasz a szervertől'));
      }
    }, 15000);

    ws.on('open', () => {
      const timestamp = new Date().toString();
      const requestId = crypto.randomUUID().replace(/-/g, '');

      // 1. Lépés: A kimeneti formátum és környezet konfigurálása (MP3 formátum)
      const configMessage = `Path: speech.config\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${timestamp}\r\nContent-Type: application/json\r\n\r\n{"context":{"system":{"name":"SpeechSDK","version":"1.12.1-rc.1","build":"JavaScript","lang":"JavaScript"}},"audio":{"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}`;
      ws.send(configMessage);

      // 2. Lépés: Az SSML üzenet (a felolvasandó szöveg) kiküldése
      // Fontos: XML escape a szövegen
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
        
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hu-HU'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapedText}</prosody></voice></speak>`;
      
      const ssmlMessage = `Path: ssml\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${timestamp}\r\nContent-Type: application/ssml+xml\r\n\r\n${ssml}`;
      ws.send(ssmlMessage);
    });

    ws.on('message', (data: any, isBinary: boolean) => {
      // Szöveges és bináris keretek is érkezhetnek
      const isTrulyBinary = isBinary || Buffer.isBuffer(data);
      
      if (isTrulyBinary) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        
        // A Microsoft Edge TTS bináris keretek felépítése:
        // Első 2 bájt (Big Endian UInt16) = a szöveges fejléc hossza
        // Utána jön a fejléc, majd közvetlenül mögötte a nyers MP3 adat
        try {
          const headerLength = buffer.readUInt16BE(0);
          const header = buffer.subarray(2, 2 + headerLength).toString('utf-8');
          
          // Ha ez a Path:audio tartalom, elmentjük a bináris hanganyagot
          if (header.includes('Path:audio')) {
            const audioData = buffer.subarray(2 + headerLength);
            if (audioData.length > 0) {
              audioBuffers.push(audioData);
            }
          }
        } catch (err) {
          console.error('Hiba az Edge TTS bináris keret feldolgozásakor:', err);
        }
      } else {
        // Szöveges keretek (Pl. válasz vége jelzés)
        const textMsg = data.toString('utf-8');
        
        // A Path:turn.end jelzi, hogy az összes hanganyag megérkezett
        if (textMsg.includes('Path:turn.end')) {
          isClosed = true;
          clearTimeout(timeout);
          ws.close();
          
          if (audioBuffers.length > 0) {
            resolve(Buffer.concat(audioBuffers));
          } else {
            reject(new Error('Nem érkezett hanganyag az Edge TTS-től'));
          }
        }
      }
    });

    ws.on('error', (err) => {
      if (!isClosed) {
        isClosed = true;
        clearTimeout(timeout);
        console.error('Edge TTS WebSocket hiba:', err);
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!isClosed) {
        isClosed = true;
        clearTimeout(timeout);
        
        // Ha a socket bezárult, de van pufferelt adatunk, azt adjuk vissza
        if (audioBuffers.length > 0) {
          resolve(Buffer.concat(audioBuffers));
        } else {
          reject(new Error('Edge TTS kapcsolat bezárult adat nélkül'));
        }
      }
    });
  });
}
