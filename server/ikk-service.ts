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
      try { kkkTextRaw = await this.getPdfText(kkkAttachment.media_id); } catch (e) { }
    }

    let pttTextRaw = '';
    if (pttAttachment?.media_id) {
      try { pttTextRaw = await this.getPdfText(pttAttachment.media_id); } catch (e) { }
    }

    return {
      kkkText: this.preprocessText(kkkTextRaw || ''),
      pttText: this.preprocessText(pttTextRaw || '')
    };
  }

  /**
   * 1. LÉPÉS: Tantárgyak kigyűjtése óraszámokkal a PTT-ből.
   *
   * Az AI a PTT szöveg és a táblázati környezet alapján meghatározza
   * minden tantárgy elméleti és gyakorlati óraszámait (theoryHours, practicalHours).
   * NEM generál modulokat ebben a lépésben!
   *
   * @param professionName Szakma neve
   * @param pttText        A PTT dokumentum teljes szövege
   * @param subjects       Tantárgyak listája (id, name, code, hours)
   * @param trainingFormat '3year' vagy '2year'
   * @returns              Tantárgyanként az elméleti/gyakorlati óraszámok
   */
  async extractSubjectHours(
    professionName: string,
    pttText: string,
    subjects: { id: number; name: string; code?: string | null; hours?: number | null }[],
    trainingFormat: '3year' | '2year' = '3year'
  ): Promise<{ id: number; name: string; code: string; theoryHours: number; practicalHours: number }[]> {
    if (subjects.length === 0) return [];

    const { getOpenAIClient } = await import('./openai');
    const openai = await getOpenAIClient();

    const subjectSummary = subjects.map(s =>
      `- Kód: "${s.code ?? '?'}" | Név: "${s.name}" | Összóra: ${s.hours ?? '?'}`
    ).join('\n');

    // Build PTT context (first 4000 chars + subject-relevant sections)
    let pttContext = '';
    if (pttText) {
      const contextParts: string[] = [];
      contextParts.push(`[PTT ÖSSZESÍTŐ TÁBLÁZAT ÉS FEJLÉC]:\n${pttText.substring(0, 8000)}`);

      for (const subject of subjects) {
        const idx = pttText.toLowerCase().indexOf(subject.name.toLowerCase().substring(0, 20));
        if (idx !== -1) {
          const start = Math.max(0, idx - 300);
          const end = Math.min(pttText.length, idx + 2500);
          contextParts.push(`[${subject.name} részletei]:\n${pttText.substring(start, end)}`);
        }
      }
      pttContext = contextParts.slice(0, 15).join('\n---\n');
    }

    const prompt = `Te egy professzionális magyar szakképzési PTT (Programtanterv) és KKK dokumentum-elemző automatizált mérnök vagy. A feladatod, hogy a megadott PTT szöveg és táblázati adatok alapján kigyűjtsd a tantárgyakat, és pontosan meghatározd azok elméleti és gyakorlati óraszámait.

BEMENETI PARAMÉTEREK:
- Szakma neve: ${professionName}
- Választott képzési forma: ${trainingFormat} // Értékei: '3year' (3 éves nappali tagozat) VAGY '2year' (2 éves felnőttképzés/rövidített)

MÓDSZERTANI ÉS PRECIZITÁSI SZABÁLYOK:

1. OSZLOP-MEGFELELTETÉS A PTT ÖSSZESÍTŐ TÁBLÁZATÁBAN:
   A PTT elején található összesítő táblázat két fő blokkra oszlik (bal oldal: nappali, jobb oldal: felnőttképzés).
   - HA '3year': A bal oldali blokkot használd (1/9, 2/10, 3/11 évfolyamok). Keresd meg a tantárgy sorában az első "A képzés összes óraszáma" oszlopot!
   - HA '2year': A jobb oldali blokkot használd (1. évf, 2. évf). Keresd meg a tantárgy sorában az utolsó, jobb szélső "A képzés összes óraszáma" oszlopot!

2. AZ ÓRASZÁMOK MEGHATÁROZÁSÁNAK SZIGORÚ PRIORITÁSI SORRENDJE:
   - 1. Prioritás: Keresd meg a tantárgy részletes leírásában az "X.X.X.4" alpontot (pl. 3.3.1.4 "A képzés órakeretének legalább..."). Ha itt fix százalék szerepel (pl. legalább 50% gyakorlat vagy legalább 70%), akkor a teljes óraszámot oszd fel ennek megfelelően! Ha pl. "legalább 50%" gyakorlat, akkor practicalHours = totalHours * 0.50, theoryHours = totalHours - practicalHours.
   - FONTOS: Az X.X.X.4 pont kizárólag a tantárgy RÉSZLETES LEÍRÁSÁBAN található (a 3.X.X.1 - 3.X.X.8 pontok között), nem az összesítő táblázatban. Keresd meg a tantárgy neve után rögtön a "3.3.1.4" vagy hasonló formátumú pontot. FIGYELEM: a PTT-ben a kódok mélyebbek lehetnek, pl. 3.3.1, 4.2.1 stb.!
   - Ha a kód 3.1 vagy 4.1 (2 számjegy), az a PTT-ben 3.3.1 vagy 4.2.1 lehet (3 számjegy) - keresd a tantárgy NEVE alapján!
   - 2. Prioritás: Ha a szövegben az óraszámok "X/Y" formátumban vannak (pl. "190/217 óra"):
     * HA '3year': Az ELSŐ érték (X) a mérvadó összóraszám.
     * HA '2year': A MÁSODIK érték (Y) a mérvadó összóraszám.

3. STRATÉGIAI UTASÍTÁS A FELCSERÉLŐDÉS ELKERÜLÉSÉRE:
   A magyar szakképzésben a jelölési sorrend és a táblázati struktúra MINDIG: [ELMÉLET] / [GYAKORLAT]. Az elmélet az első, a gyakorlat a második helyen áll!
   - "Elmélet: 40 óra, Gyakorlat: 60 óra" -> "theoryHours": 40, "practicalHours": 60
   - Ha a tantárgy tisztán elméleti (pl. Munkavállalói ismeretek, ahol a gyakorlat 0%) -> "theoryHours": 18, "practicalHours": 0

KIMENETI FORMÁTUM:
Kizárólag érvényes, tiszta JSON objektumot adj vissza, mindenféle bevezető szöveg vagy markdown (\` \`\`\`json \`) formázás nélkül!

TANTÁRGYAK (ADATBÁZIS ADATOK):
${subjectSummary}

PTT FORRÁSSZÖVEG (KONTEXTUS) - itt keresd a tantárgy részletes leírását és a X.X.X.4 pontot:
${pttContext || '(nem elérhető)'}

VÁLASZ SCHEMÁJA:
{
  "subjects": [
    {
      "code": "A tantárgy pontos PTT kódja, pl: 3.3.1",
      "name": "A tantárgy pontos neve a PTT-ből",
      "theoryHours": 0,
      "practicalHours": 0
    }
  ]
}`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'PTT elemző vagy. Csak valid JSON-t adsz vissza theoryHours és practicalHours mezőkkel.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }, { timeout: 120000 });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      const aiSubjects: { code?: string; name: string; theoryHours?: number; practicalHours?: number }[] = parsed.subjects || [];

      // Map AI results back to our subjects by code/name matching
      const result = subjects.map(sub => {
        const aiSub = aiSubjects.find(a =>
          (a.code && sub.code && a.code.trim().replace(/\.$/, '') === sub.code.trim().replace(/\.$/, '')) ||
          (a.name && a.name.toLowerCase().trim() === sub.name.toLowerCase().trim())
        );
        return {
          id: sub.id,
          name: sub.name,
          code: sub.code || aiSub?.code || '',
          theoryHours: aiSub?.theoryHours ?? Math.round((sub.hours || 0) * 0.5),
          practicalHours: aiSub?.practicalHours ?? Math.round((sub.hours || 0) * 0.5)
        };
      });

      console.log(`[extractSubjectHours] AI ${result.filter(r => r.theoryHours > 0 || r.practicalHours > 0).length} tantárgyhoz adott óraszámot.`);
      return result;
    } catch (err) {
      console.error('[extractSubjectHours] AI hiba, fallback módra váltás:', err);
      // Fallback: distribute total hours 50-50
      return subjects.map(sub => ({
        id: sub.id,
        name: sub.name,
        code: sub.code || '',
        theoryHours: Math.round((sub.hours || 10) * 0.5),
        practicalHours: Math.round((sub.hours || 10) * 0.5)
      }));
    }
  }

  /**
   * 2. LÉPÉS: Modulok bontása egy adott tantárgyhoz.
   *
   * Az AI megkapja a tantárgy tiszta elméleti és gyakorlati óraszámait,
   * majd felbontja modulokra: 1 óra elmélet = 1 modul, 7 óra gyakorlat = 1 modul (műhelynap).
   *
   * @param professionName Szakma neve
   * @param subjectName    Tantárgy neve
   * @param subjectCode    Tantárgy PTT kódja
   * @param theoryHours    Elméleti óraszám
   * @param practicalHours Gyakorlati óraszám
   * @param pttChunk       A tantárgyhoz tartozó PTT szövegrészlet
   * @param importType     'theory' | 'practical' | 'both'
   * @returns              Generált modulok listája
   */
  async generateModulesForSubject(
    professionName: string,
    subjectName: string,
    subjectCode: string,
    theoryHours: number,
    practicalHours: number,
    pttChunk: string,
    importType: 'theory' | 'practical' | 'both' = 'both'
  ): Promise<{ title: string; type: 'theory' | 'practical'; sectionCode: string }[]> {
    const { getOpenAIClient } = await import('./openai');
    const openai = await getOpenAIClient();

    const typeFocus = importType === 'theory' ? 'CSAK AZ ELMÉLETI' : importType === 'practical' ? 'CSAK A GYAKORLATI' : 'AZ ÖSSZES';

    const prompt = `Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. A feladatod a szakmai tartalom kinyerése és SZAKMAI BŐVÍTÉSE az 1 TANÓRA = 1 MODUL (elméletnél) és 1 MŰHELYNAP = 7 ÓRA (gyakorlatnál) elv alapján.

Most kifejezetten ${typeFocus} tananyagrészekre kell fókuszálnod.

── EXTRAKCIÓS ÉS FELBONTÁSI STRATÉGIA (KÖTELEZŐ) ──

A PTT szövegben keresd meg a "X.X.X.6 A tantárgy témakörei" pontot (pl. 3.3.1.6). Ez a pont felsorolja a témaköröket és azok óraszámait (pl. "Villamos áramkör 36 óra" vagy "Villamos áramkör 36").

FONTOS SZABÁLYOK:

1. ELMÉLETI MODULOK BONTÁSA:
   - Minden egyes témakörhöz annyi modult generálj, amennyi a témakör óraszáma (1 óra = 1 modul).
   - Például ha a témakör "Villamos áramkör" és 36 óra, akkor 36 darab modult generálj!
   - Ha a forrásszöveg rövid, akkor a témát szakmailag bontsd fel mélyebb szempontok szerint (Alapfogalmak -> Eszközök és gépek -> Technológiai folyamat -> Minőségellenőrzés).
   - Az elméleti összóraszám: ${theoryHours} óra. Ennyi modult kell generálnod összesen!

2. GYAKORLATI MODULOK BONTÁSA:
   - **7 óra gyakorlat = 1 komplex modul (Műhelynap)** elvet alkalmazz!
   - ${Math.ceil(practicalHours / 7)} darab műhelynapot generálj.
   - A gyakorlati témakörök kulcsszavait úgy csoportosítsd, hogy egy modul egy teljes 7 órás összefüggő műhelygyakorlati napot fedjen le.
   - A gyakorlati összóraszám: ${practicalHours} óra.

3. KÓDOLÁS ÉS CÍMEZÉS:
   - A "sectionCode" végére fűzz ABC sorrendben betűket: ${subjectCode}.6.1.a, ${subjectCode}.6.1.b, stb.
   - A modulok címe legyen pontos, iparágilag szabványos és diák-központú.

TANTÁRGY ADATAI:
- Név: ${subjectName} (${subjectCode})
- Elmélet: ${theoryHours} óra (ennél több modult NE generálj!)
- Gyakorlat: ${practicalHours} óra (ennél több modult NE generálj!)
- Generálandó elméleti modulok száma: ${theoryHours} db
- Generálandó gyakorlati modulok száma: ${Math.ceil(practicalHours / 7)} db

ELEMEZENDŐ SZÖVEG (PTT RÉSZLET) - itt keresd a X.X.X.6 pontot és a témaköröket:
${pttChunk || '(nem elérhető)'}

VÁLASZ FORMÁTUMA (SZIGORÚ RAW JSON):
{
  "modules": [
    { "title": "Szakmai témakör - 1. rész: Bevezetés és alapfogalmak", "type": "theory", "sectionCode": "${subjectCode}.6.1.a" },
    { "title": "Szakmai gyakorlat - 1. műhelynap: Alapműveletek végrehajtása", "type": "practical", "sectionCode": "${subjectCode}.6.2.a" }
  ]
}`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Te egy szigorú tanmenet-tervező vagy. Csak valid JSON-t adsz vissza.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }, { timeout: 120000 });

      const data = JSON.parse(response.choices[0].message.content || '{"modules":[]}');
      const modules = (data.modules || []) as { title: string; type: 'theory' | 'practical'; sectionCode: string }[];

      // Filter by importType
      const filtered = modules.filter(m => {
        if (importType === 'theory') return m.type === 'theory';
        if (importType === 'practical') return m.type === 'practical';
        return true;
      });

      console.log(`[generateModulesForSubject] ${filtered.length} modul generálva a(z) "${subjectName}" tantárgyhoz.`);
      return filtered;
    } catch (err) {
      console.error(`[generateModulesForSubject] AI hiba a(z) "${subjectName}" tantárgynál:`, err);
      return [];
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

  /**
   * PTT felbontása fő szekciókra a számozott fejezetcímek (3.3, 3.4, 4.1 stb.) alapján.
   *
   * A magyar PTT dokumentumokban a tantárgyak 3-szintű számozással vannak:
   * - 1. szint: 2. A KÉPZÉS SZERKEZETE (fő fejezet)
   * - 2. szint: 3.3.1 Tantárgy neve (tantárgy szint)
   * - 3. szint: 3.3.1.1, 3.3.1.2 stb. (tantárgy részletei)
   *
   * Ez a metódus a 2. szintnél (X.X.X) vágja el a szöveget,
   * így minden szekció pontosan egy tantárgyat tartalmaz.
   */
  splitPttIntoSubjectSections(text: string): { code: string; name: string; content: string }[] {
    if (!text) return [];

    const sections: { code: string; name: string; content: string }[] = [];

    // Keressük a "X.X.X Tantárgy név" mintát, ahol X szám
    // A tantárgy kódok általában 3 számjegyből állnak (pl. 3.3.1, 4.2.1)
    const subjectRegex = /\b(\d+\.\d+\.\d+)\s+([A-ZÁÉÍÓÖŐUÚÜŰ][A-ZÁÉÍÓÖŐUÚÜŰa-záéíóöőuúüű][^\n]*?(?:tantárgy|ismeretek|alapjai|gyakorlat|nyelv|technika|technológia|mérések|készítés|megmunkálás|szerelés|karbantartás|javítás|üzemeltetés|minőség|vizsgálat|dokumentáció)[^\n]*)/i;

    // Alternative: split by numbered headings that look like subject starts
    // A tantárgyak általában a 3.X.1 - 3.X.2 stb. formátumot követik
    const sectionStarts: { index: number; code: string; name: string }[] = [];

    // Find all potential subject headings (3-digit codes, e.g. 3.3.1, 4.2.1, 5.1.1)
    const headingRegex = /\n\s*(\d+\.\d+\.\d+)\s+([A-ZÁÉÍÓÖŐUÚÜŰ][^\n]{5,}?)(?:\s*\n|$)/g;
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      const code = match[1];
      const name = match[2].trim();

      // Only include sections that look like subjects (not sub-points like X.X.X.1, X.X.X.2)
      // A tantárgy kódja pontosan 3 számjegyből áll, pl. 3.3.1, 4.2.1
      const codeParts = code.split('.');
      if (codeParts.length === 3) {
        sectionStarts.push({
          index: match.index,
          code,
          name
        });
      }
    }

    // If we found sections, split the text by them
    if (sectionStarts.length === 0) {
      // Fallback: split by major sections (2-digit codes like 3.3, 4.1)
      const fallbackRegex = /\n\s*(\d+\.\d+)\s+([A-ZÁÉÍÓÖŐUÚÜŰ][^\n]{5,}?)(?:\s*\n|$)/g;
      while ((match = fallbackRegex.exec(text)) !== null) {
        sectionStarts.push({
          index: match.index,
          code: match[1],
          name: match[2].trim()
        });
      }
    }

    // Build sections from the found headings
    for (let i = 0; i < sectionStarts.length; i++) {
      const start = sectionStarts[i].index;
      const end = (i + 1 < sectionStarts.length) ? sectionStarts[i + 1].index : text.length;
      const content = text.substring(start, end).trim();

      // Skip very short sections (likely not real subjects) and the introductory part
      const skipPatterns = ['oldal', 'oldal', 'tartalomjegyzék', 'Tartalomjegyzék', 'ábra', 'Ábra'];
      const shouldSkip = skipPatterns.some(p => sectionStarts[i].name.toLowerCase().includes(p.toLowerCase()));

      if (content.length > 200 && !shouldSkip) {
        sections.push({
          code: sectionStarts[i].code,
          name: sectionStarts[i].name,
          content
        });
      }
    }

    // Also include the beginning of the document (first 5000 chars - contains the summary table)
    const introSection = {
      code: '0',
      name: 'Összesítő táblázat és bevezető',
      content: text.substring(0, 5000)
    };
    sections.unshift(introSection);

    console.log(`[splitPttIntoSubjectSections] ${sections.length} szekcióra bontva a PTT.`);
    return sections;
  }

  // Régi metódus megtartása a kompatibilitás miatt
  splitPttIntoSections(text: string): string[] {
    if (!text) return [];
    const rawSections = text.split(/(?=\n\s*\d+\.\d+(\.\d+)?\s+[^\n]+tantárgy)/i);
    const CHUNK_SIZE = 10000;
    const OVERLAP = 2000;
    const finalChunks: string[] = [];
    for (const section of rawSections) {
      if (section.length <= CHUNK_SIZE) {
        if (section.length > 100) finalChunks.push(section.trim());
      } else {
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
Te egy PTT(Programtanterv) dokumentum - elemző szakértő és SZAKOKTATÓ vagy.A feladatod a szakmai tartalom kinyerése és SZAKMAI BŐVÍTÉSE / FELBONTÁSA az 1 TANÓRA = 1 MODUL elv alapján.
Most kifejezetten ${typeFocus} tananyagrészekre kell fókuszálnod.

── KÉTOLDALÚ KINYERÉSI STRATÉGIA(KÖTELEZŐ) ──
A kinyerés során össze KELL hangolnod a PTT összesítő táblázatát a részletes szöveges leírással:
    1. TÁBLÁZAT KÖRNYEZET(Témakörök és Óraszámok): Olvasd el a kapott TÁBLÁZAT KÖRNYEZETET, és keresd meg a chunk - ban lévő tantárgyhoz tartozó témakörök óraszámait(N).
2. SZÖVEGES RÉSZ(Kulcsszavak és Részletek): Keresd meg a tantárgy témaköreit(pl. 3.1.1.6 A tantárgy témakörei).
3. 1 - ÓRÁS GRANULÁRIS FELBONTÁS:
    - Minden egyes témakörhöz(pl. 3.1.1.6.1 Álláskeresés, melynek óraszáma a táblázatban N = 5 óra) PONTOSAN N darab önálló, 1 - órás almodult kell generálnod!
      - Csoportosítsd és oszd el a témakör alatti kulcsszavakat, felsorolásokat pontosan N darab egyenletes és szakmailag koherens leckére.
   - Ha a forrásszöveg rövid, de az óraszám magas(pl. 3 óra), akkor se vonj össze modulokat! Ehelyett bontsd fel a meglévő témákat mélyebb elméleti vagy gyakorlati szempontok szerint(pl.alapfogalmak, részletes ipari szabályok, esettanulmányok).

── ELMÉLET ÉS GYAKORLAT TÍPUSÚ SZÉTVÁLASZTÁS ──
    - Keresd meg a tantárgy alatti ".4" - es pontot(pl. 3.1.1.4).
- Ha a gyakorlati százalék 0 % (pl. "legalább 0%-át gyakorlati helyszínen..."), akkor a tantárgy 100 % ELMÉLET(theory).Minden modulja "theory" típusú legyen!
      - Ha a gyakorlati százalék nagyobb mint 0 % (pl. 50 %), akkor a tantárgy elméleti és gyakorlati moduljai külön válnak(lásd a typeFocus szűrést).

── FONTOS: ÓRASZÁMOK PONTOS MEGHATÁROZÁSA ÉS A FELCSERÉLÉS ELKERÜLÉSE ──
A magyar programtantervben(PTT) az Elméleti oktatás óraszáma / aránya mindig az ELSŐ helyen szerepel, a Gyakorlati oktatás pedig a MÁSODIKON!
    Például:
    - Ha a táblázatban pl. '90 / 210' van, vagy két oszlopban '90' és '210' szerepel -> "theoryHours": 90, "practicalHours": 210
      - Ha a szöveg azt írja: "Elmélet: 30 óra, Gyakorlat: 70 óra" -> "theoryHours": 30, "practicalHours": 70
MINDIG ellenőrizd le kétszer is, hogy nem cserélted - e fel az elméleti(theoryHours) és gyakorlati(practicalHours) óraszámokat!

── KÓDOLÁS ÉS CÍMEK ──
    - A "sectionCode" végére fűzz ABC sorrendben betűket a felosztott 1 - órás moduloknál: 3.1.1.6.1.a, 3.1.1.6.1.b, 3.1.1.6.1.c, stb.
- A modulok címe legyen pontos, szakmai és diák - központú(pl. "Álláskeresés - 1. rész: Karriertervezés").

TÁBLÁZAT KÖRNYEZET (Témakörök óraszámaival):
${tableContext}

ELEMEZENDŐ SZÖVEG:
${chunk}

VÁLASZ FORMÁTUMA(SZIGORÚ JSON):
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
    return `Te egy profi szakoktató és tananyagfejlesztő vagy. Generálj szakmai tananyagot TANULÓK számára.

Szakma: ${professionName}
Tantárgy: ${subjectName}

── FELADAT ──
Minden megadott modulhoz írj egy alapos, de lényegre törő szakmai kifejtést az alábbi SZIGORÚ szabályok szerint:

1. HA A MODUL [THEORY] (Elmélet):
   - A "content" mezőbe írj egy **PONTOSAN 4-5 mondatból álló**, magas információ-sűrűségű szakmai magyarázatot.
   - Összpontosíts a tiszta definíciókra, összefüggésekre, műszaki adatokra, anyagtulajdonságokra és ipari szabályokra, pontos terminológiát használva.
   - A "practicalTasks" mező KÖTELEZŐEN ÜRES lista maradjon: [].

2. HA A MODUL [PRACTICAL] (Gyakorlat):
   - A "content" mezőbe írj egy rövid (maximum 3 mondatos) szakmai bevezetőt a feladat gyakorlati céljáról és az elsajátítandó fogásokról.
   - A "practicalTasks" mezőbe generálj **PONTOSAN 6-8 konkrét, egymásra szigorúan épülő**, lépcsőzetesen felépített gyakorlati feladatot (instrukciót), amelyek egy valós ipari munkafolyamatot (workflow) követnek le:
     * 1. Lépés: Előkészítés és munkavédelem (egyéni védőeszközök ellenőrzése, munkaterület biztonságossá tétele).
     * 2. Lépés: Mérési, előrajzolási, kalibrálási vagy gépbeállítási paraméterek meghatározása a technológiai leírás alapján.
     * 3-5. Lépés: Technológiai főműveletek végrehajtása (cselekvés-orientált, precíz lépések, pl. megmunkálás, vágás, összeállítás).
     * 6. Lépés: Utóműveletek (pl. sorjázás, tisztítás, vasalás, rögzítés, felületkezelés).
     * 7. Lépés: Minőségellenőrzés és mérés (dimenziók, tűréshatárok, vizuális hibák ellenőrzése mérőeszközökkel vagy sablonnal).
     * 8. Lépés: Rendrakás és szakmai adminisztráció (szerszámok elrakása, hulladékkezelés, munkanapló vagy jegyzőkönyv kitöltése).
   - Mindegyik feladat legyen cselekvés-orientált, **felszólító módban** megfogalmazva (pl. "Állítsa be...", "Mérje meg...", "Végezze el...").

── MATEMATIKAI ÉS FIZIKAI KÉPLETEK FORMÁTUMA ──
- Minden matematikai képletet és fizikai egyenletet KÖTELEZŐEN standard LaTeX formátumban írj!
- Blokkszintű (külön sorba kerülő) képleteknél használd a dupla dollárjelet: $$ képlet $$ (pl. $$ U = I \times R $$).
- Szövegközi (inline) képleteknél használd az egyetlen dollárjelet: $ képlet $ (pl. $ I = \frac{U}{R} $).
- Szigorúan kerüld a zárójeles, sima szöveges vagy nem szabványos képletmegadásokat! Egyszerű számokat, mértékegységeket (pl. 230V, 10%) ne tegyél LaTeX-be.

── SZIGORÚ TILALOM ──
- NE keverd az elméleti magyarázatot a gyakorlati feladatokkal!
- Könyörtelenül hagyd el a pedagógiai sallangokat (pl. "A tanuló képes lesz...").

MODULOK LISTÁJA:
${moduleList}

VÁLASZ (JSON, markdown blokk nélkül):
{
  "modules": [
    { 
      "title": "Pontos modul cím",  
      "content": "Szakmai tartalom kifejtése...",  
      "practicalTasks": [
        "1. Lépés: Ellenőrizze a...",
        "2. Lépés: Készítse elő a..."
      ]  
    }
  ]
}`.trim();
  }


  getSubjectPttText(subName: string, fullText: string, code?: string | null): string {
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
      console.warn(`[getSubjectPttText] Subject "${subName}" (cleaned: "${cleanName}") not found in PTT. Returning empty string.`);
      return '';
    }

    // Find the next subject index or use a default window size
    const searchRange = fullText.substring(idx + cleanName.length);

    // Clean the subject code to remove any trailing dots
    const currentCode = code ? code.trim().replace(/\.$/, '') : '';

    // Find headings in searchRange
    const headingRegex = /\n\s*(\d+(?:\.\d+)+)/g;
    let nextHeadingIndex = -1;
    let match;

    while ((match = headingRegex.exec(searchRange)) !== null) {
      const matchCode = match[1].trim().replace(/\.$/, '');

      // If we have a current code, check if the matched code is a sub-heading (deeper level) of the current subject.
      // e.g., if currentCode is '3.1.1', we ignore '3.1.1.1', '3.1.1.2', etc.
      if (currentCode) {
        const isSubheading = matchCode === currentCode || matchCode.startsWith(currentCode + '.');
        if (isSubheading) {
          continue; // It's a subheading inside this subject, keep searching
        }
      } else {
        // Fallback if no code is provided: only stop if the heading is a 3-digit or shorter heading (X.Y.Z or X.Y)
        // to avoid cutting off at X.Y.Z.W sub-headings.
        const partsCount = matchCode.split('.').length;
        if (partsCount > 3) {
          continue; // Ignore deeper subheadings
        }
      }

      // Found a valid next subject or section heading!
      nextHeadingIndex = match.index;
      break;
    }

    let endIdx = fullText.length;
    if (nextHeadingIndex !== -1) {
      endIdx = idx + cleanName.length + nextHeadingIndex;
    } else {
      // Fallback safe window: 8,000 characters is enough for one subject's text
      endIdx = Math.min(fullText.length, idx + 8000);
    }

    const startIdx = Math.max(0, idx - 300); // include a bit of prefix context
    return fullText.substring(startIdx, endIdx);
  }

  buildWorkshopActivityExtractionPrompt(chunk: string): string {
    return `
Te egy PTT(Programtanterv) dokumentum - elemző szakértő és SZAKOKTATÓ vagy. 
A feladatod, hogy kigyűjts MINDEN gyakorlati, műhelyben elvégezhető tevékenységet a megadott szövegből, megtartva a PTT - beli eredeti témaköröket(témaköri egységeket / címeket).

── SZABÁLYOK ──
1. Csak a VALÓDI, fizikai, kézzel fogható műhelygyakorlathoz kapcsolódó tevékenységeket gyűjtsd ki(pl.mérések, fűrészelés, hegesztés, vezetékezés, hibakeresés, beállítások, szerszámhasználat).
2. Könyörtelenül szűrj ki minden pedagógiai sallangot(pl. "a tanuló ismeri...", "képes megérteni...") és elméleti leírást.
3. Minden tevékenységhez határozd meg a PTT - beli eredeti TÉMAKÖR megnevezését(pl. "Reszelés és alapvető kézi megmunkálások" vagy "Hegesztési eljárások").

VÁLASZ FORMÁTUMA(SZIGORÚ JSON):
{
  "rawActivities": [
    {
      "topic": "PTT-beli Témakör megnevezése",
      "activity": "Műhelytevékenység konkrét leírása..."
    }
  ]
}

ELEMEZENDŐ SZÖVEG:
${chunk}
`.trim();
  }

  buildWorkshopDaySizingPrompt(subjectName: string, rawActivities: { topic: string; activity: string }[]): string {
    const formattedActivities = rawActivities.map((act: any, i: number) =>
      `${i + 1}. [Témakör: ${act.topic || 'Általános'}] ${act.activity}`
    ).join('\n');

    return `
Te egy zseniális SZAKOKTATÓ és gyakorlati tanmenet - tervező vagy.
Kaptál egy listát, ami egy adott tantárgyhoz kigyűjtött nyers műhelytevékenységeket tartalmazza témakörök szerint csoportosítva.

Tantárgy: ${subjectName}

── FELADAT ──
1. Csoportosítsd és strukturáld ezeket a tevékenységeket egymásra épülő, szekvenciális egységekre(modulokra).
2. ** PTT TÉMAKÖRÖK MEGŐRZÉSE(FONTOS) **: A modulok kialakításakor kövesd az eredeti témakörök logikai egymásutániságát.Ne keverj össze teljesen eltérő témaköröket egy napra, hacsak nem szorosan egymásra épülnek.
3. ** KÖTELEZŐ 1 NAPOS MÉRETEZÉS **: Minden egyes egység(modul) pontosan akkora méretű legyen, amit egy tanuló ** 1 műhelygyakorlati nap(kb. 6 - 8 óra gyakorlat) ** alatt reálisan meg tud tanulni és el tud végezni a műhelyben!
4. Adj minden napnak egy vonzó, szakmailag pontos és a témakört is tükröző "Nap [X]: [Témakör] - [Cím]" formátumú nevet(pl. "1. nap: Kézi fém megmunkálás - Fűrészelés és biztonságtechnika").
5. A válaszként kapott modulok sora egy tökéletes, logikusan egymásra épülő napi tanmenetet alkosson.

VÁLASZ FORMÁTUMA(SZIGORÚ JSON):
{
  "modules": [
    {
      "title": "1. nap: [Témakör neve] - [Modul konkrét címe]",
      "type": "practical",
      "sectionCode": "nap-1",
      "activities": [
        "Műhelytevékenység konkrét leírása..."
      ]
    }
  ]
}

NYERS MŰHELYTEVÉKENYSÉGEK LISTÁJA:
${formattedActivities}
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
${activities.map((act) => `- ${act}`).join('\n')}

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
