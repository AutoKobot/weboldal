import axios from 'axios';
import * as cheerio from 'cheerio';
import pdf from 'pdf-parse';
import { aiProvider } from './openai';

interface IKKAttachment {
  name: string;
  media: string;
  media_id: number;
  version: number;
  publishDate: string;
}

interface IKKProfession {
  id: number;
  name: string;
  okjId: string;
  sector: {
    name: string;
  };
  attachments: IKKAttachment[];
}

export class IKKService {
  private static readonly BASE_URL = 'https://akkreditaltvizsgaztatas.ikk.hu/kkk-ptt';
  private static readonly API_MEDIA_URL = 'https://api.ikk.hu/v1/media/documents';

  /**
   * Lekéri a szakmák listáját az IKK oldaláról a __NEXT_DATA__ objektumból.
   */
  async getProfessions(): Promise<IKKProfession[]> {
    try {
      const response = await axios.get(IKKService.BASE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      const nextDataJson = $('#__NEXT_DATA__').html();

      if (!nextDataJson) {
        throw new Error('Nem található __NEXT_DATA__ az IKK oldalon.');
      }

      const nextData = JSON.parse(nextDataJson);
      const kkk_ptts = nextData.props.pageProps.kkk_ptts || [];

      return kkk_ptts;
    } catch (error) {
      console.error('Hiba az IKK szakmák lekérésekor:', error);
      throw error;
    }
  }

  /**
   * Letölti és feldolgozza a megadott média ID-hoz tartozó PDF-et.
   */
  async getPdfText(mediaId: number): Promise<string> {
    try {
      console.log(`IKK PDF Letöltés indítása: ${IKKService.API_MEDIA_URL}/${mediaId}`);
      const response = await axios.get(`${IKKService.API_MEDIA_URL}/${mediaId}`, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream',
          'Referer': 'https://akkreditaltvizsgaztatas.ikk.hu/'
        }
      });

      const buffer = Buffer.from(response.data);
      const signature = buffer.slice(0, 4).toString();
      console.log(`Letöltve: ${buffer.length} bájt. Szignatúra: ${signature}`);
      
      if (signature !== '%PDF') {
        console.error('Hiba: A letöltött tartalom nem PDF!', buffer.slice(0, 100).toString());
        throw new Error(`A szerver nem érvényes PDF-et küldött (ID: ${mediaId}). Tartalom kezdete: ${signature}`);
      }

      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error(`Hiba a PDF feldolgozásakor (ID: ${mediaId}):`, error);
      if (error instanceof Error && (error.message.includes('Invalid PDF structure') || error.message.includes('PDF header not found'))) {
         throw new Error(`Sérült vagy nem támogatott PDF formátum (ID: ${mediaId}). A fájl letöltődött (${mediaId}), de az olvasó nem tudja értelmezni.`);
      }
      throw error;
    }
  }

  /**
   * KKK és PTT szövegek kinyerése egy szakmához.
   */
  async getProfessionContent(profession: IKKProfession) {
    console.log(`Checking attachments for profession: ${profession.name}`, JSON.stringify(profession.attachments, null, 2));

    // Keressük a KKK-t (név alapján, rugalmasabban)
    const kkkAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('KKK'))
      .sort((a, b) => b.version - a.version)[0];

    // Keressük a PTT-t (név alapján, rugalmasabban)
    const pttAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('PTT'))
      .sort((a, b) => b.version - a.version)[0];

    let kkkText = '';
    let pttText = '';

    if (kkkAttachment && kkkAttachment.media_id) {
      console.log(`Downloading KKK (ID: ${kkkAttachment.media_id}) for ${profession.name}`);
      try {
        kkkText = await this.getPdfText(kkkAttachment.media_id);
      } catch (e) {
        console.error(`Nem sikerült a KKK-t feldolgozni:`, e);
      }
    } else {
      console.warn(`Nem található KKK dokumentum (vagy hiányzik a media_id) a(z) ${profession.name} szakmához.`);
    }

    if (pttAttachment && pttAttachment.media_id) {
      console.log(`Downloading PTT (ID: ${pttAttachment.media_id}) for ${profession.name}`);
      try {
        pttText = await this.getPdfText(pttAttachment.media_id);
      } catch (e) {
        console.error(`Nem sikerült a PTT-t feldolgozni:`, e);
      }
    } else {
      console.warn(`Nem található PTT dokumentum (vagy hiányzik a media_id) a(z) ${profession.name} szakmához.`);
    }

    if (!kkkText && !pttText) {
      const details = profession.attachments?.map(a => `${a.name} (media_id: ${a.media_id}, hasMediaURL: ${!!a.media})`).join(', ');
      throw new Error(`Nem sikerült feldolgozni a KKK/PTT dokumentumokat. Részletek: ${details}. Ellenőrizd a szerver naplót a szignatúráért!`);
    }

    return { kkkText, pttText };
  }

  /**
   * AI segítségével struktúrált tananyagot generál a KKK/PTT szövegekből.
   */
  async structureCurriculum(professionName: string, kkkText: string, pttText: string) {
    console.log(`Curriculum generation started for ${professionName}. PTT: ${pttText.length} chars.`);

    const prompt = `
      Feladatod egy szakmai tananyag RENDKÍVÜL RÉSZLETES és TELJES struktúrájának kialakítása a megadott PTT (Programtanterv) alapján.
      
      Szakma: ${professionName}
      
      SZIGORÚ UTASÍTÁSOK:
      1. TANTÁRGYAK AZONOSÍTÁSA: A tantárgyak felismerése onnan történik, hogy a címük végén ott van a "tantárgy" szó és az óraszám (pl. "3.4.2 Textiltermékek gyártástechnológiája tantárgy 36/36 óra").
      2. HOL VANNAK A MODULOK? A modulokat (tananyagegységeket) KIZÁRÓLAG "A tantárgy témakörei" című bekezdés (pl. 3.4.2.6) után találod meg! HAGYJ FIGYELMEN KÍVÜL minden bevezetőt ("A tantárgy tanításának fő célja", "oktató végzettsége", "kompetenciák")!
      3. A FELSOROLÁSOK A VALÓDI MODULOK! Amikor egy témakörön belül (pl. 3.4.2.6.1 Ruhaipari ábrázolások) felsorolásokat, gondolatjeleket (-) vagy perjelekkel (/) elválasztott fogalmakat látsz, AZOK A TÉNYLEGES MODULOK! Minden EGYYES FELSOROLÁS PONTOT KÜLÖN MODULKÉNT ('theoryModules' vagy 'practicalModules' elemként) rögzíts!
      4. MODULOK ELNEVEZÉSE: Ha felsorolásból szedsz ki egy modult, a címe (title) tartalmazza a témakör nevét és a felsorolás elemét! Példa: "Ruhaipari ábrázolások - Modellrajz", "Ruhaipari ábrázolások - Gyártmányrajz".
      5. ELMÉLET VS GYAKORLAT: Ha egy tantárgynál az van írva, hogy "A képzés órakeretének X%-át gyakorlati helyszínen kell lebonyolítani", vagy a leírásban/témakörnél szerepel a "Gyakorlat" szó, akkor a hozzá tartozó felsorolás elemeket a 'practicalModules' tömbbe rakd!
      6. MENNYISÉG: Egy tantárgyhoz ÁLTALÁBAN 10-30 ilyen apró, felsorolás-szintű elméleti és 10-20 gyakorlati modul tartozik. TILOS ÖSSZEVONNI a felsorolásokat egy nagy modulba! Ha egy tantárgy alá csak 1-3 modult generálsz, az HIBÁS feldolgozás. Bontsd ki az összes gondolatjelet!
      7. A 'detailedContent' mezőbe részletesen írd le, miről szól az adott pici részfeladat vagy elméleti altéma. Hagyj figyelmen kívül minden táblázatot és puszta óraszám-összesítést!
      
      PTT Szöveg (Programtanterv - Itt vannak a konkrét tantárgyak és modulok!):
      ${pttText.substring(0, 350000)}
      
      Kérlek azonosítsd az ÖSSZES tantárgyat és az azokhoz tartozó ÖSSZES (akár tantárgyanként 10-30) elméleti és gyakorlati apró modult.
      
      VÁLASZ FORMÁTUM (Csak érvényes JSON):
      {
        "subjects": [
          {
            "name": "Textiltermékek gyártástechnológiája",
            "description": "Tantárgy részletes célkitűzései a PTT alapján",
            "theoryModules": [
              {
                "title": "3.4.2.6.1 Ruhaipari ábrázolások - Modellrajz",
                "conciseContent": "4-5 mondatos összefoglaló a modellrajz elméletéről...",
                "detailedContent": "Részletes szakmai leírás a modellrajzok elkészítésének szabályairól..."
              },
              {
                "title": "3.4.2.6.1 Ruhaipari ábrázolások - Gyártmányrajz",
                "conciseContent": "4-5 mondatos összefoglaló a gyártmányrajzról...",
                "detailedContent": "Részletes szakmai leírás..."
              },
              {
                "title": "3.4.2.6.1 Ruhaipari ábrázolások - Részletrajz",
                "conciseContent": "4-5 mondatos összefoglaló a részletrajzról...",
                "detailedContent": "Részletes szakmai leírás..."
              }
            ],
            "practicalModules": [
              {
                "title": "3.4.2.6.2 Varrástechnológia - A varratok és varrások alaki és méretjellemzői",
                "conciseContent": "A gyakorlati feladat rövid összefoglalója...",
                "detailedContent": "Pontos gyakorlati lépések, munkafázisok..."
              },
              {
                "title": "3.4.2.6.2 Varrástechnológia - Öltések és varratok (Gyakorlat)",
                "conciseContent": "A gyakorlati feladat rövid összefoglalója...",
                "detailedContent": "Pontos gyakorlati lépések, munkafázisok..."
              }
            ]
          }
        ]
      }
    `;

    return prompt;
  }
}

export const ikkService = new IKKService();
