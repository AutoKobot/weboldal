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

  /**
   * AI-alapú óraszám-generálás egy már importált szakmához.
   *
   * Stratégia (megbízhatósági sorrendben):
   *   1. A subjects.hours már tartalmazza a teljes tantárgy-órát (az importáláskor kinyerve).
   *   2. Az AI CSAK az elmélet/gyakorlat arányt állapítja meg (PTT szöveg alapján).
   *      Ha a PTT hosszú, csak a tantárgyneveket és a közelükben lévő szövegeket elemzi.
   *   3. Az arány alapján a rendszer EGYENLŐEN osztja el az órákat az azonos típusú modulok között.
   *   4. Ha nincs PTT-adat, a modul-típus arányával becsüljük (theoryMods / totalMods).
   *
   * @param professionName Szakma neve
   * @param pttText        A PTT dokumentum teljes szövege (lehet üres)
   * @param subjects       Tantárgyak listája moduljaikkal (id, name, hours, modules[])
   * @returns              Modulokhoz rendelt óraszámok listája
   */
  async generateHoursFromPtt(
    professionName: string,
    pttText: string,
    subjects: {
      id: number;
      name: string;
      hours?: number | null;
      modules: { id: number; title: string; type: string }[];
    }[],
    trainingFormat: '3year' | '2year' = '3year'
  ): Promise<{ moduleId: number; hours: number }[]> {
    if (subjects.length === 0) return [];

    const { getOpenAIClient } = await import('./openai');
    const openai = await getOpenAIClient();

    // ── 1. Compact subject list for AI (only names + hours + module type counts) ──
    const subjectSummary = subjects.map(s => {
      const theoryN = s.modules.filter(m => m.type === 'theory').length;
      const practicalN = s.modules.filter(m => m.type === 'practical').length;
      return `- "${s.name}" | DB: ${s.hours ?? '?'} óra | Elm.modulok: ${theoryN} | Gyak.modulok: ${practicalN}`;
    }).join('\n');

    // ── 2. Extract PTT context: find relevant sections ──
    let pttContext = '';
    if (pttText) {
      const contextParts: string[] = [];
      
      // Include the beginning of the PTT (first 4000 chars) as it usually contains the main summary table
      contextParts.push(`[PTT ÖSSZESÍTŐ TÁBLÁZAT ÉS FEJLÉC]:\n${pttText.substring(0, 4000)}`);
      
      for (const subject of subjects) {
        const idx = pttText.toLowerCase().indexOf(subject.name.toLowerCase().substring(0, 20));
        if (idx !== -1) {
          // Increase window to 2500 chars to ensure we reach the "X.X.X.4" point (theory/practice split)
          const start = Math.max(0, idx - 300);
          const end = Math.min(pttText.length, idx + 2500);
          contextParts.push(`[${subject.name} részletei]:\n${pttText.substring(start, end)}`);
        }
      }
      // Use more context, but keep it within reasonable token limits for gpt-4o-mini
      pttContext = contextParts.slice(0, 15).join('\n---\n'); 
    }

    const prompt = `
Te egy PTT (Programtanterv) elemző szakértő vagy. 
Szakma: ${professionName}
Választott képzési forma: ${trainingFormat === '3year' ? '3 ÉVES (nappali tagozat)' : '2 ÉVES (felnőttképzés/rövidített)'}

DOKUMENTUM FELÉPÍTÉSE (FONTOS):
1. A PTT elején van egy táblázat, ahol több oszlopban is szerepelnek óraszámok. 
   - HA "3year": HASZNÁLD AZ ELSŐ "ÖSSZES ÓRASZÁM" OSZLOPOT (általában a 3. v. 4. numerikus oszlop).
   - HA "2year": HASZNÁLD AZ UTOLSÓ "ÖSSZES ÓRASZÁM" OSZLOPOT (a táblázat jobb szélén).
2. A tantárgyak leírásánál az óraszámok gyakran "X/Y" formátumban vannak (pl. 190/217). 
   - HA "3year": MINDIG AZ ELSŐ ÉRTÉKET VEDD FIGYELEMBE (X).
   - HA "2year": MINDIG A MÁSODIK ÉRTÉKET VEDD FIGYELEMBE (Y).
3. A tantárgyaknál az "X.X.X.4" pontban (pl. 3.3.1.4) szerepel a gyakorlati arány (pl. "legalább 50%-át gyakorlati helyszínen...").

FELADAT:
Minden tantárgyhoz állapítsd meg az ELMÉLETI (theoryRatio) és GYAKORLATI (practicalRatio) óraszám-ARÁNYT (0.0 – 1.0 között) a választott képzési forma (${trainingFormat}) alapján.
- theoryRatio: az elméleti oktatás aránya (0.0 - 1.0)
- practicalRatio: a gyakorlati oktatás aránya (0.0 - 1.0)

FONTOS RENDKÍVÜLI UTASÍTÁS A FELCSERÉLŐDÉS ELKERÜLÉSÉRE:
A magyar programtantervben (PTT) az Elméleti oktatás aránya/óraszáma mindig az ELSŐ helyen szerepel, a Gyakorlati oktatás pedig a MÁSODIKON!
Például:
- Ha a szöveg azt írja: "Elmélet: 30%, Gyakorlat: 70%" -> "theoryRatio": 0.3, "practicalRatio": 0.7
- Ha a szöveg azt írja: "Gyakorlat: legalább 60%" -> "theoryRatio": 0.4, "practicalRatio": 0.6
- Ha az óraszámok eloszlása pl. "120 óra elmélet és 280 óra gyakorlat" -> "theoryRatio": 0.3, "practicalRatio": 0.7
MINDIG ellenőrizd le kétszer is, hogy nem cserélted-e fel az elméleti (theoryRatio) és gyakorlati (practicalRatio) arányokat!

SZABÁLYOK:
1. Elsősorban a tantárgy részletes leírásában (X.X.X.4 pont) keresd a "%-os" arányt!
2. Ha ott nincs adat, nézd a PTT eleji összefoglaló táblázat megfelelő oszlopát (${trainingFormat}).
3. Ha végképp nincs adat, nézd az elméleti és gyakorlati modulok arányát a DB adatokban.
4. Válaszolj CSAK valid JSON-nel.

TANTÁRGYAK (DB adatok):
${subjectSummary}

PTT SZÖVEG (releváns részletek):
${pttContext || '(nem elérhető)'}

VÁLASZ:
{
  "subjects": [
    { "name": "Tantárgy neve", "theoryRatio": 0.3, "practicalRatio": 0.7 }
  ]
}
`.trim();

    let aiRatios: { name: string; theoryRatio: number; practicalRatio: number }[] = [];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'PTT elemző vagy. Csak valid JSON-t adsz vissza.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      });
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      aiRatios = parsed.subjects || [];
      console.log(`[generateHoursFromPtt] AI ${aiRatios.length} tantárgyhoz adott arányt.`);
    } catch (err) {
      console.error('[generateHoursFromPtt] AI hiba, fallback módra váltás:', err);
    }

    // ── 3. Distribute hours per module ──
    const result: { moduleId: number; hours: number }[] = [];

    for (const subject of subjects) {
      const theoryModules = subject.modules.filter(m => m.type === 'theory');
      const practicalModules = subject.modules.filter(m => m.type === 'practical');
      const totalModules = subject.modules.length;

      if (totalModules === 0) continue;

      // Determine total hours: DB value preferred, fallback: 2 óra/modul becsléssel
      const totalHours = subject.hours || (totalModules * 2);

      // Determine practical ratio
      const normalize = (n: string) => n.toLowerCase()
        .replace(/tantárgy/g, '')
        .replace(/gyakorlat/g, '')
        .replace(/elmélet/g, '')
        .replace(/[^a-z0-9áéíóöőuúüű]/g, '')
        .trim();

      const subjectNorm = normalize(subject.name);
      const aiEntry = aiRatios.find(r => r.name && normalize(r.name) === subjectNorm);
      let practicalRatio: number;
      if (aiEntry !== undefined) {
        const pRatio = Math.max(0, Math.min(1, aiEntry.practicalRatio));
        const tRatio = Math.max(0, Math.min(1, aiEntry.theoryRatio ?? (1 - pRatio)));
        
        // Normalize the ratios to sum to exactly 1.0
        const sum = pRatio + tRatio;
        if (sum > 0) {
          practicalRatio = pRatio / sum;
        } else {
          practicalRatio = 0.5;
        }
      } else {
        // Fallback: use module type ratio
        practicalRatio = totalModules > 0 ? practicalModules.length / totalModules : 0.5;
      }

      const practicalHours = Math.round(totalHours * practicalRatio);
      const theoryHours = totalHours - practicalHours;

      // Distribute evenly within type
      if (theoryModules.length > 0 && theoryHours > 0) {
        const perTheory = Math.round((theoryHours / theoryModules.length) * 2) / 2;
        for (const m of theoryModules) {
          result.push({ moduleId: m.id, hours: perTheory });
        }
      }

      if (practicalModules.length > 0 && practicalHours > 0) {
        const perPractical = Math.round((practicalHours / practicalModules.length) * 2) / 2;
        for (const m of practicalModules) {
          result.push({ moduleId: m.id, hours: perPractical });
        }
      }
    }

    console.log(`[generateHoursFromPtt] ${result.length} modul kapott óraszámot.`);
    return result;
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

  buildExtractionPrompt(chunk: string, tableContext: string, importType: 'theory' | 'practical' | 'both' = 'both'): string {
    const typeFocus = importType === 'theory' ? 'CSAK AZ ELMÉLETI' : importType === 'practical' ? 'CSAK A GYAKORLATI' : 'AZ ÖSSZES';
    
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. A feladatod a szakmai tartalom kinyerése és SZAKMAI BŐVÍTÉSE/FELBONTÁSA az 1 TANÓRA = 1 MODUL elv alapján.
Most kifejezetten ${typeFocus} tananyagrészekre kell fókuszálnod.

── KÉTOLDALÚ KINYERÉSI STRATÉGIA (KÖTELEZŐ) ──
A kinyerés során össze KELL hangolnod a PTT összesítő táblázatát a részletes szöveges leírással:
1. TÁBLÁZAT KÖRNYEZET (Témakörök és Óraszámok): Olvasd el a kapott TÁBLÁZAT KÖRNYEZETET, és keresd meg a chunk-ban lévő tantárgyhoz tartozó témakörök óraszámait (N).
2. SZÖVEGES RÉSZ (Kulcsszavak és Részletek): Keresd meg a tantárgy témaköreit (pl. 3.1.1.6 A tantárgy témakörei).
3. 1-ÓRÁS GRANULÁRIS FELBONTÁS:
   - Minden egyes témakörhöz (pl. 3.1.1.6.1 Álláskeresés, melynek óraszáma a táblázatban N = 5 óra) PONTOSAN N darab önálló, 1-órás almodult kell generálnod!
   - Csoportosítsd és oszd el a témakör alatti kulcsszavakat, felsorolásokat pontosan N darab egyenletes és szakmailag koherens leckére.
   - Ha a forrásszöveg rövid, de az óraszám magas (pl. 3 óra), akkor se vonj össze modulokat! Ehelyett bontsd fel a meglévő témákat mélyebb elméleti vagy gyakorlati szempontok szerint (pl. alapfogalmak, részletes ipari szabályok, esettanulmányok).

── ELMÉLET ÉS GYAKORLAT TÍPUSÚ SZÉTVÁLASZTÁS ──
- Keresd meg a tantárgy alatti ".4"-es pontot (pl. 3.1.1.4).
- Ha a gyakorlati százalék 0% (pl. "legalább 0%-át gyakorlati helyszínen..."), akkor a tantárgy 100% ELMÉLET (theory). Minden modulja "theory" típusú legyen!
- Ha a gyakorlati százalék nagyobb mint 0% (pl. 50%), akkor a tantárgy elméleti és gyakorlati moduljai külön válnak (lásd a typeFocus szűrést).

── FONTOS: ÓRASZÁMOK PONTOS MEGHATÁROZÁSA ÉS A FELCSERÉLÉS ELKERÜLÉSE ──
A magyar programtantervben (PTT) az Elméleti oktatás óraszáma/aránya mindig az ELSŐ helyen szerepel, a Gyakorlati oktatás pedig a MÁSODIKON!
Például:
- Ha a táblázatban pl. '90 / 210' van, vagy két oszlopban '90' és '210' szerepel -> "theoryHours": 90, "practicalHours": 210
- Ha a szöveg azt írja: "Elmélet: 30 óra, Gyakorlat: 70 óra" -> "theoryHours": 30, "practicalHours": 70
MINDIG ellenőrizd le kétszer is, hogy nem cserélted-e fel az elméleti (theoryHours) és gyakorlati (practicalHours) óraszámokat!

── KÓDOLÁS ÉS CÍMEK ──
- A "sectionCode" végére fűzz ABC sorrendben betűket a felosztott 1-órás moduloknál: 3.1.1.6.1.a, 3.1.1.6.1.b, 3.1.1.6.1.c, stb.
- A modulok címe legyen pontos, szakmai és diák-központú (pl. "Álláskeresés - 1. rész: Karriertervezés").

TÁBLÁZAT KÖRNYEZET (Témakörök óraszámaival):
${tableContext}

ELEMEZENDŐ SZÖVEG:
${chunk}

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "code": "3.X.X",
      "totalHours": 100,
      "theoryHours": 30,
      "practicalHours": 70,
      "practicalPercent": 70,
      "modules": [
        { "title": "Álláskeresés - 1. rész: Karriertervezés", "type": "theory", "sectionCode": "3.1.1.6.1.a" },
        { "title": "Álláskeresés - 2. rész: Munkaerőpiac", "type": "theory", "sectionCode": "3.1.1.6.1.b" }
      ]
    }
  ]
}
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
   - A "content" mezőbe írj 5-6 mondatos, részletes szakmai magyarázatot.
   - Összpontosíts a fogalmakra, összefüggésekre, technikai adatokra és szabályokra.
   - Használj szakmailag pontos terminológiát.
   - A "practicalTasks" mező KÖTELEZŐEN ÜRES lista maradjon: [].

2. HA A MODUL [PRACTICAL] (Gyakorlat):
   - A "content" mezőbe írj egy rövid (max 3 mondat) szakmai bevezetőt a feladat konkrét céljáról és az elsajátítandó szakmai fogásokról.
   - A "practicalTasks" mezőbe generálj pontosan 6-8 konkrét, szakmailag szigorúan egymásra épülő, lépcsőzetesen felépülő gyakorlati feladatot (instrukciót), amelyek egy valós ipari munkafolyamatot (workflow) követnek:
     * 1. Lépés: Előkészítés és munkavédelem (egyéni védőeszközök kiválasztása, munkaterület, szerszámok és anyagok ellenőrzése).
     * 2. Lépés: Mérési, előrajzolási, kalibrálási vagy gépbeállítási paraméterek meghatározása (pl. anyagelőkészítés).
     * 3-5. Lépés: Technológiai főműveletek végrehajtása (cselekvés-orientált, szakmailag precíz lépések, pl. megmunkálás, hegesztés, vezetékezés, programozás, hibakeresés).
     * 6. Lépés: Utóműveletek (pl. sorjázás, tisztítás, rögzítés, felületkezelés, összeszerelés).
     * 7. Lépés: Minőségellenőrzés és mérés (dimenziók, tűréshatárok, tömítettség vagy működés ellenőrzése és mérése).
     * 8. Lépés: Rendrakás és szakmai adminisztráció (szerszámok elrakása, hulladékkezelés, munkalap vagy jegyzőkönyv kitöltése).
   - Mindegyik feladat legyen cselekvés-orientált, felszólító módban megfogalmazva (pl. "Állítsa be a nyomást...", "Végezze el a...", "Mérje meg a..."), kerülve a felesleges elméletet vagy elnagyolt instrukciókat. Just return the array of these tasks.

── SZIGORÚ TILALOM ──
- NE keverd az elméleti magyarázatot a gyakorlati feladatokkal!
- Kerüld a pedagógiai sallangokat (pl. "A tanuló képes lesz...").
- Ne legyen túl tömör, de ne is legyen feleslegesen bőbeszédű.

── MATEMATIKAI KÉPLETEK FORMÁTUMA ──
- Minden matematikai képletet és fizikai egyenletet KÖTELEZŐEN standard LaTeX formátumban írj!
- Blokkszintű (külön sorba kerülő) képleteknél használd a dupla dollárjelet: $$ képlet $$ (pl. $$ U = I \times R $$).
- Szövegközi (inline) képleteknél használd az egyetlen dollárjelet: $ képlet $ (pl. $ I = \frac{U}{R} $).
- Szigorúan kerüld a zárójeles képlethelyettesítéseket, mint pl. "( ( V = I \cdot R )" vagy más nem szabványos megoldásokat!

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

  getSubjectPttText(subName: string, fullText: string): string {
    if (!fullText) return '';
    
    // Clean suffixes like 'gyakorlat' or 'elmélet' from name
    const cleanName = subName
      .replace(/\s*gyakorlat\s*$/i, '')
      .replace(/\s*elmélet\s*$/i, '')
      .trim();
      
    const nameLower = cleanName.toLowerCase();
    let idx = fullText.toLowerCase().indexOf(nameLower);
    
    // If not found, try a shorter prefix (e.g. first 12 characters)
    if (idx === -1 && cleanName.length > 12) {
      idx = fullText.toLowerCase().indexOf(nameLower.substring(0, 12));
    }
    
    if (idx === -1) {
      console.warn(`[getSubjectPttText] Subject "${subName}" (cleaned: "${cleanName}") not found in PTT. Using first 15k chars.`);
      return fullText.substring(0, 15000);
    }
    
    // Find the next subject index or use a default window size
    const searchRange = fullText.substring(idx + cleanName.length);
    // Look for next heading of form X.Y.Z
    const nextHeadingMatch = searchRange.match(/\n\s*\d+\.\d+\.\d+/);
    
    let endIdx = fullText.length;
    if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
      endIdx = idx + cleanName.length + nextHeadingMatch.index;
    } else {
      // Fallback safe window: 15,000 characters is more than enough for one subject's text
      endIdx = Math.min(fullText.length, idx + 15000);
    }
    
    const startIdx = Math.max(0, idx - 300); // include a bit of prefix context
    return fullText.substring(startIdx, endIdx);
  }

  buildWorkshopActivityExtractionPrompt(chunk: string): string {
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. 
A feladatod, hogy kigyűjts MINDEN gyakorlati, műhelyben elvégezhető tevékenységet, feladatot és követelményt a megadott szövegből.

── SZABÁLYOK ──
1. Csak a VALÓDI, fizikai, kézzel fogható műhelygyakorlathoz kapcsolódó tevékenységeket gyűjtsd ki (pl. mérések, fűrészelés, hegesztés, vezetékezés, hibakeresés, beállítások, szerszámhasználat).
2. Könyörtelenül szűrj ki minden pedagógiai sallangot (pl. "a tanuló ismeri...", "képes megérteni...") és elméleti leírást.
3. A kigyűjtött elemeket egy tömör, világos listaként add vissza.

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "rawActivities": [
    "Első kigyűjtött műhelytevékenység leírása...",
    "Második kigyűjtött műhelytevékenység leírása..."
  ]
}

ELEMEZENDŐ SZÖVEG:
${chunk}
`.trim();
  }

  buildWorkshopDaySizingPrompt(subjectName: string, rawActivities: string[]): string {
    return `
Te egy zseniális SZAKOKTATÓ és gyakorlati tanmenet-tervező vagy.
Kaptál egy listát, ami egy adott tantárgyhoz kigyűjtött nyers műhelytevékenységeket tartalmazza.

Tantárgy: ${subjectName}

── FELADAT ──
1. Csoportosítsd és strukturáld ezeket a tevékenységeket egymásra épülő, szekvenciális egységekre (modulokra).
2. **KÖTELEZŐ 1 NAPOS MÉRETEZÉS**: Minden egyes egység (modul) pontosan akkora méretű legyen, amit egy tanuló **1 műhelygyakorlati nap (kb. 6-8 óra gyakorlat)** alatt reálisan meg tud tanulni és el tud végezni a műhelyben!
3. Adj minden napnak egy vonzó, szakmailag pontos "Nap [X]: [Cím]" formátumú nevet (pl. "1. nap: Kéziszerszámok biztonságos használata és fémfűrészelés alapjai").
4. A válaszként kapott modulok sora egy tökéletes, logikusan egymásra épülő napi tanmenetet alkosson.

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "modules": [
    {
      "title": "1. nap: Kéziszerszámok biztonságos használata és fémfűrészelés alapjai",
      "type": "practical",
      "sectionCode": "nap-1",
      "activities": [
        "Nyers műhelytevékenység leírása..."
      ]
    }
  ]
}

NYERS MŰHELYTEVÉKENYSÉGEK LISTÁJA:
${rawActivities.map((act, i) => `${i + 1}. ${act}`).join('\n')}
`.trim();
  }

  buildPracticalDayContentPrompt(professionName: string, subjectName: string, moduleTitle: string, activities: string[]): string {
    return `
Te egy profi szakoktató és gyakorlati tananyagfejlesztő vagy. 
Generálj részletes gyakorlati útmutatót tanulók számára egy adott gyakorlati naphoz (műhelynaphoz).

Szakma: ${professionName}
Tantárgy: ${subjectName}
Gyakorlati nap címe: ${moduleTitle}

── FELADAT ──
Írj egy alapos, cselekvés-orientált gyakorlati útmutatót az alábbi SZIGORÚ szabályok szerint:

1. A "content" mezőbe írj egy rövid (max 3-4 mondat) szakmai bevezetőt és motivációt a mai műhelygyakorlat céljáról, a használandó főbb berendezésekről és a megszerezhető szakmai készségekről.
2. A "practicalTasks" mezőbe generálj pontosan 6-8 konkrét, szakmailag szigorúan egymásra épülő gyakorlati feladatot (instrukciót), amelyek lefedik a mai napra kijelölt tevékenységeket, és egy valós ipari munkafolyamatot (workflow) követnek:
   - 1. Lépés: Előkészítés és munkavédelem (egyéni védőeszközök (EVE) ellenőrzése, munkaterület biztonságossá tétele, szerszámok és anyagok előkészítése).
   - 2. Lépés: Mérési, előrajzolási, kalibrálási vagy gépbeállítási paraméterek meghatározása (pl. anyagelőkészítés).
   - 3-5. Lépés: Technológiai főműveletek végrehajtása (cselekvés-orientált, szakmailag precíz lépések, pl. megmunkálás, hegesztés, vezetékezés, programozás, hibakeresés).
   - 6. Lépés: Utóműveletek (pl. sorjázás, tisztítás, rögzítés, felületkezelés, összeszerelés).
   - 7. Lépés: Minőségellenőrzés és mérés (dimenziók, tűréshatárok, működés ellenőrzése).
   - 8. Lépés: Rendrakás és szakmai adminisztráció (szerszámok elrakása, hulladékkezelés, munkalap vagy jegyzőkönyv kitöltése).
3. Mindegyik feladat legyen cselekvés-orientált, felszólító módban megfogalmazva (pl. "Állítsa be...", "Végezze el...", "Mérje meg..."), kerülve a felesleges elméletet.

── MATEMATIKAI KÉPLETEK FORMÁTUMA ──
- Minden matematikai képletet és fizikai egyenletet KÖTELEZŐEN standard LaTeX formátumban írj!
- Blokkszintű (külön sorba kerülő) képleteknél használd a dupla dollárjelet: $$ képlet $$ (pl. $$ U = I \times R $$).
- Szövegközi (inline) képleteknél használd az egyetlen dollárjelet: $ képlet $ (pl. $ I = \frac{U}{R} $).
- Szigorúan kerüld a zárójeles képlethelyettesítéseket, mint pl. "( ( V = I \cdot R )" vagy más nem szabványos megoldásokat!

KIJELÖLT NAPI TEVÉKENYSÉGEK:
${activities.map((act, i) => `- ${act}`).join('\n')}

VÁLASZ (JSON):
{
  "content": "A mai műhelynap célja...",
  "practicalTasks": [
    "1. Lépés: ...",
    "2. Lépés: ...",
    "3. Lépés: ...",
    "4. Lépés: ...",
    "5. Lépés: ...",
    "6. Lépés: ...",
    "7. Lépés: ...",
    "8. Lépés: ..."
  ]
}
`.trim();
  }

  async structureCurriculum(_professionName: string, _kkkText: string, chunk: string, importType?: 'theory' | 'practical' | 'both'): Promise<string> {
    return this.buildExtractionPrompt(chunk, '', importType);
  }
}

export const ikkService = new IKKService();
