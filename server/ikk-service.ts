import axios from 'axios';
import * as cheerio from 'cheerio';
import pdf from 'pdf-parse';

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
  sector: { name: string };
  attachments: IKKAttachment[];
}

export interface RawModule {
  title: string;
  type: 'theory' | 'practical';
  sectionCode: string;
}

export interface RawSubject {
  name: string;
  code: string;
  description: string;
  practicalPercent: number;
  hours?: number;
  modules: RawModule[];
}

export class IKKService {
  private static readonly BASE_URL = 'https://akkreditaltvizsgaztatas.ikk.hu/kkk-ptt';
  private static readonly API_MEDIA_URL = 'https://api.ikk.hu/v1/media/documents';

  async getProfessions(): Promise<IKKProfession[]> {
    try {
      const response = await axios.get(IKKService.BASE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const $ = cheerio.load(response.data);
      const nextDataJson = $('#__NEXT_DATA__').html();
      if (!nextDataJson) throw new Error('Nem található __NEXT_DATA__ az IKK oldalon.');
      const nextData = JSON.parse(nextDataJson);
      return nextData.props.pageProps.kkk_ptts || [];
    } catch (error) {
      console.error('Hiba az IKK szakmák lekérésekor:', error);
      throw error;
    }
  }

  async getPdfText(mediaId: number): Promise<string> {
    try {
      const response = await axios.get(`${IKKService.API_MEDIA_URL}/${mediaId}`, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/pdf,application/octet-stream',
          'Referer': 'https://akkreditaltvizsgaztatas.ikk.hu/'
        }
      });
      const buffer = Buffer.from(response.data);
      const data = await pdf(buffer);
      return data.text;
    } catch (error: any) {
      console.error(`Hiba a PDF feldolgozásakor (ID: ${mediaId}):`, error.message);
      throw error;
    }
  }

  async getProfessionContent(profession: IKKProfession) {
    const kkkAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('KKK'))
      .sort((a, b) => b.version - a.version)[0];
    const pttAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('PTT'))
      .sort((a, b) => b.version - a.version)[0];

    let kkkTextRaw = '';
    if (kkkAttachment?.media_id) {
      try { kkkTextRaw = await this.getPdfText(kkkAttachment.media_id); } catch (e) {}
    }

    let pttTextRaw = '';
    if (pttAttachment?.media_id) {
      try { pttTextRaw = await this.getPdfText(pttAttachment.media_id); } catch (e) {}
    }

    return { 
      kkkText: this.preprocessText(kkkTextRaw || ''), 
      pttText: this.preprocessText(pttTextRaw || '') 
    };
  }

  private preprocessText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\d+\s*\/\s*\d+\.\s*oldal/gi, '')
      .replace(/\d+\s*\/\s*\d+\s*oldal/gi, '')
      .replace(/P\s*R\s*O\s*G\s*R\s*A\s*M\s*T\s*A\s*N\s*T\s*E\s*R\s*V/g, '')
      .replace(/([a-záéíóöőuúüű])-\n\s*([a-záéíóöőuúüű])/gi, '$1$2')
      .replace(/\n\s*\n\s*\n/g, '\n\n');
  }

  splitPttIntoSections(text: string): string[] {
    if (!text) return [];
    
    // First try splitting by subjects
    const rawSections = text.split(/(?=\n\s*\d+\.\d+(\.\d+)?\s+[^\n]+tantárgy)/i);
    
    const CHUNK_SIZE = 10000;
    const OVERLAP = 2000;
    const finalChunks: string[] = [];

    for (const section of rawSections) {
      if (section.length <= CHUNK_SIZE) {
        if (section.length > 100) finalChunks.push(section.trim());
      } else {
        // If a single subject section is too long, chunk it with overlap
        for (let i = 0; i < section.length; i += CHUNK_SIZE - OVERLAP) {
          const chunk = section.substring(i, i + CHUNK_SIZE);
          if (chunk.length > 100) finalChunks.push(chunk.trim());
          if (i + CHUNK_SIZE >= section.length) break;
        }
      }
    }

    return finalChunks;
  }

  buildExtractionPrompt(chunk: string): string {
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő vagy. A feladatod a szakmai tartalom kinyerése a LEGRÉSZLETESEBB szinten.

── TANTÁRGY ÉS MODUL STRUKTÚRA ──
1. TANTÁRGY: Minden "X.X.X [Név] tantárgy [óra] óra" formátumú egységet rögzíts.
2. MODULOK (KRITIKUS): A "Témakörök" (3.X.X.6) fejezetek alatt található ÖSSZES elemet vedd fel külön-külön modulként!
   - Minden felsorolt sort (akkor is, ha nincs előtte szám, csak kötőjel vagy pötty) külön modulnak tekints.
   - Ha egy fejezetet (pl. 3.5.1.6.1) több modulra bontasz, a "sectionCode" végére fűzz egy kisbetűt: 3.5.1.6.1.a, 3.5.1.6.1.b, stb.

── EXTRAKCIÓS SZABÁLYOK ──
- CÍM (FONTOS): A modul címe CSAK a szakmai megnevezés legyen. NE írd bele a fejezetszámot a címbe! (Helyes: "A hegesztőív fizikája", Helytelen: "3.4.1.2 A hegesztőív fizikája").
- TÍPUS: 
  - Ha a leírás cselekvést (mérés, vágás, készítés, beállítás) sugall -> "practical".
  - Ha fogalmakat, elméletet, szabályokat ír le -> "theory".

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "code": "3.X.X",
      "hours": 72,
      "practicalPercent": 50,
      "modules": [
        { "title": "Szakmai cím 1", "type": "theory", "sectionCode": "3.X.X.6.1.a" },
        { "title": "Szakmai cím 2", "type": "practical", "sectionCode": "3.X.X.6.1.b" }
      ]
    }
  ]
}

ELEMEZENDŐ SZÖVEG:
${chunk}
`.trim();
  }

  buildContentPrompt(professionName: string, subjectName: string, modules: RawModule[]): string {
    const moduleList = modules.map((m, i) => `${i + 1}. [${(m.type || 'theory').toUpperCase()}] ${m.title}`).join('\n');
    return `
Te egy profi szakoktató és tananyagfejlesztő vagy. Generálj szakmai tananyagot TANULÓK számára.

Szakma: ${professionName}
Tantárgy: ${subjectName}

FELADAT:
Minden modulhoz írj egy tömör, professzionális kifejtést az alábbiak szerint:

1. HA A MODUL [THEORY] (Elmélet):
   - A "content" mezőbe írj 4-5 mondatos, lényegre törő szakmai magyarázatot.
   - Használj tanuló-központú nyelvezetet (ne tanári útmutatót!).
   - A "practicalTasks" maradjon üres lista [].

2. HA A MODUL [PRACTICAL] (Gyakorlat):
   - A "content" mezőbe írj egy rövid (max 2 mondat) bevezetőt a gyakorlati feladathoz.
   - A "practicalTasks" mezőbe generálj 3-5 konkrét, lépésről-lépésre végrehajtható szakmai feladatot.

TILOS:
- "A tantárgy célja...", "A tanulónak meg kell ismernie..." kezdetű mondatok.
- Halandzsa, töltelékszöveg, pedagógiai módszertani leírások.
- Ismétlődés a modulok között.

MODULOK:
${moduleList}

VÁLASZ (JSON):
{
  "modules": [
    { "title": "Pontos modul cím", "content": "Szakmai tartalom...", "practicalTasks": ["feladat 1", "feladat 2"] }
  ]
}
`.trim();
  }

  async structureCurriculum(_professionName: string, _kkkText: string, chunk: string): Promise<string> {
    return this.buildExtractionPrompt(chunk);
  }
}

export const ikkService = new IKKService();
