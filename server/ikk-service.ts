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

  async distributeSubjectHours(
    professionName: string,
    subjectName: string,
    totalHours: number,
    practicalPercent: number,
    modules: { title: string, id: number, type: string }[]
  ): Promise<{ id: number, hours: number }[]> {
    if (!totalHours || modules.length === 0) return modules.map(m => ({ id: m.id, hours: 0 }));

    try {
      const { getOpenAIClient } = await import('./openai');
      const openai = await getOpenAIClient();

      const theoryModules = modules.filter(m => m.type === 'theory');
      const practicalModules = modules.filter(m => m.type === 'practical');

      const targetPracticalHours = Math.round(totalHours * (practicalPercent / 100));
      const targetTheoryHours = totalHours - targetPracticalHours;

      const prompt = `
Te egy SZAKOKTATÓ és tanmenet-tervező vagy.
Szakma: ${professionName}
Tantárgy: ${subjectName}
Összes keretidő: ${totalHours} óra
Ebből GYAKORLAT cél: ${targetPracticalHours} óra (${practicalPercent}%)
Ebből ELMÉLET cél: ${targetTheoryHours} óra (${100 - practicalPercent}%)

FELADAT: Oszd el az órákat a modulok között úgy, hogy:
1. A GYAKORLATI modulok (PRACTICAL) óraszámainak összege pontosan ${targetPracticalHours} legyen.
2. Az ELMÉLETI modulok (THEORY) óraszámainak összege pontosan ${targetTheoryHours} legyen.
3. A modulok súlya és komplexitása alapján differenciálj.

SZABÁLYOK:
1. Az óraszámok összege pontosan ${totalHours} legyen!
2. Használj kerekített számokat (0.5-ös pontossággal, pl. 1.5, 2, 4.5).
3. Válaszolj szigorú JSON formátumban: {"distributions": [{"id": [modul_id], "hours": [óra]}]}

MODULOK LISTÁJA:
GYAKORLATI MODULOK:
${practicalModules.map(m => `- ID: ${m.id} | Cím: ${m.title}`).join('\n')}

ELMÉLETI MODULOK:
${theoryModules.map(m => `- ID: ${m.id} | Cím: ${m.title}`).join('\n')}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: "Tanmenet-tervező szakértő vagy." }, { role: "user", content: prompt }],
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.distributions || [];
    } catch (error) {
      console.error('Hiba az óraszámok elosztásakor:', error);
      // Fallback: simple average within types if AI fails
      const practicalMods = modules.filter(m => m.type === 'practical');
      const theoryMods = modules.filter(m => m.type === 'theory');

      const targetPrac = totalHours * (practicalPercent / 100);
      const targetTheo = totalHours - targetPrac;

      const pracAvg = practicalMods.length > 0 ? targetPrac / practicalMods.length : 0;
      const theoAvg = theoryMods.length > 0 ? targetTheo / theoryMods.length : 0;

      return modules.map(m => ({
        id: m.id,
        hours: m.type === 'practical' ? Math.round(pracAvg * 2) / 2 : Math.round(theoAvg * 2) / 2
      }));
    }
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

  buildExtractionPrompt(chunk: string, importType: 'theory' | 'practical' | 'both' = 'both'): string {
    const typeFocus = importType === 'theory' ? 'CSAK AZ ELMÉLETI' : importType === 'practical' ? 'CSAK A GYAKORLATI' : 'AZ ÖSSZES';
    
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. A feladatod a szakmai tartalom kinyerése és SZAKMAI BŐVÍTÉSE/FELBONTÁSA.
Most kifejezetten ${typeFocus} tananyagrészekre kell fókuszálnod.

── TANTÁRGY ÉS MODUL STRUKTÚRA ──
1. TANTÁRGY: Minden "X.X.X [Név] tantárgy [óra] óra" formátumú egységet rögzíts.
2. MODULOK ÉS GRANULÁRIS FELBONTÁS (KRITIKUS): 
   - Keress meg minden szakmai egységet (fejezetet).
   - **KÖTELEZŐ FELBONTÁS**: Ha egy fejezet (pl. 3.3.2.6.1) több, jól elkülöníthető témát, felsorolást vagy alpontot tartalmaz, akkor azt KÖTELEZŐ több kisebb, logikus modulra bontani!
     * Példa: Ha egy felsorolásban szerepelnek fémes anyagok, nem-fémes anyagok és segédanyagok, akkor ezeket NE egy modulba tedd, hanem bontsd 3 külön modulra!
     * Példa (Gyakorlatnál): Hegesztésnél bontsd szét pozíciók (PA, PB, PC, PF, stb.) és varrattípusok szerint.
   - Minden ilyen almodult (a, b, c...) vegyél fel külön elemként. 
   - A "sectionCode" végére MINDIG fűzz egy kisbetűt, ha felbontást végzel: 3.3.2.6.1.a, 3.3.2.6.1.b, stb.
   - **CÉL**: Egy modul ne legyen hosszabb 200-300 szónál a kifejtés után. Ha a forrásanyag túl sűrű, bontsd tovább!

── EXTRAKCIÓS SZABÁLYOK ──
- SZŰRÉS: ${typeFocus} modulokat keresünk.
- ELMÉLET DEFINÍCIÓ: Ismeretek, szabályok, elméleti összefüggések, anyagismeret, fogalmak.
- GYAKORLAT DEFINÍCIÓ: Cselekvések, készségek, konkrét szakmai műveletek végrehajtása.
- CÍM (FONTOS): A modul címe legyen pontos és szakmai (pl. "Szerkezeti anyagok szilárdsági jellemzői" vagy "Ipari gázok kezelése és tárolása").

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
        { "title": "Szakmai cím 2", "type": "theory", "sectionCode": "3.X.X.6.1.b" },
        { "title": "Szakmai cím 3", "type": "practical", "sectionCode": "3.X.X.6.1.c" }
      ]
    }
  ]
}

── FONTOS INSTRUKCIÓK ──
1. HOURS: Keresd meg a tantárgy neve melletti óraszámot.
2. PRACTICALPERCENT: Keresd meg a tantárgyra vonatkozó gyakorlati arányt.
3. MODULES: Légy nagyon részletes! Inkább legyen több kis modul, mint egy óriási. A mobil kijelzőkön a kisebb egységek jobban olvashatóak.

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

── FELADAT ──
Minden modulhoz írj egy alapos, de lényegre törő szakmai kifejtést az alábbi SZIGORÚ szabályok szerint:

1. HA A MODUL [THEORY] (Elmélet):
   - A "content" mezőbe írj 8-10 mondatos, részletes szakmai magyarázatot.
   - Összpontosíts a fogalmakra, összefüggésekre, technikai adatokra és szabályokra.
   - Használj szakmailag pontos terminológiát.
   - A "practicalTasks" mező KÖTELEZŐEN ÜRES lista maradjon: [].

2. HA A MODUL [PRACTICAL] (Gyakorlat):
   - A "content" mezőbe írj egy rövid (max 3 mondat) bevezetőt a feladat céljáról.
   - A "practicalTasks" mezőbe generálj 5-8 konkrét, lépésről-lépésre végrehajtható szakmai feladatot (instrukciót).
   - A feladatok legyenek cselekvés-orientáltak és technikai jellegűek (pl. "Állítsa be a nyomást 4 barra...", "Ellenőrizze a tömítettséget...").

── SZIGORÚ TILALOM ──
- NE keverd az elméleti magyarázatot a gyakorlati feladatokkal!
- Kerüld a pedagógiai sallangokat (pl. "A tanuló képes lesz...").
- Ne legyen túl tömör, de ne is legyen feleslegesen bőbeszédű.

MODULOK:
${moduleList}

VÁLASZ (JSON):
{
  "modules": [
    { "title": "Pontos modul cím", "content": "Szakmai tartalom...", "practicalTasks": ["1. feladat", "2. feladat"] }
  ]
}
`.trim();
  }

  async structureCurriculum(_professionName: string, _kkkText: string, chunk: string, importType?: 'theory' | 'practical' | 'both'): Promise<string> {
    return this.buildExtractionPrompt(chunk, importType);
  }
}

export const ikkService = new IKKService();
