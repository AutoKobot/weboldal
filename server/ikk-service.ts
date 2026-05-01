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
    const sections = text.split(/(?=\n\s*\d+\.\d+(\.\d+)?\s+[^\n]+tantárgy)/i);
    if (sections.length <= 2) {
      const CHUNK_SIZE = 8000;
      const OVERLAP = 1500;
      const chunks = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE - OVERLAP) {
        chunks.push(text.substring(i, i + CHUNK_SIZE));
      }
      return chunks;
    }
    return sections.map(s => s.trim()).filter(s => s.length > 500);
  }

  buildExtractionPrompt(chunk: string): string {
    return `
Te egy PTT (Programtanterv) dokumentum-elemző vagy.

── TANTÁRGY FELISMERÉS ──
Tantárgy = minden sor, amelynek VÉGÉN szerepel az "óra" szó egy törtszám után (pl. "72/72 óra").

── ELMÉLET/GYAKORLAT ELDÖNTÉSE (SZIGORÚ) ──
Minden tantárgy fejezetében (3.X.X) keresd meg a ".4"-es alpontot (pl. 3.4.4.4 vagy 3.1.1.4).
Szabály: 
- Ha a ".4"-es pontnál a százalék > 0% (pl. "legalább 90%-át gyakorlati helyszínen") → A tantárgy és minden modulja PRACTICAL.
- Ha a ".4"-es pontnál a százalék 0% → A tantárgy és minden modulja THEORY.
- Ha nincs ilyen pont, de a névben benne van a "gyakorlat" szó → PRACTICAL.

── MODULOK KINYERÉSE ──
Modulok KIZÁRÓLAG az "A tantárgy témakörei" (3.X.X.6) fejezet UTÁN találhatók.
Kihagyandó (NEM modul):
- "A tantárgy tanításának fő célja" (.1 pont)
- "A tantárgyat oktató végzettségére..." (.2 pont)
- "Kapcsolódó közismereti, szakmai tartalmak" (.3 pont)
- "A képzés órakeretének legalább..." (.4 pont)
- "A tantárgy oktatása során fejlesztendő kompetenciák" (.5 pont) és a hozzá tartozó táblázat.

FORMA A (Folyamatos szöveg): Minden önálló mondat legyen egy MODUL.
FORMA B (Felsorolás): Minden gondolatjellel (‒, -, •, *, vagy egyéb) kezdődő sor legyen egy MODUL.

── VÁLASZ FORMÁTUMA (JSON) ──
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "hours": 72,
      "practicalPercent": 90,
      "modules": [
        { 
          "title": "KÓD + SZÖVEG (pl. 3.4.4.6.1 Szerszámok használata)", 
          "type": "practical", 
          "sectionCode": "3.4.4.6.1" 
        }
      ]
    }
  ]
}

PTT SZÖVEG:
${chunk}
`.trim();
  }

  buildContentPrompt(professionName: string, subjectName: string, modules: RawModule[]): string {
    const moduleList = modules.map((m, i) => `${i + 1}. [${(m.type || 'theory').toUpperCase()}] ${m.title}`).join('\n');
    return `
Te egy tananyagfejlesztő vagy. Generálj szakmai tartalmat az alábbi modulokhoz.

Szakma: ${professionName}
Tantárgy: ${subjectName}

MODULOK:
${moduleList}

KÖVETELMÉNYEK:
- "content": 5-8 mondatos szakmai kifejtés.
- "practicalTasks": HA a modul PRACTICAL, akkor 3-5 konkrét gyakorlati feladat listája. Ha THEORY, maradjon üres [].
- A "title" mezőt pontosan másold vissza!

VÁLASZ (JSON):
{
  "modules": [
    { "title": "...", "content": "...", "practicalTasks": [] }
  ]
}
`.trim();
  }

  async structureCurriculum(_professionName: string, _kkkText: string, chunk: string): Promise<string> {
    return this.buildExtractionPrompt(chunk);
  }
}

export const ikkService = new IKKService();
