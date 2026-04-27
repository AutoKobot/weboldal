import axios from 'axios';
import * as cheerio from 'cheerio';
import pdf from 'pdf-parse';
import { aiProvider } from './openai';

interface IKKAttachment {
  name: string;
  media: {
    id: number;
    originalName: string;
    mimeType: string;
    size: number;
  };
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
  private static readonly API_MEDIA_URL = 'https://api.ikk.hu/v1/media';

  /**
   * Lekéri a szakmák listáját az IKK oldaláról a __NEXT_DATA__ objektumból.
   */
  async getProfessions(): Promise<IKKProfession[]> {
    try {
      const response = await axios.get(IKKService.BASE_URL);
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
      const response = await axios.get(`${IKKService.API_MEDIA_URL}/${mediaId}`, {
        responseType: 'arraybuffer'
      });

      const data = await pdf(Buffer.from(response.data));
      return data.text;
    } catch (error) {
      console.error(`Hiba a PDF feldolgozásakor (ID: ${mediaId}):`, error);
      throw error;
    }
  }

  /**
   * KKK és PTT szövegek kinyerése egy szakmához.
   */
  async getProfessionContent(profession: IKKProfession) {
    const kkkAttachment = profession.attachments
      .filter(a => a.name === 'KKK')
      .sort((a, b) => b.version - a.version)[0];

    const pttAttachment = profession.attachments
      .filter(a => a.name === 'PTT')
      .sort((a, b) => b.version - a.version)[0];

    let kkkText = '';
    let pttText = '';

    if (kkkAttachment) {
      kkkText = await this.getPdfText(kkkAttachment.media.id);
    }

    if (pttAttachment) {
      pttText = await this.getPdfText(pttAttachment.media.id);
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
