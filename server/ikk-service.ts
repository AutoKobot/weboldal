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
    const prompt = `
      Feladatod egy szakmai tananyag struktúrájának kialakítása a megadott KKK (Képzési és Kimeneti Követelmények) és PTT (Programtanterv) alapján.
      
      Szakma: ${professionName}
      
      KKK Kivonat: ${kkkText.substring(0, 10000)} ...
      
      PTT Kivonat: ${pttText.substring(0, 10000)} ...
      
      Kérlek azonosítsd a főbb tantárgyakat (Subjects) és a hozzájuk tartozó modulokat (Modules).
      Minden modulhoz írj egy 4-5 mondatos tömör összefoglalót, ami leírja a modul célját és tartalmát.
      
      A válaszod egy JSON objektum legyen a következő formátumban:
      {
        "subjects": [
          {
            "name": "Tantárgy neve",
            "description": "Tantárgy rövid leírása",
            "modules": [
              {
                "title": "Modul címe",
                "conciseContent": "4-5 mondatos összefoglaló...",
                "detailedContent": "Részletesebb leírás a tananyagról (1-2 bekezdés)"
              }
            ]
          }
        ]
      }
    `;

    // Itt hívnánk meg az AI szolgáltatót
    // Ezt a részt a routes.ts-ben vagy egy külön generátorban érdemes kezelni
    return prompt;
  }
}

export const ikkService = new IKKService();
